import type { SpectralFeatures, NoiseEvent, DetectionConfig } from '../types/AudioAnalysisTypes';

/**
 * 足音（衝撃音）検知クラス
 */
export class FootstepDetector {
    private lastDetectionTime = 0;
    private readonly cooldownMs = 300; // 同一イベントの重複検知防止

    // デフォルトしきい値（環境調整が必要な可能性あり）
    // 校正機能でベースラインを変更し、感度係数で調整する
    private readonly BASE_FLUX_THRESHOLD = 50.0;
    private readonly BASE_LOW_ENERGY_THRESHOLD = 80.0;

    /**
     * 特徴量を解析し、足音イベントを検知する
     * @param config - 検知設定（しきい値・感度）
     */
    detect(features: SpectralFeatures, timestamp: number, config?: DetectionConfig): NoiseEvent | null {
        // クールダウン中ならスキップ
        if (timestamp - this.lastDetectionTime < this.cooldownMs) {
            return null;
        }

        const sensitivity = config?.footstepSensitivity ?? 1.0;
        // config.footstepThreshold が指定されていればそれを基準にする (デフォルトはクラス内定数)
        // キャリブレーション後は config.footstepThreshold が更新されている想定
        const baseFlux = this.BASE_FLUX_THRESHOLD;
        const baseEnergy = config?.footstepThreshold ?? this.BASE_LOW_ENERGY_THRESHOLD;

        // 感度が高い(=数値が大きい)ほど、しきい値を下げる
        const effectiveFluxThresh = baseFlux / sensitivity; // Fluxは固定ベースラインでも良いが、感度は反映
        const effectiveEnergyThresh = baseEnergy / sensitivity;

        // 1. スペクトルフラックス（急激な変化）のチェック
        const isTransient = features.spectralFlux > effectiveFluxThresh;

        // 2. 低域エネルギーのチェック（ドンドンという音）
        const isLowImpact = features.lowBandEnergy > effectiveEnergyThresh;

        if (isTransient && isLowImpact) {
            this.lastDetectionTime = timestamp;

            // 確信度計算 (簡易版)
            // しきい値をどれだけ超えたか
            const ratio = features.spectralFlux / effectiveFluxThresh;
            const confidence = Math.min(1.0, ratio * 0.5);

            return {
                type: 'footstep',
                timestamp,
                confidence,
                frequencyRange: { min: 20, max: 300 }, // 主に低域
                details: {
                    energy: features.lowBandEnergy,
                    spectralFlux: features.spectralFlux
                }
            };
        }

        return null;
    }

    reset() {
        this.lastDetectionTime = 0;
    }
}
