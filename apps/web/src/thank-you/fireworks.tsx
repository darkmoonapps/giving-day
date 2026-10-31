import { Box } from '@mantine/core';
import { useEffect, useRef } from 'react';

const FIREWORK_COLORS = [
  '#A99BE0',
  '#A8E6CF',
  '#C4B6E8',
  '#7DD4B3',
  '#F8E38C',
] as const;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

function colorAt(index: number): string {
  return FIREWORK_COLORS[index % FIREWORK_COLORS.length] ?? FIREWORK_COLORS[0];
}

function createBurst(width: number, height: number): Particle[] {
  const originX = width * (0.16 + Math.random() * 0.68);
  const originY = height * (0.12 + Math.random() * 0.36);
  const color = colorAt(Math.floor(Math.random() * FIREWORK_COLORS.length));
  const particles: Particle[] = [];
  const count = 26;
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.2;
    const speed = 1.3 + Math.random() * 2.6;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
      size: 1.8 + Math.random() * 2.2,
    });
  }
  return particles;
}

function sizeCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
): void {
  const parent = canvas.parentElement;
  const width = parent?.clientWidth ?? window.innerWidth;
  const height = parent?.clientHeight ?? window.innerHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

export function Fireworks({
  reduceMotion,
}: {
  reduceMotion: boolean;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const context = canvas.getContext('2d');
    if (context === null) {
      return;
    }

    let frameId = 0;
    let destroyed = false;
    const particles: Particle[] = [];
    let nextBurstAt = 0;

    const resize = (): void => {
      sizeCanvas(canvas, context);
    };
    resize();

    const draw = (time: number): void => {
      if (destroyed) {
        return;
      }
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);
      if (time >= nextBurstAt) {
        particles.push(...createBurst(width, height));
        nextBurstAt = time + 320 + Math.random() * 420;
      }
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        if (particle === undefined) {
          continue;
        }
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.034;
        particle.life -= 0.015;
        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }
        context.globalAlpha = Math.max(particle.life, 0);
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      destroyed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, [reduceMotion]);

  if (reduceMotion) {
    return (
      <Box
        aria-hidden="true"
        data-testid="fireworks-static"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 22% 28%, #A99BE0 0 7px, transparent 8px), radial-gradient(circle at 78% 22%, #A8E6CF 0 6px, transparent 7px), radial-gradient(circle at 50% 18%, #F8E38C 0 5px, transparent 6px), radial-gradient(circle at 64% 40%, #C4B6E8 0 6px, transparent 7px)',
        }}
      />
    );
  }

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      aria-hidden="true"
      data-testid="fireworks-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
