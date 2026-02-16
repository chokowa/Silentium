import { useRef, useState, useEffect, useCallback } from 'react';
import { SpectralAnalyzer } from '../services/audio/spectral/SpectralAnalyzer';
import { FootstepDetector } from '../services/audio/detectors/FootstepDetector';
import { FrictionDetector } from '../services/audio/detectors/FrictionDetector';
import { GeneralDetector } from '../services/audio/detectors/GeneralDetector';
import type { NoiseEvent, DetectionConfig } from '../services/audio/types/AudioAnalysisTypes';

export function useAudioAnalysis(analyser: AnalyserNode | null, isActive: boolean) {
    const [events, setEvents] = useState<NoiseEvent[]>([]);

    // Configuration State
    const [config, setConfig] = useState<DetectionConfig>({
        frictionSensitivity: 0.6,
        footstepSensitivity: 3.5,
        genericSensitivity: 1.0
    });

    const [isCalibrating, setIsCalibrating] = useState(false);
    const calibrationBuffer = useRef<{ totalEnergy: number[], frictionMetric: number[], flux: number[] }>({ totalEnergy: [], frictionMetric: [], flux: [] });

    // Logic Instances
    const spectralAnalyzerRef = useRef<SpectralAnalyzer | null>(null);
    const footstepDetectorRef = useRef<FootstepDetector | null>(null);
    const frictionDetectorRef = useRef<FrictionDetector | null>(null);
    const generalDetectorRef = useRef<GeneralDetector | null>(null);

    // Initialization
    useEffect(() => {
        if (!analyser) return;

        spectralAnalyzerRef.current = new SpectralAnalyzer(analyser.context.sampleRate);
        footstepDetectorRef.current = new FootstepDetector();
        frictionDetectorRef.current = new FrictionDetector();
        generalDetectorRef.current = new GeneralDetector();

        // Reset
        setEvents([]);
    }, [analyser]);

    // Analysis Loop
    useEffect(() => {
        if (!isActive || !analyser) return;

        let animationFrameId: number;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const analyze = () => {
            if (!spectralAnalyzerRef.current || !footstepDetectorRef.current || !frictionDetectorRef.current) {
                animationFrameId = requestAnimationFrame(analyze);
                return;
            }

            analyser.getByteFrequencyData(dataArray);

            // 1. Feature Extraction
            const features = spectralAnalyzerRef.current.analyze(dataArray);
            const now = Date.now();

            // Calibration Mode
            if (isCalibrating) {
                calibrationBuffer.current.totalEnergy.push(features.energy);
                calibrationBuffer.current.frictionMetric.push(
                    (features.lowBandEnergy * 0.5) + features.midBandEnergy
                );
                calibrationBuffer.current.flux.push(features.spectralFlux);

                animationFrameId = requestAnimationFrame(analyze);
                return;
            }

            // 2. Detection
            const newEvents: NoiseEvent[] = [];

            let footstep = footstepDetectorRef.current.detect(features, now, config);
            let friction = frictionDetectorRef.current.detect(features, now, config);

            // Conflict Resolution: If both detected, pick higher confidence
            if (footstep && friction) {
                if (footstep.confidence >= friction.confidence) {
                    friction = null;
                } else {
                    footstep = null;
                }
            }

            if (footstep) newEvents.push(footstep);
            if (friction) newEvents.push(friction);

            // Generic Detector
            // Priority Logic:
            // 1. Friction (Continuous) - If detecting, suppress others or mark as secondary?
            //    -> If frictionDetector is detecting (even if not emitting new event), verify via isDetecting
            // 2. Footstep (Impact) - Can coexist with friction but distinct
            // 3. Generic - Fallback for loud noises not covered above.
            //    If friction is active, we should NOT trigger Generic to avoid double-counting.

            if (generalDetectorRef.current) {
                // Check if friction is currently active (continuous detection state)
                const isFrictionActive = frictionDetectorRef.current?.isDetecting ?? false;

                // Friction検知中、または同一フレームでFriction/Footstepが検知された場合はGenericをスキップ
                if (!isFrictionActive && !friction && !footstep) {
                    const generic = generalDetectorRef.current.detect(features, now, config);
                    if (generic) {
                        newEvents.push(generic);
                    }
                }
            }

            // 3. Update State (Accumulate events for log / display)
            if (newEvents.length > 0) {
                setEvents(prev => {
                    // Keep last 50 events max
                    const updated = [...prev, ...newEvents];
                    return updated.slice(-50);
                });
            }

            animationFrameId = requestAnimationFrame(analyze);
        };

        analyze();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isActive, analyser, config, isCalibrating]);

    const clearEvents = useCallback(() => {
        setEvents([]);
    }, []);

    // Calibration Functions
    const startCalibration = useCallback(() => {
        setIsCalibrating(true);
        calibrationBuffer.current = { totalEnergy: [], frictionMetric: [], flux: [] };

        // 3秒後にキャリブレーション終了
        setTimeout(() => {
            setIsCalibrating(false);
            const { totalEnergy, frictionMetric, flux } = calibrationBuffer.current;

            if (totalEnergy.length === 0) return;

            // 最大値をベースラインとして採用 (ノイズフロアのピーク)
            // マージンを広く取る (x1.5 ~ x2.0)
            const maxTotalEnergy = Math.max(...totalEnergy);
            const maxFrictionMetric = Math.max(...frictionMetric);
            const maxFlux = Math.max(...flux);

            setConfig(prev => ({
                ...prev,
                // Additive Margins
                // Friction: Mid/Low noise floor + 1000 (approx. +3-5dB effectively)
                frictionThreshold: Math.max(2000.0, maxFrictionMetric + 1000.0),

                // Footstep: Mid/Low noise floor + 1500
                // Using FrictionMetric as proxy for noise floor in relevant bands
                footstepThreshold: Math.max(3000.0, maxFrictionMetric + 1500.0),

                // Generic: Total Noise Floor + 4000
                // Requires significantly louder event
                genericThreshold: Math.max(5000.0, maxTotalEnergy + 4000.0)
            }));

            console.log("Calibration Completed:", { maxTotalEnergy, maxFrictionMetric, maxFlux });
        }, 3000);
    }, []);

    const updateSensitivity = useCallback((type: 'friction' | 'footstep' | 'generic', value: number) => {
        setConfig(prev => ({
            ...prev,
            [type === 'friction' ? 'frictionSensitivity' : type === 'footstep' ? 'footstepSensitivity' : 'genericSensitivity']: value
        }));
    }, []);

    return {
        events,
        clearEvents,
        config,
        isCalibrating,
        startCalibration,
        updateSensitivity
    };
}
