import type { ReactNode } from 'react';

export type TabId = 'home' | 'mixer' | 'eq' | 'timer';

interface TabBarProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
    {
        id: 'home',
        label: 'Home',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
        ),
    },
    {
        id: 'mixer',
        label: 'Mixer',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
        ),
    },
    {
        id: 'eq',
        label: 'EQ',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 12h4l3-9 4 18 3-9h6" />
            </svg>
        ),
    },
    {
        id: 'timer',
        label: 'Timer',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2 2" />
                <path d="M5 3l-2 2M19 3l2 2" />
                <line x1="12" y1="1" x2="12" y2="3" />
            </svg>
        ),
    },
];

/**
 * 固定下部タブバー
 */
export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
    return (
        <nav className="shrink-0 glass-elevated border-t border-[--color-border]">
            <div className="flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 cursor-pointer transition-colors
                ${isActive
                                    ? 'text-[--color-accent-primary]'
                                    : 'text-[--color-text-muted]'
                                }`}
                        >
                            <div className={`transition-transform ${isActive ? 'scale-110' : ''}`}>
                                {tab.icon}
                            </div>
                            <span className={`text-[9px] font-medium ${isActive ? 'text-[--color-accent-primary]' : ''}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
