import type { SilentiumConfig, EQBandConfig, RoomSize } from '../../types/audio';
import InteractiveEQ from '../visualization/InteractiveEQ'; // Update path if incorrect, seems correct based on previous view_file
import { AudioWaveform, Shield, Sliders, Box } from 'lucide-react';

function formatFreq(hz: number): string {
    if (hz >= 1000) return `${(hz / 1000).toFixed(1).replace('.0', '')}k`;
    return `${Math.round(hz)}`;
}

interface EQTabProps {
    config: SilentiumConfig;
    onEQChange: (bands: EQBandConfig[]) => void;
    onHPFChange: (freq: number) => void;
    onLPFChange: (freq: number) => void;
    onNeighborSafeFreqChange: (freq: number) => void;
    onNeighborSafeChange: (enabled: boolean) => void;
    neighborSafe: boolean;
    // スペクトラム用
    noiseAnalyser: AnalyserNode | null;
    micAnalyser: AnalyserNode | null;
    micActive: boolean;
    onRoomSizeChange: (size: RoomSize) => void;
}

const ROOM_SIZES: { value: RoomSize; label: string; desc: string }[] = [
    { value: 'off', label: 'OFF', desc: 'No Correction' },
    { value: '6tatami', label: '6畳', desc: '~10㎡' },
    { value: '8tatami', label: '8畳', desc: '~13㎡' },
    { value: '12tatami', label: '12畳', desc: '~20㎡' },
    { value: '20tatami', label: '20畳', desc: '~33㎡' },
];

/**
 * EQTab: Interactive EQ + Filters
 * Stitch Design: Visual Spectrum & Precision Filters
 */
export default function EQTab({
    config,
    onEQChange,
    onHPFChange,
    onLPFChange,
    onNeighborSafeFreqChange,
    onNeighborSafeChange,
    neighborSafe,
    noiseAnalyser,
    micAnalyser,
    micActive,
    onRoomSizeChange,
}: EQTabProps) {

    return (
        <div className="py-6 space-y-6">
            <header className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-[--color-bg-surface] text-[--color-accent-primary]">
                        <AudioWaveform size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-[--color-text-primary] tracking-tight">Equalizer</h2>
                        <p className="text-[10px] text-[--color-text-muted]">周波数特性の調整</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onNeighborSafeChange(!neighborSafe)}
                        className={`text-[9px] font-bold tracking-wide px-3 py-1 rounded-full border transition-all
                            ${neighborSafe
                                ? 'bg-[--color-accent-safe]/20 border-[--color-accent-safe]/50 text-[--color-accent-safe]'
                                : 'bg-[--color-bg-surface] border-[--color-border] text-[--color-text-muted] hover:text-[--color-text-secondary]'}`}
                    >
                        {neighborSafe ? 'SAFE ON' : 'SAFE OFF'}
                    </button>
                    {micActive && (
                        <div className="flex items-center gap-1.5 bg-[--color-accent-danger]/10 text-[--color-accent-danger] px-2 py-1 rounded-full border border-[--color-accent-danger]/20 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-[--color-accent-danger]" />
                            <span className="text-[9px] font-bold tracking-wide">MIC ACTIVE</span>
                        </div>
                    )}
                </div>
            </header>

            {/* インタラクティブEQ (スペクトラム + スライダー) */}
            <div className="space-y-2">
                <InteractiveEQ
                    noiseAnalyser={noiseAnalyser}
                    micAnalyser={micAnalyser}
                    micActive={micActive}
                    eqBands={config.eqBands}
                    onEQChange={onEQChange}
                />
                <p className="text-[10px] text-[--color-text-muted] text-center opacity-60">
                    ポイントをドラッグしてゲインを調整してください
                </p>
            </div>

            {/* Filters Section */}
            <div className="glass-card rounded-2xl p-4 border border-[--color-border] space-y-6 relative overflow-hidden bg-[--color-bg-card]">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Sliders size={48} className="text-[--color-text-muted]" />
                </div>

                <h3 className="text-xs font-bold text-[--color-text-secondary] uppercase tracking-wider flex items-center gap-2">
                    <Sliders size={12} />
                    Bandpass Filters
                </h3>

                {/* HPF */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[13px] font-medium text-[--color-text-secondary]">Low Cut (High Pass)</span>
                        <span className="text-sm font-mono font-bold text-[--color-text-primary] bg-[--color-bg-surface] px-2 py-0.5 rounded shadow-sm">
                            {formatFreq(config.hpf)} Hz
                        </span>
                    </div>
                    <input
                        type="range" min="20" max="500" step="10"
                        value={config.hpf}
                        onChange={(e) => onHPFChange(Number(e.target.value))}
                        className="w-full accent-[--color-text-secondary] h-1.5 bg-[--color-bg-surface] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-[--color-text-muted] px-1 font-mono opacity-50">
                        <span>20Hz</span>
                        <span>500Hz</span>
                    </div>
                </div>

                {/* LPF */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[13px] font-medium text-[--color-text-secondary]">High Cut (Low Pass)</span>
                        <span className="text-sm font-mono font-bold text-[--color-text-primary] bg-[--color-bg-surface] px-2 py-0.5 rounded shadow-sm">
                            {formatFreq(config.lpf)} Hz
                        </span>
                    </div>
                    <input
                        type="range" min="200" max="20000" step="100"
                        value={config.lpf}
                        onChange={(e) => onLPFChange(Number(e.target.value))}
                        className="w-full accent-[--color-text-secondary] h-1.5 bg-[--color-bg-surface] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-[--color-text-muted] px-1 font-mono opacity-50">
                        <span>200Hz</span>
                        <span>20kHz</span>
                    </div>
                </div>
            </div>

            {/* Neighbor Safe周波数 */}
            {neighborSafe && (
                <div className="glass-card rounded-2xl p-4 border border-[--color-border] bg-[--color-accent-safe]/5 shadow-[0_0_20px_var(--color-accent-safe-glow)] space-y-4">
                    <div className="flex items-center gap-2 text-[--color-accent-safe]">
                        <Shield size={16} />
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                            Neighbor Safe Mode
                        </h3>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-[11px] font-medium text-[--color-text-secondary]">Bass Cutoff Frequency</span>
                            <span className="text-xs font-mono font-bold text-[--color-accent-safe] bg-[--color-accent-safe]/10 px-1.5 py-0.5 rounded">
                                {config.neighborSafeFreq} Hz
                            </span>
                        </div>
                        <input
                            type="range" min="20" max="100" step="5"
                            value={config.neighborSafeFreq}
                            onChange={(e) => onNeighborSafeFreqChange(Number(e.target.value))}
                            className="w-full accent-[--color-accent-safe] h-1.5 bg-[--color-accent-safe]/10 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-[9px] text-[--color-text-muted]">
                            {config.neighborSafeFreq}Hz以下の重低音をカットし、隣室への振動伝達を抑制します。
                        </p>
                    </div>
                </div>
            )}

            {/* Room Correction */}
            <div className="glass-card rounded-2xl p-4 border border-[--color-border] space-y-4">
                <div className="flex items-center gap-2 text-[--color-text-secondary]">
                    <Box size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                        Room Correction
                    </h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {ROOM_SIZES.map((item) => (
                        <button
                            key={item.value}
                            onClick={() => onRoomSizeChange(item.value)}
                            className={`
                                relative p-2 rounded-lg border flex flex-col items-center justify-center transition-all active:scale-95
                                ${config.roomSize === item.value
                                    ? 'bg-[--color-accent-primary]/20 border-[--color-accent-primary] text-[--color-text-primary] shadow-sm'
                                    : 'bg-white/5 border-white/10 text-[--color-text-secondary] hover:bg-white/10'}
                            `}
                        >
                            <span className="text-xs font-medium">{item.label}</span>
                            <span className="text-[8px] opacity-60 uppercase mt-0.5">{item.desc}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
