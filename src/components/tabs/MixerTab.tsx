import type { NoiseType, SilentiumConfig } from '../../types/audio';
import { Sliders, Activity } from 'lucide-react';

const NOISE_TYPES: NoiseType[] = ['white', 'pink', 'brown', 'blue', 'violet'];

// ノイズタイプ別メタ
const NOISE_META: Record<NoiseType, { label: string; color: string; desc: string }> = {
    white: { label: 'White', color: '#94a3b8', desc: 'Flat Spectrum' }, // Slate-400 (Visible in Light/Dark)
    pink: { label: 'Pink', color: '#f472b6', desc: 'Balanced' }, // Pink-400
    brown: { label: 'Brown', color: '#a0845e', desc: 'Deep & Warm' }, // Brownish
    blue: { label: 'Blue', color: '#60a5fa', desc: 'Crisp Highs' }, // Blue-400
    violet: { label: 'Violet', color: '#a78bfa', desc: 'Sharp Air' }, // Violet-400
};

interface MixerTabProps {
    config: SilentiumConfig;
    onNoiseVolumeChange: (type: NoiseType, value: number) => void;
    onRumbleIntensityChange: (value: number) => void;

    onRumbleCrossoverChange: (freq: number) => void;
    onModulationChange: (val: number) => void;
}

/**
 * MixerTab: ノイズ5色ミキサー + Rumble
 * Stitch Design: High-Fidelity Sliders & Cards
 * Theme-aware implementation
 */
export default function MixerTab({
    config,
    onNoiseVolumeChange,
    onRumbleIntensityChange,
    onRumbleCrossoverChange,
    onModulationChange,
}: MixerTabProps) {
    return (
        <div className="py-6 space-y-8">
            {/* Header */}
            <header className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-[--color-bg-surface] text-[--color-accent-primary]">
                    <Sliders size={18} />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-[--color-text-primary] tracking-tight">Noise Mixer</h2>
                    <p className="text-[10px] text-[--color-text-muted]">5色のノイズをブレンド</p>
                </div>
            </header>

            {/* 各ノイズチャンネル */}
            <div className="space-y-3">
                {NOISE_TYPES.map((type) => {
                    const meta = NOISE_META[type];
                    const vol = config.noiseVolumes[type];
                    const percent = Math.round(vol * 100);

                    return (
                        <div key={type} className="group glass-card rounded-2xl p-4 transition-all duration-300 hover:bg-[--color-bg-elevated] border border-[--color-border] hover:border-[--color-accent-primary]/30">
                            <div className="flex flex-col gap-3">
                                {/* Label & Value Row */}
                                <div className="flex items-end justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full shadow-sm"
                                            style={{
                                                background: meta.color,
                                                boxShadow: `0 0 8px ${meta.color}40`
                                            }}
                                        />
                                        <div>
                                            <span className="block text-sm font-semibold tracking-wide text-[--color-text-primary]">
                                                {meta.label}
                                            </span>
                                            <span className="text-[10px] text-[--color-text-muted] font-medium opacity-70">
                                                {meta.desc}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-[--color-text-primary] tabular-nums bg-[--color-bg-surface] px-2 py-0.5 rounded">
                                        {percent}%
                                    </span>
                                </div>

                                {/* Custom Slider Channel */}
                                <div className="relative h-6 flex items-center w-full">
                                    {/* Track Background */}
                                    <div className="absolute inset-x-0 h-1.5 bg-[--color-bg-surface] rounded-full overflow-hidden">
                                        {/* Active Track Fill */}
                                        <div
                                            className="h-full rounded-full transition-all duration-100 ease-out"
                                            style={{
                                                width: `${percent}%`,
                                                background: meta.color,
                                                opacity: 0.9
                                            }}
                                        />
                                    </div>

                                    {/* Invisible Range Input (Interactive Layer) */}
                                    <input
                                        type="range" min="0" max="100" step="1"
                                        value={percent}
                                        onChange={(e) => onNoiseVolumeChange(type, Number(e.target.value) / 100)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />

                                    {/* Custom Thumb (Visual Only) */}
                                    <div
                                        className="absolute h-5 w-5 bg-[--color-bg-card] border-2 rounded-full shadow-sm pointer-events-none transition-transform duration-100 group-hover:scale-110"
                                        style={{
                                            left: `${percent}%`,
                                            marginLeft: '-10px', // Center thumb
                                            borderColor: meta.color
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Rumble Generator Section */}
            <div className="pt-2">
                <div className="glass-card rounded-2xl p-4 border border-[--color-border] relative overflow-hidden bg-[--color-bg-card]">
                    {/* Background decoration */}
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-[--color-accent-secondary] opacity-[0.05] rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded bg-[--color-bg-surface] text-[--color-text-secondary]">
                            <Activity size={14} />
                        </div>
                        <h3 className="text-xs font-bold text-[--color-text-secondary] uppercase tracking-wider">
                            Low Frequency Rumble
                        </h3>
                    </div>

                    <div className="space-y-5">
                        {/* Intensity Slider */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-[13px] font-medium text-[--color-text-muted]">Intensity</span>
                                <span className="text-xs font-mono font-bold text-[--color-text-primary] bg-[--color-bg-surface] px-1.5 py-0.5 rounded">
                                    {Math.round(config.rumbleIntensity * 100)}%
                                </span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="1"
                                value={config.rumbleIntensity * 100}
                                onChange={(e) => onRumbleIntensityChange(Number(e.target.value) / 100)}
                                className="w-full h-1.5 bg-[--color-bg-surface] rounded-lg appearance-none cursor-pointer accent-[--color-accent-secondary]"
                            />
                        </div>

                        {/* Crossover Freq Slider */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-[13px] font-medium text-[--color-text-muted]">Crossover (Low Pass)</span>
                                <span className="text-xs font-mono font-bold text-[--color-text-primary] bg-[--color-bg-surface] px-1.5 py-0.5 rounded">
                                    {config.rumbleCrossover} Hz
                                </span>
                            </div>
                            <input
                                type="range" min="40" max="150" step="5"
                                value={config.rumbleCrossover}
                                onChange={(e) => onRumbleCrossoverChange(Number(e.target.value))}
                                className="w-full h-1.5 bg-[--color-bg-surface] rounded-lg appearance-none cursor-pointer accent-[--color-accent-secondary]"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Organic Flow (Modulation) Generator Section */}
            <div className="pt-2">
                <div className="glass-card rounded-2xl p-4 border border-[--color-border] relative overflow-hidden bg-[--color-bg-card]">
                    {/* Background decoration */}
                    <div className="absolute -left-4 -top-4 w-24 h-24 bg-[--color-accent-primary] opacity-[0.05] rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded bg-[--color-bg-surface] text-[--color-text-secondary]">
                            <Activity size={14} />
                        </div>
                        <h3 className="text-xs font-bold text-[--color-text-secondary] uppercase tracking-wider">
                            Organic Flow (1/f Fluctuation)
                        </h3>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-[13px] font-medium text-[--color-text-muted]">Modulation Depth</span>
                            <span className="text-xs font-mono font-bold text-[--color-text-primary] bg-[--color-bg-surface] px-1.5 py-0.5 rounded">
                                {Math.round(config.modulation * 100)}%
                            </span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.01"
                            value={config.modulation}
                            onChange={(e) => onModulationChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-[--color-bg-surface] rounded-lg appearance-none cursor-pointer accent-[--color-accent-primary]"
                        />
                        <div className="flex justify-between text-[8px] text-[--color-text-muted] mt-1 px-1">
                            <span>Static</span>
                            <span>Natural Flow</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
