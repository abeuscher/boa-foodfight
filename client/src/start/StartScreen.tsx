interface Props {
  readonly onStart: () => void;
}

/**
 * Placeholder title screen — a single Start button into the campaign
 * (the Hill, L1's home base). Stub pending the real start-screen spec;
 * intentionally minimal so it's trivially replaceable.
 */
export function StartScreen({ onStart }: Props): JSX.Element {
  return (
    <div className="startscreen">
      <h1 className="start-title">Food Fight</h1>
      <p className="start-sub">Battle of the Ants</p>
      <button className="start-go" onClick={onStart}>
        Start
      </button>
    </div>
  );
}
