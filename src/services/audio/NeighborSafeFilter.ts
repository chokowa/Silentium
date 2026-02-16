/**
 * Neighbor Safe Filter（近隣配慮フィルタ）
 * 指定周波数以下をHPF×2段（-24dB/oct）で急峻にカット
 * 外部スピーカーの低音による下階への振動漏れを防止
 */
export class NeighborSafeFilter {
    private context: AudioContext;
    private hpf1: BiquadFilterNode;
    private hpf2: BiquadFilterNode;
    private bypass: GainNode;  // バイパス用
    private filtered: GainNode; // フィルタ経由用
    private inputNode: GainNode;
    private outputNode: GainNode;
    private _enabled: boolean = true;

    constructor(context: AudioContext, cutoffHz: number = 40) {
        this.context = context;

        this.inputNode = context.createGain();
        this.outputNode = context.createGain();

        // HPF × 2段で -24dB/oct
        this.hpf1 = context.createBiquadFilter();
        this.hpf1.type = 'highpass';
        this.hpf1.frequency.value = cutoffHz;
        this.hpf1.Q.value = 0.707; // Butterworth

        this.hpf2 = context.createBiquadFilter();
        this.hpf2.type = 'highpass';
        this.hpf2.frequency.value = cutoffHz;
        this.hpf2.Q.value = 0.707;

        // フィルタパス
        this.filtered = context.createGain();
        this.filtered.gain.value = 1;
        this.hpf1.connect(this.hpf2);
        this.hpf2.connect(this.filtered);
        this.filtered.connect(this.outputNode);

        // バイパスパス
        this.bypass = context.createGain();
        this.bypass.gain.value = 0; // 初期状態はフィルタON（バイパスOFF）
        this.bypass.connect(this.outputNode);

        // 入力を両方のパスに接続
        this.inputNode.connect(this.hpf1);
        this.inputNode.connect(this.bypass);
    }

    /** フィルタの有効/無効を切り替え */
    public setEnabled(enabled: boolean): void {
        this._enabled = enabled;
        const now = this.context.currentTime;
        if (enabled) {
            // フィルタON: フィルタパスを有効、バイパスを無効
            this.filtered.gain.setTargetAtTime(1, now, 0.02);
            this.bypass.gain.setTargetAtTime(0, now, 0.02);
        } else {
            // フィルタOFF: バイパスを有効、フィルタパスを無効
            this.filtered.gain.setTargetAtTime(0, now, 0.02);
            this.bypass.gain.setTargetAtTime(1, now, 0.02);
        }
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    /** カットオフ周波数を変更 (Hz) */
    public setCutoff(freq: number): void {
        this.hpf1.frequency.setTargetAtTime(freq, this.context.currentTime, 0.02);
        this.hpf2.frequency.setTargetAtTime(freq, this.context.currentTime, 0.02);
    }

    public getInputNode(): AudioNode {
        return this.inputNode;
    }

    public getOutputNode(): AudioNode {
        return this.outputNode;
    }
}
