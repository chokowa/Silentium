import { useState, useEffect, useCallback, useRef } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { usePresets } from './hooks/usePresets';
import { MicrophoneAnalyzer } from './services/audio/MicrophoneAnalyzer';
import { AutoMaskingService } from './services/audio/AutoMaskingService';


// Layout & Screens
import AppLayout, { type TabId } from './components/common/AppLayout';
import HomeTab from './components/tabs/HomeTab';
import MixerTab from './components/tabs/MixerTab';
import EQTab from './components/tabs/EQTab';
import AnalysisTab from './components/tabs/AnalysisTab';
import TimerTab from './components/tabs/TimerTab';
import { useAudioAnalysis } from './hooks/useAudioAnalysis';
import { useTimer } from './hooks/useTimer';

import type { NoiseType, EQBandConfig, RoomSize } from './types/audio';

/**
 * Silentium — App Container
 * New Unified AppLayout Architecture
 */
export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<TabId>('home');

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Audio State
  const [micActive, setMicActive] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null);

  // Hooks
  const engine = useAudioEngine();
  const presets = usePresets();
  const micRef = useRef<MicrophoneAnalyzer | null>(null);
  const autoMaskingRef = useRef<AutoMaskingService | null>(null);

  // Analysis Hook
  const { events, config, isCalibrating, startCalibration, updateSensitivity } = useAudioAnalysis(micAnalyser, micActive);

  // Timer Hook
  const timer = useTimer(() => {
    if (engine.isPlaying) engine.togglePlay();
  });

  // Initialize Engine
  useEffect(() => {
    if (!engine.isInitialized) {
      engine.initialize();
    }
  }, [engine]);

  // Sync Config
  useEffect(() => {
    if (engine.isInitialized) {
      engine.applyConfig(presets.currentConfig);
    }
  }, [presets.currentConfig, engine.isInitialized, engine]);

  // Theme Effect
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // ===== Handlers =====

  const handleSelectPreset = useCallback((index: number) => {
    presets.selectPreset(index);
  }, [presets]);

  const handleMicToggle = useCallback(async () => {
    if (micActive) {
      micRef.current?.stop();
      setMicActive(false);
      setIsLearning(false);
      setMicAnalyser(null);
      autoMaskingRef.current = null;
    } else {
      if (!micRef.current) {
        micRef.current = new MicrophoneAnalyzer();
      }
      const ok = await micRef.current.start();
      if (ok) {
        setMicActive(true);
        setMicAnalyser(micRef.current.getAnalyser());
        autoMaskingRef.current = new AutoMaskingService(micRef.current);
      }
    }
  }, [micActive]);

  const handleAutoMask = useCallback(() => {
    if (!autoMaskingRef.current) return;
    const optimalSettings = autoMaskingRef.current.calculateOptimalSettings(presets.currentConfig);
    presets.updateConfig({
      ...optimalSettings,
      name: 'Auto Masked',
      icon: '✨',
      description: 'Automatically optimized for current noise.'
    });
  }, [presets]);

  const handleToggleLearning = useCallback(() => {
    if (!autoMaskingRef.current) return;
    if (isLearning) {
      const optimalSettings = autoMaskingRef.current.stopLearning(presets.currentConfig);
      presets.updateConfig({
        ...optimalSettings,
        name: 'Adaptive Mask',
        icon: '🛡',
        description: 'Optimized based on noise history.'
      });
      setIsLearning(false);
    } else {
      autoMaskingRef.current.startLearning();
      setIsLearning(true);
    }
  }, [isLearning, presets]);

  // Volume & EQ Handlers
  const handleNoiseVolumeChange = useCallback((type: NoiseType, value: number) => {
    const newVolumes = { ...presets.currentConfig.noiseVolumes, [type]: value };
    presets.updateConfig({ noiseVolumes: newVolumes });
    engine.setNoiseVolume(type, value);
  }, [presets, engine]);

  const handleMasterVolumeChange = useCallback((value: number) => {
    presets.updateConfig({ masterVolume: value });
    engine.setMasterVolume(value);
  }, [presets, engine]);

  // MediaSession API - Persistence & Remote Control
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Silentium',
        artist: 'Noise Masking Engine',
        album: 'Acoustic Comfort',
        artwork: [
          { src: 'https://chokowa.github.io/Silentium/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'https://chokowa.github.io/Silentium/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (!engine.isPlaying) engine.togglePlay();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (engine.isPlaying) engine.togglePlay();
      });
    }
  }, [engine]);

  // Sync MediaSession Playback State
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = engine.isPlaying ? 'playing' : 'paused';
    }
  }, [engine.isPlaying]);

  const handleRumbleIntensityChange = useCallback((value: number) => {
    presets.updateConfig({ rumbleIntensity: value });
    engine.setRumbleIntensity(value);
  }, [presets, engine]);

  const handleRumbleCrossoverChange = useCallback((freq: number) => {
    presets.updateConfig({ rumbleCrossover: freq });
    engine.setRumbleCrossover(freq);
  }, [presets, engine]);

  const handleEQChange = useCallback((bands: EQBandConfig[]) => {
    presets.updateConfig({ eqBands: bands });
    engine.setEQ(bands);
  }, [presets, engine]);

  const handleHPFChange = useCallback((freq: number) => {
    presets.updateConfig({ hpf: freq });
    engine.setHPF(freq);
  }, [presets, engine]);

  const handleLPFChange = useCallback((freq: number) => {
    presets.updateConfig({ lpf: freq });
    engine.setLPF(freq);
  }, [presets, engine]);

  const handleNeighborSafeChange = useCallback((enabled: boolean) => {
    presets.updateConfig({ neighborSafe: enabled });
    engine.setNeighborSafe(enabled);
  }, [presets, engine]);

  const handleNeighborSafeFreqChange = useCallback((freq: number) => {
    presets.updateConfig({ neighborSafeFreq: freq });
    engine.setNeighborSafeFreq(freq);
  }, [presets, engine]);

  const handleRoomSizeChange = useCallback((size: RoomSize) => {
    presets.updateConfig({ roomSize: size });
    engine.setRoomSize(size);
  }, [presets, engine]);

  const handleModulationChange = useCallback((value: number) => {
    presets.updateConfig({ modulation: value });
    engine.setModulation(value);
  }, [presets, engine]);

  const handleAnalyzeAndMask = useCallback(() => {
    if (!autoMaskingRef.current) return;

    // イベント履歴から最適設定を計算
    const optimalSettings = autoMaskingRef.current.calculateOptimalSettingsFromEvents(
      events,
      presets.currentConfig
    );

    // 設定を適用
    if (Object.keys(optimalSettings).length > 0) {
      alert(`Auto Masking Applied!\nAnalyzed ${events.length} events.\nSettings updated based on noise history.`);
      presets.updateConfig({
        ...optimalSettings,
        name: 'Adaptive Mask',
        icon: '🛡',
        description: 'Optimized based on detected event history.'
      });
    } else {
      alert("No significant events found to analyze yet.\nPlease wait for some noise events (Footstep/Friction/Generic) to occur.");
    }
  }, [events, presets]);

  const handleEventClick = useCallback((event: import('./services/audio/types/AudioAnalysisTypes').NoiseEvent) => {
    if (!autoMaskingRef.current) return;

    const maskSettings = autoMaskingRef.current.calculateMaskForSingleEvent(event, presets.currentConfig);

    presets.updateConfig({
      ...maskSettings,
      name: `Mask: ${event.type}`,
      icon: '🎯',
      description: `Optimized for ${event.type} at ${(event.frequencyRange.min + event.frequencyRange.max) / 2}Hz`
    });

    // Optional: Visual feedback
    alert(`Created mask for ${event.type}\nFreq: ${((event.frequencyRange.min + event.frequencyRange.max) / 2).toFixed(0)}Hz`);
  }, [presets]);

  // Derived Props
  const noiseAnalyser = engine.getMasterAnalyser();
  const currentPreset = presets.currentConfig;

  return (
    <div className="h-full bg-[--color-bg-primary] transition-colors duration-300">
      {/* Background Mesh (Global) */}
      <div className="bg-mesh opacity-50 dark:opacity-100 transition-opacity duration-300" />

      <AppLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}

        isPlaying={engine.isPlaying}
        onTogglePlay={engine.togglePlay}
        masterVolume={currentPreset.masterVolume}
        onMasterVolumeChange={handleMasterVolumeChange}

        onAutoMask={handleAutoMask}
        onToggleLearning={handleToggleLearning}
        isLearning={isLearning}
        micActive={micActive}
        onMicToggle={handleMicToggle}

        noiseAnalyser={noiseAnalyser}
        micAnalyser={micAnalyser}

        theme={theme}
        onToggleTheme={toggleTheme}
        currentPresetName={currentPreset.name}
      >
        {/* Tab Content Switching */}
        {activeTab === 'home' && (
          <HomeTab
            presets={presets.builtinPresets}
            activePresetIndex={presets.activeBuiltinIndex}
            onSelectPreset={handleSelectPreset}
            neighborSafe={currentPreset.neighborSafe}
            onNeighborSafeChange={handleNeighborSafeChange}
            userPresets={presets.userPresets}
            activeUserPresetId={presets.activeUserPresetId}
            onSaveUserPreset={presets.saveUserPreset}
            onLoadUserPreset={presets.loadUserPreset}
            onDeleteUserPreset={presets.deleteUserPreset}
          />
        )}

        {activeTab === 'mixer' && (
          <MixerTab
            config={currentPreset}
            onNoiseVolumeChange={handleNoiseVolumeChange}
            onRumbleIntensityChange={handleRumbleIntensityChange}
            onRumbleCrossoverChange={handleRumbleCrossoverChange}
            onModulationChange={handleModulationChange}
          />
        )}

        {activeTab === 'eq' && (
          <EQTab
            config={currentPreset}
            onEQChange={handleEQChange}
            onHPFChange={handleHPFChange}
            onLPFChange={handleLPFChange}
            neighborSafe={currentPreset.neighborSafe}
            onNeighborSafeChange={handleNeighborSafeChange}
            onNeighborSafeFreqChange={handleNeighborSafeFreqChange}
            noiseAnalyser={noiseAnalyser}
            micAnalyser={micAnalyser}
            micActive={micActive}
            onRoomSizeChange={handleRoomSizeChange}
          />
        )}



        {activeTab === 'analysis' && (
          <AnalysisTab
            micAnalyser={micAnalyser}
            micActive={micActive}
            events={events}
            config={config}
            isCalibrating={isCalibrating}
            onStartCalibration={startCalibration}
            onUpdateSensitivity={updateSensitivity}
            onAnalyzeAndMask={handleAnalyzeAndMask}
            onEventClick={handleEventClick}
          />
        )}

        {activeTab === 'timer' && (
          <TimerTab
            timer={timer}
          />
        )}
      </AppLayout>
    </div>
  );
}
