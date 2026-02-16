import type { SilentiumConfig } from '../../types/audio';

interface PresetCardProps {
    config: SilentiumConfig;
    isActive: boolean;
    onClick: () => void;
}

// カテゴリ別アクセントカラー
const categoryColors: Record<string, string> = {
    footstep: 'rgba(124, 111, 245, 0.2)',
    voice: 'rgba(91, 141, 238, 0.2)',
    sleep: 'rgba(139, 92, 246, 0.2)',
    general: 'rgba(52, 211, 153, 0.2)',
};

/**
 * プリセットカード（モバイル最適化版）
 * コンパクトなカードで横スクロールに最適化
 */
export default function PresetCard({ config, isActive, onClick }: PresetCardProps) {
    const bgAccent = categoryColors[config.category] || categoryColors.general;

    return (
        <button
            onClick={onClick}
            className={`glass-card rounded-xl p-3 text-left cursor-pointer
        w-[140px] min-w-[140px] shrink-0
        ${isActive ? 'active' : ''}
        transition-all duration-300`}
            style={{
                background: isActive
                    ? `linear-gradient(135deg, ${bgAccent}, rgba(30, 30, 48, 0.7))`
                    : undefined,
            }}
        >
            {/* アイコン + 名前（横並び） */}
            <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">{config.icon}</span>
                <h3 className="text-[--color-text-primary] font-semibold text-xs leading-tight truncate">
                    {config.name}
                </h3>
            </div>

            {/* 説明 */}
            <p className="text-[--color-text-muted] text-[10px] leading-snug line-clamp-2">
                {config.description}
            </p>

            {/* Neighbor Safe表示 */}
            {!config.neighborSafe && (
                <div className="mt-1.5">
                    <span className="text-[9px] text-[--color-accent-danger] bg-[rgba(248,113,113,0.1)] px-1.5 py-0.5 rounded-full">
                        ⚠ Safe OFF
                    </span>
                </div>
            )}
        </button>
    );
}
