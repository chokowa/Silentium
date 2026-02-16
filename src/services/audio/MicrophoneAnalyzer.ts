import { AudioContextManager } from './AudioContextManager';

/**
 * マイクロフォン入力アナライザー
 * マイクから拾った環境音の周波数データを取得
 */
export class MicrophoneAnalyzer {
    private stream: MediaStream | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private analyser: AnalyserNode;
    private context: AudioContext;
    private _isActive = false;

    constructor() {
        this.context = AudioContextManager.getInstance().getContext();
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
    }

    /** マイクアクセスを開始 */
    async start(): Promise<boolean> {
        try {
            // AudioContextのresume（ユーザーインタラクション後）
            await AudioContextManager.getInstance().resume();

            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false, // エコーキャンセルOFF（生の環境音が欲しい）
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });

            this.sourceNode = this.context.createMediaStreamSource(this.stream);
            this.sourceNode.connect(this.analyser);
            // ⚠ destination には接続しない（フィードバック防止）

            this._isActive = true;
            return true;
        } catch (err) {
            console.warn('マイクアクセスが拒否されました:', err);
            this._isActive = false;
            return false;
        }
    }

    /** マイクを停止 */
    stop(): void {
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        this._isActive = false;
    }

    /** アナライザーノード取得 */
    getAnalyser(): AnalyserNode {
        return this.analyser;
    }

    /** マイクがアクティブか */
    get isActive(): boolean {
        return this._isActive;
    }
}
