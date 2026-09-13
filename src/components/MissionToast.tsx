import { useEffect } from 'react';

interface Props {
  message: string;
  onDone: () => void;
  durationMs?: number;
}

export function MissionToast({ message, onDone, durationMs = 4200 }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onDone, durationMs);
    return () => window.clearTimeout(t);
  }, [onDone, durationMs]);

  return (
    <div className="mission-toast" role="status">
      <span className="toast-label">Side Mission</span>
      <p>{message}</p>
    </div>
  );
}
