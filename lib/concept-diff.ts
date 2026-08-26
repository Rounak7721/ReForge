import type { Concept } from "@/lib/prompts/builder";

/**
 * What changed between two concepts.
 *
 * The Editor returns the whole concept object rather than a patch, which keeps
 * the pipeline idempotent but means a refinement is otherwise invisible — the
 * page simply swaps and the user has to hunt for the difference. This computes
 * the difference so the UI can state it.
 *
 * Pure, synchronous, and free: it is a comparison of two objects already in
 * memory, so showing the diff costs no extra model call and no extra quota.
 *
 * Identity rules, chosen to match how the model actually behaves:
 * - pages and navigation are keyed by `path` (a rename keeps the path)
 * - features are keyed by `name` (they have no stable id)
 * A rename therefore reads as one removal plus one addition, which is honest:
 * we cannot tell a rename from a swap without an id, and claiming otherwise
 * would sometimes be wrong.
 */

export type ChangeKind = "added" | "removed" | "changed";

export type Change = {
  kind: ChangeKind;
  /** Which part of the concept moved. */
  area: "Name" | "Description" | "Feature" | "Page" | "Navigation" | "UI direction";
  label: string;
  /** Present on `changed` entries where showing the old value is useful. */
  from?: string;
  to?: string;
};

export type ConceptDiff = {
  changes: Change[];
  counts: { added: number; removed: number; changed: number };
};

function diffKeyed<T>(
  before: readonly T[],
  after: readonly T[],
  key: (item: T) => string,
  label: (item: T) => string,
  area: Change["area"],
): Change[] {
  const beforeKeys = new Map(before.map((item) => [key(item), item]));
  const afterKeys = new Map(after.map((item) => [key(item), item]));

  const changes: Change[] = [];

  for (const [k, item] of afterKeys) {
    if (!beforeKeys.has(k)) changes.push({ kind: "added", area, label: label(item) });
  }
  for (const [k, item] of beforeKeys) {
    if (!afterKeys.has(k)) changes.push({ kind: "removed", area, label: label(item) });
  }

  return changes;
}

export function diffConcepts(before: Concept, after: Concept): ConceptDiff {
  const changes: Change[] = [];

  if (before.name !== after.name) {
    changes.push({
      kind: "changed",
      area: "Name",
      label: after.name,
      from: before.name,
      to: after.name,
    });
  }

  if (before.description !== after.description) {
    changes.push({ kind: "changed", area: "Description", label: "Rewritten" });
  }

  changes.push(
    ...diffKeyed(
      before.features,
      after.features,
      (f) => f.name.trim().toLowerCase(),
      (f) => f.name,
      "Feature",
    ),
  );

  changes.push(
    ...diffKeyed(
      before.pages,
      after.pages,
      (p) => p.path.trim().toLowerCase(),
      (p) => `${p.name} (${p.path})`,
      "Page",
    ),
  );

  changes.push(
    ...diffKeyed(
      before.navigation,
      after.navigation,
      (n) => n.path.trim().toLowerCase(),
      (n) => n.label,
      "Navigation",
    ),
  );

  // Pages that survived but whose section count moved — "the home page grew a
  // section" is a real, visible change the keyed diff above cannot see.
  const beforePages = new Map(before.pages.map((p) => [p.path.trim().toLowerCase(), p]));
  for (const page of after.pages) {
    const previous = beforePages.get(page.path.trim().toLowerCase());
    if (previous === undefined) continue;
    if (previous.sections.length !== page.sections.length) {
      changes.push({
        kind: "changed",
        area: "Page",
        label: page.name,
        from: `${previous.sections.length} sections`,
        to: `${page.sections.length} sections`,
      });
    }
  }

  const ui = [
    ["Style", before.uiDirection.style, after.uiDirection.style],
    ["Mood", before.uiDirection.mood, after.uiDirection.mood],
    ["Typography", before.uiDirection.typography, after.uiDirection.typography],
    ["Primary", before.uiDirection.palette.primary, after.uiDirection.palette.primary],
    ["Surface", before.uiDirection.palette.surface, after.uiDirection.palette.surface],
    ["Text colour", before.uiDirection.palette.text, after.uiDirection.palette.text],
  ] as const;

  for (const [label, from, to] of ui) {
    if (from !== to) {
      changes.push({ kind: "changed", area: "UI direction", label, from, to });
    }
  }

  const counts = {
    added: changes.filter((c) => c.kind === "added").length,
    removed: changes.filter((c) => c.kind === "removed").length,
    changed: changes.filter((c) => c.kind === "changed").length,
  };

  return { changes, counts };
}
