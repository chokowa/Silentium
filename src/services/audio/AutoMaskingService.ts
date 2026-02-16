import type { SilentiumConfig } from '../../types/audio';
import { MicrophoneAnalyzer } from './MicrophoneAnalyzer';

/**
 * AutoMaskingService
 * 環境音（マイク入力）を解析し、最適なマスキング設定を自動生成する
 */
export class AutoMaskingService {
    private micAnalyzer: MicrophoneAnalyzer;

    constructor(micAnalyzer: MicrophoneAnalyzer) {
        this.micAnalyzer = micAnalyzer;
    }

    // 学習用データ
    private isLearning = false;
    private history: Uint8Array[] = [];
    private historyInterval: number | null = null;

    /**
     * 学習開始: 騒音データを記録し続ける
     */
    startLearning() {
        if (this.isLearning) return;
        this.isLearning = true;
        this.history = [];

        // 100msごとにスナップショットを記録
        this.historyInterval = window.setInterval(() => {
            const analyser = this.micAnalyzer.getAnalyser();
            if (!analyser) return;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            // メモリ節約のため、最大1分分(600個)までに制限
            if (this.history.length >= 600) {
                this.history.shift();
            }
            this.history.push(dataArray);
        }, 100);
    }

    /**
     * 学習終了: 蓄積データから最適設定を計算して返す
     */
    stopLearning(currentConfig: SilentiumConfig): Partial<SilentiumConfig> {
        if (!this.isLearning) return {};

        this.isLearning = false;
        if (this.historyInterval) clearInterval(this.historyInterval);
        this.historyInterval = null;

        if (this.history.length === 0) return {};

        // 履歴データの統合（各ビンの最大値を取る＝突発音対策）
        // 中央値も計算して、ベースノイズ対策とバランスを取るのが理想だが
        // ここでは「突発音もカバーする」という要件から Max-Hold 法を採用
        const bufferLength = this.history[0].length;
        const aggregatedData = new Uint8Array(bufferLength);

        for (let i = 0; i < bufferLength; i++) {
            let maxVal = 0;
            const values = [];
            for (const frame of this.history) {
                const v = frame[i];
                if (v > maxVal) maxVal = v;
                values.push(v);
            }

            // MaxとMedianのブレンド (Max寄りにして突発音重視)
            values.sort((a, b) => a - b);
            const median = values[Math.floor(values.length / 2)];

            // Max 70% : Median 30% の重み付け
            aggregatedData[i] = Math.min(255, maxVal * 0.7 + median * 0.3);
        }

        return this.calculateFromData(aggregatedData, currentConfig, this.micAnalyzer.getAnalyser()!.context.sampleRate);
    }

    /**
     * 現在の瞬間値から計算 (既存互換)
     */
    calculateOptimalSettings(currentConfig: SilentiumConfig): Partial<SilentiumConfig> {
        const analyser = this.micAnalyzer.getAnalyser();
        if (!analyser) return {};

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        return this.calculateFromData(dataArray, currentConfig, analyser.context.sampleRate);
    }

    /**
     * 生データ配列から設定を計算する内部メソッド (共通ロジック)
     */
    private calculateFromData(dataArray: Uint8Array, currentConfig: SilentiumConfig, sampleRate: number): Partial<SilentiumConfig> {
        const bufferLength = dataArray.length;
        const nyquist = sampleRate / 2;

        // 1. 周波数帯域ごとのエネルギーを計測
        const bands = {
            low: { sum: 0, count: 0 },     // ~100Hz
            midLow: { sum: 0, count: 0 },  // ~300Hz
            mid: { sum: 0, count: 0 },     // ~800Hz
            midHigh: { sum: 0, count: 0 }, // ~2000Hz
            high: { sum: 0, count: 0 }     // 2000Hz~
        };

        for (let i = 0; i < bufferLength; i++) {
            const freq = (i / bufferLength) * nyquist;
            const val = dataArray[i];

            if (freq < 150) {
                bands.low.sum += val; bands.low.count++;
            } else if (freq < 400) {
                bands.midLow.sum += val; bands.midLow.count++;
            } else if (freq < 1000) {
                bands.mid.sum += val; bands.mid.count++;
            } else if (freq < 4000) {
                bands.midHigh.sum += val; bands.midHigh.count++;
            } else {
                bands.high.sum += val; bands.high.count++;
            }
        }

        const levels = {
            low: bands.low.count > 0 ? bands.low.sum / bands.low.count : 0,
            midLow: bands.midLow.count > 0 ? bands.midLow.sum / bands.midLow.count : 0,
            mid: bands.mid.count > 0 ? bands.mid.sum / bands.mid.count : 0,
            midHigh: bands.midHigh.count > 0 ? bands.midHigh.sum / bands.midHigh.count : 0,
            high: bands.high.count > 0 ? bands.high.sum / bands.high.count : 0,
        };

        // 2. ノイズミックスの決定
        const normalize = (val: number) => {
            const threshold = 40.0;
            if (val < threshold) return 0.1;
            return Math.min(1.0, 0.2 + (val - threshold) / 120);
        };

        const newNoiseVolumes = { ...currentConfig.noiseVolumes };
        newNoiseVolumes.brown = normalize(levels.low * 0.8 + levels.midLow * 0.4);
        newNoiseVolumes.pink = normalize(levels.midLow * 0.6 + levels.mid * 0.6);
        newNoiseVolumes.white = normalize(levels.midHigh * 0.8 + levels.high * 0.2);
        newNoiseVolumes.blue = normalize(levels.high * 0.7);
        newNoiseVolumes.violet = normalize(levels.high * 0.5);

        // 3. EQ設定
        const newEQBands = currentConfig.eqBands.map(band => {
            let targetLevel = 0;
            if (band.frequency <= 100) targetLevel = levels.low;
            else if (band.frequency <= 300) targetLevel = levels.midLow;
            else if (band.frequency <= 1000) targetLevel = levels.mid;
            else if (band.frequency <= 4000) targetLevel = levels.midHigh;
            else targetLevel = levels.high;

            const baseLevel = 80;
            let gain = 0;
            if (targetLevel > baseLevel) {
                gain = Math.min(6, (targetLevel - baseLevel) / 20);
            } else {
                gain = Math.max(-3, (targetLevel - baseLevel) / 30);
            }
            return { ...band, gain };
        });

        // 4. Rumble (超低域) の調整
        let newRumbleIntensity = 0;
        let newRumbleCrossover = 80;

        if (levels.low > 140) {
            newRumbleIntensity = Math.min(0.8, (levels.low - 140) / 100);
            newRumbleCrossover = 80 + (levels.low - 140) * 0.5;
        }

        // 5. HPF (Low Cut) の調整
        let newHPF = currentConfig.hpf;
        if (levels.low < 60) {
            newHPF = 150;
        } else if (levels.low < 100) {
            newHPF = 80;
        } else {
            newHPF = 30;
        }

        // 6. LPF (High Cut) の調整
        let newLPF = currentConfig.lpf;
        if (levels.high < 60) {
            newLPF = 8000;
        } else if (levels.high > 120) {
            newLPF = 16000;
        }

        return {
            noiseVolumes: newNoiseVolumes,
            eqBands: newEQBands,
            rumbleIntensity: newRumbleIntensity,
            rumbleCrossover: Math.min(150, newRumbleCrossover),
            hpf: newHPF,
            lpf: newLPF,
        };
    }

    /**
     * 過去のイベント履歴から最適な設定を計算する (適応型マスキング)
     * 発生したノイズの周波数帯域を集計し、それを重点的にマスクする設定を生成する
     */
    calculateOptimalSettingsFromEvents(events: import('./types/AudioAnalysisTypes').NoiseEvent[], currentConfig: SilentiumConfig): Partial<SilentiumConfig> {
        if (events.length === 0) return {};

        // 1. 周波数帯域のヒートマップを作成
        // frequencyRange: { min, max } を持つイベントを集計
        let maxCount = 0;
        const bandCounts = {
            low: 0,     // < 300
            midLow: 0,  // 300 - 800
            midHigh: 0, // 800 - 2000
            high: 0     // > 2000
        };

        events.forEach(event => {
            const min = event.frequencyRange?.min ?? 0;
            const max = event.frequencyRange?.max ?? 0;
            const center = (min + max) / 2;

            if (center < 300) bandCounts.low++;
            else if (center < 800) bandCounts.midLow++;
            else if (center < 2000) bandCounts.midHigh++;
            else bandCounts.high++;

            maxCount++;
        });

        // 比率計算
        const ratios = {
            low: maxCount > 0 ? bandCounts.low / maxCount : 0,
            midLow: maxCount > 0 ? bandCounts.midLow / maxCount : 0,
            midHigh: maxCount > 0 ? bandCounts.midHigh / maxCount : 0,
            high: maxCount > 0 ? bandCounts.high / maxCount : 0
        };

        // 2. ノイズカラーの推奨
        // Lowが多い -> Brown
        // MidLowが多い -> Pink
        // MidHigh/Highが多い -> White
        const newNoiseVolumes = { ...currentConfig.noiseVolumes };

        // ベースラインは少し下げて、必要なところだけ上げる
        newNoiseVolumes.brown = 0.2 + (ratios.low * 0.6); // Max 0.8
        newNoiseVolumes.pink = 0.2 + (ratios.midLow * 0.6);
        newNoiseVolumes.white = 0.1 + (ratios.midHigh * 0.6 + ratios.high * 0.3);

        // 重み付け調整
        if (ratios.low > 0.5) newNoiseVolumes.brown = Math.max(newNoiseVolumes.brown, 0.6);
        if (ratios.midLow > 0.5) newNoiseVolumes.pink = Math.max(newNoiseVolumes.pink, 0.6);

        // 3. Rumble (Low Cut) 調整
        // 低周波ノイズが多いなら、Rumble Intensityを上げて対抗するか、
        // 逆に再生側の負担を減らすためにHPFを入れるかは戦略による。
        // ここでは「マスキング」なので、Rumbleを少し入れる。
        let newRumbleIntensity = currentConfig.rumbleIntensity;
        if (ratios.low > 0.3) {
            newRumbleIntensity = Math.min(0.8, 0.3 + ratios.low * 0.5);
        }

        return {
            noiseVolumes: newNoiseVolumes,
            rumbleIntensity: newRumbleIntensity
        };
    }
    /**
     * 単一イベントに対するマスキング設定を計算する
     * イベントをクリックした際に呼び出される
     */
    calculateMaskForSingleEvent(event: import('./types/AudioAnalysisTypes').NoiseEvent, currentConfig: SilentiumConfig): Partial<SilentiumConfig> {
        const min = event.frequencyRange?.min ?? 0;
        const max = event.frequencyRange?.max ?? 0;
        const center = (min + max) / 2;

        const newNoiseVolumes = { ...currentConfig.noiseVolumes };
        let newRumbleIntensity = currentConfig.rumbleIntensity;

        // Reset volumes to a low baseline to emphasize the masking color
        newNoiseVolumes.brown = 0.1;
        newNoiseVolumes.pink = 0.1;
        newNoiseVolumes.white = 0.1;
        newNoiseVolumes.blue = 0.0;
        newNoiseVolumes.violet = 0.0;

        // Select primary masking color based on center frequency
        if (center < 300) {
            // Low Frequency -> Brown Noise + Rumble
            newNoiseVolumes.brown = 0.7;
            newNoiseVolumes.pink = 0.2;
            newRumbleIntensity = 0.6;
        } else if (center < 1000) {
            // Mid-Low Frequency -> Pink Noise
            newNoiseVolumes.brown = 0.3;
            newNoiseVolumes.pink = 0.7;
            newNoiseVolumes.white = 0.2;
        } else {
            // High Frequency -> White Noise
            newNoiseVolumes.pink = 0.3;
            newNoiseVolumes.white = 0.6;
            newNoiseVolumes.blue = 0.2;
        }

        // Event Type specific adjustments
        if (event.type === 'friction') {
            // Friction needs steady masking
            newNoiseVolumes.pink = Math.max(newNoiseVolumes.pink, 0.5);
        } else if (event.type === 'footstep') {
            // Impact needs low end coverage
            newNoiseVolumes.brown = Math.max(newNoiseVolumes.brown, 0.6);
        }

        return {
            noiseVolumes: newNoiseVolumes,
            rumbleIntensity: newRumbleIntensity
        };
    }
}
