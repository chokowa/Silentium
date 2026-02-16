import { useEffect, useRef } from 'react';

interface SpectrumAnalyzerProps {
    analyser: AnalyserNode | null;
    className?: string;
    themeKey?: string;
}

/**
 * スペクトラムアナライザー
 * マスター出力の周波数特性をリアルタイム表示
 */
export default function SpectrumAnalyzer({ analyser, className = '', themeKey }: SpectrumAnalyzerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const colorsRef = useRef({
        bg: 'transparent',
        hueStart: 260,
        hueEnd: 160,
    });

    // テーマ変更時に色設定を更新
    useEffect(() => {
        // 現在のドキュメントのクラスからテーマを判断（またはthemeKeyプロパティを使用）
        // ここでは単純に document.documentElement のクラスを見る
        const isDark = document.documentElement.classList.contains('dark');

        if (isDark) {
            colorsRef.current = {
                bg: 'transparent',
                hueStart: 260, // Purple
                hueEnd: 160,   // Green
            };
        } else {
            // Light Theme (Blue -> Cyan)
            colorsRef.current = {
                bg: 'transparent',
                hueStart: 220, // Blue
                hueEnd: 190,   // Cyan
            };
        }
    }, [themeKey]);

    useEffect(() => {
        let animationFrameId: number;
        const canvas = canvasRef.current;

        const render = () => {
            if (!canvas || !analyser) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            // Alpha有効で取得
            const ctx = canvas.getContext('2d', { alpha: true });
            if (!ctx) return;

            // Retina対応
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            const targetWidth = Math.floor(rect.width * dpr);
            const targetHeight = Math.floor(rect.height * dpr);

            if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                ctx.scale(dpr, dpr);
            }

            const w = rect.width;
            const h = rect.height;

            // 背景クリア
            ctx.clearRect(0, 0, w, h);

            // 周波数データ取得
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            const barCount = 64;
            const barWidth = (w / barCount) - 1;
            // 線形サンプリング
            const step = Math.floor(bufferLength / barCount);

            for (let i = 0; i < barCount; i++) {
                const dataIndex = i * step;
                const value = dataArray[dataIndex] / 255;
                if (value < 0.01) continue;

                const barHeight = value * h * 0.85;

                // グラデーション
                const hueStart = colorsRef.current.hueStart;
                const hueEnd = colorsRef.current.hueEnd;
                // hueStart -> hueEnd
                const hue = hueStart - (i / barCount) * (hueStart - hueEnd);

                const lightness = 50 + value * 20;
                const alpha = 0.3 + value * 0.6;

                ctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, ${alpha})`;

                const x = i * (barWidth + 1);
                const y = h - barHeight;
                const radius = Math.min(barWidth / 2, 3);

                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, radius);
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [analyser]);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full ${className}`}
            style={{ height: '100%' }}
        />
    );
}
