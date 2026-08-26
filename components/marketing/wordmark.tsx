/**
 * The wordmark. The mark is a set of three stacked rules that shorten as they
 * descend — a structure being reduced to its parts, which is the one thing the
 * product actually does.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span aria-hidden className="flex flex-col gap-[3px]">
        <span className="block h-[3px] w-[18px] rounded-full bg-[var(--ink)]" />
        <span className="block h-[3px] w-[12px] rounded-full bg-[var(--signal)]" />
        <span className="block h-[3px] w-[7px] rounded-full bg-[var(--dim)]" />
      </span>
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">
        Reforge
      </span>
    </span>
  );
}
