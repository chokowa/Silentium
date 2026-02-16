
import DualSpectrum from '../visualization/DualSpectrum';

interface TopBarProps {
    // スペクトラム
    noiseAnalyser: AnalyserNode | null;
    micAnalyser: AnalyserNode | null;
    micActive: boolean;
    onMicToggle: () => void;
    onAutoMask: () => void; // 瞬間調整
    onToggleLearning: () => void; // 学習モード切替
    isLearning: boolean;
    // 再生
    isPlaying: boolean;
    onTogglePlay: () => void;
    // プリセット情報
    presetIcon: string;
    presetName: string;
    // ボリューム
    masterVolume: number;
    onMasterVolumeChange: (v: number) => void;
    // Neighbor Safe
    neighborSafe: boolean;
}

/**
 * 固定ヘッダー
 * スペクトラム + ツールバー(Mic/Auto/Rec) + 再生情報
 */
export default function TopBar({
    noiseAnalyser,
    micAnalyser,
    micActive,
    onMicToggle,
    onAutoMask,
    onToggleLearning,
    isLearning,
    isPlaying,
    onTogglePlay,
    presetIcon,
    presetName,
    masterVolume,
    onMasterVolumeChange,
    neighborSafe,
}: TopBarProps) {
    return (
        <div className="shrink-0 glass-elevated flex flex-col relative z-20">
            {/* 1. Spectrum Visualization Area */}
            <div className="h-40 relative overflow-hidden bg-[rgba(5,5,8,0.8)] border-b border-[rgba(255,255,255,0.03)]">
                <DualSpectrum
                    noiseAnalyser={noiseAnalyser}
                    micAnalyser={micAnalyser}
                    micActive={micActive}
                />

                {/* 凡例 (スペクトラム内に控えめに配置) */}
                {micActive && (
                    <div className="absolute bottom-2 right-3 flex items-center gap-4 text-[9px] pointer-events-none tracking-wide font-mono">
                        <span className="flex items-center gap-1.5 text-[--color-text-secondary]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[--color-accent-danger] shadow-[0_0_8px_var(--color-accent-danger)]"></span>
                            INPUT
                        </span>
                        <span className="flex items-center gap-1.5 text-[--color-text-secondary]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[--color-accent-primary] shadow-[0_0_8px_var(--color-accent-primary)]"></span>
                            OUTPUT
                        </span>
                    </div>
                )}
            </div>

            {/* 2. Primary Tools Bar (Mic, Auto, Rec) */}
            <div className="flex items-center justify-center gap-6 py-3 bg-[rgba(18,18,24,0.95)] backdrop-blur-md border-b border-[rgba(255,255,255,0.05)]">
                {/* Mic Toggle */}
                <button
                    onClick={onMicToggle}
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 active:scale-95
                        ${micActive
                            ? 'bg-[rgba(239,68,68,0.15)] text-[--color-accent-danger] border border-[rgba(239,68,68,0.3)] shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                            : 'bg-[rgba(255,255,255,0.05)] text-[--color-text-muted] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]'
                        }`}
                    title={micActive ? "マイクOFF" : "マイクON"}
                >
                    <span className="text-xl mb-0.5">🎙</span>
                </button>

                {/* Auto Masking Controls */}
                <div className={`flex items-center gap-4 transition-all duration-300 ${micActive ? 'opacity-100 translate-y-0' : 'opacity-20 translate-y-1 pointer-events-none grayscale'}`}>

                    {/* Arrow Indicator (Visual connection) */}
                    <span className="text-[--color-text-muted] opacity-30">›</span>

                    {/* Instant Auto */}
                    <button
                        onClick={micActive ? onAutoMask : undefined}
                        className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-[rgba(124,111,245,0.15)] text-[--color-accent-primary] border border-[rgba(124,111,245,0.3)] shadow-[0_0_12px_rgba(124,111,245,0.15)] transition-all active:scale-95 hover:bg-[rgba(124,111,245,0.25)]"
                        title="瞬時オートセットアップ"
                    >
                        <span className="text-xl mb-0.5">✨</span>
                    </button>

                    {/* Adaptive Rec */}
                    <button
                        onClick={micActive ? onToggleLearning : undefined}
                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl border transition-all active:scale-95
                            ${isLearning
                                ? 'bg-[rgba(239,68,68,0.2)] text-red-500 border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                : 'bg-[rgba(30,30,40,0.5)] text-red-400 border-[rgba(255,255,255,0.05)] hover:bg-[rgba(239,68,68,0.1)]'
                            }`}
                        title={isLearning ? "学習終了" : "学習録音開始"}
                    >
                        <span className={`text-lg transition-transform ${isLearning ? 'scale-110' : ''}`}>{isLearning ? '■' : '●'}</span>
                    </button>
                </div>
            </div>

            {/* 3. Playback Info & Volume */}
            <div className="flex items-center justify-between px-4 py-3 bg-[--color-bg-surface]">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Play Button */}
                    <button
                        onClick={onTogglePlay}
                        className={`play-btn-sm shrink-0 ${isPlaying ? 'playing' : ''}`}
                    >
                        {isPlaying ? '■' : '▶'}
                    </button>

                    {/* Master Volume (moved here) */}
                    <div className="flex items-center gap-2 bg-[rgba(0,0,0,0.2)] rounded-full pl-2.5 pr-1 py-1 h-8 max-w-[140px] flex-1">
                        <span className="text-[10px] text-[--color-text-muted]">🔊</span>
                        <input
                            type="range"
                            min="0" max="1" step="0.01"
                            value={masterVolume}
                            onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
                            className="flex-1 min-w-0 h-1 bg-[rgba(255,255,255,0.15)] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                        />
                    </div>
                </div>

                {/* Preset Info (moved directly to right) */}
                <div className="flex flex-col items-end ml-3 min-w-0 shrink">
                    <div className="flex items-center gap-2 justify-end w-full">
                        <span className="text-base">{presetIcon}</span>
                        <span className="text-xs font-bold text-[--color-text-primary] truncate max-w-[100px]">
                            {presetName}
                        </span>
                    </div>
                    {neighborSafe && (
                        <p className="text-[9px] text-[--color-accent-safe] mt-0.5">🛡 Neighbor Safe</p>
                    )}
                </div>
            </div>
        </div>
    );
}
