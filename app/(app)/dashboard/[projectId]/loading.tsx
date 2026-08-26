import { AnalysisSkeleton } from "@/components/analysis/analysis-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading for a saved project. Mirrors the real page's layout. */
export default function ProjectLoading() {
  return (
    <div className="space-y-12" aria-busy>
      <div className="space-y-5">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-10 w-4/5 max-w-2xl" />
        <div className="flex flex-wrap gap-2.5">
          <Skeleton className="h-8 w-52 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Skeleton className="size-4 rounded-md" />
        <Skeleton className="h-2.5 w-20" />
        <span aria-hidden className="bg-hairline h-px flex-1" />
      </div>

      <AnalysisSkeleton />
    </div>
  );
}
