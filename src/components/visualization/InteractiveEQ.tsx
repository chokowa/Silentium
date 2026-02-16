import { useEffect, useRef, useState } from 'react';
import type { EQBandConfig } from '../../types/audio';
import './InteractiveEQ.css'; // Don't allow this to interfere, but keep import to avoid break

interface InteractiveEQProps {
    noiseAnalyser: AnalyserNode | null;
    micAnalyser: AnalyserNode | null;
    micActive: boolean;
    eqBands: EQBandConfig[];
    onEQChange: (bands: EQBandConfig[]) => void;
}

export default function InteractiveEQ({
    noiseAnalyser,
    micAnalyser,
    micActive,
    eqBands,
    onEQChange,
}: InteractiveEQProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ドラッグ操作の状態管理
    const [draggingBandIndex, setDraggingBandIndex] = useState<number | null>(null);

    // 最新のeqBandsをRefに保持（アニメーションループ内での参照用）
    const eqBandsRef = useRef(eqBands);
    useEffect(() => {
        eqBandsRef.current = eqBands;
    }, [eqBands]);

    // 現在のテーマ色設定を保持
    const themeColorsRef = useRef({
        bg: '#18181b', // Dark default
        grid: 'rgba(255, 255, 255, 0.03)',
        gridMain: 'rgba(255, 255, 255, 0.1)',
        spectrumMicFill: 'rgba(255, 100, 80, 0)',
        spectrumMicStroke: 'rgba(255, 100, 80, 0.5)',
        spectrumNoiseFill: 'rgba(124, 111, 245, 0.1)',
        spectrumNoiseStroke: 'rgba(124, 111, 245, 0.6)',
    });

    useEffect(() => {
        let animationFrameId: number;

        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            // テーマ検出 (毎フレームチェックは重いが、確実に追従させる簡易策)
            // 実際は classList 参照は高速なので問題ない範囲
            const isDark = document.documentElement.classList.contains('dark');
            if (isDark) {
                themeColorsRef.current = {
                    bg: '#18181b',
                    grid: 'rgba(255, 255, 255, 0.03)',
                    gridMain: 'rgba(255, 255, 255, 0.1)',
                    spectrumMicFill: 'rgba(255, 100, 80, 0)',
                    spectrumMicStroke: 'rgba(255, 100, 80, 0.5)',
                    spectrumNoiseFill: 'rgba(124, 111, 245, 0.1)',
                    spectrumNoiseStroke: 'rgba(124, 111, 245, 0.6)',
                };
            } else {
                // Light Theme
                themeColorsRef.current = {
                    bg: '#ffffff',
                    grid: 'rgba(0, 0, 0, 0.05)',
                    gridMain: 'rgba(0, 0, 0, 0.1)',
                    spectrumMicFill: 'rgba(239, 68, 68, 0)',
                    spectrumMicStroke: 'rgba(239, 68, 68, 0.6)',
                    spectrumNoiseFill: 'rgba(59, 130, 246, 0.1)',
                    spectrumNoiseStroke: 'rgba(59, 130, 246, 0.6)',
                };
            }
            const colors = themeColorsRef.current;

            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) return;

            // Retina対応 & サイズ調整
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            // サイズ変更検知
            const targetWidth = Math.floor(rect.width * dpr);
            const targetHeight = Math.floor(rect.height * dpr);

            if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                ctx.scale(dpr, dpr);
            }

            const w = rect.width;
            const h = rect.height;

            // 背景
            ctx.fillStyle = colors.bg;
            ctx.fillRect(0, 0, w, h);

            // 現在のバンド設定を取得
            const currentBands = eqBandsRef.current;

            // グリッド線 (等間隔)
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 1;
            const bandWidth = w / currentBands.length;

            currentBands.forEach((_, i) => {
                const x = (i + 0.5) * bandWidth; // 中心線
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            });

            // dBグリッド
            [0.2, 0.35, 0.5, 0.65, 0.8].forEach(ratio => {
                const y = h * ratio;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.strokeStyle = ratio === 0.5 ? colors.gridMain : colors.grid;
                ctx.stroke();
            });

            // スペクトラム描画関数
            const drawGraphicSpectrum = (analyser: AnalyserNode, colorStart: string, colorEnd: string, isFill: boolean) => {
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyser.getByteFrequencyData(dataArray);

                const freqs = currentBands.map(b => b.frequency);
                const nyquist = analyser.context.sampleRate / 2;

                const ranges = freqs.map((freq, i) => {
                    const lowerInfo = i === 0 ? freq / 1.5 : freqs[i - 1];
                    const upperInfo = i === freqs.length - 1 ? freq * 1.5 : freqs[i + 1];
                    const lowerBound = i === 0 ? 20 : Math.sqrt(freq * lowerInfo);
                    const upperBound = i === freqs.length - 1 ? 20000 : Math.sqrt(freq * upperInfo);

                    const lowIndex = Math.floor((lowerBound / nyquist) * bufferLength);
                    const highIndex = Math.ceil((upperBound / nyquist) * bufferLength);
                    return { lowIndex, highIndex };
                });

                ctx.beginPath();
                const points: { x: number, y: number }[] = [];
                points.push({ x: 0, y: h });

                ranges.forEach((range, i) => {
                    let sum = 0;
                    let max = 0;
                    const count = Math.max(1, range.highIndex - range.lowIndex);
                    for (let k = range.lowIndex; k <= range.highIndex; k++) {
                        const val = dataArray[k] || 0;
                        sum += val;
                        if (val > max) max = val;
                    }
                    const avg = sum / count;
                    const val = (avg * 0.4 + max * 0.6) / 255;
                    const visualVal = Math.pow(val, 1.2);

                    const x = (i + 0.5) * bandWidth;
                    const y = h - (visualVal * h * 0.95);
                    points.push({ x, y });
                });

                points.push({ x: w, y: h });

                ctx.moveTo(points[0].x, points[0].y);

                for (let i = 0; i < points.length - 1; i++) {
                    const p0 = i > 0 ? points[i - 1] : points[0];
                    const p1 = points[i];
                    const p2 = points[i + 1];
                    const p3 = i < points.length - 2 ? points[i + 2] : p2;

                    const cp1x = p1.x + (p2.x - p0.x) / 6;
                    const cp1y = p1.y + (p2.y - p0.y) / 6;
                    const cp2x = p2.x - (p3.x - p1.x) / 6;
                    const cp2y = p2.y - (p3.y - p1.y) / 6;

                    if (i === 0) {
                        ctx.lineTo(p1.x, p1.y);
                    } else if (i === points.length - 2) {
                        ctx.lineTo(p2.x, p2.y);
                    } else {
                        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
                    }
                }

                if (isFill) {
                    ctx.lineTo(w, h);
                    ctx.lineTo(0, h);
                    ctx.closePath();
                    const grad = ctx.createLinearGradient(0, h, 0, 0);
                    grad.addColorStop(0, colorStart);
                    grad.addColorStop(1, colorEnd);
                    ctx.fillStyle = grad;
                    ctx.fill();
                } else {
                    ctx.strokeStyle = colorEnd;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            };

            if (micActive && micAnalyser) {
                drawGraphicSpectrum(micAnalyser, colors.spectrumMicFill, colors.spectrumMicStroke, false);
            }
            if (noiseAnalyser) {
                drawGraphicSpectrum(noiseAnalyser, colors.spectrumNoiseFill, colors.spectrumNoiseStroke, true);
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [noiseAnalyser, micAnalyser, micActive]);


    // ----- マウス・タッチ操作ロジック (Vertical Lock) -----

    const calculateGainFromY = (clientY: number, rect: DOMRect) => {
        const y = clientY - rect.top;
        const normalizedY = Math.max(0, Math.min(1, y / rect.height));
        // Top(0px) = +12dB, Bottom(height) = -12dB
        const db = 12 - (normalizedY * 24);

        // Center Snap (±0.5dB)
        if (Math.abs(db) < 0.5) return 0;
        return db;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!containerRef.current) return;

        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // 操作するバンドを決定
        const bandWidth = rect.width / eqBands.length;
        const index = Math.floor(x / bandWidth);

        if (index >= 0 && index < eqBands.length) {
            setDraggingBandIndex(index);

            // タップした時点でも値を更新（即時反応）
            const newGain = calculateGainFromY(e.clientY, rect);
            const newBands = [...eqBands];
            newBands[index] = { ...newBands[index], gain: newGain };
            onEQChange(newBands);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        // ドラッグ中のみ処理 (Vertical Lock: 横移動してもバンドを変えない)
        if (draggingBandIndex === null || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const newGain = calculateGainFromY(e.clientY, rect);

        const newBands = [...eqBands];
        // 常にdraggingBandIndexを更新
        newBands[draggingBandIndex] = { ...newBands[draggingBandIndex], gain: newGain };
        onEQChange(newBands);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setDraggingBandIndex(null);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    return (
        <div
            className="relative w-full h-48 bg-[--color-bg-card] rounded-lg overflow-hidden border border-[--color-border] shadow-inner touch-none cursor-pointer select-none"
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {/* Canvas Layer */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Visual Overlays (非インタラクティブ - 操作は親divで受ける) */}
            <div className="absolute inset-0 w-full h-full pointer-events-none select-none flex">
                {eqBands.map((band, i) => {
                    const freqLabel = band.frequency >= 1000
                        ? `${(band.frequency / 1000).toString().replace('.0', '')}k`
                        : band.frequency;

                    const isDragging = draggingBandIndex === i;

                    return (
                        <div key={i} className="relative flex-1 h-full flex flex-col items-center group">
                            {/* Center Line Visual */}
                            <div className={`absolute top-0 bottom-6 w-[1px] transition-colors ${isDragging ? 'bg-[--color-text-primary]/40' : 'bg-[--color-border] group-hover:bg-[--color-text-primary]/20'}`}></div>

                            {/* Thumb Visual */}
                            <div className="relative flex-1 w-full">
                                <div
                                    className={`absolute w-3 h-3 left-1/2 -ml-1.5 rounded-full border shadow-sm transition-transform duration-75
                                        ${band.gain === 0 ? 'bg-[--color-text-muted]' : 'bg-[--color-bg-surface] border-[--color-accent-primary]'}
                                        ${isDragging ? 'scale-150 border-[--color-bg-surface] bg-[--color-accent-primary] z-20' : 'z-10'}
                                    `}
                                    style={{
                                        top: `${((12 - band.gain) / 24) * 100}%`,
                                        marginTop: '-6px'
                                    }}
                                />
                            </div>

                            {/* Label */}
                            <div className="h-6 flex items-center justify-center bg-[--color-bg-card]/90 w-full border-t border-[--color-border] z-10">
                                <span className={`text-[9px] font-mono transition-colors ${isDragging ? 'text-[--color-accent-primary] font-bold' : 'text-[--color-text-muted] group-hover:text-[--color-text-primary]'}`}>
                                    {freqLabel}
                                </span>
                            </div>

                            {/* Tooltip (Dragging or Hover) */}
                            <div
                                className={`absolute top-2 bg-[--color-bg-elevated] px-1.5 py-0.5 rounded text-[9px] font-mono text-[--color-text-primary] whitespace-nowrap z-20 border border-[--color-border] shadow-lg translate-y-[-50%] transition-opacity
                                    ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                `}
                                style={{
                                    top: `${((12 - band.gain) / 24) * 100}%`
                                }}
                            >
                                {band.gain > 0 ? '+' : ''}{band.gain.toFixed(1)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
