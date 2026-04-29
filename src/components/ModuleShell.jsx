export default function ModuleShell({ title, subtitle, stats = [], notice, children }) {
  return (
    <section className="ops-module-shell">
      <header className="ops-module-shell__head">
        <div>
          <h1 className="ops-module-shell__title">{title}</h1>
          {subtitle ? <p className="ops-module-shell__subtitle">{subtitle}</p> : null}
        </div>
        {notice ? <div className="ops-module-shell__notice">{notice}</div> : null}
      </header>
      {stats.length ? (
        <div className="ops-module-shell__stats">
          {stats.map((item) => (
            <article key={item.label} className={`ops-module-shell__stat ${item.tone ? `is-${item.tone}` : ""}`}>
              <div className="ops-module-shell__stat-label">{item.label}</div>
              <strong className="ops-module-shell__stat-value">{item.value}</strong>
            </article>
          ))}
        </div>
      ) : null}
      <div className="ops-module-shell__body">{children}</div>
    </section>
  );
}
