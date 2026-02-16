import type { SilentiumConfig, EQBandConfig } from '../types/audio';
import { DEFAULT_EQ_BANDS, DEFAULT_CONFIG } from '../types/audio';

// ヘルパー: 指定した周波数のゲインを設定したバンド配列を返す
const createBands = (adjustments: Record<number, number>): EQBandConfig[] => {
    return DEFAULT_EQ_BANDS.map(band => ({
        ...band,
        gain: adjustments[band.frequency] ?? 0
    }));
};

/**
 * プリセットデータ定義
 * リサーチに基づく騒音タイプ別の最適設定 (10バンドEQ対応版)
 */
export const PRESETS: SilentiumConfig[] = [
    {
        name: 'Footstep Shield',
        icon: '🛡️',
        description: '足音・衝撃音を低域ノイズで覆い隠す',
        category: 'footstep',
        noiseVolumes: { white: 0, pink: 0.3, brown: 1.0, blue: 0, violet: 0 },
        masterVolume: 0.6,
        envMasterVolume: 0.3,
        eqBands: createBands({
            31.5: 4, 63: 6, 125: 4, // Low End Boost
            250: 3, 500: 1,         // Impact Body
            4000: -2, 8000: -4, 16000: -6 // Roll off highs
        }),
        hpf: 30,
        lpf: 8000,
        rumbleIntensity: 0.8,
        rumbleCrossover: 100,
        modulation: 0.005,
        neighborSafe: true,
        neighborSafeFreq: 40,
        roomSize: 'off',
    },
    {
        name: 'Voice Blocker',
        icon: '🗣️',
        description: '話し声・テレビ音声を中高域ノイズで遮断',
        category: 'voice',
        noiseVolumes: { white: 0.1, pink: 0.7, brown: 0.2, blue: 0.4, violet: 0 },
        masterVolume: 0.5,
        envMasterVolume: 0.3,
        eqBands: createBands({
            31.5: -2, 63: -2,
            500: 2, 1000: 4, 2000: 5, 4000: 3, // Vocal Range Boost
            8000: 0, 16000: 0
        }),
        hpf: 100,
        lpf: 16000,
        rumbleIntensity: 0,
        rumbleCrossover: 80,
        modulation: 0,
        neighborSafe: true,
        neighborSafeFreq: 40,
        roomSize: 'off',
    },
    {
        name: 'Deep Sleep',
        icon: '🌙',
        description: '刺激を最小限に抑えた穏やかな音の壁',
        category: 'sleep',
        noiseVolumes: { white: 0, pink: 0.2, brown: 0.8, blue: 0, violet: 0 },
        masterVolume: 0.4,
        envMasterVolume: 0.4,
        eqBands: createBands({
            31.5: 2, 63: 2, 125: 0,
            1000: -2, 2000: -4, 4000: -6, 8000: -8, 16000: -10 // Darker sound
        }),
        hpf: 20,
        lpf: 800,   // 低域のみ通過
        rumbleIntensity: 0.4,
        rumbleCrossover: 60,
        modulation: 0.01,
        neighborSafe: true,
        neighborSafeFreq: 40,
        roomSize: 'off',
    },
    {
        name: 'Focus Wall',
        icon: '🎯',
        description: '集中を妨げる全ての雑音を均一に遮蔽',
        category: 'general',
        noiseVolumes: { white: 0.2, pink: 0.5, brown: 0.4, blue: 0.1, violet: 0 },
        masterVolume: 0.5,
        envMasterVolume: 0.2,
        eqBands: [...DEFAULT_EQ_BANDS], // フラット
        hpf: 80,
        lpf: 12000,
        rumbleIntensity: 0.3,
        rumbleCrossover: 80,
        modulation: 0,
        neighborSafe: true,
        neighborSafeFreq: 40,
        roomSize: 'off',
    },
    {
        name: 'Heavy Shield',
        icon: '⚔️',
        description: '最大出力の防御壁。外部スピーカー推奨',
        category: 'footstep',
        noiseVolumes: { white: 0.3, pink: 0.6, brown: 1.0, blue: 0, violet: 0 },
        masterVolume: 0.7,
        envMasterVolume: 0.3,
        eqBands: createBands({
            31.5: 6, 63: 8, 125: 6, 250: 4, // Heavy Lows
            500: 2, 1000: 0,
            4000: -2, 8000: -4, 16000: -6
        }),
        hpf: 25,
        lpf: 10000,
        rumbleIntensity: 1.0,
        rumbleCrossover: 120,
        modulation: 0.005,
        neighborSafe: false, // ⚠️ Safe OFF
        neighborSafeFreq: 40,
        roomSize: 'off',
    },
];

export { DEFAULT_CONFIG };
