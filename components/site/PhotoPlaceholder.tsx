type PhotoPlaceholderProps = {
  /** Mono caption describing the photo that will eventually sit here. */
  label: string;
  /** CSS aspect-ratio value, e.g. "21 / 9". */
  ratio?: string;
  className?: string;
};

/**
 * Labeled striped stand-in for photography that has not been shot yet.
 * Per the design system, photos stay as these placeholders until real
 * assets arrive, so the caption states what belongs in the slot.
 */
export function PhotoPlaceholder({
  label,
  ratio = "21 / 9",
  className = "",
}: PhotoPlaceholderProps) {
  return (
    <div
      className={`flex items-end overflow-hidden rounded-[18px] border border-outline-variant bg-surface-container-high p-4 sm:p-5 md:p-6 ${className}`}
      style={{
        aspectRatio: ratio,
        backgroundImage:
          "repeating-linear-gradient(135deg, var(--color-placeholder-stripe) 0 10px, var(--color-surface-container-high) 10px 20px)",
      }}
    >
      <span className="rounded border border-outline-strong bg-surface-container-lowest px-2.5 py-1.5 font-label text-xs text-on-surface-variant">
        {label}
      </span>
    </div>
  );
}
