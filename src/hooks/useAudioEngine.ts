import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioContextManager } from '../services/audio/AudioContextManager';
import { NoiseGenerator } from '../services/audio/NoiseGenerator';
import { AudioChannel } from '../services/audio/AudioChannel';
import { NeighborSafeFilter } from '../services/audio/NeighborSafeFilter';
import { BackgroundAudioService } from '../services/audio/BackgroundAudioService';
import type { BackgroundAudioStatus } from '../services/audio/BackgroundAudioService';
import type { NoiseType, SilentiumConfig, EQBandConfig, RoomSize } from '../types/audio';

const NOISE_TYPES: NoiseType[] = ['white', 'pink', 'brown', 'blue', 'violet'];

export interface AudioEngineState {
    isPlaying: boolean;
    isInitialized: boolean;
}

export function useAudioEngine() {
    const [state, setState] = useState<AudioEngineState>({
        isPlaying: false,
        isInitialized: false,
    });

    // Refs（再レンダリング不要なもの）
    const channels = useRef<Map<NoiseType, AudioChannel>>(new Map());
    const noiseMaster = useRef<GainNode | null>(null);
    const globalMaster = useRef<GainNode | null>(null);
    const safeFilter = useRef<NeighborSafeFilter | null>(null);
    const masterAnalyser = useRef<AnalyserNode | null>(null);
    const generator = useRef<NoiseGenerator | null>(null);
    const streamDestination = useRef<MediaStreamAudioDestinationNode | null>(null);

    // 現在のマスターボリュームを保持（停止/再生時の復元用）
    const lastMasterVolume = useRef<number>(0.5);

    // Organic Flow（揺らぎ）用
    const modulationDepth = useRef<number>(0);
    const animationFrameId = useRef<number | null>(null);
    const intervalId = useRef<ReturnType<typeof setInterval> | null>(null); // バックグラウンド用setInterval

    const panCurrents = useRef<Map<NoiseType, number>>(new Map()); // 各chの現在パン値
    const isPlayingRef = useRef(false); // アニメーションループ内参照用
    const togglePlayRef = useRef<(() => void) | null>(null); // Media Sessionコールバック用（Stale Closure防止）

    // バックグラウンド再生サービス
    const bgService = useRef<BackgroundAudioService>(new BackgroundAudioService());
    const currentModeName = useRef<string>('Default'); // Media Sessionメタデータ用
    const [bgStatus, setBgStatus] = useState<BackgroundAudioStatus>({
        streamPlaying: false,
        mediaSessionSupported: 'mediaSession' in navigator,
        mediaSessionActive: false,
        lastError: null,
    });

    // ステータスコールバック登録
    useEffect(() => {
        bgService.current.onStatusChange(setBgStatus);
    }, []);


    /**
     * エンジン初期化
     * AudioContext + 全チャンネル + マスターチェーン構築
     */
    const initialize = useCallback(() => {
        if (state.isInitialized) return;

        const mgr = AudioContextManager.getInstance();
        const ctx = mgr.getContext();

        // ノイズジェネレーター
        generator.current = new NoiseGenerator(ctx);

        // マスターチェーン構築
        noiseMaster.current = ctx.createGain();
        noiseMaster.current.gain.value = 1.0;

        safeFilter.current = new NeighborSafeFilter(ctx, 40);

        globalMaster.current = ctx.createGain();
        // 初期値は保持している設定値を使う
        globalMaster.current.gain.value = lastMasterVolume.current;

        masterAnalyser.current = ctx.createAnalyser();
        masterAnalyser.current.fftSize = 2048;

        // NoiseMaster → SafeFilter → GlobalMaster → Analyser → Destination
        noiseMaster.current.connect(safeFilter.current.getInputNode());
        safeFilter.current.getOutputNode().connect(globalMaster.current);
        globalMaster.current.connect(masterAnalyser.current);

        // MediaStreamDestinationを作成し、<audio>タグへ送出するための実ストリームを取り出す
        streamDestination.current = ctx.createMediaStreamDestination();
        masterAnalyser.current.connect(streamDestination.current);

        // 各ノイズタイプのチャンネル作成
        NOISE_TYPES.forEach((type) => {
            const channel = new AudioChannel(ctx);
            channel.getOutputNode().connect(noiseMaster.current!);
            channels.current.set(type, channel);
        });

        setState({ isPlaying: false, isInitialized: true });
    }, [state.isInitialized]);

    /**
     * 設定を全チャンネルに同期適用
     */
    const applyConfig = useCallback((config: SilentiumConfig) => {
        if (!state.isInitialized) return;

        // マスターボリューム更新 & 保持
        lastMasterVolume.current = config.masterVolume;

        if (globalMaster.current) {
            globalMaster.current.gain.setTargetAtTime(
                config.masterVolume,
                AudioContextManager.getInstance().getContext().currentTime,
                0.02
            );
        }

        // Neighbor Safe
        if (safeFilter.current) {
            safeFilter.current.setEnabled(config.neighborSafe);
            safeFilter.current.setCutoff(config.neighborSafeFreq);
        }

        // 各チャンネルに設定適用
        NOISE_TYPES.forEach((type) => {
            const ch = channels.current.get(type);
            if (!ch) return;

            ch.setVolume(config.noiseVolumes[type]);
            ch.setEQ(config.eqBands);
            ch.setHPF(config.hpf);
            ch.setLPF(config.lpf);
            ch.setRumbleIntensity(config.rumbleIntensity);
            ch.setRumbleCrossover(config.rumbleCrossover);
            ch.setRoomSize(config.roomSize);
        });

        // Modulation (揺らぎ) 強度更新
        modulationDepth.current = config.modulation; // refで保持
    }, [state.isInitialized]);

    /**
     * Organic Flow Animation Loop
     */
    // 間欠カオス法による1/fゆらぎ生成用
    // 各チャンネルに独立した状態変数を持たせる
    const chaosStates = useRef<Map<NoiseType, { x: number }>>(new Map());

    /**
     * Organic Flow Animation Loop
     * 間欠カオス法（Intermittent Chaos）を用いた1/fゆらぎ生成
     */
    const updateOrganicFlow = useCallback(() => {
        if (!isPlayingRef.current || !state.isInitialized) return;

        const depth = modulationDepth.current;

        NOISE_TYPES.forEach(type => {
            const ch = channels.current.get(type);
            if (!ch) return;

            // 状態初期化
            if (!chaosStates.current.has(type)) {
                // 初期値はチャンネルごとに散らす (0.1 ~ 0.9)
                chaosStates.current.set(type, { x: Math.random() * 0.8 + 0.1 });
                panCurrents.current.set(type, 0);
            }

            const state = chaosStates.current.get(type)!;

            // --- 間欠カオス写像 (Intermittent Chaos Map) ---
            // x[n+1] = { x[n] + u * x[n]^k        (0 <= x < c)
            //          { (x[n] - c) / (1 - c)     (c <= x < 1)
            // 簡略化モデルとして、Pomeau-Manneville写像に近い挙動を使う
            // 0付近に滞在する時間が長くなる（ラミナー状態）→ バースト的に変化する

            // 更新頻度を落とす（毎フレームだと速すぎるため、少しだけ動かす）
            // ここではスムージングによって擬似的に1/f特性を取り出すアプローチ

            // 修正ベルヌーイシフト + 非線形項
            // x = x + 0.5; if (x >= 1.0) x -= 1.0; (単なるシフト) に対し、
            // 0付近での変化を遅くすることで1/f成分を作る

            // シンプルな実装:
            // x < 0.5 のとき: x = x + 2 * x^2
            // x >= 0.5 のとき: x = x - 2 * (1 - x)^2
            // これにランダムな摂動を少し加えてカオス軌道を維持する

            let x = state.x;
            if (Math.random() < 0.1) { // 10%の確率でカオス更新（ゆっくりした変動を作るため）
                if (x < 0.5) {
                    x = x + 0.05 + 1.5 * x * x;
                } else {
                    x = x - 0.05 - 1.5 * (1 - x) * (1 - x);
                }

                // 境界処理 (0..1に押し戻す)
                if (x < 0.001) x = x + 0.9;
                if (x > 0.999) x = x - 0.9;

                state.x = x;
            }

            // --- ターゲット値の算出 ---
            // x (0.0~1.0) を -1.0~1.0 にマップ
            const chaoticVal = (state.x * 2) - 1;

            // 1. Pan (左右)
            // chaoticVal をそのままターゲットにすると激しすぎるので、depthを掛ける
            const targetPan = chaoticVal * depth;

            let currentPan = panCurrents.current.get(type) || 0;
            // Lerpで追従 (係数0.01でゆっくり)
            currentPan += (targetPan - currentPan) * 0.01;
            panCurrents.current.set(type, currentPan);
            ch.setPan(currentPan);

            // 2. Volume (音量)
            // 音量はあまり激しく変えると不快なので、Panとは位相をずらして微細に
            // xの逆相(1-x)を使って、Panが右に行くとき音量が下がる等の相関を避ける（あるいは逆相関させる）
            // ここでは x そのものを使いつつ、範囲を狭める
            // 基準ゲイン 1.0 に対し、0.85 ~ 1.15 程度 (depth依存)
            // depth=0 のときは 1.0 (変化なし)

            // 1/fゆらぎは「心地よい」範囲に収める
            // (1.0 - depth * 0.15) ~ (1.0 + depth * 0.05) 
            // マイナス側（減衰）を少し大きめにすると「風が凪ぐ」感じが出る

            const volFluctuation = (state.x - 0.6) * 0.3 * depth; // -0.18 ~ +0.12 (depth=1時)
            const targetVol = 1.0 + volFluctuation;

            // 音量はPanよりさらにゆっくり追従させる (呼吸のように)
            // ModGainNodeに直接セット (現在の値を取得できないので、targetVolをそのままセットし、AudioParamの時定数でスムージング)
            // AudioChannel側で setTargetAtTime(val, t, 0.05) しているので、ここで頻繁に呼んでも大丈夫だが
            // 負荷軽減のため、差分がある程度あるときだけ呼ぶなどの工夫も可。
            // ここでは毎フレーム呼ぶが、setTargetAtTimeが滑らかにしてくれる。

            ch.setModulationGain(targetVol);
        });

        // 可視状態に応じて次のスケジューリング方法を選択
        if (document.visibilityState === 'visible') {
            // フォアグラウンド: requestAnimationFrame（滑らかだが、バックグラウンドで停止する）
            animationFrameId.current = requestAnimationFrame(updateOrganicFlow);
        }
        // バックグラウンドの場合は setInterval 側がループを駆動するので、ここでは何もしない
    }, [state.isInitialized]);

    /**
     * 再生開始/停止のトグル
     */
    /**
     * Organic Flowのバックグラウンド用setIntervalを開始
     * visibilitychangeイベントで切り替える
     */
    const startBackgroundInterval = useCallback(() => {
        if (intervalId.current) return;
        // ~60fps相当の16ms → バックグラウンドでは負荷軽減のため50msに
        intervalId.current = setInterval(() => {
            if (isPlayingRef.current) {
                updateOrganicFlow();
            }
        }, 50);
    }, [updateOrganicFlow]);

    const stopBackgroundInterval = useCallback(() => {
        if (intervalId.current) {
            clearInterval(intervalId.current);
            intervalId.current = null;
        }
    }, []);

    /**
     * visibilitychange切り替え: フォアグラウンド⇔バックグラウンドでループ方式を変更
     */
    useEffect(() => {
        const handleVisibility = () => {
            if (!isPlayingRef.current) return;

            if (document.visibilityState === 'hidden') {
                // バックグラウンドへ: rAF停止 → setInterval開始
                if (animationFrameId.current) {
                    cancelAnimationFrame(animationFrameId.current);
                    animationFrameId.current = null;
                }
                startBackgroundInterval();
            } else {
                // フォアグラウンドへ: setInterval停止 → rAF再開
                stopBackgroundInterval();
                if (!animationFrameId.current) {
                    animationFrameId.current = requestAnimationFrame(updateOrganicFlow);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [startBackgroundInterval, stopBackgroundInterval, updateOrganicFlow]);

    /**
     * コンポーネントアンマウント時にバックグラウンドサービスをクリーンアップ
     */
    useEffect(() => {
        return () => {
            bgService.current.dispose();
        };
    }, []);

    const togglePlay = useCallback(async () => {
        if (!state.isInitialized) {
            initialize();
        }

        const mgr = AudioContextManager.getInstance();
        const ctx = mgr.getContext();
        await mgr.resume();

        if (state.isPlaying) {
            // 停止: フェードアウト → ソース停止 → ゲインリセット
            if (globalMaster.current) {
                const now = ctx.currentTime;
                // クリックノイズ防止のためフェードアウト
                globalMaster.current.gain.setTargetAtTime(0.0001, now, 0.05);

                // 即座にRefを更新してループを止める
                isPlayingRef.current = false;

                // バックグラウンドサービス停止
                bgService.current.stop();
                stopBackgroundInterval();

                setTimeout(() => {
                    NOISE_TYPES.forEach((type) => {
                        channels.current.get(type)?.stopSource();
                    });

                    // 次回再生のためにゲイン設定値を復元しておく
                    if (globalMaster.current) {
                        globalMaster.current.gain.cancelScheduledValues(ctx.currentTime);
                        globalMaster.current.gain.setValueAtTime(lastMasterVolume.current, ctx.currentTime);
                    }
                    // ループ停止
                    if (animationFrameId.current) {
                        cancelAnimationFrame(animationFrameId.current);
                        animationFrameId.current = null;
                    }

                    setState(prev => ({ ...prev, isPlaying: false }));
                }, 200);
            }
        } else {
            // 再生: 各チャンネルにソースを設定して開始
            if (!generator.current) return;

            // 念のためマスターボリュームを確実に設定（フェードアウト状態からの復帰）
            if (globalMaster.current) {
                globalMaster.current.gain.cancelScheduledValues(ctx.currentTime);
                globalMaster.current.gain.setValueAtTime(lastMasterVolume.current, ctx.currentTime);
            }

            NOISE_TYPES.forEach((type) => {
                const ch = channels.current.get(type);
                if (!ch || !generator.current) return;

                const source = generator.current.createSource(type);
                ch.setSource(source);
                source.start();
            });

            setState(prev => ({ ...prev, isPlaying: true }));

            isPlayingRef.current = true;

            // バックグラウンド再生サービス開始
            // ref経由で常に最新のtogglePlayを呼ぶ（Stale Closure防止）
            // MediaStreamDestination のストリームを渡すことで、実音声を<audio>タグで出力させる
            bgService.current.start(
                () => togglePlayRef.current?.(),
                () => {
                    try {
                        return AudioContextManager.getInstance().getContext();
                    } catch {
                        return null;
                    }
                },
                currentModeName.current,
                streamDestination.current?.stream
            );

            // ループ開始
            if (!animationFrameId.current) {
                animationFrameId.current = requestAnimationFrame(updateOrganicFlow);
            }
        }
    }, [state.isPlaying, state.isInitialized, initialize, updateOrganicFlow, startBackgroundInterval, stopBackgroundInterval]);

    // togglePlayが再生成されるたびにrefを更新
    useEffect(() => {
        togglePlayRef.current = togglePlay;
    }, [togglePlay]);

    /**
     * 個別チャンネルのボリューム変更
     */
    const setNoiseVolume = useCallback((type: NoiseType, volume: number) => {
        channels.current.get(type)?.setVolume(volume);
    }, []);

    /**
     * マスターボリューム変更
     */
    const setMasterVolume = useCallback((volume: number) => {
        lastMasterVolume.current = volume;
        if (globalMaster.current) {
            const ctx = AudioContextManager.getInstance().getContext();
            const now = ctx.currentTime;

            // 小さすぎる値は0とみなして完全に切る
            if (volume < 0.001) {
                globalMaster.current.gain.cancelScheduledValues(now);
                globalMaster.current.gain.setTargetAtTime(0, now, 0.02);
                globalMaster.current.gain.setValueAtTime(0, now + 0.1);
            } else {
                globalMaster.current.gain.setTargetAtTime(volume, now, 0.02);
            }
        }
    }, []);

    /**
     * EQ変更（全チャンネルに適用）
     */
    const setEQ = useCallback((bands: EQBandConfig[]) => {
        NOISE_TYPES.forEach((type) => {
            channels.current.get(type)?.setEQ(bands);
        });
    }, []);

    /**
     * EQ個別バンドのゲイン変更（全チャンネルに適用）
     */
    const setEQBandGain = useCallback((index: number, value: number) => {
        NOISE_TYPES.forEach((type) => {
            channels.current.get(type)?.setEQGain(index, value);
        });
    }, []);

    /**
     * HPF変更（全チャンネルに適用）
     */
    const setHPF = useCallback((freq: number) => {
        NOISE_TYPES.forEach((type) => {
            channels.current.get(type)?.setHPF(freq);
        });
    }, []);

    /**
     * LPF変更（全チャンネルに適用）
     */
    const setLPF = useCallback((freq: number) => {
        NOISE_TYPES.forEach((type) => {
            channels.current.get(type)?.setLPF(freq);
        });
    }, []);

    /**
     * ランブル強度変更（全チャンネルに適用）
     */
    const setRumbleIntensity = useCallback((value: number) => {
        NOISE_TYPES.forEach((type) => {
            channels.current.get(type)?.setRumbleIntensity(value);
        });
    }, []);

    /**
     * ランブル・クロスオーバー変更（全チャンネルに適用）
     */
    const setRumbleCrossover = useCallback((freq: number) => {
        NOISE_TYPES.forEach((type) => {
            channels.current.get(type)?.setRumbleCrossover(freq);
        });
    }, []);

    /**
     * Neighbor Safe Mode 切替
     */
    const setNeighborSafe = useCallback((enabled: boolean) => {
        safeFilter.current?.setEnabled(enabled);
    }, []);

    /**
     * Neighbor Safe カットオフ変更
     */
    const setNeighborSafeFreq = useCallback((freq: number) => {
        safeFilter.current?.setCutoff(freq);
    }, []);

    /**
     * 部屋サイズ補正変更
     */
    const setRoomSize = useCallback((size: RoomSize) => {
        NOISE_TYPES.forEach((type) => {
            channels.current.get(type)?.setRoomSize(size);
        });
    }, []);

    /**
     * Modulation深度変更
     */
    const setModulation = useCallback((value: number) => {
        modulationDepth.current = value;
    }, []);

    /**
     * モード名更新（Media Sessionメタデータ用）
     */
    const updateModeName = useCallback((name: string) => {
        currentModeName.current = name;
        if (isPlayingRef.current) {
            bgService.current.updateMetadata(name);
        }
    }, []);

    /**
     * マスターアナライザー取得（スペクトラム表示用）
     */
    const getMasterAnalyser = useCallback((): AnalyserNode | null => {
        return masterAnalyser.current;
    }, []);

    return {
        ...state,
        initialize,
        togglePlay,
        applyConfig,
        setNoiseVolume,
        setMasterVolume,
        setEQ,
        setEQBandGain,
        setHPF,
        setLPF,
        setRumbleIntensity,
        setRumbleCrossover,
        setNeighborSafe,
        setNeighborSafeFreq,
        setRoomSize,
        setModulation,
        getMasterAnalyser,
        updateModeName,
        bgStatus,
    };
}

