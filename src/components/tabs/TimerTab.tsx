import { X, Clock } from 'lucide-react';

interface TimerTabProps {
    isPlaying: boolean;
    onTogglePlay: () => void;
    timer: {
        timerMinutes: number;
        timerRemaining: number;
        isTimerActive: boolean;
        startTimer: (minutes: number) => void;
        stopTimer: () => void;
    };
}

/**
 * TimerTab: スリープタイマー (Persisted Version)
 * アプリを最小化したりタブを切り替えても継続するタイマー。
 */
export default function TimerTab({ isPlaying, onTogglePlay, timer }: TimerTabProps) {
    const { timerMinutes, timerRemaining, isTimerActive, startTimer, stopTimer } = timer;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const presets = [15, 30, 60, 120, 240];

    const handleCustomClick = () => {
        const value = prompt('タイマー時間を分単位で入力してください (1〜1440)', '90');
        if (value) {
            const minutes = parseInt(value, 10);
            if (!isNaN(minutes) && minutes > 0) {
                startTimer(minutes);
            } else {
                alert('有効な数字を入力してください');
            }
        }
    };

    // 円形プログレス計算
    const progress = isTimerActive && timerMinutes > 0
        ? timerRemaining / (timerMinutes * 60)
        : 0;
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    return (
        <div className="px-6 py-6 space-y-8">
            <header className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-[--color-accent-primary]">
                    <Clock size={18} />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-[--color-text-primary] tracking-tight">Sleep Timer</h2>
                    <p className="text-[10px] text-[--color-text-muted]">再生を自動停止します</p>
                </div>
            </header>

            {/* 円形タイマー表示 (Hero Section) */}
            <div className="flex justify-center py-4">
                <div className="relative w-56 h-56 flex items-center justify-center">
                    {/* 背景ブラー効果 */}
                    <div className={`absolute inset-0 rounded-full bg-[--color-accent-primary] blur-3xl opacity-[0.05] transition-opacity duration-1000 ${isTimerActive ? 'opacity-[0.15]' : ''}`} />

                    <svg className="w-full h-full -rotate-90 drop-shadow-2xl" viewBox="0 0 200 200">
                        {/* 背景リング */}
                        <circle
                            cx="100" cy="100" r={radius}
                            fill="none"
                            stroke="rgba(255,255,255,0.03)"
                            strokeWidth="8"
                        />
                        {/* プログレスリング */}
                        <circle
                            cx="100" cy="100" r={radius}
                            fill="none"
                            stroke={isTimerActive ? 'var(--color-accent-primary)' : 'transparent'}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            className="transition-all duration-1000 ease-linear"
                            style={{ filter: 'drop-shadow(0 0 4px var(--color-accent-glow))' }}
                        />
                    </svg>

                    {/* 中央テキスト */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-4xl font-bold tracking-tighter tabular-nums transition-colors duration-300 ${isTimerActive ? 'text-[--color-text-primary] drop-shadow-md' : 'text-[--color-text-muted]'}`}>
                            {isTimerActive ? formatTime(timerRemaining) : '--:--'}
                        </span>
                        <span className="text-[10px] text-[--color-text-muted] mt-2 uppercase tracking-widest font-medium opacity-60">
                            {isTimerActive ? 'Remaining' : 'Ready'}
                        </span>
                    </div>
                </div>
            </div>

            {/* プリセットボタン群 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-medium text-[--color-text-muted] uppercase tracking-wider">Set Duration</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {presets.map((m) => (
                        <button
                            key={m}
                            onClick={() => startTimer(m)}
                            className={`
                                group relative overflow-hidden px-4 py-3 rounded-xl transition-all duration-300
                                flex flex-col items-center justify-center gap-1 border
                                ${timerMinutes === m && isTimerActive
                                    ? 'bg-[rgba(226,232,240,0.1)] border-[--color-accent-primary] text-[--color-text-primary] shadow-[0_0_15px_rgba(226,232,240,0.1)]'
                                    : 'bg-[rgba(255,255,255,0.03)] border-transparent text-[--color-text-secondary] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.1)]'
                                }
                            `}
                        >
                            <span className="text-sm font-semibold">{m}</span>
                            <span className="text-[9px] opacity-50 lowercase">min</span>

                            {/* Active Indicator Dot */}
                            {timerMinutes === m && isTimerActive && (
                                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[--color-accent-primary] shadow-[0_0_6px_var(--color-accent-primary)] animate-pulse" />
                            )}
                        </button>
                    ))}
                    {/* 自由設定ボタン */}
                    <button
                        onClick={handleCustomClick}
                        className={`
                            group relative overflow-hidden px-4 py-3 rounded-xl transition-all duration-300
                            flex flex-col items-center justify-center gap-1 border
                            ${!presets.includes(timerMinutes) && timerMinutes > 0 && isTimerActive
                                ? 'bg-[rgba(226,232,240,0.1)] border-[--color-accent-primary] text-[--color-text-primary] shadow-[0_0_15px_rgba(226,232,240,0.1)]'
                                : 'bg-[rgba(255,255,255,0.03)] border-transparent text-[--color-text-secondary] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.1)]'
                            }
                        `}
                    >
                        <span className="text-sm font-semibold">自由設定</span>
                        <span className="text-[9px] opacity-50 lowercase">custom</span>

                        {!presets.includes(timerMinutes) && timerMinutes > 0 && isTimerActive && (
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[--color-accent-primary] shadow-[0_0_6px_var(--color-accent-primary)] animate-pulse" />
                        )}
                    </button>
                </div>
            </div>

            {/* キャンセルボタン */}
            <div className={`transition-all duration-500 overflow-hidden ${isTimerActive ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                <button
                    onClick={() => stopTimer()}
                    className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 group
                    text-[--color-accent-danger] bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.1)]
                    hover:bg-[rgba(239,68,68,0.1)] hover:border-[rgba(239,68,68,0.3)] hover:shadow-[0_0_15px_rgba(239,68,68,0.1)]
                    transition-all duration-300"
                >
                    <X size={16} />
                    <span className="text-xs font-semibold tracking-wide">CANCEL TIMER</span>
                </button>
            </div>
        </div>
    );
}
