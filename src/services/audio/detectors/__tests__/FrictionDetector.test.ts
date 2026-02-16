import { describe, it, expect, beforeEach } from 'vitest';
import { FrictionDetector } from '../FrictionDetector';
import type { DetectionConfig, SpectralFeatures } from '../../types/AudioAnalysisTypes';

describe('FrictionDetector', () => {
    let detector: FrictionDetector;

    beforeEach(() => {
        detector = new FrictionDetector();
    });

    const createFeatures = (midEnergy: number): SpectralFeatures => ({
        energy: midEnergy,
        lowBandEnergy: 0,
        midBandEnergy: midEnergy,
        highBandEnergy: 0,
        spectralFlux: 0,
        spectralCentroid: 500
    });

    it('should not detect short bursts', () => {
        // 1 frame of high energy
        const input = createFeatures(100);
        const event = detector.detect(input, 1000);
        expect(event).toBeNull();
    });

    it('should detect continuous noise after threshold', () => {
        const input = createFeatures(100);

        // Feed 5 frames (threshold is 5)
        for (let i = 0; i < 4; i++) {
            expect(detector.detect(input, 1000 + i * 20)).toBeNull();
        }

        // 5th frame should trigger
        const event = detector.detect(input, 1100);
        expect(event).not.toBeNull();
        expect(event?.type).toBe('friction');
    });

    it('should reset when noise stops', () => {
        // Trigger detection first
        const inputHigh = createFeatures(100);
        for (let i = 0; i < 6; i++) {
            detector.detect(inputHigh, 1000 + i * 20);
        }

        // Stop noise
        const inputSilence = createFeatures(0);
        detector.detect(inputSilence, 2000);

        // Start noise again (1 frame) - should not trigger immediately
        const event = detector.detect(inputHigh, 2020);
        expect(event).toBeNull();
    });

    it('should respect sensitivity configuration', () => {
        // デフォルトでは検知されないレベル (threshold 40.0)
        const weakFeatures = createFeatures(30);
        // Energy = 30 < 40
        expect(detector.detect(weakFeatures, 1000)).toBeNull();

        // 感度を上げる (x2.0) -> しきい値 20.0
        const config: DetectionConfig = {
            footstepSensitivity: 1.0,
            frictionSensitivity: 2.0,
            genericSensitivity: 1.0
        };

        // 5フレーム連続検知が必要
        for (let i = 0; i < 4; i++) {
            detector.detect(weakFeatures, 1000 + i * 20, config);
        }
        const result = detector.detect(weakFeatures, 1100, config);
        expect(result).not.toBeNull();
        expect(result?.type).toBe('friction');
    });
});
