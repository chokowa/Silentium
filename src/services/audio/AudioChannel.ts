import { Equalizer } from './Equalizer';
import { RumbleGenerator } from './RumbleGenerator';
import type { EQBandConfig, RoomSize } from '../../types/audio';
import { ROOM_MODE_PRESETS } from '../../types/audio';

/**
 * 個別オーディオチャンネル
 * Source → EQ → Rumble → HPF×2 → LPF×2 → Gain → Analyser
 *
 * 各ノイズタイプ（White/Pink/Brown/Blue/Violet）ごとに1つ生成
 */
export class AudioChannel {
    private context: AudioContext;

    // ノードチェーン
    private eq: Equalizer;
    private rumble: RumbleGenerator;
    private hpf1: BiquadFilterNode;
    private hpf2: BiquadFilterNode;
    private lpf1: BiquadFilterNode;
    private lpf2: BiquadFilterNode;

    // クロスオーバー & 空間処理
    private crossoverLPF: BiquadFilterNode;
    private crossoverHPF: BiquadFilterNode;
    private lowDiffuser1: BiquadFilterNode; // インパルス拡散用 Allpass 1
    private lowDiffuser2: BiquadFilterNode; // インパルス拡散用 Allpass 2
    private highDelay: DelayNode;           // 空間拡張用 Delay
    private highPanner: StereoPannerNode;   // 空間拡張用 Panner
    private mixNode: GainNode;              // 再合流
    private modGainNode: GainNode;          // 揺らぎ用ゲイン

    private gainNode: GainNode;
    private analyser: AnalyserNode;

    // ソース管理
    private sourceNode: AudioBufferSourceNode | null = null;

    constructor(context: AudioContext) {
        this.context = context;

        // EQ (5バンド)
        this.eq = new Equalizer(context);

        // ランブル
        this.rumble = new RumbleGenerator(context);

        // HPF × 2段 (-24dB/oct)
        this.hpf1 = context.createBiquadFilter();
        this.hpf1.type = 'highpass';
        this.hpf1.frequency.value = 20;
        this.hpf1.Q.value = 0.707;

        this.hpf2 = context.createBiquadFilter();
        this.hpf2.type = 'highpass';
        this.hpf2.frequency.value = 20;
        this.hpf2.Q.value = 0.707;

        // LPF × 2段 (-24dB/oct)
        // LPF × 2段 (-24dB/oct)
        this.lpf1 = context.createBiquadFilter();
        this.lpf1.type = 'lowpass';
        this.lpf1.frequency.value = 20000;
        this.lpf1.Q.value = 0.707;
        this.lpf2 = context.createBiquadFilter();
        this.lpf2.type = 'lowpass';
        this.lpf2.frequency.value = 20000;
        this.lpf2.Q.value = 0.707;

        // --- クロスオーバー & 空間処理ノード ---
        const CROSSOVER_FREQ = 150;

        // 低域パス (Low Path)
        this.crossoverLPF = context.createBiquadFilter();
        this.crossoverLPF.type = 'lowpass';
        this.crossoverLPF.frequency.value = CROSSOVER_FREQ;
        this.crossoverLPF.Q.value = 0.707;

        // インパルス拡散 (Diffuser): Allpassフィルタで群遅延を発生させ、ピークを散らす
        this.lowDiffuser1 = context.createBiquadFilter();
        this.lowDiffuser1.type = 'allpass';
        this.lowDiffuser1.frequency.value = 60; // ハム/足音帯域
        this.lowDiffuser1.Q.value = 2.0;

        this.lowDiffuser2 = context.createBiquadFilter();
        this.lowDiffuser2.type = 'allpass';
        this.lowDiffuser2.frequency.value = 100; // 少し上の帯域
        this.lowDiffuser2.Q.value = 2.0;

        // 高域パス (High Path)
        this.crossoverHPF = context.createBiquadFilter();
        this.crossoverHPF.type = 'highpass';
        this.crossoverHPF.frequency.value = CROSSOVER_FREQ;
        this.crossoverHPF.Q.value = 0.707;

        this.highPanner = context.createStereoPanner();
        this.highPanner.pan.value = 0; // デフォルトはセンター(後でLFOで揺らす想定)

        this.highDelay = context.createDelay();
        this.highDelay.delayTime.value = 0.02; // 20ms (ハース効果による広がり)

        // 再合流
        this.mixNode = context.createGain();

        // 揺らぎ用ゲイン
        this.modGainNode = context.createGain();
        this.modGainNode.gain.value = 1.0;

        // ゲイン
        this.gainNode = context.createGain();
        this.gainNode.gain.value = 0;

        // アナライザ
        this.analyser = context.createAnalyser();
        this.analyser.fftSize = 2048;

        // --- 接続グラフ構築 ---
        // 1. 基本チェーン: Source -> EQ -> Rumble -> HPF -> HPF -> LPF -> LPF
        this.eq.getOutputNode().connect(this.rumble.getInputNode());
        this.rumble.getOutputNode().connect(this.hpf1);
        this.hpf1.connect(this.hpf2);
        this.hpf2.connect(this.lpf1);
        this.lpf1.connect(this.lpf2);

        // 2. クロスオーバー分岐
        const preSplitNode = this.lpf2;

        // Path A: Low (Diffuser)
        preSplitNode.connect(this.crossoverLPF);
        this.crossoverLPF.connect(this.lowDiffuser1);
        this.lowDiffuser1.connect(this.lowDiffuser2);
        this.lowDiffuser2.connect(this.mixNode);

        // Path B: High (Spatial)
        preSplitNode.connect(this.crossoverHPF);
        this.crossoverHPF.connect(this.highPanner);
        this.highPanner.connect(this.highDelay);
        this.highDelay.connect(this.mixNode);

        // ※ 遅延のないドライ音も少し混ぜないと音が遠くなる可能性があるが、
        // 今回は「空間拡張」が目的なので、HighはDelayのみを通すか、Dry+Wetにするか。
        // 実装計画では「微細なDelayを付加して空間感を演出」とある。
        // 純粋なDelayのみだと位相干渉でコムフィルタになるが、左右で違うDelayなら広がる。
        // ここではシンプルに「高域全体を少し遅らせて拡散させる」アプローチをとる。
        // もし音が痩せるようなら、crossoverHPF -> mixNode (Dry) も追加検討。
        // 現状は Panner -> Delay -> Mix なので、全高域成分が遅延・パンニングされる。

        // 3. 最終出力
        this.mixNode.connect(this.modGainNode);
        this.modGainNode.connect(this.gainNode);
        this.gainNode.connect(this.analyser);
    }

    /** ソース設定（既存のソースがあれば停止して切り替え） */
    public setSource(source: AudioBufferSourceNode): void {
        if (this.sourceNode) {
            try { this.sourceNode.stop(); } catch { /* 既に停止済みの場合無視 */ }
            this.sourceNode.disconnect();
        }
        this.sourceNode = source;
        this.sourceNode.connect(this.eq.getInputNode());
    }

    /** ボリューム設定 (0.0 ~ 1.0) */
    public setVolume(value: number): void {
        const now = this.context.currentTime;
        // 小さすぎる値は0とみなして完全に切る（setTargetAtTimeの0無限接近問題への対処）
        if (value < 0.001) {
            // クリックノイズ防止のため微短フェードアウト
            this.gainNode.gain.cancelScheduledValues(now);
            this.gainNode.gain.setTargetAtTime(0, now, 0.02);
            // 念のため少し後に完全0をセット
            this.gainNode.gain.setValueAtTime(0, now + 0.1);
        } else {
            this.gainNode.gain.setTargetAtTime(value, now, 0.02);
        }
    }

    /** HPFカットオフ設定 (Hz) */
    public setHPF(freq: number): void {
        this.hpf1.frequency.setTargetAtTime(freq, this.context.currentTime, 0.02);
        this.hpf2.frequency.setTargetAtTime(freq, this.context.currentTime, 0.02);
    }

    /** LPFカットオフ設定 (Hz) */
    public setLPF(freq: number): void {
        this.lpf1.frequency.setTargetAtTime(freq, this.context.currentTime, 0.02);
        this.lpf2.frequency.setTargetAtTime(freq, this.context.currentTime, 0.02);
    }

    /** EQバンド設定 */
    public setEQ(bands: EQBandConfig[]): void {
        this.eq.setBands(bands);
    }

    /** EQ個別バンドのゲイン設定 */
    public setEQGain(index: number, value: number): void {
        this.eq.setGain(index, value);
    }

    /** ランブル強度設定 (0.0 ~ 1.0) */
    public setRumbleIntensity(value: number): void {
        this.rumble.setIntensity(value);
    }

    /** ランブル・クロスオーバー周波数設定 (Hz) */
    public setRumbleCrossover(freq: number): void {
        this.rumble.setCrossover(freq);
    }

    /** 出力ノード（マスターへ接続用） */
    public getOutputNode(): AudioNode {
        return this.analyser;
    }

    /** アナライザ取得 */
    public getAnalyser(): AnalyserNode {
        return this.analyser;
    }

    /**
     * パンニング設定 (-1.0 ~ 1.0)
     * LFO等から呼び出して揺らぎを作る
     */
    public setPan(value: number): void {
        this.highPanner.pan.setTargetAtTime(value, this.context.currentTime, 0.05);
    }

    /**
     * 変調ゲイン設定 (0.0 ~ 1.0)
     * 1/fゆらぎで音量を微細に変動させる
     */
    public setModulationGain(value: number): void {
        this.modGainNode.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
    }

    /**
     * 部屋サイズ設定（ルームモード補正）
     */
    public setRoomSize(size: RoomSize): void {
        const config = ROOM_MODE_PRESETS[size];
        if (config) {
            this.eq.setRoomMode(config.frequencies, config.cutAmount, config.Q);
        }
    }

    /** ソースを停止 */
    public stopSource(): void {
        if (this.sourceNode) {
            try { this.sourceNode.stop(); } catch { /* noop */ }
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
    }
}
