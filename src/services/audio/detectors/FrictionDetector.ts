import type { SpectralFeatures, NoiseEvent, DetectionConfig } from '../types/AudioAnalysisTypes';

/**
 * 摩擦音（引きずり・ローラー音）検知クラス
 * 持続的なノイズを検知する
 */
export class FrictionDetector {
    private continuousFrames = 0;
    private readonly FRAMES_THRESHOLD = 12; // 約200ms相当 (16ms * 12 = 192ms)
    private readonly BASE_ENERGY_THRESHOLD = 40.0;

    // 状態管理
    private _isDetecting = false;

    get isDetecting(): boolean {
        return this._isDetecting;
    }

    /**
     * 特徴量を解析し、摩擦音イベントを検知する
     * @param config - 検知設定
     */
    detect(features: SpectralFeatures, timestamp: number, config?: DetectionConfig): NoiseEvent | null {
        const sensitivity = config?.frictionSensitivity ?? 1.0;
        const baseThreshold = config?.frictionThreshold ?? this.BASE_ENERGY_THRESHOLD;

        // Effective Threshold
        const effectiveThreshold = baseThreshold / sensitivity;

        // 中低域のエネルギーに着目 (引きずり音の主成分)
        // MidLow (300-2000Hz) が典型的だが、低いゴゴゴ音(Low)も含む
        const frictionEnergy = (features.lowBandEnergy * 0.5) + features.midBandEnergy;

        if (frictionEnergy > effectiveThreshold) {
            this.continuousFrames++;

            if (this.continuousFrames >= this.FRAMES_THRESHOLD) {
                // すでに検知中の場合は、連続イベントとして扱い、新規イベントは発火しない(nullを返す)
                // これにより "Friction" イベントの乱立を防ぐ
                if (this._isDetecting) {
                    return null;
                }

                this._isDetecting = true;

                return {
                    type: 'friction',
                    timestamp,
                    confidence: Math.min(1.0, (frictionEnergy / effectiveThreshold) * 0.6),
                    frequencyRange: { min: 100, max: 1000 },
                    details: {
                        energy: frictionEnergy
                    }
                };
            }
        } else {
            // ノイズが途切れたらリセット
            // 多少の途切れ(1-2フレーム)は許容するデバウンス処理を入れても良いが、
            // ここではシンプルに閾値を下回ったら即解除
            if (this.continuousFrames > 0) {
                this.continuousFrames = 0;
            }
            this._isDetecting = false;
        }

        return null;
    }

    reset() {
        this.continuousFrames = 0;
        this._isDetecting = false;
    }
}
