import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors AnalysisView's layout so the page doesn't jump when the real result
 * arrives. A skeleton, not a spinner on white — the shape is the reassurance.
 */

function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-card space-y-3 rounded-lg border p-5">
      <Skeleton className="h-3 w-32" />
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton
            key={index}
            className="h-3.5"
            style={{ width: `${100 - index * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function AnalysisSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <SectionSkeleton lines={3} />
      <div className="grid gap-4 md:grid-cols-2">
        <SectionSkeleton lines={2} />
        <SectionSkeleton lines={3} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SectionSkeleton lines={4} />
        <SectionSkeleton lines={3} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SectionSkeleton lines={3} />
        <SectionSkeleton lines={4} />
      </div>
    </div>
  );
}
