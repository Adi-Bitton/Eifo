type Props = { className?: string; size?: number };

/**
 * Eifo? wordmark — refined, minimal premium mark.
 * - Lighter weight rounded sans, tight tracking, navy.
 * - Dotless "ı" with a small elegant pin floating above.
 * - "?" subtly tinted with the brand gradient as a small accent.
 */
export function EifoLogo({ className, size = 22 }: Props) {
  const pinW = size * 0.34;
  const pinH = size * 0.42;
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        fontFamily: '"Rubik", system-ui, sans-serif',
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.02em",
        color: "var(--brand-navy)",
        direction: "ltr",
        paddingTop: pinH * 0.75,
      }}
    >
      <span>E</span>
      <span
        style={{
          position: "relative",
          display: "inline-block",
          marginInline: "0.01em",
        }}
      >
        <span style={{ display: "inline-block" }}>ı</span>
        <svg
          aria-hidden
          viewBox="0 0 24 30"
          width={pinW}
          height={pinH}
          style={{
            position: "absolute",
            left: "50%",
            top: `-${pinH * 0.88}px`,
            transform: "translateX(-50%)",
            filter: "drop-shadow(0 1px 2px rgba(15,23,42,.18))",
          }}
        >
          <defs>
            <linearGradient id="eifo-pin-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--brand-pink)" />
              <stop offset="100%" stopColor="var(--brand-orange)" />
            </linearGradient>
          </defs>
          <path
            d="M12 1c-5 0-9 3.6-9 8.5 0 4.2 3.2 8 7 11.5 1 .9 1.6 1.5 2 2 .4-.5 1-1.1 2-2 3.8-3.5 7-7.3 7-11.5C21 4.6 17 1 12 1z"
            fill="url(#eifo-pin-grad)"
          />
          <circle cx="12" cy="10" r="2.6" fill="#fff" />
        </svg>
      </span>
      <span>f</span>
      <span>o</span>
      <span
        style={{
          backgroundImage: "var(--gradient-brand)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          fontWeight: 500,
          marginInlineStart: "0.04em",
          opacity: 0.85,
        }}
      >
        ?
      </span>
    </div>
  );
}
