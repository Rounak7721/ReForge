import { conceptSchema, type Concept } from "@/lib/prompts/builder";

/**
 * The Editor: step 3 of the pipeline. Concept + instruction → updated concept.
 *
 * Returns the **whole** object, never a patch. Idempotent, trivial to persist,
 * and it makes undo a matter of restoring the previous `refinements` row.
 *
 * The schema is shared with the Builder on purpose — an edit must produce
 * something the Builder could equally have produced, so there is exactly one
 * shape in the system for ConceptView (and later a renderer or code generator)
 * to consume.
 */
export { conceptSchema };

const SYSTEM = [
  "You are editing an existing product concept.",
  "Return the COMPLETE concept object, not a description of your changes and not a partial object.",
  "Apply the user's instruction and NOTHING else. Every field the instruction does not implicate must come back exactly as it went in — same wording, same order.",
  // Measured: without this sentence the model removes a page and leaves its nav
  // entry behind, which renders as a broken link. Cross-field consistency is not
  // inferred, it has to be stated.
  "Keep pages and navigation consistent. If you add a page, add its navigation entry. If you remove a page, remove its navigation entry.",
  // The palette used to be a fixed three-key object, so "use red, gold, black
  // and white" was unsatisfiable by construction. It is an open list now, and
  // the model has to be told that the incoming length is not a budget —
  // otherwise it mirrors whatever count it was handed.
  "The palette is a list of any length. If the instruction names colours, return one entry for EVERY colour named, adding entries as needed. Never drop a requested colour to keep the list the size it was.",
  "If the instruction is vague, make a confident, specific choice rather than a generic one.",
  "Respond with a single JSON object matching the schema. No prose outside it.",
].join(" ");

export function buildEditorPrompt(input: {
  concept: Concept;
  instruction: string;
}): { system: string; prompt: string } {
  const prompt = [
    "=== CURRENT CONCEPT ===",
    JSON.stringify(input.concept, null, 2),
    "",
    "=== INSTRUCTION ===",
    input.instruction,
    "",
    "Return the full updated concept.",
  ].join("\n");

  return { system: SYSTEM, prompt };
}
