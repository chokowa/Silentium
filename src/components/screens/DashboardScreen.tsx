import { useState } from 'react';
import type { SilentiumConfig, NoiseType, EQBandConfig } from '../../types/audio';
import DualSpectrum from '../visualization/DualSpectrum';
import PresetCarousel from '../preset/PresetCarousel';
import MixerTab from '../tabs/MixerTab';
import EQTab from '../tabs/EQTab';
import TimerTab from '../tabs/TimerTab';
import AcousticsTab from '../tabs/AcousticsTab';

interface DashboardScreenProps {
    // プリセット
    presets: SilentiumConfig[];
    activePresetIndex: number;
    onSelectPreset: (index: number) => void;

    // 再生制御
    isPlaying: boolean;
    onTogglePlay: () => void;
    masterVolume: number;
    onMasterVolumeChange: (value: number) => void;

    // 音響エンジン
    noiseAnalyser: AnalyserNode | null;
    micAnalyser: AnalyserNode | null;
    micActive: boolean;
    onMicToggle: () => void;

    // ノイズ設定 & ハンドラ
    config: SilentiumConfig;
    onNoiseVolumeChange: (type: NoiseType, vol: number) => void;
    onRumbleIntensityChange: (v: number) => void;
    onRumbleCrossoverChange: (v: number) => void;

    // EQ設定 & ハンドラ
    onEQChange: (bands: EQBandConfig[]) => void;
    onHPFChange: (v: number) => void;
    onLPFChange: (v: number) => void;

    // Neighbor Safe
    neighborSafe: boolean;
    onNeighborSafeChange: (enabled: boolean) => void;
    onNeighborSafeFreqChange: (freq: number) => void;

    // Acoustics
    onRoomSizeChange: (size: any) => void;
    onModulationChange: (val: number) => void;

    // オートマスキング & タイマー
    onAutoMask: () => void;
    onToggleLearning: () => void;
    isLearning: boolean;
}

/**
 * Silentium Unified Dashboard
 * Stitch "Obsidian & Platinum" Concept
 */
export default function DashboardScreen({
    presets,
    activePresetIndex,
    onSelectPreset,
    isPlaying,
    onTogglePlay,
    masterVolume,
    onMasterVolumeChange,
    noiseAnalyser,
    micAnalyser,
    micActive,
    onMicToggle,
    // Auto Masking
    onAutoMask,
    onToggleLearning,
    isLearning,
    // Config
    config,
    onNoiseVolumeChange,
    onRumbleIntensityChange,
    onRumbleCrossoverChange,
    onEQChange,
    onHPFChange,
    onLPFChange,
    neighborSafe,
    onNeighborSafeChange,
    onNeighborSafeFreqChange,
    // Acoustics
    onRoomSizeChange,
    onModulationChange,
}: DashboardScreenProps) {
    // Overlay State
    const [activeOverlay, setActiveOverlay] = useState<'mixer' | 'eq' | 'timer' | 'acoustics' | null>(null);

    // Formatter
    const formatVol = (v: number) => Math.round(v * 100);

    return (
        <div className="h-full flex flex-col relative overflow-hidden bg-[--color-bg-primary]">
            {/* 1. Hero Visualizer Section (Top 35%) */}
            <div className="flex-none h-[35vh] relative z-0">
                {/* Visualizer Full Bleed */}
                <div className="absolute inset-0 opacity-80">
                    <DualSpectrum
                        noiseAnalyser={noiseAnalyser}
                        micAnalyser={micAnalyser}
                        micActive={micActive}
                    />
                </div>

                {/* Overlay Gradient for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[--color-bg-primary]/50 to-[--color-bg-primary]" />

                {/* Header (Minimal) */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10">
                    <div>
                        <h1 className="text-2xl font-light tracking-[0.2em] text-[--color-text-primary] opacity-90">
                            SILENTIUM
                        </h1>
                        <p className="text-[10px] text-[--color-text-secondary] tracking-widest uppercase mt-1 opacity-70">
                            Acoustic Masking Engine
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* 1. Mic Toggle */}
                        <button
                            onClick={onMicToggle}
                            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all
                                ${micActive
                                    ? 'bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                    : 'bg-white/5 border-white/10 text-[--color-text-secondary] hover:bg-white/10'}`}
                            title="Mic Toggle"
                        >
                            <span className="text-xs">
                                {micActive ? '●' : '○'}
                            </span>
                        </button>

                        {/* 2. Auto Masking (Only when Mic is Active) */}
                        <div className={`flex items-center gap-2 transition-all duration-300 ${micActive ? 'opacity-100' : 'opacity-0 pointer-events-none translate-x-2'}`}>
                            {/* Instant Auto */}
                            <button
                                onClick={onAutoMask}
                                className="w-8 h-8 rounded-full flex items-center justify-center border border-[--color-accent-primary]/30 text-[--color-accent-primary] bg-[--color-accent-primary]/10 hover:bg-[--color-accent-primary]/20 transition-all active:scale-95"
                                title="Auto Adjust"
                            >
                                <span className="text-xs">✨</span>
                            </button>

                            {/* Learning Mode */}
                            <button
                                onClick={onToggleLearning}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-95
                                    ${isLearning
                                        ? 'bg-amber-500/20 border-amber-500 text-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                        : 'border-white/20 text-[--color-text-secondary] hover:bg-white/10'}`}
                                title="Adaptive Learning"
                            >
                                <span className="text-[10px]">{isLearning ? '🧠' : 'Lrn'}</span>
                            </button>
                        </div>

                        {/* Neighbor Safe Badge */}
                        <button
                            onClick={() => onNeighborSafeChange(!neighborSafe)}
                            className={`px-3 py-1 rounded-full border text-[10px] tracking-wide backdrop-blur-md transition-all active:scale-95 cursor-pointer ml-1
                            ${neighborSafe
                                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-900/10 hover:bg-emerald-900/20'
                                    : 'border-red-500/30 text-red-400 bg-red-900/10 hover:bg-red-900/20'}`}
                        >
                            {neighborSafe ? 'SAFE' : 'UNSAFE'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Main Controls (Middle) */}
            <div className="flex-1 relative z-10 flex flex-col px-6 -mt-10">

                {/* Active Preset Display */}
                <div className="flex flex-col items-center justify-center mb-8">
                    <div className="text-6xl mb-4 animate-float drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] grayscale-[0.2]">
                        {presets[activePresetIndex]?.icon}
                    </div>
                    <h2 className="text-2xl font-light text-center text-white tracking-wide">
                        {presets[activePresetIndex]?.name}
                    </h2>
                    <p className="text-xs text-[--color-text-muted] mt-2 uppercase tracking-widest text-center max-w-[200px]">
                        {presets[activePresetIndex]?.description}
                    </p>
                </div>

                {/* Quick Actions (Floating Glass Cards) */}
                <div className="grid grid-cols-3 gap-3 mb-auto">
                    <button
                        onClick={() => setActiveOverlay(activeOverlay === 'mixer' ? null : 'mixer')}
                        className={`glass-card py-4 rounded-xl flex flex-col items-center justify-center gap-1.5 group transition-all
                        ${activeOverlay === 'mixer' ? 'active' : ''}`}
                    >
                        <span className="text-lg opacity-70 group-hover:opacity-100">🎚️</span>
                        <span className="text-[9px] uppercase tracking-widest text-[--color-text-secondary]">Mixer</span>
                    </button>

                    <button
                        onClick={() => setActiveOverlay(activeOverlay === 'eq' ? null : 'eq')}
                        className={`glass-card py-4 rounded-xl flex flex-col items-center justify-center gap-1.5 group transition-all
                        ${activeOverlay === 'eq' ? 'active' : ''}`}
                    >
                        <span className="text-lg opacity-70 group-hover:opacity-100">波</span>
                        <span className="text-[9px] uppercase tracking-widest text-[--color-text-secondary]">EQ</span>
                    </button>

                    <button
                        onClick={() => setActiveOverlay(activeOverlay === 'acoustics' ? null : 'acoustics')}
                        className={`glass-card py-4 rounded-xl flex flex-col items-center justify-center gap-1.5 group transition-all
                        ${activeOverlay === 'acoustics' ? 'active' : ''}`}
                    >
                        <span className="text-lg opacity-70 group-hover:opacity-100">🏠</span>
                        <span className="text-[9px] uppercase tracking-widest text-[--color-text-secondary]">Spa</span>
                    </button>

                    <button
                        onClick={() => setActiveOverlay(activeOverlay === 'timer' ? null : 'timer')}
                        className={`glass-card py-4 rounded-xl flex flex-col items-center justify-center gap-1.5 group transition-all
                        ${activeOverlay === 'timer' ? 'active' : ''}`}
                    >
                        <span className="text-lg opacity-70 group-hover:opacity-100">⏱️</span>
                        <span className="text-[9px] uppercase tracking-widest text-[--color-text-secondary]">Timer</span>
                    </button>
                </div>
            </div>

            {/* 3. Fixed Playback Bar (Bottom) */}
            <div className="flex-none px-6 pb-8 pt-4 bg-[--color-bg-primary] border-t border-white/5 relative z-20">

                {/* Preset Carousel (Mini) */}
                <div className="mb-6 relative h-12">
                    <PresetCarousel
                        presets={presets}
                        activeIndex={activePresetIndex}
                        onSelect={onSelectPreset}
                    />
                </div>

                <div className="flex items-center gap-6">
                    {/* Play/Pause (Platinum Button) */}
                    <button
                        onClick={onTogglePlay}
                        className={`play-btn flex-none ${isPlaying ? 'playing' : ''}`}
                    >
                        {isPlaying ? (
                            <div className="w-3 h-3 bg-white/90 rounded-[1px]" />
                        ) : (
                            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white/90 border-b-[6px] border-b-transparent ml-1" />
                        )}
                    </button>

                    {/* Master Volume */}
                    <div className="flex-1 flex flex-col justify-center gap-2">
                        <div className="flex justify-between items-end text-[10px] text-[--color-text-muted] uppercase tracking-wider font-mono">
                            <span>Master Gain</span>
                            <span>{formatVol(masterVolume)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="100" step="1"
                            value={masterVolume * 100}
                            onChange={(e) => onMasterVolumeChange(Number(e.target.value) / 100)}
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            {/* ===== Overlays (Mixer / EQ / Timer) ===== */}
            {activeOverlay && (
                <>
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30"
                        onClick={() => setActiveOverlay(null)}
                    />

                    {/* Sliding Panel */}
                    <div className="absolute bottom-0 left-0 right-0 z-40 bg-[--color-bg-card] rounded-t-3xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-slide-up max-h-[70vh] flex flex-col">

                        {/* Drag Handle */}
                        <div className="w-full h-8 flex items-center justify-center shrink-0" onClick={() => setActiveOverlay(null)}>
                            <div className="w-12 h-1 bg-white/20 rounded-full" />
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto px-6 pb-8">
                            {activeOverlay === 'mixer' && (
                                <MixerTab
                                    config={config}
                                    onNoiseVolumeChange={onNoiseVolumeChange}
                                    onRumbleIntensityChange={onRumbleIntensityChange}
                                    onRumbleCrossoverChange={onRumbleCrossoverChange}
                                />
                            )}
                            {activeOverlay === 'eq' && (
                                <EQTab
                                    config={config}
                                    onEQChange={onEQChange}
                                    onHPFChange={onHPFChange}
                                    onLPFChange={onLPFChange}
                                    neighborSafe={neighborSafe}
                                    onNeighborSafeChange={onNeighborSafeChange}
                                    onNeighborSafeFreqChange={onNeighborSafeFreqChange}
                                    noiseAnalyser={noiseAnalyser}
                                    micAnalyser={micAnalyser}
                                    micActive={micActive}
                                />
                            )}
                            {activeOverlay === 'timer' && (
                                <TimerTab
                                    isPlaying={isPlaying}
                                    onTogglePlay={onTogglePlay}
                                />
                            )}
                            {activeOverlay === 'acoustics' && (
                                <AcousticsTab
                                    config={config}
                                    onRoomSizeChange={onRoomSizeChange}
                                    onModulationChange={onModulationChange}
                                />
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
