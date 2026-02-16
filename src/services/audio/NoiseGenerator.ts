import type { NoiseType } from '../../types/audio';

/**
 * 5色ノイズ生成エンジン
 * 10秒バッファ + 1秒等パワー円環クロスフェード → シームレスループ
 */
export class NoiseGenerator {
    private context: AudioContext;
    private bufferSize: number;

    constructor(context: AudioContext, duration: number = 10) {
        this.context = context;
        this.bufferSize = context.sampleRate * duration;
    }

    /**
     * 指定タイプのノイズバッファを生成
     * 末尾1秒を先頭に等パワーフェードで混合し、完全なシームレスループを実現
     */
    public createNoiseBuffer(type: NoiseType): AudioBuffer {
        const sampleRate = this.context.sampleRate;
        const mainSamples = this.bufferSize;
        const crossSamples = Math.floor(sampleRate * 1.0); // 1秒のクロスフェード余白
        const totalSamples = mainSamples + crossSamples;

        const tempBuffer = new Float32Array(totalSamples);

        // ノイズ生成
        switch (type) {
            case 'white': this.fillWhiteNoise(tempBuffer); break;
            case 'pink': this.fillPinkNoise(tempBuffer); break;
            case 'brown': this.fillBrownNoise(tempBuffer); break;
            case 'blue': this.fillBlueNoise(tempBuffer); break;
            case 'violet': this.fillVioletNoise(tempBuffer); break;
        }

        // 等パワー円環クロスフェード
        const finalBuffer = this.context.createBuffer(1, mainSamples, sampleRate);
        const finalData = finalBuffer.getChannelData(0);

        for (let i = 0; i < mainSamples; i++) {
            if (i < crossSamples) {
                const alpha = i / crossSamples;
                const gainIn = Math.sqrt(alpha);      // 等パワーフェードイン
                const gainOut = Math.sqrt(1 - alpha); // 等パワーフェードアウト
                finalData[i] = (tempBuffer[i] * gainIn) + (tempBuffer[mainSamples + i] * gainOut);
            } else {
                finalData[i] = tempBuffer[i];
            }
        }

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

    // ===== ノイズ生成アルゴリズム =====

    /** White: 全帯域均一 */
    private fillWhiteNoise(data: Float32Array): void {
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }

    /** Pink: -3dB/oct (Voss-McCartney アルゴリズム) */
    private fillPinkNoise(data: Float32Array): void {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
    }

    /** Brown: -6dB/oct (ランダムウォーク) */
    private fillBrownNoise(data: Float32Array): void {
        let lastOut = 0.0;
        for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + 0.02 * white) / 1.02;
            data[i] = lastOut * 3.5;
        }
    }

    /** Blue: +3dB/oct (1次差分 — White Noiseの隣接サンプル差) */
    private fillBlueNoise(data: Float32Array): void {
        let prev = 0;
        for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (white - prev) * 0.5; // 差分でハイパス特性を付与
            prev = white;
        }
    }

    /** Violet: +6dB/oct (2次差分) */
    private fillVioletNoise(data: Float32Array): void {
        let prev1 = 0;
        let prev2 = 0;
        for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (white - 2 * prev1 + prev2) * 0.35; // 2次差分でより急峻なハイパス
            prev2 = prev1;
            prev1 = white;
        }
    }
}
