import type { SilentiumConfig, SavedPreset } from '../../types/audio';
import { Trash2, Save } from 'lucide-react';

interface HomeTabProps {
    presets: SilentiumConfig[];
    activePresetIndex: number | null;
    onSelectPreset: (index: number) => void;
    neighborSafe: boolean;
    onNeighborSafeChange: (enabled: boolean) => void;
    userPresets: SavedPreset[];
    activeUserPresetId: string | null;
    onSaveUserPreset: (name: string) => void;
    onLoadUserPreset: (id: string) => void;
    onDeleteUserPreset: (id: string) => void;
}

/**
 * HomeTab: プリセットグリッド + User Presets + Neighbor Safe
 */
export default function HomeTab({
    presets,
    activePresetIndex,
    onSelectPreset,
    neighborSafe,
    onNeighborSafeChange,
    userPresets,
    activeUserPresetId,
    onSaveUserPreset,
    onLoadUserPreset,
    onDeleteUserPreset,
}: HomeTabProps) {

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    const handleSave = () => {
        const name = prompt('プリセット名を入力してください', `My Config ${userPresets.length + 1}`);
        if (name) {
            onSaveUserPreset(name);
        }
    };

    return (
        <div className="h-full overflow-y-auto px-4 py-4 space-y-6">
            {/* Situations (Built-in Presets) */}
            <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold text-[--color-text-secondary] uppercase tracking-wider">Situations</h2>
                    <span className="text-[10px] text-[--color-text-muted] font-mono">{presets.length} presets</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {presets.map((preset, i) => {
                        const isActive = i === activePresetIndex;
                        return (
                            <button
                                key={preset.name}
                                onClick={() => onSelectPreset(i)}
                                className={`preset-grid-card ${isActive ? 'active' : ''}`}
                            >
                                <span className="text-2xl mb-1 block">{preset.icon}</span>
                                <span className="text-[10px] font-bold text-[--color-text-primary] leading-tight block">
                                    {preset.name}
                                </span>
                                {!preset.neighborSafe && (
                                    <span className="text-[8px] text-[--color-accent-danger] mt-0.5 block font-bold">⚠ Unsafe</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* User Presets */}
            <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold text-[--color-text-secondary] uppercase tracking-wider">User Presets</h2>
                    <button
                        onClick={handleSave}
                        disabled={userPresets.length >= 6}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all
                            ${userPresets.length >= 6
                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                : 'bg-[--color-accent-primary]/10 text-[--color-accent-primary] hover:bg-[--color-accent-primary]/20 active:scale-95 border border-[--color-accent-primary]/20'}`}
                    >
                        <Save size={12} />
                        SAVE CURRENT
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {userPresets.map((preset) => {
                        const isActive = activeUserPresetId === preset.id;
                        return (
                            <div
                                key={preset.id}
                                onClick={() => onLoadUserPreset(preset.id)}
                                className={`preset-grid-card relative min-h-[90px] flex flex-col justify-between items-stretch text-left ${isActive ? 'active' : ''}`}
                            >
                                <div className="space-y-1">
                                    <p className={`text-[11px] font-bold truncate ${isActive ? 'text-[--color-text-primary]' : 'text-[--color-text-primary]'}`}>
                                        {preset.config.name}
                                    </p>
                                    <p className="text-[8px] text-[--color-text-muted] font-mono opacity-70">
                                        {formatDate(preset.createdAt)}
                                    </p>
                                </div>

                                <div className="flex items-center justify-end mt-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteUserPreset(preset.id);
                                        }}
                                        className="p-1.5 rounded-md hover:bg-[--color-accent-danger]/20 text-[--color-text-muted] hover:text-[--color-accent-danger] transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {/* Empty Slots */}
                    {Array.from({ length: 6 - userPresets.length }).map((_, i) => (
                        <div
                            key={`empty-${i}`}
                            className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] h-[90px] flex items-center justify-center"
                        >
                            <span className="text-[9px] text-white/10 font-bold tracking-widest uppercase">Empty Slot</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Neighbor Safe */}
            <div className={`glass-card rounded-2xl p-4 border border-[--color-border] ${neighborSafe ? 'bg-[--color-accent-safe]/5' : 'bg-[--color-accent-danger]/5'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${neighborSafe ? 'bg-[--color-accent-safe]/20 text-[--color-accent-safe]' : 'bg-[--color-accent-danger]/20 text-[--color-accent-danger]'}`}>
                            <span className="text-xl leading-none">{neighborSafe ? '🛡️' : '⚠️'}</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[--color-text-primary]">Neighbor Safe Mode</p>
                            <p className="text-[9px] text-[--color-text-muted] mt-0.5">
                                {neighborSafe ? '低域振動が安全に制限されています' : '低域制限OFF — 下階への振動に注意'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => onNeighborSafeChange(!neighborSafe)}
                        className={`relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer p-1
                            ${neighborSafe ? 'bg-[--color-accent-safe]' : 'bg-white/10'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-300 transform
                            ${neighborSafe ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                    </button>
                </div>
            </div>

        </div>
    );
}

