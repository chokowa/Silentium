import type { NoiseType, SilentiumConfig, EQBandConfig } from '../../types/audio';
import NoiseMixer from '../lab/NoiseMixer';
import DSPPanel from '../lab/DSPPanel';
import SpectrumAnalyzer from '../visualization/SpectrumAnalyzer';

interface LabScreenProps {
    config: SilentiumConfig;
    onNoiseVolumeChange: (type: NoiseType, value: number) => void;
    onEQChange: (bands: EQBandConfig[]) => void;
    onHPFChange: (freq: number) => void;
    onLPFChange: (freq: number) => void;
    onRumbleIntensityChange: (value: number) => void;
    onRumbleCrossoverChange: (freq: number) => void;
    onModulationChange: (value: number) => void;
    onNeighborSafeChange: (enabled: boolean) => void;
    onNeighborSafeFreqChange: (freq: number) => void;
    analyser: AnalyserNode | null;
    onClose: () => void;
    onSavePreset: () => void;
}

/**
 * 画面B: サウンド・ラボ（モバイルファースト）
 */
export default function LabScreen({
    config,
    onNoiseVolumeChange,
    onEQChange,
    onHPFChange,
    onLPFChange,
    onRumbleIntensityChange,
    onRumbleCrossoverChange,
    onModulationChange,
    onNeighborSafeChange,
    onNeighborSafeFreqChange,
    analyser,
    onClose,
    onSavePreset,
}: LabScreenProps) {
    return (
        <div className="h-full flex flex-col bg-[--color-bg-primary] animate-slide-up">
            {/* ヘッダー（固定） */}
            <header className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
                <button onClick={onClose} className="btn-ghost text-[11px] py-1.5 px-2.5 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
                <h2 className="text-sm font-semibold text-[--color-text-primary]">Sound Lab</h2>
                <button onClick={onSavePreset} className="btn-ghost text-[11px] py-1.5 px-2.5 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                        <polyline points="17,21 17,13 7,13 7,21" />
                        <polyline points="7,3 7,8 15,8" />
                    </svg>
                    Save
                </button>
            </header>

            {/* スペクトラムアナライザー（固定） */}
            <div className="shrink-0 mx-4 h-16 glass-card rounded-xl overflow-hidden mb-3">
                <SpectrumAnalyzer analyser={analyser} />
            </div>

            {/* スクロール可能エリア */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-8 space-y-3"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {/* ノイズミキサー */}
                <NoiseMixer config={config} onVolumeChange={onNoiseVolumeChange} />

                {/* DSPパネル */}
                <DSPPanel
                    config={config}
                    onEQChange={onEQChange}
                    onHPFChange={onHPFChange}
                    onLPFChange={onLPFChange}
                    onRumbleIntensityChange={onRumbleIntensityChange}
                    onRumbleCrossoverChange={onRumbleCrossoverChange}
                    onModulationChange={onModulationChange}
                    onNeighborSafeChange={onNeighborSafeChange}
                    onNeighborSafeFreqChange={onNeighborSafeFreqChange}
                />
            </div>
        </div>
    );
}
