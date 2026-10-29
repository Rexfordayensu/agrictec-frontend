/**
 * The one page background for every route (farmer app, sign-in, admin console, 404 and
 * maintenance): the theme colour with a soft emerald glow top-left and a purple glow
 * bottom-right. Fixed, so it never scrolls, and static: no lines, patterns or animation.
 * The glow colours are the --bg-glow-1 / --bg-glow-2 tokens in globals.css.
 */
export function PageBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background: [
          'radial-gradient(ellipse at 0% 0%, var(--bg-glow-1), transparent 60%)',
          'radial-gradient(ellipse at 100% 100%, var(--bg-glow-2), transparent 60%)',
          'var(--bg-1)',
        ].join(', '),
      }}
    />
  );
}
