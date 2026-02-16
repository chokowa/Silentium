import type { SilentiumConfig } from '../../types/audio';
import PresetCard from './PresetCard';

interface PresetCarouselProps {
    presets: SilentiumConfig[];
    activeIndex: number;
    onSelect: (index: number) => void;
}

/**
 * プリセットカルーセル（モバイル最適化版）
 * 横スクロールでプリセットを選択
 */
export default function PresetCarousel({ presets, activeIndex, onSelect }: PresetCarouselProps) {
    return (
        <div className="relative">
            {/* フェード（左） */}
            <div className="absolute left-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to right, var(--color-bg-primary), transparent)' }}
            />

            {/* カード列 */}
            <div className="flex gap-2.5 overflow-x-auto px-5 py-1 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
                {presets.map((preset, i) => (
                    <div key={preset.name} className="snap-start">
                        <PresetCard
                            config={preset}
                            isActive={i === activeIndex}
                            onClick={() => onSelect(i)}
                        />
                    </div>
                ))}
            </div>

            {/* フェード（右） */}
            <div className="absolute right-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to left, var(--color-bg-primary), transparent)' }}
            />
        </div>
    );
}
