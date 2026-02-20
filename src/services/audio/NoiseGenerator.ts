import type { NoiseType } from '../../types/audio';

/**
 * 5色ノイズ生成エンジン
 * 円環状のIIR/FIRフィルタリングアルゴリズムを使用して生成することで、
 * クロスフェードの位相干渉による音量変動（揺れ・うねり）をなくし
 * 数学的に完全にシームレスなループを実現します。
 */
export class NoiseGenerator {
    private context: AudioContext;
    private bufferSize: number;

    constructor(context: AudioContext, duration: number = 10) {
        this.context = context;
        // バッファ長（デフォルト10秒）
        this.bufferSize = context.sampleRate * duration;
    }

    /**
     * 指定タイプのノイズバッファを生成
     * クロスフェードを使用せず、2パスの書き込みでIIRフィルター状態をシームレス化します。
     */
    public createNoiseBuffer(type: NoiseType): AudioBuffer {
        const sampleRate = this.context.sampleRate;
        const mainSamples = this.bufferSize;

        // ベースとなるホワイトノイズ（前後が繋がった完全なランダムの円環とみなせる）
        const whiteSource = new Float32Array(mainSamples);
        for (let i = 0; i < mainSamples; i++) {
            whiteSource[i] = Math.random() * 2 - 1;
        }

        const outData = new Float32Array(mainSamples);

        // 各ノイズのスペクトル特性にフィルタリング
        switch (type) {
            case 'white': outData.set(whiteSource); break;
            case 'pink': this.fillPinkCircular(whiteSource, outData); break;
            case 'brown': this.fillBrownCircular(whiteSource, outData); break;
            case 'blue': this.fillBlueCircular(whiteSource, outData); break;
            case 'violet': this.fillVioletCircular(whiteSource, outData); break;
        }

        const finalBuffer = this.context.createBuffer(1, mainSamples, sampleRate);
        finalBuffer.getChannelData(0).set(outData);

        return finalBuffer;
    }

    /**
     * ループ再生用のAudioBufferSourceNodeを作成
     */
    public createSource(type: NoiseType): AudioBufferSourceNode {
        const buffer = this.createNoiseBuffer(type);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        return source;
    }

    // ===== 円環ノイズ生成アルゴリズム (2 Passes) =====

    /**
     * Pink: -3dB/oct (Voss-McCartney アルゴリズム)
     */
    private fillPinkCircular(white: Float32Array, out: Float32Array): void {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        const len = white.length;

        // 1周目でフィルター状態を収束させ、2周目でバッファに書き込む
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < len; i++) {
                const w = white[i];
                b0 = 0.99886 * b0 + w * 0.0555179;
                b1 = 0.99332 * b1 + w * 0.0750759;
                b2 = 0.96900 * b2 + w * 0.1538520;
                b3 = 0.86650 * b3 + w * 0.3104856;
                b4 = 0.55000 * b4 + w * 0.5329522;
                b5 = -0.7616 * b5 - w * 0.0168980;
                const val = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
                b6 = w * 0.115926;

                if (pass === 1) out[i] = val;
            }
        }
    }

    /**
     * Brown: -6dB/oct (ランダムウォーク・ローパス)
     */
    private fillBrownCircular(white: Float32Array, out: Float32Array): void {
        let lastOut = 0.0;
        const len = white.length;

        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < len; i++) {
                const w = white[i];
                lastOut = (lastOut + 0.02 * w) / 1.02; // Leaky Integrator
                if (pass === 1) out[i] = lastOut * 3.5;
            }
        }
    }

    /**
     * Blue: +3dB/oct (1次差分)
     */
    private fillBlueCircular(white: Float32Array, out: Float32Array): void {
        let prev = 0;
        const len = white.length;

        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < len; i++) {
                const w = white[i];
                if (pass === 1) out[i] = (w - prev) * 0.5;
                prev = w;
            }
        }
    }

    /**
     * Violet: +6dB/oct (2次差分)
     */
    private fillVioletCircular(white: Float32Array, out: Float32Array): void {
        let prev1 = 0;
        let prev2 = 0;
        const len = white.length;

        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < len; i++) {
                const w = white[i];
                if (pass === 1) out[i] = (w - 2 * prev1 + prev2) * 0.35;
                prev2 = prev1;
                prev1 = w;
            }
        }
    }
}
