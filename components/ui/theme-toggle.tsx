"use client";

import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";

import { Display, Moon, Sun } from "@/components/ui/icons";

/**
 * Theme control.
 *
 * Three states, not two: "system" is a real choice and the default, so hiding
 * it behind a two-way switch would make it unreachable once the user touched
 * the toggle even once. It is also why this is a segmented control rather than
 * the sun/moon switch every AI-built site ships.
 *
 * Built on native radio inputs. That buys correct group semantics and
 * arrow-key navigation from the browser rather than a hand-rolled roving
 * tabindex, and the labels give each option a real hit target.
 */

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Display },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const name = useId();

  // `theme` is undefined on the server and on the first client render — the
  // real value only exists after next-themes reads localStorage. Rendering the
  // active state before then would either mismatch on hydration or flash the
  // wrong segment.
  useEffect(() => setMounted(true), []);

  const active = mounted ? (theme ?? "system") : "system";
  const index = Math.max(
    0,
    OPTIONS.findIndex((option) => option.value === active),
  );

  return (
    <fieldset
      className={`border-hairline bg-shell/60 relative inline-flex items-center rounded-full border p-1 backdrop-blur-md ${className}`}
    >
      <legend className="sr-only">Colour theme</legend>

      {/* Sliding thumb. One transform-only element behind the labels, so
          switching costs a composite rather than three repaints. */}
      <span
        aria-hidden
        className="bg-core border-hairline-strong absolute top-1 left-1 size-8 rounded-full border shadow-(--inner-highlight) transition-transform duration-500 ease-spring motion-reduce:transition-none"
        style={{ transform: `translateX(${index * 2}rem)` }}
      />

      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = active === value;
        return (
          <label
            key={value}
            className={`relative z-1 flex size-8 cursor-pointer items-center justify-center rounded-full text-[15px] transition-colors duration-300 ${
              isActive ? "text-ember" : "text-faint hover:text-ink"
            }`}
            title={label}
          >
            <input
              type="radio"
              name={name}
              value={value}
              checked={isActive}
              onChange={() => setTheme(value)}
              className="sr-only"
            />
            <Icon />
            <span className="sr-only">{label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
