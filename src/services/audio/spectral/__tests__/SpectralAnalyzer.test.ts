import { describe, it, expect, beforeEach } from 'vitest';
import { SpectralAnalyzer } from '../SpectralAnalyzer';

describe('SpectralAnalyzer', () => {
    let analyzer: SpectralAnalyzer;
    const SAMPLE_RATE = 44100;
    const FFT_SIZE = 1024; // Bin count will be 512

    beforeEach(() => {
        analyzer = new SpectralAnalyzer(SAMPLE_RATE);
    });

    it('should initialize correctly', () => {
        expect(analyzer).toBeDefined();
    });

    it('should calculate total energy correctly', () => {
        // Mock frequency data (all zeros except one bin)
        const data = new Uint8Array(FFT_SIZE / 2);
        data[10] = 100; // Arbitrary bin

        const features = analyzer.analyze(data);
        expect(features.energy).toBe(100);
    });

    it('should calculate spectral flux (change from previous frame)', () => {
        const binCount = FFT_SIZE / 2;

        // Frame 1: Silence
        const frame1 = new Uint8Array(binCount).fill(0);
        const feat1 = analyzer.analyze(frame1);
        expect(feat1.spectralFlux).toBe(0); // Initial frame has no previous to compare

        // Frame 2: Impulse
        const frame2 = new Uint8Array(binCount).fill(0);
        frame2[50] = 200;
        const feat2 = analyzer.analyze(frame2);

        // Flux should be sum of abs diff: |200 - 0| = 200
        expect(feat2.spectralFlux).toBe(200);

        // Frame 3: Same as Frame 2
        const feat3 = analyzer.analyze(frame2);
        // Flux should be |200 - 200| = 0
        expect(feat3.spectralFlux).toBe(0);
    });

    it('should calculate spectral centroid correctly', () => {
        const binCount = FFT_SIZE / 2;
        const data = new Uint8Array(binCount).fill(0);

        // Single bin active at index 10
        data[10] = 255;

        const features = analyzer.analyze(data);

        // Hz per bin = (44100 / 2) / 512 = 43.066...
        const hzPerBin = (SAMPLE_RATE / 2) / binCount;
        const expectedFreq = 10 * hzPerBin;

        expect(features.spectralCentroid).toBeCloseTo(expectedFreq, 1);
    });

    it('should separate energy into bands', () => {
        const binCount = FFT_SIZE / 2;
        const hzPerBin = (SAMPLE_RATE / 2) / binCount; // ~43Hz

        const data = new Uint8Array(binCount).fill(0);

        // 1. Low Frequency (~100Hz -> bin index ~2)
        const lowBin = Math.floor(100 / hzPerBin);
        data[lowBin] = 100;

        // 2. Mid Frequency (~1000Hz -> bin index ~23)
        const midBin = Math.floor(1000 / hzPerBin);
        data[midBin] = 50;

        // 3. High Frequency (~5000Hz -> bin index ~116)
        const highBin = Math.floor(5000 / hzPerBin);
        data[highBin] = 20;

        const features = analyzer.analyze(data);

        expect(features.lowBandEnergy).toBe(100);
        expect(features.midBandEnergy).toBe(50);
        expect(features.highBandEnergy).toBe(20);
        expect(features.energy).toBe(170);
    });
});
