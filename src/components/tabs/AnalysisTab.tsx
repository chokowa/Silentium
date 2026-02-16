import { useState } from 'react';
import Spectrogram from '../visualization/Spectrogram';
import type { NoiseEvent, DetectionConfig } from '../../services/audio/types/AudioAnalysisTypes';
import { MicOff, Settings2, Activity } from 'lucide-react';

interface AnalysisTabProps {
    micAnalyser: AnalyserNode | null;
    micActive: boolean;
    events: NoiseEvent[];

    // Calibration Props
    config: DetectionConfig;
    isCalibrating: boolean;
    onStartCalibration: () => void;
    onUpdateSensitivity: (type: 'friction' | 'footstep' | 'generic', value: number) => void;
    onAnalyzeAndMask: () => void;
    onEventClick?: (event: NoiseEvent) => void;
}

export default function AnalysisTab({
    micAnalyser,
    micActive,
    events,
    config,
    isCalibrating,
    onStartCalibration,
    onUpdateSensitivity,
    onAnalyzeAndMask,
    onEventClick
}: AnalysisTabProps) {
    // スペクトログラム表示感度
    const [visualSensitivity, setVisualSensitivity] = useState(1.0);

    // 最新のイベントを上にする
    const recentEvents = [...events].reverse().slice(0, 10);

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-[--color-text-muted] uppercase tracking-wider">
                    Spectrogram Analysis
                </h2>
                <div className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${micActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[--color-text-muted]">
                        {micActive ? 'Monitoring' : 'Mic Inactive'}
                    </span>
                </div>
            </div>

            {/* Controls & Calibration */}
            <div className="bg-black/10 rounded-lg p-3 border border-white/5 space-y-3">
                {/* ... existing header ... */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[--color-text-secondary]">
                        <Settings2 size={14} />
                        <span>Detection Settings</span>
                    </div>
                    {/* ... existing buttons ... */}
                    <div className="flex gap-2">
                        <button
                            onClick={onStartCalibration}
                            disabled={!micActive || isCalibrating}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-all
                                ${isCalibrating
                                    ? 'bg-amber-500/20 text-amber-500 animate-pulse'
                                    : micActive
                                        ? 'bg-white/5 hover:bg-white/10 text-white'
                                        : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
                        >
                            <Activity size={14} />
                            {isCalibrating ? 'Calibrating...' : 'Auto Calibrate'}
                        </button>

                        <button
                            onClick={onAnalyzeAndMask}
                            disabled={events.length === 0}
                            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-emerald-600/80 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="Generate masking settings from recent events"
                        >
                            Analyze & Mask
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    {/* Visual Sensitivity Slider (New) */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-[--color-text-muted]">
                            <span>Visual Sens.</span>
                            <span>x{visualSensitivity.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1" max="3.0" step="0.1"
                            value={visualSensitivity}
                            onChange={(e) => setVisualSensitivity(parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Footstep Slider */}
                    <div className="space-y-1">
                        {/* ... */}
                        <div className="flex justify-between text-[10px] text-[--color-text-muted]">
                            <span>Footstep</span>
                            <span>x{config.footstepSensitivity.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1" max="5.0" step="0.1"
                            value={config.footstepSensitivity}
                            onChange={(e) => onUpdateSensitivity('footstep', parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Friction Slider */}
                    <div className="space-y-1">
                        {/* ... */}
                        <div className="flex justify-between text-[10px] text-[--color-text-muted]">
                            <span>Friction</span>
                            <span>x{config.frictionSensitivity.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1" max="5.0" step="0.1"
                            value={config.frictionSensitivity}
                            onChange={(e) => onUpdateSensitivity('friction', parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Generic Slider */}
                    <div className="space-y-1">
                        {/* ... */}
                        <div className="flex justify-between text-[10px] text-[--color-text-muted]">
                            <span>Generic</span>
                            <span>x{(config.genericSensitivity ?? 1.0).toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1" max="5.0" step="0.1"
                            value={config.genericSensitivity ?? 1.0}
                            onChange={(e) => onUpdateSensitivity('generic', parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Main Visualizer */}
            <div className="w-full bg-black/20 rounded-xl overflow-hidden border border-[--color-border] shadow-inner relative min-h-[200px]">
                {micActive && micAnalyser ? (
                    <Spectrogram
                        analyser={micAnalyser}
                        events={events}
                        height={240}
                        className="w-full"
                        sensitivity={visualSensitivity}
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[--color-text-muted] gap-2">
                        <MicOff size={32} />
                        <p className="text-sm">Microphone is off</p>
                    </div>
                )}
            </div>

            {/* Event Log */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-xs font-semibold text-[--color-text-muted] mb-3 uppercase tracking-wide">
                    Detected Events
                </h3>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin">
                    {recentEvents.length === 0 ? (
                        <div className="text-center py-8 text-[--color-text-muted] text-xs">
                            No events detected yet...
                        </div>
                    ) : (
                        recentEvents.map((event, idx) => (
                            <div
                                key={event.timestamp + idx}
                                onClick={() => onEventClick?.(event)}
                                className={`p-3 rounded-lg border flex items-center justify-between animate-in fade-in slide-in-from-right-2 duration-300 cursor-pointer hover:opacity-80 transition-opacity
                                    ${event.type === 'footstep'
                                        ? 'bg-red-500/10 border-red-500/30'
                                        : event.type === 'friction'
                                            ? 'bg-yellow-500/10 border-yellow-500/30'
                                            : 'bg-cyan-500/10 border-cyan-500/30'
                                    }`}
                                title="Click to create mask for this event"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">
                                        {event.type === 'footstep' ? '👣' : event.type === 'friction' ? '🔊' : '⚡'}
                                    </span>
                                    <div>
                                        <div className={`text-sm font-bold ${event.type === 'footstep' ? 'text-red-400' :
                                            event.type === 'friction' ? 'text-yellow-400' : 'text-cyan-400'
                                            }`}>
                                            {event.type === 'footstep' ? 'Footstep / Impact' :
                                                event.type === 'friction' ? 'Dragging / Friction' : 'Loud Noise (Generic)'}
                                        </div>
                                        <div className="text-[10px] text-[--color-text-muted] font-mono mt-0.5">
                                            {event.frequencyRange.min}Hz - {event.frequencyRange.max}Hz
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-[--color-text-muted] opacity-70">
                                        {new Date(event.timestamp).toLocaleTimeString().split(' ')[0]}
                                    </div>
                                    <div className="text-[10px] font-mono mt-0.5 opacity-50">
                                        conf: {(event.confidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
