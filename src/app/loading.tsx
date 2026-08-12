/**
 * Route-level loading state.
 *
 * A skeleton that matches the shape of a typical page rather than a centred
 * spinner, so the layout does not jump when content arrives and the user can see
 * what is coming.
 */
export default function Loading() {
  return (
    <div className="section-editorial" aria-busy="true" aria-live="polite">
      <div className="container">
        <span className="sr-only">Loading</span>
        <div className="skeleton skeleton-line" style={{ width: '6rem', height: '0.7rem' }} />
        <div className="skeleton skeleton-title" style={{ marginTop: '1.5rem', height: '3rem', width: '60%' }} />
        <div style={{ maxWidth: '38rem', marginTop: '1.5rem' }}>
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '1.5rem', marginTop: '3.5rem' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
