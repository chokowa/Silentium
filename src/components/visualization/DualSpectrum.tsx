import { useEffect, useRef } from 'react';

interface DualSpectrumProps {
    noiseAnalyser: AnalyserNode | null;
    micAnalyser: AnalyserNode | null;
    micActive: boolean;
}

/**
 * デュアルスペクトラムアナライザー
 * ノイズ出力（紫）とマイク入力（赤橙）を重ね合わせて表示
 * → マスキング効果が視覚的に把握できる
 */
export default function DualSpectrum({ noiseAnalyser, micAnalyser, micActive }: DualSpectrumProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        let animationFrameId: number;

        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Retina対応
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            // キャンバスサイズが変更された場合のみ再設定（ちらつき防止）
            if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
                canvas.width = Math.floor(rect.width * dpr);
                canvas.height = Math.floor(rect.height * dpr);
                // スケール再設定が必要
                ctx.scale(dpr, dpr);
            }

            // スケールを考慮した論理サイズ
            const w = rect.width;
            const h = rect.height;

            // クリア (論理座標で指定)
            ctx.clearRect(0, 0, w, h);

            const barCount = 48;

            // === マイク入力（背景レイヤー — 赤橙） ===
            if (micAnalyser && micActive) {
                const micBuffer = micAnalyser.frequencyBinCount;
                const micData = new Uint8Array(micBuffer);
                micAnalyser.getByteFrequencyData(micData);

                const micStep = Math.floor(micBuffer / barCount);
                const barW = (w / barCount) - 1;

                // 描画設定のキャッシュ
                ctx.fillStyle = '';

                for (let i = 0; i < barCount; i++) {
                    const val = micData[i * micStep] / 255;
                    const barH = val * h * 0.9;

                    if (val > 0.01) { // 小さすぎる値は描画スキップ
                        // 赤橙グラデーション（環境音 = 「敵」の色）
                        const alpha = 0.15 + val * 0.35;
                        ctx.fillStyle = `rgba(255, 100, 80, ${alpha})`;

                        const x = i * (barW + 1);
                        const y = h - barH;
                        const r = Math.min(barW / 2, 2);

                        ctx.beginPath();
                        ctx.roundRect(x, y, barW, barH, r);
                        ctx.fill();
                    }
                }
            }

            // === ノイズ出力（前景レイヤー — 紫青） ===
            if (noiseAnalyser) {
                const noiseBuffer = noiseAnalyser.frequencyBinCount;
                const noiseData = new Uint8Array(noiseBuffer);
                noiseAnalyser.getByteFrequencyData(noiseData);

                const noiseStep = Math.floor(noiseBuffer / barCount);
                const barW = (w / barCount) - 1;

                for (let i = 0; i < barCount; i++) {
                    const val = noiseData[i * noiseStep] / 255;
                    const barH = val * h * 0.9;

                    if (val > 0.01) {
                        // 紫→青グラデーション（ノイズ = 「味方」の色）
                        const hue = 260 - (i / barCount) * 80;
                        const alpha = 0.3 + val * 0.5;
                        ctx.fillStyle = `hsla(${hue}, 75%, 60%, ${alpha})`;

                        const x = i * (barW + 1);
                        const y = h - barH; // 下底基準
                        const r = Math.min(barW / 2, 2);

                        ctx.beginPath();
                        ctx.roundRect(x, y, barW, barH, r);
                        ctx.fill();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [noiseAnalyser, micAnalyser, micActive]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full block"
        />
    );
}
