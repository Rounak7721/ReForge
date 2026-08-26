"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

/**
 * Scroll-entry reveal.
 *
 * IntersectionObserver, never a scroll listener — a scroll handler fires on
 * every frame and forces a reflow each time, which is the single easiest way
 * to make a page janky on mobile.
 *
 * The hidden state lives in CSS (`[data-reveal]` in globals.css) and is scoped
 * inside `@media (prefers-reduced-motion: no-preference)`, so a visitor who
 * asked for less motion gets the content immediately with no animation and no
 * JS dependency. `once` is the default: re-animating on every scroll-past is a
 * gimmick, not a delight.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className,
  once = true,
}: {
  children: ReactNode;
  as?: ElementType;
  /** Stagger offset in ms. Keep cascades under ~400ms total. */
  delay?: number;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;

    // No observer (very old browser, or a test environment) means we must not
    // leave the content permanently transparent. Show it and stop.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setShown(false);
          }
        }
      },
      // Fire slightly before the element reaches the fold so the motion has
      // finished by the time it is properly in view.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      data-shown={shown ? "true" : "false"}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}

/**
 * Cursor-tracked spotlight border.
 *
 * Writes `--mx`/`--my` on the element; the gradient itself is the `.spotlight`
 * rule in globals.css. Pointer position is written straight to a custom
 * property rather than held in React state — putting it in state would
 * re-render the subtree on every pointermove.
 *
 * Skipped entirely on touch, where there is no hover to track.
 */
export function Spotlight({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const node = ref.current;
    if (node === null || event.pointerType === "touch") return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    node.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }, []);

  return (
    <Tag ref={ref} onPointerMove={onPointerMove} className={`spotlight ${className}`}>
      {children}
    </Tag>
  );
}
