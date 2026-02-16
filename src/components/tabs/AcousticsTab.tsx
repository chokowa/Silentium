import type { SilentiumConfig, RoomSize } from '../../types/audio';

interface AcousticsTabProps {
    config: SilentiumConfig;
    onRoomSizeChange: (size: RoomSize) => void;
    onModulationChange: (value: number) => void;
}

const ROOM_SIZES: { value: RoomSize; label: string; desc: string }[] = [
    { value: 'off', label: 'OFF', desc: 'No correction' },
    { value: '6tatami', label: '6畳', desc: 'Small Room (~10㎡)' },
    { value: '8tatami', label: '8畳', desc: 'Medium Room (~13㎡)' },
    { value: '12tatami', label: '12畳', desc: 'Living Room (~20㎡)' },
    { value: '20tatami', label: '20畳', desc: 'Large Space (~33㎡)' },
];

export default function AcousticsTab({
    config,
    onRoomSizeChange,
    onModulationChange,
}: AcousticsTabProps) {
    return (
        <div className="flex flex-col gap-8 text-[--color-text-primary]">
            <header className="mb-2">
                <h3 className="text-xl font-light tracking-widest uppercase opacity-90">Acoustics</h3>
                <p className="text-xs text-[--color-text-secondary] mt-1">
                    Room Correction & Psychoacoustics
                </p>
            </header>

            {/* 1. Room Mode Correction */}
            <section className="space-y-4">
                <h4 className="text-sm font-medium uppercase tracking-wider text-[--color-accent-primary]/80 flex items-center gap-2">
                    <span>🏠</span> Room Size Correction
                </h4>
                <p className="text-[10px] text-[--color-text-muted] leading-relaxed">
                    部屋のサイズに応じた定在波（Room Modes）を自動的に抑制し、ブーミングのないクリアな低音を実現します。
                </p>

                <div className="grid grid-cols-3 gap-2">
                    {ROOM_SIZES.map((item) => (
                        <button
                            key={item.value}
                            onClick={() => onRoomSizeChange(item.value)}
                            className={`
                                relative p-3 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-95
                                ${config.roomSize === item.value
                                    ? 'bg-[--color-accent-primary]/20 border-[--color-accent-primary] text-[--color-text-primary] shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.2)]'
                                    : 'bg-white/5 border-white/10 text-[--color-text-secondary] hover:bg-white/10'}
                            `}
                        >
                            <span className="text-sm font-medium">{item.label}</span>
                            <span className="text-[8px] opacity-60 uppercase mt-0.5">{item.desc}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* 2. Organic Flow (1/f Fluctuation) */}
            <section className="space-y-4">
                <h4 className="text-sm font-medium uppercase tracking-wider text-[--color-accent-primary]/80 flex items-center gap-2">
                    <span>🍃</span> Organic Flow
                </h4>
                <p className="text-[10px] text-[--color-text-muted] leading-relaxed">
                    1/f ゆらぎ理論に基づき、音の定位を微細に変化させます。長時間聴取時の疲労感を軽減し、自然な音響空間を作り出します。
                </p>

                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs text-[--color-text-secondary]">Modulation Depth</span>
                        <span className="text-xs font-mono text-[--color-accent-primary]">
                            {Math.round(config.modulation * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={config.modulation}
                        onChange={(e) => onModulationChange(parseFloat(e.target.value))}
                        className="w-full appearance-none h-1.5 bg-white/10 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[--color-accent-primary] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                    <div className="flex justify-between text-[8px] text-[--color-text-muted] mt-1 px-1">
                        <span>Static</span>
                        <span>Natural Flow</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
