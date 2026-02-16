import type { SilentiumConfig } from '../../types/audio';

interface HomeScreenProps {
    presets: SilentiumConfig[];
    activePresetIndex: number;
    onSelectPreset: (index: number) => void;
}

export default function HomeScreen({ presets, activePresetIndex, onSelectPreset }: HomeScreenProps) {
    return (
        <div className="pt-4 pb-10 px-2">
            <h2 className="text-xs font-medium text-[--color-text-muted] uppercase tracking-widest mb-4 pl-2">
                Select Environment
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {presets.map((preset, index) => {
                    const isActive = activePresetIndex === index;
                    return (
                        <button
                            key={preset.name}
                            onClick={() => onSelectPreset(index)}
                            className={`aspect-video rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group
                                ${isActive
                                    ? 'bg-[--color-bg-elevated] shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-[--color-accent-primary]/30'
                                    : 'bg-[--color-bg-surface] hover:bg-[--color-bg-elevated] border border-[--color-border]'}`}
                        >
                            {/* Icon */}
                            <div className={`text-3xl transition-transform duration-500 
                                ${isActive ? 'scale-110 drop-shadow-[0_0_10px_var(--color-accent-glow)]' : 'grayscale opacity-60 group-hover:scale-105'}`}>
                                {preset.icon}
                            </div>

                            {/* Name */}
                            <span className={`text-[10px] font-medium tracking-wider uppercase text-center transition-colors line-clamp-1
                                ${isActive ? 'text-[--color-text-primary]' : 'text-[--color-text-secondary]'}`}>
                                {preset.name}
                            </span>

                            {/* Active Indicator Line */}
                            {isActive && (
                                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[--color-accent-primary] shadow-[0_0_10px_var(--color-accent-primary)]" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
