/**
 * The Reforge mark.
 *
 * Three bars that shorten as they descend: a structure being reduced to its
 * parts, which is the one thing the product actually does. The second bar is
 * pulled right — the reduction is a disassembly, not a neat pyramid, and the
 * offset is what stops it reading as a generic "menu" glyph.
 *
 * Two exports: `LogoMark` is the tile on its own (headers, auth, favicon),
 * `Wordmark` pairs it with the name. Both are pure SVG/CSS — no image asset to
 * ship, so nothing to go missing or block first paint.
 */

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`from-ember relative inline-flex items-center justify-center overflow-hidden rounded-[30%] bg-linear-to-br to-[oklch(0.5_0.19_28)] shadow-[0_2px_10px_-2px_var(--ember)] ${className}`}
    >
      {/* Top-edge sheen — the highlight that makes the tile read as a physical
          chip rather than a flat colour swatch. */}
      <span
        className="absolute inset-0 rounded-[30%] bg-linear-to-b from-white/30 to-transparent"
        style={{ maskImage: "linear-gradient(to bottom, #000, transparent 55%)" }}
      />
      <svg viewBox="0 0 24 24" className="relative size-[62%]" fill="none">
        <rect x="4.5" y="6" width="15" height="2.6" rx="1.3" fill="white" />
        <rect x="8" y="10.7" width="11.5" height="2.6" rx="1.3" fill="white" fillOpacity="0.82" />
        <rect x="4.5" y="15.4" width="7" height="2.6" rx="1.3" fill="white" fillOpacity="0.6" />
      </svg>
    </span>
  );
}

export function Wordmark({
  className = "",
  size = "default",
}: {
  className?: string;
  size?: "default" | "lg";
}) {
  const tile = size === "lg" ? "size-9" : "size-7";
  const text = size === "lg" ? "text-[21px]" : "text-[17px]";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={tile} />
      <span
        translate="no"
        className={`display-sm font-semibold ${text}`}
        style={{ letterSpacing: "-0.03em" }}
      >
        Reforge
      </span>
    </span>
  );
}
