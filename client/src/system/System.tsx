/**
 * System sub-view placeholder (ui-hill-hub-spec verb rail #5). Save /
 * load / settings / quit — "standard system-menu pattern; not designed
 * here." The world-loop save/load lives in `engine/world-save.ts`;
 * wiring it into a real menu is future work.
 */
export function System(): JSX.Element {
  return (
    <div className="columns">
      <section className="parties">
        <h2>System</h2>
        <p className="hint">
          Save / load / settings / quit. Not built in this harness — the standard system menu is
          undesigned per the hub spec, and the world-loop save format lives in{' '}
          <code>engine/world-save.ts</code> awaiting a UI.
        </p>
      </section>
    </div>
  );
}
