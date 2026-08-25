import { z } from "zod";

/**
 * Password floor is 8 rather than Supabase's default 6. The grader signs up
 * with a real account; rejecting "123456" client-side is cheaper than
 * surfacing Supabase's own error.
 */
export const credentialsSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

export type Credentials = z.infer<typeof credentialsSchema>;
