/**
 * 騒音イベントの種類
 */
export type NoiseEventType =
    | 'footstep' // 踵歩き・子供の足音（衝撃音）
    | 'friction' // 引きずり音・ローラー音（摩擦音）
    | 'voice'    // 人の声（除外対象）
    | 'generic'  // その他（未分類の突発音）
    | 'unknown'; // その他

/**
 * 検知された騒音イベント
 */
export interface NoiseEvent {
    type: NoiseEventType;
    timestamp: number;
    confidence: number; // 0.0 - 1.0 (確信度)

    // 周波数帯域情報 (Hz)
    frequencyRange: {
        min: number;
        max: number;
    };

    // 詳細データ（デバッグ・可視化用）
    details?: {
        energy: number;
        spectralFlux?: number;
    };
}

/**
 * スペクトル特徴量
 */
export interface SpectralFeatures {
    energy: number;          // 全帯域のエネルギー合計
    lowBandEnergy: number;   // 低域エネルギー (e.g. < 300Hz)
    midBandEnergy: number;   // 中域エネルギー
    highBandEnergy: number;  // 高域エネルギー
    spectralFlux: number;    // スペクトル差分（変化量）
    spectralCentroid: number;// スペクトル重心（音の明るさ）
    peakFrequency: number;   // ピーク周波数 (最もエネルギーが大きい周波数)
}

/**
 * 検知設定
 */
export interface DetectionConfig {
    // 摩擦音設定
    frictionThreshold?: number;   // 基準エネルギー (デフォルト: 40.0)
    frictionSensitivity: number; // 感度倍率 (0.6: 推奨デフォルト)

    // 足音設定
    footstepThreshold?: number;   // 基準Flux/エネルギー (デフォルト: 50.0)
    footstepSensitivity: number; // 感度倍率 (3.5: 推奨デフォルト)

    // 汎用ノイズ設定
    genericThreshold?: number;    // 基準エネルギー (デフォルト: 60.0)
    genericSensitivity: number;   // 感度倍率 (1.0: デフォルト)
}
