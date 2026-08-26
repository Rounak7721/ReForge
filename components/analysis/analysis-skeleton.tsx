import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors AnalysisView's bento so the page doesn't jump when the real result
 * arrives. A skeleton in the true layout, not a spinner on an empty page —
 * the shape is the reassurance, and matching the spans is what prevents the
 * content from reflowing under the user's eyes.
 */

function CellSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`plate space-y-3 p-6 ${className}`}>
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-4 rounded-md" />
        <Skeleton className="h-2.5 w-28" />
      </div>
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className="h-3.5" style={{ width: `${96 - index * 13}%` }} />
        ))}
      </div>
    </div>
  );
}

export function AnalysisSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-6" aria-hidden>
      <CellSkeleton lines={2} className="md:col-span-6" />
      <CellSkeleton lines={3} className="md:col-span-2" />
      <CellSkeleton lines={3} className="md:col-span-4" />
      <CellSkeleton lines={4} className="md:col-span-4" />
      <CellSkeleton lines={3} className="md:col-span-2" />
      <CellSkeleton lines={4} className="md:col-span-3" />
      <CellSkeleton lines={4} className="md:col-span-3" />
    </div>
  );
}
