import type { SpectralFeatures, NoiseEvent, DetectionConfig } from '../types/AudioAnalysisTypes';

/**
 * 汎用ノイズ検知クラス
 * 特定のパターン（足音・摩擦音）に当てはまらないが、
 * 環境基準（キャリブレーション値）を超える大きな音を検知する
 */
export class GeneralDetector {
    private lastDetectionTime = 0;
    private readonly cooldownMs = 500; // 汎用検知は少し間隔を空ける

    // デフォルトしきい値 (エネルギー総和に対する値)
    // 1024 bins * avg noise 10 = 10240, so 60.0 is way too low.
    // Setting conservative default. Calibration is recommended.
    private readonly BASE_ENERGY_THRESHOLD = 5000.0;
    private readonly BASE_FLUX_THRESHOLD = 500.0; // 変化量のしきい値

    /**
     * 特徴量を解析し、汎用ノイズイベントを検知する
     * @param config - 検知設定
     */
    detect(features: SpectralFeatures, timestamp: number, config?: DetectionConfig): NoiseEvent | null {
        // クールダウン中ならスキップ
        if (timestamp - this.lastDetectionTime < this.cooldownMs) {
            return null;
        }

        const sensitivity = config?.genericSensitivity ?? 1.0;
        const baseThreshold = config?.genericThreshold ?? this.BASE_ENERGY_THRESHOLD;

        // Flux threshold adapts with sensitivity too? Or stays constant?
        // Let's make it adaptive.
        const fluxThreshold = this.BASE_FLUX_THRESHOLD / sensitivity;

        // Effective Threshold
        const effectiveThreshold = baseThreshold / sensitivity;

        // エネルギーがしきい値を超え、かつ変化(Flux)がある程度大きい場合のみ検知
        // これにより定常ノイズ（ファンなど）を除外する
        if (features.energy > effectiveThreshold && features.spectralFlux > fluxThreshold) {
            this.lastDetectionTime = timestamp;

            // ピーク周波数帯域の特定 (SpectralFeatures.peakFrequency を利用)
            const peakFreq = features.peakFrequency;
            const bandwidth = 200; // ±200Hz の範囲とする

            // 範囲が負にならないように、かつナイキスト周波数を超えないようにクリップ
            const minFreq = Math.max(20, peakFreq - bandwidth);
            const maxFreq = Math.min(20000, peakFreq + bandwidth);
            const range = { min: minFreq, max: maxFreq };

            return {
                type: 'generic',
                timestamp,
                confidence: Math.min(1.0, (features.energy / effectiveThreshold) * 0.5),
                frequencyRange: range,
                details: {
                    energy: features.energy
                }
            };
        }

        return null;
    }

    reset() {
        this.lastDetectionTime = 0;
    }
}
