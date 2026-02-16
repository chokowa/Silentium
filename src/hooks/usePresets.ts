import { useState, useCallback, useEffect } from 'react';
import type { SilentiumConfig, SavedPreset } from '../types/audio';
import { DEFAULT_CONFIG, DEFAULT_EQ_BANDS } from '../types/audio';
import { PRESETS } from '../utils/presets';

const STORAGE_KEY = 'silentium_user_presets';
const CURRENT_KEY = 'silentium_current_config';

/**
 * プリセット管理Hook
 * 組み込みプリセット + ユーザー保存プリセット + 現在の設定
 */
export function usePresets() {
    const [currentConfig, setCurrentConfig] = useState<SilentiumConfig>(() => {
        // localStorageから前回の設定を復元
        try {
            const saved = localStorage.getItem(CURRENT_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // データマイグレーション: EQバンド数が異なる(古い5バンド)場合はデフォルトにリセット
                if (!parsed.eqBands || parsed.eqBands.length !== DEFAULT_EQ_BANDS.length) {
                    console.log("Migrating legacy EQ settings to 10-band format.");
                    return { ...DEFAULT_CONFIG };
                }
                return parsed;
            }
        } catch { /* noop */ }
        return { ...DEFAULT_CONFIG };
    });

    // アクティブなプリセットの状態を追跡
    const [activeBuiltinIndex, setActiveBuiltinIndex] = useState<number | null>(0);
    const [activeUserPresetId, setActiveUserPresetId] = useState<string | null>(null);

    const [userPresets, setUserPresets] = useState<SavedPreset[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch { /* noop */ }
        return [];
    });

    // 設定変更時にlocalStorageへ保存
    useEffect(() => {
        try {
            localStorage.setItem(CURRENT_KEY, JSON.stringify(currentConfig));
        } catch { /* noop */ }
    }, [currentConfig]);

    // ユーザープリセット変更時にlocalStorageへ保存
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets));
        } catch { /* noop */ }
    }, [userPresets]);

    /** 組み込みプリセットを選択 */
    const selectPreset = useCallback((index: number) => {
        if (index >= 0 && index < PRESETS.length) {
            // オブジェクトのディープコピーに近い形で新しい参照を作る
            const presetBase = PRESETS[index];
            const preset: SilentiumConfig = {
                ...presetBase,
                noiseVolumes: { ...presetBase.noiseVolumes },
                eqBands: presetBase.eqBands.map(b => ({ ...b }))
            };
            setCurrentConfig(prev => ({
                ...preset,
                masterVolume: prev.masterVolume // 既存のボリュームを維持
            }));

            // ビジュアル状態の更新
            setActiveBuiltinIndex(index);
            setActiveUserPresetId(null);
        }
    }, []);

    /** 現在の設定を部分更新 */
    const updateConfig = useCallback((partial: Partial<SilentiumConfig>) => {
        setCurrentConfig(prev => ({ ...prev, ...partial }));
        // スライダーを動かした場合は選択状態を解除（任意だが、通常はマニュアル操作時は未選択にする）
        // setActiveBuiltinIndex(null);
        // setActiveUserPresetId(null);
    }, []);

    /** 現在の設定をユーザープリセットとして保存 */
    const saveUserPreset = useCallback((name: string) => {
        setUserPresets(prev => {
            if (prev.length >= 6) return prev; // 最大6つまで
            const now = Date.now();
            const preset: SavedPreset = {
                id: `user_${now}`,
                config: { ...currentConfig, name },
                createdAt: now,
                updatedAt: now,
            };
            return [...prev, preset];
        });
    }, [currentConfig]);

    /** ユーザープリセットを読み込み */
    const loadUserPreset = useCallback((id: string) => {
        const preset = userPresets.find(p => p.id === id);
        if (preset) {
            setCurrentConfig({ ...preset.config });

            // ビジュアル状態の更新
            setActiveBuiltinIndex(null);
            setActiveUserPresetId(id);
        }
    }, [userPresets]);

    /** ユーザープリセットを削除 */
    const deleteUserPreset = useCallback((id: string) => {
        setUserPresets(prev => prev.filter(p => p.id !== id));
        if (activeUserPresetId === id) {
            setActiveUserPresetId(null);
        }
    }, [activeUserPresetId]);

    return {
        currentConfig,
        builtinPresets: PRESETS,
        userPresets,
        activeBuiltinIndex,
        activeUserPresetId,
        selectPreset,
        updateConfig,
        saveUserPreset,
        loadUserPreset,
        deleteUserPreset,
    };
}
