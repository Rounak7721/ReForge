import { AnalysisSkeleton } from "@/components/analysis/analysis-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading for a saved project. Mirrors the real page's layout. */
export default function ProjectLoading() {
  return (
    <div className="space-y-8" aria-busy>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-56" />
      </div>
      <AnalysisSkeleton />
    </div>
  );
}
