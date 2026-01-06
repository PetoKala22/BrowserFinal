import { useEffect, useRef } from 'react';
import { SkyLayerColors, SkyStateInput } from './skyTypes';
import { computeSkyLayers } from './skyModel';
import { mixOklab } from './skyColor';
import { renderSkyGradient } from './skyRenderer';

const blendLayers = (from: SkyLayerColors, to: SkyLayerColors, t: number): SkyLayerColors => ({
  upperSky: mixOklab(from.upperSky, to.upperSky, t),
  midSky: mixOklab(from.midSky, to.midSky, t),
  horizonBand: mixOklab(from.horizonBand, to.horizonBand, t),
  groundBounce: mixOklab(from.groundBounce, to.groundBounce, t)
});

const getCanvasContext = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext(
    '2d',
    { colorSpace: 'display-p3' } as CanvasRenderingContext2DSettings
  );
  return context ?? canvas.getContext('2d');
};

export const useSkyBackground = (state: SkyStateInput) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRef = useRef<SkyLayerColors>(computeSkyLayers(state));
  const currentRef = useRef<SkyLayerColors>(targetRef.current);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    targetRef.current = computeSkyLayers(state);
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = getCanvasContext(canvas);
    if (!ctx) return undefined;

    const updateSize = () => {
      const bounds = (canvas.parentElement ?? canvas).getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(bounds.width * dpr));
      const height = Math.max(1, Math.floor(bounds.height * dpr));
      if (width === sizeRef.current.width && height === sizeRef.current.height) return;
      sizeRef.current = { width, height, dpr };
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${Math.floor(bounds.width)}px`;
      canvas.style.height = `${Math.floor(bounds.height)}px`;
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(canvas.parentElement ?? canvas);

    let raf = 0;
    let last = performance.now();
    const animate = (now: number) => {
      const dt = Math.min(200, now - last);
      last = now;

      const smoothing = 1 - Math.exp(-dt / 400);
      currentRef.current = blendLayers(currentRef.current, targetRef.current, smoothing);

      const { width, height } = sizeRef.current;
      renderSkyGradient(ctx, width, height, currentRef.current);

      raf = window.requestAnimationFrame(animate);
    };

    raf = window.requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return canvasRef;
};
