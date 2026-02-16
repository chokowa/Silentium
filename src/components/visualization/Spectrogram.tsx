import { useEffect, useRef } from 'react';
import type { NoiseEvent } from '../../services/audio/types/AudioAnalysisTypes';

interface SpectrogramProps {
    analyser: AnalyserNode | null;
    events: NoiseEvent[];
    className?: string;
    height?: number;
    sensitivity?: number; // 0.1 - 5.0
}

/**
 * スペクトログラム (Waterfall Plot)
 * 時間経過とともに周波数成分の変化を可視化する
 */
export default function Spectrogram({ analyser, events, className = '', height = 200, sensitivity = 1.0 }: SpectrogramProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement | null>(null); // シフト用の一時キャンバス
    const lastScrollTime = useRef<number>(0);

    useEffect(() => {
        if (!tempCanvasRef.current) {
            tempCanvasRef.current = document.createElement('canvas');
        }
    }, []);

    useEffect(() => {
        let animationFrameId: number;
        const canvas = canvasRef.current;
        const tempCanvas = tempCanvasRef.current;

        const render = () => {
            if (!canvas || !tempCanvas || !analyser) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            const ctx = canvas.getContext('2d', { alpha: false });
            const tempCtx = tempCanvas.getContext('2d', { alpha: false });

            if (!ctx || !tempCtx) return;

            // サイズ合わせ
            const w = canvas.clientWidth;
            const h = height;
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
                tempCanvas.width = w;
                tempCanvas.height = h;

                // 黒背景で初期化
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, w, h);
                tempCtx.fillStyle = '#000';
                tempCtx.fillRect(0, 0, w, h);
            }

            // 1. 画像をシフト (スクロール速度の制御)
            // 30秒で画面端まで行きたい。
            // 60fps想定で 30s * 60 = 1800 frames.
            // Canvas幅が例えば600pxなら、1フレームあたり 0.33px 進む必要がある。
            // 整数座標系なので、3フレームに1回 1px 進むくらいの間引き処理が必要。
            const now = Date.now();
            if (!lastScrollTime.current) lastScrollTime.current = now;

            // 画面幅 / 30秒 = 1秒あたりのピクセル数
            // 例: 600px / 30s = 20px/s
            // 20px / 60fps = 0.33px/frame
            const pixelsPerSecond = w / 30;
            const msPerPixel = 1000 / pixelsPerSecond;

            if (now - lastScrollTime.current >= msPerPixel) {
                lastScrollTime.current = now;

                // 現在のキャンバスの内容をtempにコピー
                tempCtx.drawImage(canvas, 0, 0);

                // 左に1pxずらして描画 (右端を開ける)
                ctx.drawImage(tempCanvas, -1, 0);

                // 右端をクリア (次の描画のため)
                ctx.fillStyle = '#000';
                ctx.fillRect(w - 1, 0, 1, h);
            }

            // 2. 最新のFFTデータを右端に描画
            // スクロールとは独立して、データは常に右端に更新し続ける（残像を残すため描画は常に行う）
            // ただし、厳密には「スクロールした時だけ新しい列を描く」のが正しいスペクトログラムだが、
            // リアルタイム感を出すために、右端1pxは常に現在の音で更新し続ける実装にする。

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);

            const x = w - 1;
            const nyquist = analyser.context.sampleRate / 2;

            // Y軸マッピング関数 (3分割 Custom Scale)
            // Top: Nyquist (e.g. 22050Hz) -> y=0
            // Middle: 1000Hz -> y=h/2
            // Low-Mid: 250Hz -> y=h*0.75 (Bottomから25%の高さ)
            // Bottom: 0Hz -> y=h

            const mapFreqToY = (freq: number) => {
                if (freq <= 250) {
                    // 0 - 250Hz -> Bottom (h) - Low-Mid (h*0.75)
                    // Linear mapping
                    return h - (freq / 250) * (h * 0.25);
                } else if (freq <= 1000) {
                    // 250 - 1000Hz -> Low-Mid (h*0.75) - Middle (h*0.5)
                    // Linear mapping
                    return (h * 0.75) - ((freq - 250) / (750)) * (h * 0.25);
                } else {
                    // 1000 - Nyquist -> Middle (h*0.5) - Top (0)
                    // Linear mapping
                    return (h * 0.5) - ((freq - 1000) / (nyquist - 1000)) * (h * 0.5);
                }
            };

            const columnImage = ctx.createImageData(1, h);
            const pixelData = columnImage.data;

            // 周波数ビンごとに描画するのではなく、Y座標（ピクセル）ごとに対応する周波数を求めて色を決定する
            // 逆写像が必要
            // 逆写像 (Y -> Freq)
            for (let y = 0; y < h; y++) {
                // Y座標から周波数を逆算
                let freq = 0;
                if (y >= h * 0.75) {
                    // 0-250Hz Range (Bottom Quarter)
                    // y scale: h -> h*0.75 maps to 0 -> 250
                    freq = ((h - y) / (h * 0.25)) * 250;
                } else if (y >= h * 0.5) {
                    // 250-1000Hz Range (Next Quarter)
                    // y scale: h*0.75 -> h*0.5 maps to 250 -> 1000
                    freq = 250 + ((h * 0.75 - y) / (h * 0.25)) * 750;
                } else {
                    // 1000-Nyquist Range (Top Half)
                    // y scale: h*0.5 -> 0 maps to 1000 -> Nyquist
                    freq = 1000 + ((h * 0.5 - y) / (h * 0.5)) * (nyquist - 1000);
                }

                const binIndex = Math.floor(freq / (nyquist / bufferLength));
                const safeIndex = Math.min(Math.max(0, binIndex), bufferLength - 1);

                const rawValue = dataArray[safeIndex];

                // 感度調整適用
                const value = Math.min(255, rawValue * sensitivity);

                // ヒートマップ生成 (黒 -> 青 -> 赤 -> 白)
                const r = value > 200 ? 255 : value > 100 ? (value - 100) * 2.55 : 0;
                const g = value > 200 ? (value - 200) * 4.6 : value > 50 ? (value - 50) * 2 : 0;
                const b = value > 100 ? 0 : value * 2.55;

                const ptr = y * 4;
                pixelData[ptr] = r;
                pixelData[ptr + 1] = g;
                pixelData[ptr + 2] = b;
                pixelData[ptr + 3] = 255;
            }

            ctx.putImageData(columnImage, x, 0);

            // 3. イベント描画
            const recentEvents = events.filter(e => now - e.timestamp < 30000); // 30秒以内なら表示対象 (本当はスクロールに合わせて移動すべきだが簡易実装として右端表示のみにする？)
            // いや、Spectrogramは画像としてスクロールしているので、書き込んだピクセルは勝手に移動する。
            // したがって、イベントが発生した「瞬間（フレーム）」にマーカーを書き込めば、あとは勝手に流れていく。

            // 直近のフレームで発生したイベントだけを描画する
            // msPerPixel (1px移動する時間) 以内に発生したイベント
            const newEvents = events.filter(e => now - e.timestamp < (msPerPixel * 1.5)); // 少し余裕を持たせる

            newEvents.forEach(event => {
                let color = '#00ffff';
                if (event.type === 'footstep') color = '#ff0000';
                else if (event.type === 'friction') color = '#ffff00';

                ctx.strokeStyle = color;
                ctx.lineWidth = 2; // 太めに

                const yMin = mapFreqToY(event.frequencyRange.min);
                const yMax = mapFreqToY(event.frequencyRange.max);

                // 線を描画 (右端)
                ctx.beginPath();
                ctx.moveTo(x, yMax);
                ctx.lineTo(x, yMin);
                ctx.stroke();

                // アイコン的な目印も？
                // Canvas上に描くと消せないので線だけでシンプルに。
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [analyser, events, height, sensitivity]); // sensitivity dependency added

    return (
        <div className={`relative ${className}`}>
            <canvas
                ref={canvasRef}
                className="w-full bg-black rounded"
                style={{ height: height }}
            />
            {/* Axis Labels */}
            <div className="absolute inset-y-0 left-0 w-8 pointer-events-none text-[10px] text-white/50 font-mono">
                {/* Modified Scale: Bottom=0, 25%=250, 50%=1000, Top=Nyquist */}
                <div className="absolute bottom-0 left-1">0Hz</div>
                <div className="absolute bottom-[25%] left-1">250Hz</div>
                <div className="absolute top-[50%] left-1 -translate-y-1/2">1kHz</div>
                <div className="absolute top-[25%] left-1 -translate-y-1/2">5kHz</div>
                <div className="absolute top-0 left-1">20kHz</div>
            </div>

            <div className="absolute bottom-1 right-1 text-xs text-white/50 pointer-events-none">
                30s →
            </div>
            <div className="absolute top-1 right-1 text-xs text-white/50 pointer-events-none">
                Freq ↑
            </div>
        </div>
    );
}
