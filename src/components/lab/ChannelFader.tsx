import type { NoiseType } from '../../types/audio';

interface ChannelFaderProps {
    type: NoiseType;
    volume: number;
    onChange: (value: number) => void;
}

// ノイズタイプ別のラベルと色
const NOISE_META: Record<NoiseType, { label: string; shortLabel: string; color: string }> = {
    white: { label: 'White', shortLabel: 'W', color: '#e8e6f0' },
    pink: { label: 'Pink', shortLabel: 'P', color: '#f472b6' },
    brown: { label: 'Brown', shortLabel: 'B', color: '#a0845e' },
    blue: { label: 'Blue', shortLabel: 'Bl', color: '#60a5fa' },
    violet: { label: 'Violet', shortLabel: 'V', color: '#a78bfa' },
};

/**
 * 個別チャンネルフェーダー（縦型・モバイル最適化）
 */
export default function ChannelFader({ type, volume, onChange }: ChannelFaderProps) {
    const meta = NOISE_META[type];
    const percentage = Math.round(volume * 100);

    return (
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            {/* 数値ラベル */}
            <span className="text-[9px] text-[--color-text-muted] tabular-nums font-mono">
                {percentage}
            </span>

            {/* 縦フェーダー */}
            <div className="relative h-[120px] w-6 flex items-center justify-center">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) => onChange(Number(e.target.value) / 100)}
                    className="vertical-fader"
                    style={{ accentColor: meta.color }}
                />
                {/* レベルメーター */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 rounded-full transition-all duration-100 pointer-events-none"
                    style={{
                        height: `${percentage}%`,
                        background: `linear-gradient(to top, ${meta.color}50, ${meta.color}15)`,
                    }}
                />
            </div>

            {/* ノイズタイプラベル */}
            <div className="text-[10px] font-medium" style={{ color: meta.color }}>
                {meta.label}
            </div>
        </div>
    );
}
