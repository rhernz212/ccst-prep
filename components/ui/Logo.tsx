/**
 * Brand mark: four linked nodes on a gradient tile — a network segment, which
 * is the one visual idea the whole site is about. Drawn inline rather than
 * shipped as a file so it inherits the theme's brand ramp and stays crisp at
 * every size.
 */
export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-xl bg-linear-to-br from-brand-400 via-brand-600 to-signal-600 text-white shadow-brand ${className}`}
      aria-hidden="true"
    >
      {/* Top-light sheen, the same trick as the cards' inset hairline. */}
      <span className="absolute inset-0 bg-linear-to-b from-white/30 to-transparent" />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        className="relative h-[64%] w-[64%]"
      >
        <path
          d="M6 6.5 18.5 5.5M6 6.5 7 17.5M7 17.5 17.5 16.5M18.5 5.5 17.5 16.5"
          strokeWidth="1.6"
          opacity="0.75"
        />
        <circle cx="6" cy="6.5" r="2.6" fill="currentColor" />
        <circle cx="18.5" cy="5.5" r="1.8" fill="currentColor" />
        <circle cx="7" cy="17.5" r="1.8" fill="currentColor" />
        <circle cx="17.5" cy="16.5" r="2.6" fill="currentColor" />
      </svg>
    </span>
  );
}

/** Mark plus wordmark, for the header and the landing hero. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo className="h-8 w-8" />
      <span className="font-display text-lg font-semibold tracking-tight text-foreground">
        Cert<span className="text-brand-600 dark:text-brand-400">Prep</span>
      </span>
    </span>
  );
}
