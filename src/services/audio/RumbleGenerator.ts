/**
 * ランブルジェネレーター（サブハーモニクス生成）
 * 低域を抽出し、倍音を付加して「地鳴り感」を作り出す
 * 足音（ドスン）への対抗手段として設計
 */
export class RumbleGenerator {
    private context: AudioContext;
    private inputNode: GainNode;
    private outputNode: GainNode;

    // 倍音生成パス
    private crossover: BiquadFilterNode;      // 低域抽出用ローパス
    private harmonicGenerator: WaveShaperNode; // 非線形歪みで倍音生成
    private harmonicGain: GainNode;            // 倍音の量
    private dryGain: GainNode;                 // 原音

    constructor(context: AudioContext) {
        this.context = context;
        this.inputNode = context.createGain();
        this.outputNode = context.createGain();

        // 1. 低域抽出フィルタ (デフォルト: 80Hz以下)
        this.crossover = context.createBiquadFilter();
        this.crossover.type = 'lowpass';
        this.crossover.frequency.value = 80;
        this.crossover.Q.value = 1.0; // やや共振させて効果を強化

        // 2. 倍音生成（非線形歪み — よりアグレッシブなカーブ）
        this.harmonicGenerator = context.createWaveShaper();
        this.harmonicGenerator.curve = this.makeDistortionCurve(20) as Float32Array<ArrayBuffer>;
        this.harmonicGenerator.oversample = '4x'; // アンチエイリアス

        // 2.5 倍音整形フィルタ (追加): 不要な高次倍音をカットし、温かみのある低域補完にする
        const shapingFilter = context.createBiquadFilter();
        shapingFilter.type = 'lowpass';
        shapingFilter.frequency.value = 250; // 250Hz以上はカット
        shapingFilter.Q.value = 0.5; // なだらかに

        // 3. 倍音ゲイン
        this.harmonicGain = context.createGain();
        this.harmonicGain.gain.value = 0; // 初期値はOFF

        // 4. 原音パス
        this.dryGain = context.createGain();
        this.dryGain.gain.value = 1.0;

        // 接続
        // Input → Dry → Output
        this.inputNode.connect(this.dryGain);
        this.dryGain.connect(this.outputNode);

        // Input → Crossover → WaveShaper → ShapingFilter → HarmonicGain → Output
        this.inputNode.connect(this.crossover);
        this.crossover.connect(this.harmonicGenerator);
        this.harmonicGenerator.connect(shapingFilter); // フィルタ挿入
        shapingFilter.connect(this.harmonicGain);
        this.harmonicGain.connect(this.outputNode);
    }

    /**
     * 歪みカーブ生成
     * amount が大きいほどアグレッシブな倍音が生まれる
     */
    private makeDistortionCurve(amount: number): Float32Array {
        const k = amount;
        const nSamples = 44100;
        const curve = new Float32Array(nSamples);
        const deg = Math.PI / 180;
        for (let i = 0; i < nSamples; i++) {
            const x = (i * 2) / nSamples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    /** ランブル強度 (0.0 ~ 1.0) */
    public setIntensity(value: number): void {
        // 0.0→オフ、1.0→最大倍音 (ゲイン2.0)
        const gain = value * 2.0;
        this.harmonicGain.gain.setTargetAtTime(gain, this.context.currentTime, 0.05);
    }

    /** クロスオーバー周波数 (Hz) — どの帯域以下を倍音強化の対象にするか */
    public setCrossover(freq: number): void {
        this.crossover.frequency.setTargetAtTime(freq, this.context.currentTime, 0.05);
    }

    public getInputNode(): AudioNode {
        return this.inputNode;
    }

    public getOutputNode(): AudioNode {
        return this.outputNode;
    }
}
