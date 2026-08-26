/**
 * Seeds the demo account with one finished project.
 *
 * **Required, not a nicety.** The free Gemini tier allows 500 requests a day,
 * shared with whoever is evaluating this. If that runs out, a visitor with no
 * seeded project sees an empty dashboard and an honest error — which is correct
 * behaviour but a poor demonstration. This gives them something real to open.
 *
 * Makes **zero model calls**: every value comes from `lib/demo/seed-data.ts`,
 * captured from one real pipeline run.
 *
 * Idempotent — re-running replaces the demo project rather than duplicating it.
 *
 *   pnpm seed:demo
 */
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo/credentials";
import {
  DEMO_ANALYSIS,
  DEMO_GENERATED_HTML,
  DEMO_CONCEPT,
  DEMO_PROJECT,
  DEMO_REFINEMENTS,
} from "@/lib/demo/seed-data";
import { createAdminClient } from "@/lib/supabase/admin";

async function findOrCreateUser(admin: ReturnType<typeof createAdminClient>) {
  // `createUser` with an existing email returns an error rather than the user,
  // so look first. listUsers is paginated; the demo project is small enough
  // that page 1 is always enough, but be explicit rather than assume.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError !== null) throw new Error(`listUsers: ${listError.message}`);

  const existing = list.users.find((u) => u.email === DEMO_EMAIL);
  if (existing !== undefined) {
    // Reset the password so a rotated credential in the README still works.
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error !== null) throw new Error(`updateUser: ${error.message}`);
    console.log(`  reused existing demo user ${existing.id}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    // Confirm outright: the project has email sending effectively disabled,
    // and an unconfirmed demo user could never log in.
    email_confirm: true,
  });
  if (error !== null) throw new Error(`createUser: ${error.message}`);
  console.log(`  created demo user ${data.user.id}`);
  return data.user.id;
}

async function main() {
  console.log(`Seeding demo account: ${DEMO_EMAIL}`);
  const admin = createAdminClient();

  const userId = await findOrCreateUser(admin);

  // Replace rather than accumulate. `refinements` cascades from `projects`.
  const { error: clearError } = await admin.from("projects").delete().eq("user_id", userId);
  if (clearError !== null) throw new Error(`clear projects: ${clearError.message}`);

  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({
      user_id: userId,
      url: DEMO_PROJECT.url,
      description: DEMO_PROJECT.description,
      target_customer: DEMO_PROJECT.targetCustomer,
      analysis: DEMO_ANALYSIS,
      concept: DEMO_CONCEPT,
      generated_html: DEMO_GENERATED_HTML,
    })
    .select("id")
    .single();
  if (projectError !== null) throw new Error(`insert project: ${projectError.message}`);

  const { error: refineError } = await admin.from("refinements").insert(
    DEMO_REFINEMENTS.map((r) => ({
      project_id: project.id,
      instruction: r.instruction,
      concept_after: r.conceptAfter,
    })),
  );
  if (refineError !== null) throw new Error(`insert refinements: ${refineError.message}`);

  console.log(`  project ${project.id} — "${DEMO_CONCEPT.name}"`);
  console.log(`  ${DEMO_REFINEMENTS.length} refinements`);
  console.log(`\nDone. Log in at /login with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((e) => {
  console.error("SEED FAILED:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
