import type { NoiseType, SilentiumConfig } from '../../types/audio';
import ChannelFader from './ChannelFader';

const NOISE_TYPES: NoiseType[] = ['white', 'pink', 'brown', 'blue', 'violet'];

interface NoiseMixerProps {
    config: SilentiumConfig;
    onVolumeChange: (type: NoiseType, value: number) => void;
}

/**
 * ノイズミキサー（モバイル最適化版）
 */
export default function NoiseMixer({ config, onVolumeChange }: NoiseMixerProps) {
    return (
        <div className="glass-card rounded-xl p-3">
            <h3 className="text-[10px] font-medium text-[--color-text-secondary] uppercase tracking-wider mb-3">
                Noise Generator
            </h3>
            <div className="flex justify-between items-end px-1">
                {NOISE_TYPES.map((type) => (
                    <ChannelFader
                        key={type}
                        type={type}
                        volume={config.noiseVolumes[type]}
                        onChange={(v) => onVolumeChange(type, v)}
                    />
                ))}
            </div>
        </div>
    );
}
