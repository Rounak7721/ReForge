import { cn } from "@/lib/utils";

/**
 * Skeleton block.
 *
 * A sweeping shimmer rather than `animate-pulse`: pulse fades the whole
 * element's opacity, which reads as "broken/disabled", while a sweep reads as
 * "loading". The sweep is a transform on a pseudo-element, so it stays on the
 * compositor; under `prefers-reduced-motion` the `.shimmer` rule drops the
 * animation and leaves a static block.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer bg-secondary/70 rounded-lg", className)}
      {...props}
    />
  );
}

export { Skeleton };
