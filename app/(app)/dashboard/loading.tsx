import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading for the project list. The dashboard queries Postgres
 * before it can render anything, and without this the user waits on an empty
 * screen with no signal that work is happening.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-10" aria-busy>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-11 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="plate space-y-4 p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3.5 w-3/5" />
            <div className="border-hairline flex items-center justify-between border-t pt-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="size-4 rounded-md" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
