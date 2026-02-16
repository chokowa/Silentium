import { describe, it, expect, beforeEach } from 'vitest';
import { FootstepDetector } from '../FootstepDetector';
import type { DetectionConfig, SpectralFeatures } from '../../types/AudioAnalysisTypes';

describe('FootstepDetector', () => {
    let detector: FootstepDetector;

    beforeEach(() => {
        detector = new FootstepDetector();
    });

    const createFeatures = (flux: number, lowEnd: number): SpectralFeatures => ({
        energy: flux + lowEnd,
        lowBandEnergy: lowEnd,
        midBandEnergy: 0,
        highBandEnergy: 0,
        spectralFlux: flux,
        spectralCentroid: 100
    });

    it('should detect high flux low energy signal as footstep', () => {
        // Flux > 50, LowEnergy > 80
        const input = createFeatures(100, 150);
        const event = detector.detect(input, 1000);

        expect(event).not.toBeNull();
        expect(event?.type).toBe('footstep');
        expect(event?.frequencyRange.max).toBe(300);
    });

    it('should ignore low energy signals', () => {
        // Flux ok, but LowEnergy too low
        const input = createFeatures(100, 20);
        const event = detector.detect(input, 1000);

        expect(event).toBeNull();
    });

    it('should respect cooldown period', () => {
        const input = createFeatures(100, 150);

        // 1st detection
        const event1 = detector.detect(input, 1000);
        expect(event1).not.toBeNull();

        // 2nd detection (immediate) -> should be ignored
        const event2 = detector.detect(input, 1100);
        expect(event2).toBeNull();

        // 3rd detection (after 300ms) -> should be detected
        const event3 = detector.detect(input, 1400);
        expect(event3).not.toBeNull();
    });

    it('should respect sensitivity configuration', () => {
        // デフォルトでは検知されないレベルの特徴量
        // Base Flux: 50, Base Energy: 80
        const weakFeatures = createFeatures(40, 70);
        expect(detector.detect(weakFeatures, 1000)).toBeNull();

        // 感度を上げる (x2.0) -> しきい値が半分になるはず (Flux: 25, Energy: 40)
        const config: DetectionConfig = {
            footstepSensitivity: 2.0,
            frictionSensitivity: 1.0,
            genericSensitivity: 1.0
        };
        const result = detector.detect(weakFeatures, 2000, config); // timestamp must advance
        expect(result).not.toBeNull();
        expect(result?.type).toBe('footstep');
    });

    it('should respect threshold configuration', () => {
        // デフォルトでは検知されるレベル
        const strongFeatures = createFeatures(60, 90);
        expect(detector.detect(strongFeatures, 1000)).not.toBeNull();

        // しきい値を上げる -> 検知されなくなるはず
        const config: DetectionConfig = {
            footstepSensitivity: 1.0,
            frictionSensitivity: 1.0,
            footstepThreshold: 200.0, // Energy threshold raised significantly
            genericSensitivity: 1.0
        };
        const result = detector.detect(strongFeatures, 2000, config);
        expect(result).toBeNull();
    });
});
