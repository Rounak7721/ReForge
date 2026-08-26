"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ArrowUp, Spark } from "@/components/ui/icons";

/**
 * The natural-language instruction box.
 *
 * Extracted because there are now two refinement loops — the concept object
 * and the generated page — and they must look and behave identically. They are
 * the same interaction with a different target, and a user who has learned one
 * has learned the other.
 *
 * **This is not a chat transcript, and that is a product decision.** The
 * instruction acts on the artifact on screen; the artifact stays the product,
 * not the conversation. A message stream would push the thing being edited off
 * the top of the page and turn an editing control into a chat toy.
 *
 * Owns its own draft, validation and focus. The parent supplies only what
 * differs — the copy, the suggestions, and what to do with the instruction —
 * which is what keeps the two call sites from drifting apart.
 */

const MIN_LENGTH = 3;

export function CommandBar({
  id,
  label,
  placeholder,
  suggestions,
  busy,
  coolingDown,
  coolingDownHint,
  invalidHint,
  onSubmit,
}: {
  /** Must be unique on the page — both loops can be mounted at once. */
  id: string;
  label: string;
  placeholder: string;
  suggestions: readonly string[];
  busy: boolean;
  coolingDown: boolean;
  coolingDownHint: string;
  invalidHint: string;
  /**
   * Return false (or resolve false) to reject the submission and KEEP the
   * draft. The caller's guards — an in-flight request, a rate-limit cooldown,
   * a failed call — all mean "not sent", and clearing the box in those cases
   * loses what the user typed with nothing to retry from.
   */
  onSubmit: (instruction: string) => boolean | Promise<boolean>;
}) {
  const [instruction, setInstruction] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = instruction.trim();
    if (text.length < MIN_LENGTH) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    setInvalid(false);
    // Cleared only once the caller confirms it accepted the instruction.
    if (await onSubmit(text)) setInstruction("");
  }

  return (
    // Sticky to the bottom of the viewport so the instruction box is always
    // within reach while scrolling a long artifact.
    <div className="sticky bottom-4 z-30 pt-2 pb-[env(safe-area-inset-bottom)]">
      {/* Ember border, ember glow and an explicit label. As a neutral hairline
          on a translucent shell this read as another content card, and users
          did not notice the product's headline capability was sitting right
          there. It is the one place on the page that accepts input, so it is
          the one place carrying the accent colour. */}
      <form
        onSubmit={(event) => void submit(event)}
        className="border-ember/35 bg-shell/95 rounded-[1.75rem] border-2 p-3 shadow-[var(--shadow-lifted),0_0_0_1px_var(--ember-soft),0_12px_40px_-16px_var(--ember)] backdrop-blur-xl"
      >
        <label htmlFor={id} className="text-ember eyebrow mb-2.5 flex items-center gap-2 pl-1">
          <Spark className="size-3.5" />
          {label}
        </label>

        <div className="border-hairline bg-core flex items-center gap-2 rounded-2xl border px-1 shadow-(--inner-highlight)">
          <span aria-hidden className="text-ember pl-2.5 font-mono text-sm">
            ↳
          </span>

          <input
            ref={inputRef}
            id={id}
            name={id}
            type="text"
            value={instruction}
            onChange={(event) => {
              setInstruction(event.target.value);
              if (invalid) setInvalid(false);
            }}
            placeholder={placeholder}
            maxLength={500}
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${id}-error` : undefined}
            className="placeholder:text-faint/80 min-w-0 flex-1 bg-transparent py-2.5 text-[15px] outline-none disabled:opacity-50"
          />

          <Button
            type="submit"
            size="icon"
            // Stays enabled until the request actually starts; length is
            // validated on submit instead.
            disabled={busy || coolingDown}
            aria-label={busy ? "Updating…" : "Apply change"}
          >
            {busy ? (
              <span
                aria-hidden
                className="spin-slow size-4 rounded-full border-2 border-current border-t-transparent"
              />
            ) : (
              <ArrowUp />
            )}
          </Button>
        </div>

        {invalid ? (
          <p id={`${id}-error`} role="alert" className="text-destructive px-4 pt-2 text-xs">
            {invalidHint}
          </p>
        ) : null}

        {coolingDown ? (
          <p role="status" className="text-faint px-4 pt-2 text-xs">
            {coolingDownHint}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5 px-1 pt-2.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setInstruction(suggestion);
                setInvalid(false);
                inputRef.current?.focus();
              }}
              disabled={busy}
              className="border-hairline text-dim hover:border-ember/40 hover:text-ink rounded-full border px-3 py-1.5 text-xs transition-colors duration-300 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
