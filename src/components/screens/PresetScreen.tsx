import { useEffect, useRef, useState } from 'react';
import type { SilentiumConfig } from '../../types/audio';
import PresetCarousel from '../preset/PresetCarousel';
import SpectrumAnalyzer from '../visualization/SpectrumAnalyzer';

interface PresetScreenProps {
    presets: SilentiumConfig[];
    activePresetIndex: number;
    onSelectPreset: (index: number) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
    masterVolume: number;
    onMasterVolumeChange: (value: number) => void;
    neighborSafe: boolean;
    analyser: AnalyserNode | null;
    onOpenLab: () => void;
}

/**
 * 画面A: プリセット・セレクター（モバイルファースト）
 */
export default function PresetScreen({
    presets,
    activePresetIndex,
    onSelectPreset,
    isPlaying,
    onTogglePlay,
    masterVolume,
    onMasterVolumeChange,
    neighborSafe,
    analyser,
    onOpenLab,
}: PresetScreenProps) {
    const [timerMinutes, setTimerMinutes] = useState(0);
    const [timerRemaining, setTimerRemaining] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startTimer = (minutes: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (minutes === 0) {
            setTimerMinutes(0);
            setTimerRemaining(0);
            return;
        }
        setTimerMinutes(minutes);
        const endTime = Date.now() + minutes * 60 * 1000;
        setTimerRemaining(minutes * 60);

        timerRef.current = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            setTimerRemaining(remaining);
            if (remaining <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                setTimerMinutes(0);
                if (isPlaying) onTogglePlay();
            }
        }, 1000);
    };

    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const timerPresets = [0, 15, 30, 60, 90];

    return (
        <div className="h-full flex flex-col relative overflow-hidden">
            {/* 背景スペクトラム */}
            <div className="absolute inset-0 opacity-15 pointer-events-none">
                <SpectrumAnalyzer analyser={analyser} />
            </div>

            {/* ヘッダー */}
            <header className="relative z-10 flex items-center justify-between px-4 pt-4 pb-1">
                <div>
                    <h1 className="text-base font-bold tracking-tight text-[--color-text-primary]">
                        Silentium
                    </h1>
                    <p className="text-[9px] text-[--color-text-muted] tracking-wide">NOISE MASKING ENGINE</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Neighbor Safe バッジ */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium
            ${neighborSafe
                            ? 'bg-[rgba(52,211,153,0.1)] text-[--color-accent-safe]'
                            : 'bg-[rgba(248,113,113,0.1)] text-[--color-accent-danger]'
                        }`}>
                        <span className="text-xs">{neighborSafe ? '🛡️' : '⚠️'}</span>
                        <span>{neighborSafe ? 'Safe' : 'Unsafe'}</span>
                    </div>

                    {/* Editボタン */}
                    <button onClick={onOpenLab} className="btn-ghost text-[11px] py-1.5 px-2.5 flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636L5.636 18.364" />
                        </svg>
                        Edit
                    </button>
                </div>
            </header>

            {/* ===== メインコンテンツ ===== */}
            <div className="relative z-10 flex-1 flex flex-col min-h-0">

                {/* プリセットカルーセル */}
                <div className="pt-3 pb-2 animate-fade-in">
                    <PresetCarousel
                        presets={presets}
                        activeIndex={activePresetIndex}
                        onSelect={onSelectPreset}
                    />
                </div>

                {/* 中央: プレイボタン + プリセット名 */}
                <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-0">
                    {/* プリセットアイコン + 名前 */}
                    <div className="text-center space-y-2">
                        <div className="text-4xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-float">
                            {presets[activePresetIndex]?.icon}
                        </div>
                        <div>
                            <p className="text-lg font-bold text-[--color-text-primary] tracking-wide filter drop-shadow-[0_0_10px_rgba(0,243,255,0.3)]">
                                {presets[activePresetIndex]?.name}
                            </p>
                            <p className="text-[10px] text-[--color-text-secondary] mt-1 max-w-[240px] mx-auto uppercase tracking-wider font-medium">
                                {presets[activePresetIndex]?.description}
                            </p>
                        </div>
                    </div>

                    {/* プレイボタン (Centerpiece) */}
                    <div className="relative group">
                        {/* 背景のグローエフェクト */}
                        <div className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-500
                            ${isPlaying ? 'bg-[--color-accent-danger] opacity-40' : 'bg-[--color-accent-primary] opacity-20 group-hover:opacity-40'}`}
                        />

                        <button
                            onClick={onTogglePlay}
                            className={`play-btn relative z-10 w-20 h-20 ${isPlaying ? 'playing animate-pulse-ring' : ''}`}
                        >
                            {isPlaying ? (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white" className="drop-shadow-md">
                                    <rect x="6" y="4" width="4" height="16" rx="1" />
                                    <rect x="14" y="4" width="4" height="16" rx="1" />
                                </svg>
                            ) : (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white" className="ml-1 drop-shadow-md">
                                    <polygon points="8,5 19,12 8,19" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* 下部: マスターボリューム + タイマー */}
                <div className="px-5 pb-6 pt-2 space-y-3">
                    {/* マスターボリューム */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-[--color-text-muted] uppercase tracking-wider">Master Volume</span>
                            <span className="text-[10px] text-[--color-text-muted] font-mono tabular-nums">
                                {Math.round(masterVolume * 100)}%
                            </span>
                        </div>
                        <input
                            type="range" min="0" max="100" step="1"
                            value={masterVolume * 100}
                            onChange={(e) => onMasterVolumeChange(Number(e.target.value) / 100)}
                            className="w-full"
                        />
                    </div>

                    {/* タイマー */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-[--color-text-muted] uppercase tracking-wider">Sleep Timer</span>
                            {timerRemaining > 0 && (
                                <span className="text-[10px] text-[--color-accent-primary] font-mono tabular-nums">
                                    {formatTime(timerRemaining)}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            {timerPresets.map((m) => (
                                <button
                                    key={m}
                                    onClick={() => startTimer(m)}
                                    className={`flex-1 py-2 rounded-xl text-[11px] font-medium transition-all cursor-pointer
                    ${timerMinutes === m && m > 0
                                            ? 'bg-[--color-accent-primary] text-white'
                                            : 'bg-[rgba(124,111,245,0.08)] text-[--color-text-muted] hover:bg-[rgba(124,111,245,0.15)]'
                                        }`}
                                >
                                    {m === 0 ? 'OFF' : `${m}m`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
