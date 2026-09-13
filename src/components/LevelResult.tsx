import { useEffect, useRef, useState } from 'react';
import type { GameStats } from '../types/models';

interface Props {
  stats: GameStats;
  levelTitle: string;
  storyTitle?: string;
  ready: boolean;
  hasNext: boolean;
  onNext: () => void;
  onRetry: () => void;
}

const HOLD_SKIP_MS = 400;

export function LevelResult({
  stats,
  levelTitle,
  storyTitle,
  ready,
  hasNext,
  onNext,
  onRetry,
}: Props) {
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStart = useRef<number | null>(null);
  const fired = useRef(false);
  const raf = useRef(0);

  useEffect(() => {
    fired.current = false;
  }, [ready]);

  useEffect(() => {
    if (!ready || !holding) {
      setHoldProgress(0);
      holdStart.current = null;
      cancelAnimationFrame(raf.current);
      return;
    }
    holdStart.current = performance.now();
    const tick = (now: number) => {
      const start = holdStart.current ?? now;
      const p = Math.min(1, (now - start) / HOLD_SKIP_MS);
      setHoldProgress(p);
      if (p >= 1) {
        if (!fired.current) {
          fired.current = true;
          onNext();
        }
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [holding, ready, onNext]);

  if (!ready) {
    return (
      <div className="overlay level-sting">
        <div className="overlay-card sting-card">
          <p className="eyebrow">Level Clear</p>
          <h2>{levelTitle}</h2>
          <p className="muted">Hold any key or click ~0.4s to skip…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay level-result">
      <div className="overlay-card">
        <p className="eyebrow">Result</p>
        <h2>{levelTitle}</h2>
        {storyTitle && <p className="story-title-chip">{storyTitle}</p>}
        <div className="stats-grid compact">
          <div>
            <span>Score</span>
            <strong>{stats.score.toLocaleString()}</strong>
          </div>
          <div>
            <span>Lines</span>
            <strong>{stats.lines}</strong>
          </div>
          <div>
            <span>Level</span>
            <strong>{stats.level}</strong>
          </div>
        </div>
        <div className="menu-actions row">
          <button
            type="button"
            className="menu-btn primary"
            onPointerDown={(e) => {
              e.preventDefault();
              setHolding(true);
            }}
            onPointerUp={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
            onClick={() => {
              if (fired.current) return;
              fired.current = true;
              onNext();
            }}
          >
            {hasNext ? 'Next' : 'Continue'}
            {holding && (
              <span className="hold-meter" style={{ ['--p' as string]: holdProgress }} />
            )}
          </button>
          <button type="button" className="menu-btn ghost" onClick={onRetry}>
            Retry
          </button>
        </div>
        <p className="muted tiny">Tap Next · or hold {HOLD_SKIP_MS}ms</p>
      </div>
    </div>
  );
}
