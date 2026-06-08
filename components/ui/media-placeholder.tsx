type MediaPlaceholderProps = {
  label?: string;
  className?: string;
  dark?: boolean;
};

export function MediaPlaceholder({
  label = "Място за снимка",
  className = "",
  dark = false,
}: MediaPlaceholderProps) {
  return (
    <div
      className={[
        "relative grid h-full w-full place-items-center overflow-hidden",
        dark
          ? "bg-boutique-sage-deep text-boutique-on-sage"
          : "bg-boutique-warm text-boutique-muted",
        className,
      ].join(" ")}
    >
      <div
        className={`absolute inset-4 rounded-[inherit] border border-dashed ${
          dark ? "border-white/25" : "border-boutique-muted/25"
        }`}
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-3 px-6 text-center">
        <svg
          viewBox="0 0 48 48"
          aria-hidden
          className="h-10 w-10 opacity-45"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="5" y="8" width="38" height="32" rx="4" />
          <circle cx="17" cy="19" r="4" />
          <path d="m9 35 10-9 7 6 5-4 8 7" />
        </svg>
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] opacity-70">
          {label}
        </span>
      </div>
    </div>
  );
}
