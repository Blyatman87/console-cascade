interface Props {
  onLeft: () => void;
  onRight: () => void;
  onSoftDropStart: () => void;
  onSoftDropEnd: () => void;
  onHardDrop: () => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
  onHold: () => void;
  onPause: () => void;
}

export function TouchControls(props: Props) {
  return (
    <div className="touch-controls">
      <div className="touch-row">
        <button type="button" className="touch-btn" onClick={props.onHold} aria-label="Hold">
          Hold
        </button>
        <button type="button" className="touch-btn" onClick={props.onRotateCCW} aria-label="Rotate CCW">
          ↺
        </button>
        <button type="button" className="touch-btn" onClick={props.onRotateCW} aria-label="Rotate CW">
          ↻
        </button>
        <button type="button" className="touch-btn" onClick={props.onPause} aria-label="Pause">
          ❚❚
        </button>
      </div>
      <div className="touch-row">
        <button type="button" className="touch-btn wide" onClick={props.onLeft} aria-label="Left">
          ◀
        </button>
        <button
          type="button"
          className="touch-btn wide"
          onPointerDown={props.onSoftDropStart}
          onPointerUp={props.onSoftDropEnd}
          onPointerLeave={props.onSoftDropEnd}
          aria-label="Soft Drop"
        >
          ▼
        </button>
        <button type="button" className="touch-btn wide" onClick={props.onRight} aria-label="Right">
          ▶
        </button>
        <button type="button" className="touch-btn wide accent" onClick={props.onHardDrop} aria-label="Hard Drop">
          ⬇
        </button>
      </div>
    </div>
  );
}
