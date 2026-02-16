import { describe, it, expect, beforeEach } from 'vitest';
import { GeneralDetector } from '../GeneralDetector';
import type { DetectionConfig, SpectralFeatures } from '../../types/AudioAnalysisTypes';

describe('GeneralDetector', () => {
    let detector: GeneralDetector;

    beforeEach(() => {
        detector = new GeneralDetector();
    });

    const mockFeatures: SpectralFeatures = {
        energy: 0,
        lowBandEnergy: 0,
        midBandEnergy: 0,
        highBandEnergy: 0,
        spectralFlux: 0,
        spectralCentroid: 0
    };

    it('should detect high energy signal as generic noise', () => {
        // Threshold: Energy 5000, Flux 500
        const input = { ...mockFeatures, energy: 6000, midBandEnergy: 6000, spectralFlux: 600 };
        const event = detector.detect(input, 1000);

        expect(event).not.toBeNull();
        expect(event?.type).toBe('generic');
        expect(event?.frequencyRange.min).toBe(300);
        expect(event?.frequencyRange.max).toBe(2000);
    });

    it('should ignore low energy signals', () => {
        const input = { ...mockFeatures, energy: 3000, spectralFlux: 600 };
        const event = detector.detect(input, 1000);

        expect(event).toBeNull();
    });

    it('should ignore low flux signals (stationary noise)', () => {
        const input = { ...mockFeatures, energy: 6000, spectralFlux: 100 };
        const event = detector.detect(input, 1000);

        expect(event).toBeNull();
    });


    it('should respect sensitivity configuration', () => {
        // デフォルトでは検知されないレベル (threshold 5000.0)
        const weakFeatures = { ...mockFeatures, energy: 4000, spectralFlux: 600, lowBandEnergy: 0, midBandEnergy: 0, highBandEnergy: 0 };
        expect(detector.detect(weakFeatures, 1000)).toBeNull();

        // 感度を上げる (x2.0) -> しきい値 2500.0
        const config: DetectionConfig = {
            footstepSensitivity: 1.0,
            frictionSensitivity: 1.0,
            genericSensitivity: 2.0
        };
        const result = detector.detect(weakFeatures, 2000, config);
        expect(result).not.toBeNull();
        expect(result?.type).toBe('generic');
    });

    it('should respect threshold configuration', () => {
        // デフォルトでは検知されるレベル
        const strongFeatures = { ...mockFeatures, energy: 6000, spectralFlux: 600 };
        expect(detector.detect(strongFeatures, 1000)).not.toBeNull();

        // しきい値を上げる -> 検知されなくなるはず
        const config: DetectionConfig = {
            footstepSensitivity: 1.0,
            frictionSensitivity: 1.0,
            genericSensitivity: 1.0,
            genericThreshold: 8000.0
        };
        const result = detector.detect(strongFeatures, 2000, config);
        expect(result).toBeNull();
    });
});
