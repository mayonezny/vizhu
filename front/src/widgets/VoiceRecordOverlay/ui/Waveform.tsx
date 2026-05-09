import { useEffect, useRef } from 'react';

import './Waveform.scss';

const BAR_COUNT = 32;

type WaveformProps = {
  analyserNode: AnalyserNode | null;
};

export const Waveform = ({ analyserNode }: WaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const setSize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    setSize();

    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    cancelAnimationFrame(rafRef.current);

    const baseColor = getComputedStyle(canvas).color;

    if (!analyserNode) {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const barW = Math.floor(width / BAR_COUNT) - 2;
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < BAR_COUNT; i++) {
        ctx.beginPath();
        ctx.roundRect(i * (barW + 2), height - 6, barW, 6, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, height / 2 - 2, width, 4);
      return;
    }

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barW = Math.floor(width / BAR_COUNT) - 2;
      for (let i = 0; i < BAR_COUNT; i++) {
        const val = dataArray[Math.floor((i * dataArray.length) / BAR_COUNT)];
        const barH = Math.max(6, (val / 255) * height);
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = 0.4 + (val / 255) * 0.6;
        ctx.beginPath();
        ctx.roundRect(i * (barW + 2), height - barH, barW, barH, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    draw();

    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode]);

  return <canvas ref={canvasRef} className="waveform" aria-hidden="true" />;
};
