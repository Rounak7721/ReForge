import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading for the project list. The dashboard queries Postgres
 * before it can render anything, and without this the user waits on a blank
 * screen with no signal that work is happening.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="space-y-3 rounded-lg border p-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </li>
        ))}
      </ul>
    </div>
  );
}
