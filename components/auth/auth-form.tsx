"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiError } from "@/lib/api/errors";
import { safeRedirectPath } from "@/lib/safe-redirect";

type Mode = "login" | "signup";

const COPY = {
  login: {
    title: "Welcome back",
    description: "Log in to pick up where you left off.",
    submit: "Log in",
    pending: "Logging in…",
    endpoint: "/api/auth/login",
    switchPrompt: "Don't have an account?",
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

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const copy = COPY[mode];
  const router = useRouter();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    try {
      const response = await fetch(copy.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
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
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent you a confirmation link. Click it to activate your
            account, then log in.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to login</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              minLength={8}
              required
              disabled={pending}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="text-destructive bg-destructive/10 rounded-md px-3 py-2 text-sm"
            >
              {error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="mt-6 flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? copy.pending : copy.submit}
          </Button>
          <p className="text-muted-foreground text-sm">
            {copy.switchPrompt}{" "}
            <Link href={copy.switchHref} className="text-foreground underline underline-offset-4">
              {copy.switchLabel}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
