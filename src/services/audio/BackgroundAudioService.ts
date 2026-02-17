/**
 * BackgroundAudioService
 * Android画面ロック時のバックグラウンド再生を維持するサービス
 * 
 * 3層構造:
 * 1. 無音HTML Audio要素 — OSに「メディア再生中」と認識させるキープアライブ
 * 2. Media Session API — ロック画面コントロール・メタデータ表示
 * 3. visibilitychange — フォアグラウンド復帰時のAudioContext自動復旧
 */
export class BackgroundAudioService {
    private silentAudio: HTMLAudioElement | null = null;
    private onTogglePlay: (() => void) | null = null;
    private visibilityHandler: (() => void) | null = null;
    private audioContextGetter: (() => AudioContext | null) | null = null;

    /**
     * 無音WAVファイルをBase64 Data URIとして生成
     * 5秒の無音ステレオWAV (44100Hz, 16bit)
     */
    private createSilentWavDataUri(): string {
        // WAVヘッダー + 5秒分の無音データ
        const sampleRate = 44100;
        const numChannels = 1;
        const bitsPerSample = 16;
        const duration = 5; // 秒
        const numSamples = sampleRate * duration;
        const dataSize = numSamples * numChannels * (bitsPerSample / 8);
        const headerSize = 44;
        const fileSize = headerSize + dataSize;

        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);

        // RIFF ヘッダー
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, fileSize - 8, true);
        this.writeString(view, 8, 'WAVE');

        // fmt チャンク
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // チャンクサイズ
        view.setUint16(20, 1, true);  // PCMフォーマット
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
        view.setUint16(32, numChannels * (bitsPerSample / 8), true);
        view.setUint16(34, bitsPerSample, true);

        // data チャンク (全て0 = 無音)
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);
        // データ部分は ArrayBuffer のデフォルト値(0) のままなので明示的な書き込み不要

        // Base64エンコード
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return 'data:audio/wav;base64,' + btoa(binary);
    }

    private writeString(view: DataView, offset: number, str: string): void {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }

    /**
     * 無音Audio要素を作成してループ再生
     */
    private createAndPlaySilentAudio(): void {
        if (this.silentAudio) return;

        const audio = document.createElement('audio');
        audio.src = this.createSilentWavDataUri();
        audio.loop = true;
        audio.volume = 0.01; // 最小音量（完全0だとブラウザが無視する可能性）

        // 再生試行 (ユーザージェスチャー後に呼ばれる前提)
        audio.play().catch(err => {
            console.warn('[BackgroundAudio] 無音Audio再生失敗:', err);
        });

        this.silentAudio = audio;
    }

    /**
     * 無音Audio要素を停止・破棄
     */
    private stopSilentAudio(): void {
        if (this.silentAudio) {
            this.silentAudio.pause();
            this.silentAudio.src = '';
            this.silentAudio = null;
        }
    }

    /**
     * Media Session APIを設定
     * ロック画面にメタデータとコントロールを表示
     */
    private setupMediaSession(modeName: string): void {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: `Silentium — ${modeName}`,
            artist: 'Silentium',
            album: 'Sound Masking',
        });

        navigator.mediaSession.playbackState = 'playing';

        // 再生/一時停止コントロール
        navigator.mediaSession.setActionHandler('play', () => {
            this.onTogglePlay?.();
        });

        navigator.mediaSession.setActionHandler('pause', () => {
            this.onTogglePlay?.();
        });

        // 不要なアクションは明示的にnullを設定
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
    }

    /**
     * Media Sessionのメタデータを更新（モード名変更時）
     */
    public updateMetadata(modeName: string): void {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: `Silentium — ${modeName}`,
            artist: 'Silentium',
            album: 'Sound Masking',
        });
    }

    /**
     * visibilitychangeリスナーを設定
     * バックグラウンドから復帰時にAudioContextを自動resume
     */
    private setupVisibilityHandler(): void {
        this.visibilityHandler = () => {
            if (document.visibilityState === 'visible') {
                // フォアグラウンド復帰時: AudioContextを復旧
                const ctx = this.audioContextGetter?.();
                if (ctx && ctx.state === 'suspended') {
                    ctx.resume().then(() => {
                        console.log('[BackgroundAudio] AudioContext復旧完了');
                    }).catch(err => {
                        console.warn('[BackgroundAudio] AudioContext復旧失敗:', err);
                    });
                }
            }
        };

        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    /**
     * バックグラウンド再生サービスを開始
     * メインの再生開始時に呼び出す
     * 
     * @param onTogglePlay - 再生/停止トグルのコールバック（ロック画面コントロール用）
     * @param getAudioContext - AudioContextの取得関数
     * @param modeName - 現在のモード名（Media Sessionメタデータ用）
     */
    public start(
        onTogglePlay: () => void,
        getAudioContext: () => AudioContext | null,
        modeName: string
    ): void {
        this.onTogglePlay = onTogglePlay;
        this.audioContextGetter = getAudioContext;

        // 1. 無音Audio要素の再生開始
        this.createAndPlaySilentAudio();

        // 2. Media Session設定
        this.setupMediaSession(modeName);

        // 3. visibilitychangeリスナー設定
        this.setupVisibilityHandler();
    }

    /**
     * バックグラウンド再生サービスを停止
     * メインの再生停止時に呼び出す
     */
    public stop(): void {
        // 無音Audio停止
        this.stopSilentAudio();

        // Media Session状態を更新
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
        }
    }

    /**
     * 完全クリーンアップ（アンマウント時）
     */
    public dispose(): void {
        this.stop();

        // visibilitychangeリスナー解除
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }

        // Media Sessionハンドラ解除
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
        }

        this.onTogglePlay = null;
        this.audioContextGetter = null;
    }
}
