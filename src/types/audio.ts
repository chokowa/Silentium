// ノイズタイプ
export type NoiseType = 'white' | 'pink' | 'brown' | 'blue' | 'violet';

// 部屋サイズ (畳数)
export type RoomSize = 'off' | '6tatami' | '8tatami' | '12tatami' | '20tatami';

// ルームモード補正設定
export interface RoomModeConfig {
    size: RoomSize;
    frequencies: number[]; // 定在波が発生しやすい周波数
    cutAmount: number;     // カット量 (dB, 正の値を入れるとマイナスされる想定)
    Q: number;             // フィルタの鋭さ
}

// EQバンド設定
export interface EQBandConfig {
    frequency: number;  // Hz
    gain: number;       // dB (-12 ~ +12)
    Q: number;          // 帯域幅 (0.1 ~ 10)
    type: BiquadFilterType; // 'peaking' | 'lowshelf' | 'highshelf'
}

// Silentiumプリセット設定
export interface SilentiumConfig {
    name: string;
    icon: string;
    description: string;
    category: 'footstep' | 'voice' | 'sleep' | 'general';

    // ノイズミックス (各タイプの音量: 0.0 ~ 1.0)
    noiseVolumes: Record<NoiseType, number>;

    // マスター設定
    masterVolume: number;   // 0.0 ~ 1.0
    envMasterVolume: number; // 0.0 ~ 1.0 (環境音マスター)

    // DSP設定
    eqBands: EQBandConfig[];     // 5バンドEQ
    hpf: number;                 // ハイパスフィルタ (Hz)
    lpf: number;                 // ローパスフィルタ (Hz)
    rumbleIntensity: number;     // ランブル強度 (0.0 ~ 1.0)
    rumbleCrossover: number;     // ランブル・クロスオーバー (Hz)
    modulation: number;          // LFO変調深度
    neighborSafe: boolean;       // 近隣配慮モード (40Hz以下カット)
    neighborSafeFreq: number;    // 配慮モード・カットオフ周波数 (Hz)
    roomSize: RoomSize;          // 部屋サイズ補正
}

// ユーザー保存用プリセット (IDと設定のペア)
export interface SavedPreset {
    id: string;
    config: SilentiumConfig;
    createdAt: number;
    updatedAt: number;
}

// 環境音トラック情報 (UI表示用)
export interface EnvTrackInfo {
    id: string;
    name: string;
    volume: number;
}

// デフォルトEQバンド設定 (10バンド・グラフィックEQ仕様)
export const DEFAULT_EQ_BANDS: EQBandConfig[] = [
    { frequency: 31.5, gain: 0, Q: 1.41, type: 'lowshelf' }, // Sub
    { frequency: 63, gain: 0, Q: 1.41, type: 'peaking' },  // Bass
    { frequency: 125, gain: 0, Q: 1.41, type: 'peaking' },  // Low
    { frequency: 250, gain: 0, Q: 1.41, type: 'peaking' },  // Low Mid
    { frequency: 500, gain: 0, Q: 1.41, type: 'peaking' },  // Mid
    { frequency: 1000, gain: 0, Q: 1.41, type: 'peaking' },  // Mid High
    { frequency: 2000, gain: 0, Q: 1.41, type: 'peaking' },  // High Mid
    { frequency: 4000, gain: 0, Q: 1.41, type: 'peaking' },  // Presence
    { frequency: 8000, gain: 0, Q: 1.41, type: 'peaking' },  // Brilliance
    { frequency: 16000, gain: 0, Q: 1.41, type: 'highshelf' },// Air
];

// ルームモード定在波データ (日本の一般的な部屋寸法に基づく概算)
// 天井高は約2.4m (70Hz付近) を共通の課題とする
export const ROOM_MODE_PRESETS: Record<RoomSize, RoomModeConfig> = {
    'off': { size: 'off', frequencies: [], cutAmount: 0, Q: 0 },
    '6tatami': {
        // 江戸間6畳 (約2.6m x 3.5m) -> 65Hz, 48Hz
        size: '6tatami',
        frequencies: [48, 65, 71], // 長辺, 短辺, 天井
        cutAmount: 3,
        Q: 4.0
    },
    '8tatami': {
        // 江戸間8畳 (約3.5m x 3.5m) -> 48Hz (強), 71Hz
        size: '8tatami',
        frequencies: [48, 71, 96], // 正方形に近いので48Hzが重なる, 倍音96Hz
        cutAmount: 4, // 共振が強いので少し深めに
        Q: 4.5
    },
    '12tatami': {
        // LDK想定 (約3.5m x 5.3m) -> 48Hz, 32Hz
        size: '12tatami',
        frequencies: [32, 48, 71],
        cutAmount: 2.5,
        Q: 3.5
    },
    '20tatami': {
        // 大きなリビング -> 低域の定在波は下がるが残響が課題
        size: '20tatami',
        frequencies: [28, 42, 71],
        cutAmount: 2.0,
        Q: 3.0
    }
};

// デフォルト設定
export const DEFAULT_CONFIG: SilentiumConfig = {
    name: 'Default',
    icon: '🔇',
    description: 'デフォルト設定',
    category: 'general',
    noiseVolumes: { white: 0, pink: 0.3, brown: 0.5, blue: 0, violet: 0 },
    masterVolume: 0.5,
    envMasterVolume: 0.5,
    eqBands: [...DEFAULT_EQ_BANDS],
    hpf: 20,
    lpf: 20000,
    rumbleIntensity: 0,
    rumbleCrossover: 80,
    modulation: 0,
    neighborSafe: true,
    neighborSafeFreq: 40,
    roomSize: 'off',
};
