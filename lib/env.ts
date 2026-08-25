import { z } from "zod";

/**
 * Env access, validated once at module load.
 *
 * Vercel env vars are being added lazily as each is first used, so the failure
 * mode this guards against is real: a missing var otherwise arrives as
 * `undefined` inside a Supabase constructor and surfaces as an opaque runtime
 * error on the first click. Here it fails loudly, naming the variable.
 *
 * `publicEnv` is safe anywhere. `serverEnv` is a function, not a constant, so
 * that merely importing this module from a Client Component doesn't try to read
 * server-only values — call it inside server code.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"),
});

// Next.js inlines NEXT_PUBLIC_* at build time only for statically analysable
// property access, so these must be written out in full rather than looped over.
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is missing"),
});

let cachedServerEnv: z.infer<typeof serverSchema> | undefined;

export function serverEnv() {
  cachedServerEnv ??= serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return cachedServerEnv;
}
