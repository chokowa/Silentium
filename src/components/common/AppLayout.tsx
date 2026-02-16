import type { ReactNode } from 'react';
import {
    Home,
    Settings2,
    Activity,
    Timer,
    Play,
    Pause,
    Sparkles,
    Brain,
    Volume2,
    Sun,
    Moon,
    Mic,
    MicOff,

} from 'lucide-react';
import DualSpectrum from '../visualization/DualSpectrum';

export type TabId = 'home' | 'mixer' | 'eq' | 'analysis' | 'timer';

interface AppLayoutProps {
    children: ReactNode;
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    // Player
    isPlaying: boolean;
    onTogglePlay: () => void;
    masterVolume: number;
    onMasterVolumeChange: (vol: number) => void;
    // Auto/Learn
    onAutoMask: () => void;
    onToggleLearning: () => void;
    isLearning: boolean;
    // Mic (Extra)
    micActive: boolean;
    onMicToggle: () => void;
    // Visualizer (Pass-through)
    noiseAnalyser: AnalyserNode | null;
    micAnalyser: AnalyserNode | null;
    // Theme
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    // Meta
    currentPresetName: string;
}

/**
 * AppLayout Component for Silentium
 * Provides the premium 'Obsidian & Platinum' shell with persistent Player Bar and Navigation.
 * Theme-aware implementation using CSS variables.
 */
export default function AppLayout({
    children,
    activeTab,
    onTabChange,
    isPlaying,
    onTogglePlay,
    masterVolume,
    onMasterVolumeChange,
    onAutoMask,
    onToggleLearning,
    isLearning,
    micActive,
    onMicToggle,
    noiseAnalyser,
    micAnalyser,
    theme,
    onToggleTheme,
    currentPresetName
}: AppLayoutProps) {

    const tabs: { id: TabId; icon: any; label: string }[] = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'mixer', icon: Settings2, label: 'Mixer' },
        { id: 'eq', icon: Activity, label: 'EQ' },
        { id: 'analysis', icon: Sparkles, label: 'Analysis' },
        { id: 'timer', icon: Timer, label: 'Timer' },
    ];

    return (
        <div className="min-h-screen w-full max-w-lg mx-auto bg-[--color-bg-primary] text-[--color-text-primary] font-sans relative transition-colors duration-300">

            {/* 1. Top Area (Fixed Header) */}
            <header className="sticky top-0 z-30 h-[160px] bg-gradient-to-b from-[--color-bg-surface]/95 to-[--color-bg-primary] border-b border-[--color-border]/30 backdrop-blur-md">
                {/* Visualizer Background */}
                <div className="absolute inset-0 opacity-40">
                    <DualSpectrum
                        noiseAnalyser={noiseAnalyser}
                        micAnalyser={micAnalyser}
                        micActive={micActive}
                    />
                </div>

                {/* Header Foreground */}
                <div className="relative h-full px-5 pt-6 pb-4 flex justify-between items-start pointer-events-none">
                    <div className="pointer-events-auto">
                        <h1 className="text-xl font-light tracking-[0.15em] opacity-90 text-[--color-text-primary]">SILENTIUM</h1>
                        <p className="text-[10px] text-[--color-text-muted] tracking-widest uppercase opacity-70 mt-1 line-clamp-1">
                            {currentPresetName}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 pointer-events-auto">
                        {/* Mic Toggle */}
                        <button
                            onClick={onMicToggle}
                            className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer
                                ${micActive
                                    ? 'bg-[--color-accent-danger]/10 border-[--color-accent-danger]/50 text-[--color-accent-danger] shadow-[0_0_10px_var(--color-accent-danger)]'
                                    : 'bg-[--color-bg-surface]/30 border-[--color-border] text-[--color-text-muted] hover:bg-[--color-bg-surface]/50'}`}
                            aria-label="Toggle Microphone"
                        >
                            {micActive ? <Mic size={18} /> : <MicOff size={18} />}
                        </button>

                        {/* Theme Toggle */}
                        <button
                            onClick={onToggleTheme}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-[--color-bg-surface]/30 border border-[--color-border] text-[--color-text-primary] shadow-sm hover:bg-[--color-bg-surface]/50 transition-all cursor-pointer"
                            aria-label="Toggle Theme"
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                    </div>
                </div>
                {/* Visualizer Fade */}
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[--color-bg-primary] to-transparent pointer-events-none" />
            </header>

            {/* 2. Center Content Area */}
            <main className="relative z-10 px-5 pt-4 pb-[200px]">
                {children}
            </main>

            {/* 3. Bottom UI Footer - Fixed at bottom of viewport */}
            <footer className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto bg-[--color-bg-surface]/95 backdrop-blur-2xl border-t border-[--color-border] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-colors duration-300 pb-safe">
                {/* Player Controls */}
                <div className="px-5 py-4 flex items-center justify-between gap-4 relative">
                    {/* ... (rest of the footer remains same but with adjustments) */}
                    <div className="flex-1 flex items-center justify-start gap-3">
                        <button
                            onClick={onAutoMask}
                            className={`p-2.5 rounded-full transition-all duration-300 active:scale-95 border border-transparent
                                ${micActive ? '' : 'opacity-30 pointer-events-none'}
                                text-[--color-text-muted] hover:text-[--color-text-primary] hover:bg-[--color-bg-elevated]`}
                        >
                            <Sparkles size={18} />
                        </button>

                        <button
                            onClick={onToggleLearning}
                            className={`p-2.5 rounded-full transition-all duration-300 active:scale-95 border
                                ${isLearning
                                    ? 'text-[--color-accent-warning] border-[--color-accent-warning]/30 bg-[--color-accent-warning]/10 shadow-[0_0_15px_var(--color-accent-warning)]'
                                    : 'text-[--color-text-muted] border-transparent hover:text-[--color-text-primary] hover:bg-[--color-bg-elevated]'}
                                ${micActive ? '' : 'opacity-30 pointer-events-none'}`}
                        >
                            <Brain size={18} />
                        </button>
                    </div>

                    <div className="flex-none">
                        <button
                            onClick={onTogglePlay}
                            className={`relative group w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm
                                ${isPlaying
                                    ? 'bg-[--color-text-primary] text-[--color-bg-primary]'
                                    : 'bg-[--color-bg-card] border border-[--color-border] text-[--color-text-primary] hover:bg-[--color-bg-elevated]'}`}
                        >
                            {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="ml-0.5 fill-current" />}
                            {isPlaying && <div className="absolute inset-0 rounded-full animate-pulse-ring border border-[--color-accent-primary]/30" />}
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-end gap-3">
                        <Volume2 size={18} className="text-[--color-text-muted] shrink-0" />
                        <div className="relative w-24 h-8 flex items-center cursor-pointer group">
                            <div className="absolute inset-x-0 h-1.5 bg-[--color-text-primary]/20 rounded-full border border-[--color-text-primary]/10" />
                            <div
                                className="absolute left-0 h-1.5 bg-[--color-text-primary] group-hover:bg-[--color-accent-primary] rounded-full transition-colors"
                                style={{ width: `${masterVolume * 100}%` }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[--color-bg-surface] border-2 border-[--color-text-primary] group-hover:border-[--color-accent-primary] shadow-sm rounded-full transform -translate-x-1/2 transition-all duration-75 group-active:scale-110 z-10"
                                style={{ left: `${masterVolume * 100}%` }}
                            />
                            <input
                                type="range" min="0" max="100" value={masterVolume * 100}
                                onChange={(e) => onMasterVolumeChange(Number(e.target.value) / 100)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            />
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <nav className="border-t border-[--color-border]/30 flex items-center justify-around py-1 transition-colors duration-300 bg-[--color-bg-primary]/30">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className="flex flex-col items-center gap-1 group py-2.5 px-4 w-full relative"
                            >
                                <Icon
                                    size={20}
                                    strokeWidth={isActive ? 2.5 : 1.5}
                                    className={`transition-all duration-200 ${isActive ? 'text-[--color-accent-primary] -translate-y-0.5' : 'text-[--color-text-muted] group-hover:text-[--color-text-secondary]'}`}
                                />
                                <span className={`text-[9px] uppercase tracking-widest font-medium ${isActive ? 'text-[--color-accent-primary]' : 'text-[--color-text-muted]'}`}>
                                    {tab.label}
                                </span>
                                {isActive && <div className="absolute bottom-0 w-8 h-0.5 bg-[--color-accent-primary] shadow-[0_0_10px_var(--color-accent-primary)]" />}
                            </button>
                        );
                    })}
                </nav>
            </footer>

            {/* Depth Overlay */}
            <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[--color-bg-primary] opacity-20 z-0" />
        </div>
    );
}
