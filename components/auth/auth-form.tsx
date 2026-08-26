"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Button, ButtonIcon } from "@/components/ui/button";
import { ArrowUpRight, Check } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiError } from "@/lib/api/errors";
import { safeRedirectPath } from "@/lib/safe-redirect";

type Mode = "login" | "signup";
type Field = "email" | "password";
type FieldErrors = Partial<Record<Field, string>>;

const COPY = {
  login: {
    title: "Welcome back",
    description: "Log in to pick up where you left off.",
    submit: "Log in",
    pending: "Logging in…",
    endpoint: "/api/auth/login",
    switchPrompt: "Don’t have an account?",
    switchHref: "/signup",
    switchLabel: "Sign up",
  },
  signup: {
    title: "Create your account",
    description: "Start turning products into your own in a couple of minutes.",
    submit: "Create account",
    pending: "Creating account…",
    endpoint: "/api/auth/signup",
    switchPrompt: "Already have an account?",
    switchHref: "/login",
    switchLabel: "Log in",
  },
} as const;

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  // Deliberately loose. The server and the mail provider are the real
  // authorities on deliverability; this only catches obvious typos.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (password.length < 8) {
    errors.password = "Passwords need at least 8 characters.";
  }
  return errors;
}

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const copy = COPY[mode];
  const router = useRouter();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [checkEmail, setCheckEmail] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const errors = validate(email, password);
    setFieldErrors(errors);
    const firstBad = (["email", "password"] as const).find(
      (field) => errors[field] !== undefined,
    );
    if (firstBad !== undefined) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(copy.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiError;
        setError(payload.error?.message ?? "Something went wrong.");
        return;
      }

      // Signup succeeds without a session when email confirmation is enabled.
      if (mode === "signup") {
        const { signedIn } = (await response.json()) as { signedIn: boolean };
        if (!signedIn) {
          setCheckEmail(true);
          return;
        }
      }

      // refresh() so the middleware re-runs with the new session cookie before
      // the dashboard renders.
      router.replace(safeRedirectPath(next));
      router.refresh();
    } catch {
      setError("Couldn’t reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="bezel w-full max-w-sm">
        <div className="bezel-core p-8 text-center">
          <span className="bg-ember-soft text-ember mx-auto flex size-12 items-center justify-center rounded-2xl text-xl">
            <Check />
          </span>
          <h1 className="display-sm mt-5 text-xl font-semibold">Check your email</h1>
          <p className="text-dim mt-2.5 text-sm leading-relaxed text-pretty">
            We’ve sent you a confirmation link. Click it to activate your account, then
            log in.
          </p>
          <Button asChild variant="outline" className="mt-7 w-full">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bezel w-full max-w-sm">
      <form ref={formRef} onSubmit={onSubmit} noValidate className="bezel-core p-8">
        <h1 className="display-sm text-2xl font-semibold">{copy.title}</h1>
        <p className="text-dim mt-2 text-sm text-pretty">{copy.description}</p>

        <div className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              // An address is not prose — autocorrect and the red squiggle are
              // pure noise here.
              spellCheck={false}
              autoCapitalize="none"
              placeholder="you@company.com"
              aria-invalid={fieldErrors.email !== undefined}
              aria-describedby={fieldErrors.email !== undefined ? "email-error" : undefined}
              disabled={pending}
            />
            {fieldErrors.email !== undefined ? (
              <p id="email-error" role="alert" className="text-destructive text-xs">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              spellCheck={false}
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              aria-invalid={fieldErrors.password !== undefined}
              aria-describedby={
                fieldErrors.password !== undefined ? "password-error" : undefined
              }
              disabled={pending}
            />
            {fieldErrors.password !== undefined ? (
              <p id="password-error" role="alert" className="text-destructive text-xs">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          {error !== null ? (
            <p
              role="alert"
              className="border-destructive/25 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm"
            >
              {error}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="mt-8 w-full" disabled={pending}>
          {pending ? (
            <>
              <span
                aria-hidden
                className="spin-slow size-4 rounded-full border-2 border-current border-t-transparent"
              />
              {copy.pending}
            </>
          ) : (
            <>
              {copy.submit}
              <ButtonIcon>
                <ArrowUpRight />
              </ButtonIcon>
            </>
          )}
        </Button>

        <p className="text-dim mt-6 text-center text-sm">
          {copy.switchPrompt}{" "}
          <Link
            href={copy.switchHref}
            className="text-foreground underline decoration-hairline-strong underline-offset-4 transition-colors hover:decoration-current"
          >
            {copy.switchLabel}
          </Link>
        </p>
      </form>
    </div>
  );
}
