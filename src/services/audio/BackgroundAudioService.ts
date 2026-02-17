/**
 * BackgroundAudioService
 * Android画面ロック時のバックグラウンド再生を維持するサービス
 * 
 * 3層構造:
 * 1. 無音HTML Audio要素 — OSに「メディア再生中」と認識させるキープアライブ
 * 2. Media Session API — ロック画面コントロール・メタデータ表示
 * 3. visibilitychange — フォアグラウンド復帰時のAudioContext自動復旧
 */

/** 外部から参照できるステータス */
export interface BackgroundAudioStatus {
    silentAudioPlaying: boolean;
    mediaSessionSupported: boolean;
    mediaSessionActive: boolean;
    lastError: string | null;
}

export class BackgroundAudioService {
    private silentAudio: HTMLAudioElement | null = null;
    private onTogglePlay: (() => void) | null = null;
    private visibilityHandler: (() => void) | null = null;
    private audioContextGetter: (() => AudioContext | null) | null = null;
    private statusCallback: ((status: BackgroundAudioStatus) => void) | null = null;
    private actionCooldown: number = 0; // Media Session二重トリガー防止タイムスタンプ

    private _status: BackgroundAudioStatus = {
        silentAudioPlaying: false,
        mediaSessionSupported: 'mediaSession' in navigator,
        mediaSessionActive: false,
        lastError: null,
    };

    /**
     * ステータス変更コールバックを設定（UI表示用）
     */
    public onStatusChange(cb: (status: BackgroundAudioStatus) => void): void {
        this.statusCallback = cb;
    }

    public getStatus(): BackgroundAudioStatus {
        return { ...this._status };
    }

    private updateStatus(partial: Partial<BackgroundAudioStatus>): void {
        this._status = { ...this._status, ...partial };
        this.statusCallback?.(this._status);
    }

    /**
     * 無音WAVをBlob URLとして生成
     * Data URIではなくBlob URLを使うことでブラウザの互換性を向上
     */
    private createSilentAudioBlobUrl(): string {
        const sampleRate = 44100;
        const numChannels = 1;
        const bitsPerSample = 16;
        const duration = 10; // 10秒（5秒最低要件を余裕を持って超える）
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
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
        view.setUint16(32, numChannels * (bitsPerSample / 8), true);
        view.setUint16(34, bitsPerSample, true);

        // data チャンク (全て0 = 無音)
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        // Blob URL生成（data URIより安定）
        const blob = new Blob([buffer], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    }

    private writeString(view: DataView, offset: number, str: string): void {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }

    /**
     * 無音Audio要素を作成してループ再生
     * 重要: DOMに追加しないとAndroid Chromeが認識しない
     */
    private createAndPlaySilentAudio(): void {
        // 既存のpause中要素がある場合は再開するだけ
        if (this.silentAudio) {
            if (this.silentAudio.paused) {
                this.silentAudio.play()
                    .then(() => this.updateStatus({ silentAudioPlaying: true, lastError: null }))
                    .catch(err => this.updateStatus({ silentAudioPlaying: false, lastError: `Resume failed: ${err.message}` }));
            }
            return;
        }

        const audio = document.createElement('audio');
        audio.src = this.createSilentAudioBlobUrl();
        audio.loop = true;
        audio.volume = 0.01; // 最小音量（0だとブラウザが無視する可能性）

        // DOMに追加（Android Chromeで必須）
        audio.style.display = 'none';
        document.body.appendChild(audio);

        // 再生試行 (ユーザージェスチャー後に呼ばれる前提)
        audio.play()
            .then(() => {
                this.updateStatus({ silentAudioPlaying: true, lastError: null });
            })
            .catch(err => {
                this.updateStatus({
                    silentAudioPlaying: false,
                    lastError: `Silent audio failed: ${err.message}`
                });
            });

        this.silentAudio = audio;
    }

    /**
     * 無音Audio要素を停止・破棄
     */
    private stopSilentAudio(): void {
        if (this.silentAudio) {
            this.silentAudio.pause();
            // DOMから削除
            if (this.silentAudio.parentNode) {
                this.silentAudio.parentNode.removeChild(this.silentAudio);
            }
            // Blob URL解放
            if (this.silentAudio.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.silentAudio.src);
            }
            this.silentAudio = null;
            this.updateStatus({ silentAudioPlaying: false });
        }
    }

    /**
     * Media Session APIを設定
     * ロック画面にメタデータとコントロールを表示
     */
    private setupMediaSession(modeName: string): void {
        if (!('mediaSession' in navigator)) {
            this.updateStatus({ mediaSessionSupported: false });
            return;
        }

        navigator.mediaSession.metadata = new MediaMetadata({
            title: `Silentium — ${modeName}`,
            artist: 'Silentium',
            album: 'Sound Masking',
        });

        navigator.mediaSession.playbackState = 'playing';

        // 再生コントロール: ロック画面の「再生」ボタン
        navigator.mediaSession.setActionHandler('play', () => {
            // クールダウン中は無視（HyperOS等の二重トリガー防止）
            if (Date.now() - this.actionCooldown < 800) return;
            this.actionCooldown = Date.now();

            // Chromeが自動pauseしたsilent audioを再開
            if (this.silentAudio && this.silentAudio.paused) {
                this.silentAudio.play().catch(() => { /* 無視 */ });
            }
            navigator.mediaSession.playbackState = 'playing';
            this.onTogglePlay?.();
        });

        // 一時停止コントロール: ロック画面の「一時停止」ボタン
        navigator.mediaSession.setActionHandler('pause', () => {
            // クールダウン中は無視（HyperOS等の二重トリガー防止）
            if (Date.now() - this.actionCooldown < 800) return;
            this.actionCooldown = Date.now();

            navigator.mediaSession.playbackState = 'paused';
            this.onTogglePlay?.();
        });

        // 停止コントロール（通知を閉じる操作）
        navigator.mediaSession.setActionHandler('stop', () => {
            navigator.mediaSession.playbackState = 'none';
            this.onTogglePlay?.();
        });

        // 不要なアクションは明示的にnullを設定
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);

        this.updateStatus({ mediaSessionActive: true });
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
                    ctx.resume().catch(() => { /* 復旧失敗は無視 */ });
                }
                // 無音Audioも復旧（停止している場合）
                if (this.silentAudio && this.silentAudio.paused) {
                    this.silentAudio.play().catch(() => { /* 復旧失敗は無視 */ });
                }
            }
        };

        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    /**
     * バックグラウンド再生サービスを開始
     */
    public start(
        onTogglePlay: () => void,
        getAudioContext: () => AudioContext | null,
        modeName: string
    ): void {
        this.onTogglePlay = onTogglePlay;
        this.audioContextGetter = getAudioContext;

        // 1. 無音Audio要素の再生開始（DOMに追加）
        this.createAndPlaySilentAudio();

        // 2. Media Session設定
        this.setupMediaSession(modeName);

        // 3. visibilitychangeリスナー設定
        this.setupVisibilityHandler();
    }

    /**
     * バックグラウンド再生サービスを停止
     * 注意: silent audioはpauseのみ（DOMから削除しない）
     * HyperOS等でaudio要素消失時に再生が再トリガーされる問題を回避
     */
    public stop(): void {
        // silent audioはpauseのみ（deleteはdispose()で行う）
        if (this.silentAudio) {
            this.silentAudio.pause();
            this.updateStatus({ silentAudioPlaying: false });
        }

        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
        }
        this.updateStatus({ mediaSessionActive: false });
    }

    /**
     * 完全クリーンアップ（アンマウント時）
     */
    public dispose(): void {
        // silent audioをDOM含めて完全破棄
        this.stopSilentAudio();

        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none';
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
            navigator.mediaSession.setActionHandler('stop', null);
        }

        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }

        this.onTogglePlay = null;
        this.audioContextGetter = null;
        this.statusCallback = null;
        this.updateStatus({ silentAudioPlaying: false, mediaSessionActive: false });
    }
}
