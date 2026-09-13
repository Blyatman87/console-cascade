interface Props {
  title: string;
  blurb: string;
  chapter?: string;
  onContinue: () => void;
  continueLabel?: string;
}

export function StoryBlurb({
  title,
  blurb,
  chapter,
  onContinue,
  continueLabel = 'Begin Level',
}: Props) {
  return (
    <div className="screen story-screen">
      {chapter && <p className="eyebrow">{chapter}</p>}
      <h2>{title}</h2>
      <p className="story-blurb">{blurb}</p>
      <button type="button" className="menu-btn primary" onClick={onContinue}>
        {continueLabel}
      </button>
    </div>
  );
}
