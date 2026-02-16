import type { SpectralFeatures } from '../types/AudioAnalysisTypes';

/**
 * 周波数データを解析し、特徴量を抽出するクラス
 */
export class SpectralAnalyzer {
    private previousSpectrum: Uint8Array | null = null;
    private readonly sampleRate: number;


    constructor(sampleRate: number) {
        this.sampleRate = sampleRate;

    }

    /**
     * FFTデータから特徴量を計算する
     * @param frequencyData - AnalyserNode.getByteFrequencyData() で取得した配列
     */
    analyze(frequencyData: Uint8Array): SpectralFeatures {
        const binCount = frequencyData.length;
        const nyquist = this.sampleRate / 2;
        const hzPerBin = nyquist / binCount;

        let totalEnergy = 0;
        let weightedSum = 0;
        let lowEng = 0; // ~300Hz
        let midEng = 0; // 300Hz ~ 2000Hz
        let highEng = 0;// 2000Hz ~

        // Peak Tracking
        let maxVal = 0;
        let maxBinIndex = 0;

        // 1. エネルギー計算 (Energy & Bands) & 重心用データ収集
        for (let i = 0; i < binCount; i++) {
            const val = frequencyData[i];
            const freq = i * hzPerBin;

            totalEnergy += val;
            weightedSum += val * i; // bin index based centroid calculation usually sufficient

            if (val > maxVal) {
                maxVal = val;
                maxBinIndex = i;
            }

            // 帯域分割
            if (freq < 300) {
                lowEng += val;
            } else if (freq < 2000) {
                midEng += val;
            } else {
                highEng += val;
            }
        }

        // 2. スペクトル重心 (Spectral Centroid)
        // 0 〜 binCount-1 のインデックス値で正規化して返すケースもあるが、
        // ここではHz単位に変換して返すと直感的。
        // weightedSum / totalEnergy = 重心のBin Index
        const centroidBin = totalEnergy > 0 ? weightedSum / totalEnergy : 0;
        const spectralCentroid = centroidBin * hzPerBin;

        // 3. ピーク周波数
        const peakFrequency = maxBinIndex * hzPerBin;

        // 4. スペクトルフラックス (Spectral Flux)
        // 前回のフレームとの差分の二乗和（または絶対値和）。
        // 急激な変化（立ち上がり）を検知するのに有効。
        let spectralFlux = 0;
        if (this.previousSpectrum) {
            for (let i = 0; i < binCount; i++) {
                const diff = frequencyData[i] - this.previousSpectrum[i];
                // 正の変化（立ち上がり）のみを重視する場合は diff > 0 のみ加算する手法もあるが、
                // ここでは単純なL1距離（絶対値差分）を採用。
                spectralFlux += Math.abs(diff);
            }
        }

        // 履歴更新 (参照渡しではなくコピーを保存)
        this.previousSpectrum = new Uint8Array(frequencyData);

        return {
            energy: totalEnergy,
            lowBandEnergy: lowEng,
            midBandEnergy: midEng,
            highBandEnergy: highEng,
            spectralFlux,
            spectralCentroid,
            peakFrequency
        };
    }

    /**
     * 状態のリセット（無音区間や再開時）
     */
    reset() {
        this.previousSpectrum = null;
    }
}
