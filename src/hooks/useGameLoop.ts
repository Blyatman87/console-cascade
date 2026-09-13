import { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/engine';

export function useGameLoop(
  engine: GameEngine | null,
  running: boolean,
  onFrame: () => void,
) {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    if (!engine || !running) return;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      engine.tick(dt);
      onFrameRef.current();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [engine, running]);
}
