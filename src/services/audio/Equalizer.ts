import type { EQBandConfig } from '../../types/audio';
import { DEFAULT_EQ_BANDS } from '../../types/audio';

/**
 * 5バンド パラメトリック イコライザー
 * 各バンドで周波数・ゲイン・Q値を独立制御
 */
export class Equalizer {
    private context: AudioContext;
    private filters: BiquadFilterNode[] = [];
    private bandConfigs: EQBandConfig[];

    constructor(context: AudioContext, bands?: EQBandConfig[]) {
        this.context = context;
        this.bandConfigs = bands ? [...bands] : [...DEFAULT_EQ_BANDS];
        this.createFilters();
        this.createRoomFilters();
    }

    private createFilters(): void {
        this.filters = this.bandConfigs.map((band) => {
            const filter = this.context.createBiquadFilter();
            filter.type = band.type;
            filter.frequency.value = band.frequency;
            filter.Q.value = band.Q;
            filter.gain.value = band.gain;
            return filter;
        });

        // フィルタチェーンの直列接続
        for (let i = 0; i < this.filters.length - 1; i++) {
            this.filters[i].connect(this.filters[i + 1]);
        }
    }

    public getInputNode(): AudioNode {
        return this.filters[0];
    }



    /** 特定バンドのゲインを設定 (dB) */
    public setGain(index: number, value: number): void {
        if (index >= 0 && index < this.filters.length) {
            this.filters[index].gain.setTargetAtTime(value, this.context.currentTime, 0.02);
        }
    }

    /** 特定バンドの周波数を設定 (Hz) */
    public setFrequency(index: number, value: number): void {
        if (index >= 0 && index < this.filters.length) {
            this.filters[index].frequency.setTargetAtTime(value, this.context.currentTime, 0.02);
        }
    }

    /** 特定バンドのQ値を設定 */
    public setQ(index: number, value: number): void {
        if (index >= 0 && index < this.filters.length) {
            this.filters[index].Q.setTargetAtTime(value, this.context.currentTime, 0.02);
        }
    }

    /** 全バンド一括設定 */
    public setBands(bands: EQBandConfig[]): void {
        bands.forEach((band, i) => {
            if (i < this.filters.length) {
                this.setGain(i, band.gain);
                this.setFrequency(i, band.frequency);
                this.setQ(i, band.Q);
            }
        });
    }

    /** 現在のバンド設定を取得 */
    public getBandCount(): number {
        return this.filters.length;
    }

    // --- ルームモード補正 ---

    private roomFilters: BiquadFilterNode[] = [];

    /**
     * ルームモード補正フィルタの初期化
     * コンストラクタから呼び出すか、遅延初期化する
     * ここでは最大3つの補正用フィルタを予め確保しておく
     */
    private createRoomFilters(): void {
        // 既存チェーンの最後尾に追加するための準備
        // 現在の構成: Source -> [EQ Bands] -> Output
        // 新構成: Source -> [EQ Bands] -> [Room Filters] -> Output

        // 3つのピーキングフィルタを用意
        for (let i = 0; i < 3; i++) {
            const filter = this.context.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = 1000; // ダミー
            filter.gain.value = 0; // デフォルトはスルー
            filter.Q.value = 1;
            this.roomFilters.push(filter);
        }

        // Room Filters同士を接続
        for (let i = 0; i < this.roomFilters.length - 1; i++) {
            this.roomFilters[i].connect(this.roomFilters[i + 1]);
        }

        // メインEQチェーンの最後尾と接続
        const lastEQFilter = this.filters[this.filters.length - 1];
        lastEQFilter.disconnect(); // 一旦切断 (実装依存: getOutputNodeで参照されている先が変わるため注意)
        lastEQFilter.connect(this.roomFilters[0]);
    }

    /**
     * 出力ノードの上書き
     * createRoomFiltersを呼んだ後は、最後のRoomFilterが出力になる
     */
    public getOutputNode(): AudioNode {
        if (this.roomFilters.length > 0) {
            return this.roomFilters[this.roomFilters.length - 1];
        }
        return this.filters[this.filters.length - 1];
    }

    /** 
     * 部屋サイズに応じた補正を適用 
     * @param modeName RoomSize ('6tatami', '8tatami'...)
     */
    /** 
     * 部屋サイズに応じた補正を適用 
     * @param frequencies カットする周波数リスト
     * @param cutAmount カット量 (dB, 正の値)
     * @param Q Q値
     */
    public setRoomMode(frequencies: number[], cutAmount: number, Q: number): void {
        const now = this.context.currentTime;

        // 3つのフィルタに対して設定を適用
        for (let i = 0; i < this.roomFilters.length; i++) {
            const filter = this.roomFilters[i];

            if (i < frequencies.length && cutAmount > 0) {
                // 補正適用 (カットフィルタとして動作)
                filter.frequency.setTargetAtTime(frequencies[i], now, 0.02);
                filter.gain.setTargetAtTime(-cutAmount, now, 0.02);
                filter.Q.setTargetAtTime(Q, now, 0.02);
            } else {
                // 無効化 (スルー)
                filter.gain.setTargetAtTime(0, now, 0.02);
            }
        }
    }
}

