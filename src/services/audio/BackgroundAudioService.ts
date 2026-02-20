/**
 * BackgroundAudioService
 * Android画面ロック時のバックグラウンド再生を維持するサービス
 * 
 * 3層構造:
 * 1. 実データストリーム(MediaStream)のHTML Audio要素再生 — OSに「メディア再生中」と認識させる
 * 2. Media Session API — ロック画面コントロール・メタデータ表示
 * 3. visibilitychange — フォアグラウンド復帰時のAudioContext自動復旧
 */

/** 外部から参照できるステータス */
export interface BackgroundAudioStatus {
    streamPlaying: boolean;
    mediaSessionSupported: boolean;
    mediaSessionActive: boolean;
    lastError: string | null;
}

export class BackgroundAudioService {
    private audioElement: HTMLAudioElement | null = null;
    private onTogglePlay: (() => void) | null = null;
    private visibilityHandler: (() => void) | null = null;
    private audioContextGetter: (() => AudioContext | null) | null = null;
    private statusCallback: ((status: BackgroundAudioStatus) => void) | null = null;

    /**
     * 意図された再生状態（true=再生中, false=停止中）
     * HyperOS等のOSが自動再開した際に、これをチェックして不正な再開を抑制する
     */
    private _isActive: boolean = false;

    private _status: BackgroundAudioStatus = {
        streamPlaying: false,
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
     * 実ストリームをもつAudio要素を作成して再生
     * これによりWeb Audio APIのサスペンドを回避する
     */
    private createAndPlayAudioElement(stream: MediaStream): void {
        // 既存要素の再利用
        if (this.audioElement) {
            if (this.audioElement.srcObject !== stream) {
                this.audioElement.srcObject = stream;
            }
            if (this.audioElement.paused) {
                this.audioElement.play()
                    .then(() => this.updateStatus({ streamPlaying: true, lastError: null }))
                    .catch(err => this.updateStatus({ streamPlaying: false, lastError: `Resume failed: ${err.message}` }));
            }
            return;
        }

        const audio = document.createElement('audio');
        audio.srcObject = stream;
        // AudioContextの出力を流すので、ボリュームはそのまま出力する(1.0)
        audio.volume = 1.0;

        // DOMに追加（Android Chromeで必須）
        audio.style.display = 'none';
        document.body.appendChild(audio);

        // OSによる自動再開を監視・抑制
        audio.addEventListener('play', () => {
            if (!this._isActive) {
                audio.pause();
            }
        });

        audio.play()
            .then(() => {
                this.updateStatus({ streamPlaying: true, lastError: null });
            })
            .catch(err => {
                this.updateStatus({
                    streamPlaying: false,
                    lastError: `Audio element failed: ${err.message}`
                });
            });

        this.audioElement = audio;
    }

    /**
     * Audio要素を完全破棄（dispose時のみ）
     */
    private destroyAudioElement(): void {
        if (this.audioElement) {
            this.audioElement.pause();
            if (this.audioElement.parentNode) {
                this.audioElement.parentNode.removeChild(this.audioElement);
            }
            this.audioElement.srcObject = null;
            this.audioElement = null;
            this.updateStatus({ streamPlaying: false });
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
            if (this._isActive) return;
            this._isActive = true;

            if (this.audioElement && this.audioElement.paused) {
                this.audioElement.play().catch(() => { /* 無視 */ });
            }
            navigator.mediaSession.playbackState = 'playing';
            this.onTogglePlay?.();
        });

        // 一時停止コントロール
        navigator.mediaSession.setActionHandler('pause', () => {
            if (!this._isActive) return;
            this._isActive = false;

            if (this.audioElement && !this.audioElement.paused) {
                this.audioElement.pause();
            }
            navigator.mediaSession.playbackState = 'paused';
            this.onTogglePlay?.();
        });

        // 停止コントロール（通知を閉じる操作）
        navigator.mediaSession.setActionHandler('stop', () => {
            if (!this._isActive) return;
            this._isActive = false;

            if (this.audioElement && !this.audioElement.paused) {
                this.audioElement.pause();
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
                if (this.audioElement && this.audioElement.paused) {
                    this.audioElement.play().catch(() => { /* 無視 */ });
                }
            }
        };

        if (!this.visibilityHandler) return;
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    /**
     * バックグラウンド再生サービスを開始
     */
    public start(
        onTogglePlay: () => void,
        getAudioContext: () => AudioContext | null,
        modeName: string,
        stream?: MediaStream
    ): void {
        this._isActive = true;
        this.onTogglePlay = onTogglePlay;
        this.audioContextGetter = getAudioContext;

        if (stream) {
            this.createAndPlayAudioElement(stream);
        }
        this.setupMediaSession(modeName);

        // 重複登録防止
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
        }
        this.setupVisibilityHandler();
    }

    /**
     * バックグラウンド再生サービスを停止
     * audio要素はpauseのみ（DOMから削除しない）
     */
    public stop(): void {
        this._isActive = false;

        if (this.audioElement && !this.audioElement.paused) {
            this.audioElement.pause();
        }
        this.updateStatus({ streamPlaying: false });

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
        this.destroyAudioElement();

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
        this.updateStatus({ streamPlaying: false, mediaSessionActive: false });
    }
}
