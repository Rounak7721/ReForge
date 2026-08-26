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
      {/* Bowl: two concentric arcs about (18, 10.6), outer r=6 and counter r=2,
          so every arm is exactly 4 thick and the curve stays parallel to
          itself.

          Strokes: parallelograms on a 0.55 shear at pitch 7.18. They are 4.68
          wide, not 4.1 — a sheared bar's *optical* thickness is its horizontal
          width times cos(atan(0.55)) ≈ 0.876, so matching the stem numerically
          would render them ~12% lighter than the letter they belong to.

          The longest stroke doubles as the R's leg, which is what makes this a
          letter rather than a letter with decoration beside it. Checked
          legible down to 28px — the nav size. */}
      <svg viewBox="0 0 32 32" className="relative size-[64%]" fill="white">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.5 4.6 H18 A6 6 0 0 1 18 16.6 H7.5 Z M11.6 8.6 H18 A2 2 0 0 1 18 12.6 H11.6 Z"
        />
        <path d="M16.06 16.6 H20.74 L26.68 27.4 H22.0 Z" />
        <path d="M10.695 19.9 H15.375 L19.5 27.4 H14.82 Z" />
        <path d="M5.33 23.2 H10.01 L12.32 27.4 H7.64 Z" />
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
