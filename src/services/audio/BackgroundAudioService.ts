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

    /**
     * 意図された再生状態（true=再生中, false=停止中）
     * HyperOS等のOSがsilent audioを自動再開した際に、
     * これをチェックして不正な再開を抑制する
     */
    private _isActive: boolean = false;

    private _status: BackgroundAudioStatus = {
        silentAudioPlaying: false,
        mediaSessionSupported: 'mediaSession' in navigator,
        mediaSessionActive: false,
        lastError: null,
    };

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
     */
    private createSilentAudioBlobUrl(): string {
        const sampleRate = 44100;
        const numChannels = 1;
        const bitsPerSample = 16;
        const duration = 10;
        const numSamples = sampleRate * duration;
        const dataSize = numSamples * numChannels * (bitsPerSample / 8);
        const headerSize = 44;
        const fileSize = headerSize + dataSize;

        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);

        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, fileSize - 8, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
        view.setUint16(32, numChannels * (bitsPerSample / 8), true);
        view.setUint16(34, bitsPerSample, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

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
     */
    private createAndPlaySilentAudio(): void {
        // 既存要素の再利用
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
        audio.volume = 0.01;

        // DOMに追加（Android Chromeで必須）
        audio.style.display = 'none';
        document.body.appendChild(audio);

        // OSによるsilent audioの自動再開を監視・抑制
        // HyperOS等がstop()後にaudioを勝手にresumeした場合、即座にpauseし直す
        audio.addEventListener('play', () => {
            if (!this._isActive) {
                audio.pause();
            }
        });

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
     * 無音Audio要素を完全破棄（dispose時のみ）
     */
    private destroySilentAudio(): void {
        if (this.silentAudio) {
            this.silentAudio.pause();
            if (this.silentAudio.parentNode) {
                this.silentAudio.parentNode.removeChild(this.silentAudio);
            }
            if (this.silentAudio.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.silentAudio.src);
            }
            this.silentAudio = null;
            this.updateStatus({ silentAudioPlaying: false });
        }
    }

    /**
     * Media Session APIを設定
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

        // 再生コントロール
        navigator.mediaSession.setActionHandler('play', () => {
            // 既にアクティブなら無視（二重トリガー防止）
            if (this._isActive) return;
            this._isActive = true;

            if (this.silentAudio && this.silentAudio.paused) {
                this.silentAudio.play().catch(() => { /* 無視 */ });
            }
            navigator.mediaSession.playbackState = 'playing';
            this.onTogglePlay?.();
        });

        // 一時停止コントロール
        navigator.mediaSession.setActionHandler('pause', () => {
            // 既に停止中なら無視（二重トリガー防止）
            if (!this._isActive) return;
            this._isActive = false;

            if (this.silentAudio && !this.silentAudio.paused) {
                this.silentAudio.pause();
            }
            navigator.mediaSession.playbackState = 'paused';
            this.onTogglePlay?.();
        });

        // 停止コントロール（通知を閉じる操作）
        navigator.mediaSession.setActionHandler('stop', () => {
            if (!this._isActive) return;
            this._isActive = false;

            if (this.silentAudio && !this.silentAudio.paused) {
                this.silentAudio.pause();
            }
            navigator.mediaSession.playbackState = 'none';
            this.onTogglePlay?.();
        });

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
     * visibilitychangeリスナー
     * _isActiveの場合のみAudioContext復旧を試みる
     */
    private setupVisibilityHandler(): void {
        this.visibilityHandler = () => {
            if (document.visibilityState === 'visible' && this._isActive) {
                const ctx = this.audioContextGetter?.();
                if (ctx && ctx.state === 'suspended') {
                    ctx.resume().catch(() => { /* 無視 */ });
                }
                if (this.silentAudio && this.silentAudio.paused) {
                    this.silentAudio.play().catch(() => { /* 無視 */ });
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
        this._isActive = true;
        this.onTogglePlay = onTogglePlay;
        this.audioContextGetter = getAudioContext;

        this.createAndPlaySilentAudio();
        this.setupMediaSession(modeName);
        this.setupVisibilityHandler();
    }

    /**
     * バックグラウンド再生サービスを停止
     * silent audioはpauseのみ（DOMから削除しない）
     */
    public stop(): void {
        this._isActive = false;

        if (this.silentAudio && !this.silentAudio.paused) {
            this.silentAudio.pause();
        }
        this.updateStatus({ silentAudioPlaying: false });

        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
        }
        this.updateStatus({ mediaSessionActive: false });
    }

    /**
     * 完全クリーンアップ（アンマウント時）
     */
    public dispose(): void {
        this._isActive = false;
        this.destroySilentAudio();

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
