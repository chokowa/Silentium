import type { SilentiumConfig, EQBandConfig } from '../../types/audio';

interface DSPPanelProps {
    config: SilentiumConfig;
    onEQChange: (bands: EQBandConfig[]) => void;
    onHPFChange: (freq: number) => void;
    onLPFChange: (freq: number) => void;
    onRumbleIntensityChange: (value: number) => void;
    onRumbleCrossoverChange: (freq: number) => void;
    onModulationChange: (value: number) => void;
    onNeighborSafeChange: (enabled: boolean) => void;
    onNeighborSafeFreqChange: (freq: number) => void;
}

function formatFreq(hz: number): string {
    if (hz >= 1000) return `${(hz / 1000).toFixed(1)}k`;
    return `${Math.round(hz)}`;
}

/**
 * DSPパネル（モバイル最適化版）
 */
export default function DSPPanel({
    config,
    onEQChange,
    onHPFChange,
    onLPFChange,
    onRumbleIntensityChange,
    onRumbleCrossoverChange,
    onModulationChange,
    onNeighborSafeChange,
    onNeighborSafeFreqChange,
}: DSPPanelProps) {

    const handleEQBandGain = (index: number, gain: number) => {
        const newBands = config.eqBands.map((b, i) =>
            i === index ? { ...b, gain } : b
        );
        onEQChange(newBands);
    };

    return (
        <div className="space-y-3">
            {/* ===== Neighbor Safe ===== */}
            <div className={`glass-card rounded-xl p-3 ${config.neighborSafe ? 'glow-safe' : 'glow-danger'}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">{config.neighborSafe ? '🛡️' : '⚠️'}</span>
                        <h3 className="text-[10px] font-medium text-[--color-text-secondary] uppercase tracking-wider">
                            Neighbor Safe
                        </h3>
                    </div>
                    <button
                        onClick={() => onNeighborSafeChange(!config.neighborSafe)}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer
              ${config.neighborSafe ? 'bg-[--color-accent-safe]' : 'bg-[--color-accent-danger]'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200
              ${config.neighborSafe ? 'left-[21px]' : 'left-0.5'}`}
                        />
                    </button>
                </div>
                {config.neighborSafe && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[--color-text-muted] w-8 font-mono">{config.neighborSafeFreq}Hz</span>
                        <input
                            type="range" min="20" max="80" step="5"
                            value={config.neighborSafeFreq}
                            onChange={(e) => onNeighborSafeFreqChange(Number(e.target.value))}
                            className="flex-1"
                        />
                    </div>
                )}
                {!config.neighborSafe && (
                    <p className="text-[9px] text-[--color-accent-danger] leading-snug">
                        低域制限が解除されています。下階への振動に注意してください。
                    </p>
                )}
            </div>

            {/* ===== EQ ===== */}
            <div className="glass-card rounded-xl p-3">
                <h3 className="text-[10px] font-medium text-[--color-text-secondary] uppercase tracking-wider mb-2">
                    Equalizer
                </h3>
                <div className="space-y-1.5">
                    {config.eqBands.map((band, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-[9px] text-[--color-text-muted] w-8 text-right font-mono">
                                {formatFreq(band.frequency)}
                            </span>
                            <input
                                type="range" min="-12" max="12" step="0.5"
                                value={band.gain}
                                onChange={(e) => handleEQBandGain(i, Number(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-[9px] text-[--color-text-muted] w-8 font-mono tabular-nums">
                                {band.gain > 0 ? '+' : ''}{band.gain.toFixed(1)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ===== Filters ===== */}
            <div className="glass-card rounded-xl p-3">
                <h3 className="text-[10px] font-medium text-[--color-text-secondary] uppercase tracking-wider mb-2">
                    Filters
                </h3>
                <div className="space-y-2.5">
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] text-[--color-text-muted]">Low Cut (HPF)</span>
                            <span className="text-[9px] text-[--color-text-muted] font-mono">{formatFreq(config.hpf)}Hz</span>
                        </div>
                        <input
                            type="range" min="20" max="500" step="1"
                            value={config.hpf}
                            onChange={(e) => onHPFChange(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] text-[--color-text-muted]">High Cut (LPF)</span>
                            <span className="text-[9px] text-[--color-text-muted] font-mono">{formatFreq(config.lpf)}Hz</span>
                        </div>
                        <input
                            type="range" min="200" max="20000" step="100"
                            value={config.lpf}
                            onChange={(e) => onLPFChange(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            {/* ===== Rumble ===== */}
            <div className="glass-card rounded-xl p-3">
                <h3 className="text-[10px] font-medium text-[--color-text-secondary] uppercase tracking-wider mb-2">
                    Rumble Generator
                </h3>
                <div className="space-y-2.5">
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] text-[--color-text-muted]">Intensity</span>
                            <span className="text-[9px] text-[--color-text-muted] font-mono tabular-nums">
                                {Math.round(config.rumbleIntensity * 100)}%
                            </span>
                        </div>
                        <input
                            type="range" min="0" max="100" step="1"
                            value={config.rumbleIntensity * 100}
                            onChange={(e) => onRumbleIntensityChange(Number(e.target.value) / 100)}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] text-[--color-text-muted]">Crossover</span>
                            <span className="text-[9px] text-[--color-text-muted] font-mono tabular-nums">
                                {config.rumbleCrossover}Hz
                            </span>
                        </div>
                        <input
                            type="range" min="40" max="150" step="5"
                            value={config.rumbleCrossover}
                            onChange={(e) => onRumbleCrossoverChange(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            {/* ===== Modulation ===== */}
            <div className="glass-card rounded-xl p-3">
                <h3 className="text-[10px] font-medium text-[--color-text-secondary] uppercase tracking-wider mb-2">
                    Modulation
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-[--color-text-muted] w-8 text-right font-mono tabular-nums">
                        {(config.modulation * 100).toFixed(1)}%
                    </span>
                    <input
                        type="range" min="0" max="5" step="0.1"
                        value={config.modulation * 100}
                        onChange={(e) => onModulationChange(Number(e.target.value) / 100)}
                        className="flex-1"
                    />
                </div>
            </div>
        </div>
    );
}
