import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Timer管理用Hook
 * アプリのライフサイクル(最小化・タブ切り替え)に影響されず、
 * 絶対時間(Date.now)を基準に計測する。
 */
export function useTimer(onTimeUp?: () => void) {
    const [timerMinutes, setTimerMinutes] = useState(0);
    const [timerRemaining, setTimerRemaining] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [expiryTime, setExpiryTime] = useState<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimerMinutes(0);
        setTimerRemaining(0);
        setIsTimerActive(false);
        setExpiryTime(null);
    }, []);

    const startTimer = useCallback((minutes: number) => {
        if (timerRef.current) clearInterval(timerRef.current);

        if (minutes <= 0) {
            stopTimer();
            return;
        }

        const now = Date.now();
        const end = now + minutes * 60 * 1000;

        setTimerMinutes(minutes);
        setExpiryTime(end);
        setTimerRemaining(minutes * 60);
        setIsTimerActive(true);
    }, [stopTimer]);

    // チック処理
    useEffect(() => {
        if (!isTimerActive || !expiryTime) return;

        timerRef.current = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((expiryTime - now) / 1000));

            setTimerRemaining(remaining);

            if (remaining <= 0) {
                stopTimer();
                if (onTimeUp) onTimeUp();
            }
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerActive, expiryTime, stopTimer, onTimeUp]);

    // 可視性変更時の補正 (タブ復帰時などに強制更新)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isTimerActive && expiryTime) {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((expiryTime - now) / 1000));
                setTimerRemaining(remaining);
                if (remaining <= 0) {
                    stopTimer();
                    if (onTimeUp) onTimeUp();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isTimerActive, expiryTime, stopTimer, onTimeUp]);

    return {
        timerMinutes,
        timerRemaining,
        isTimerActive,
        startTimer,
        stopTimer
    };
}
