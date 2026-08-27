---
name: debug-log
description: Log a real failure to docs/04-debugging-log.md in the required Problem→Prompt→Attempt→Debug→Fix format. Use the moment AI-generated code fails, breaks, or behaves wrongly — before fixing it. Also use when the user says "log this bug" or at wrap-up to catch unlogged failures.
---

# debug-log

`docs/04-debugging-log.md` is a graded deliverable worth **10 points**. The brief asks for at least 2 examples where AI-generated code failed, and marks the section *"This is important."*

**Log the failure before fixing it.** Once the fix lands, the dead ends and the wrong hypotheses are gone — and those are the parts that demonstrate debugging skill. A bug fixed silently is a lost point.

## When to log

Any real failure where AI-generated code didn't work:

- Runtime error or crash
- Wrong behaviour that looked right in review
- A build or type failure from generated code
- Something that worked locally and broke on deploy
- A model response that broke a downstream assumption

Not: typos caught immediately, or things fixed in under a minute with no investigation.

Minimum 2 by submission. Two well-documented failures beat five thin ones — but log more than two as they happen and select the best at the end.

## Procedure

1. **Stop before fixing.** Capture the symptom: exact error text, what the user saw, what was expected.
2. **Capture the prompt** that produced the broken code, verbatim (typos corrected, content unchanged).
3. **Write the Problem, AI prompt, and Attempted solution sections now.**
4. Debug. Keep notes on what was tried, including the wrong turns.
5. After the fix lands, complete the Debugging and Final solution sections.

## Entry format

```markdown
## N. <Short title>

**Phase:** <MVP phase> · **Date:** <YYYY-MM-DD>

### Problem
<observed symptom — exact error text, what the user saw, expected vs actual>

### AI prompt
> <the prompt that produced the broken code>

### Attempted solution
<what the AI generated, and why it looked correct — this matters: the failure is
more interesting when the code was plausible>

### Debugging
<how the real cause was found: hypotheses, what was checked, what was ruled out,
the dead ends. Do not compress this into a clean narrative — the messy version
is the evidence.>

### Final solution
<the fix, and the underlying reason it works — not just the diff>
```

## Write the Debugging section honestly

The temptation is to present a straight line from symptom to fix. Resist it. A section that reads "assumed X, checked, ruled out; then noticed Y in the response body; confirmed by Z" scores better than "found the bug and fixed it", because it shows method. Dead ends are the content, not noise to be trimmed.

## Likely candidates in this stack

Worth recognising early so they get logged rather than reflexively patched:

- Malformed LLM JSON surviving into `JSON.parse` — the most probable runtime failure here
- A 429 storm from an un-debounced chat box hitting the ~10–15 RPM free tier
- An RLS policy blocking a legitimate read (works with service role, fails in the browser)
- The service-role Supabase client reaching a Client Component / the client bundle
- Next.js 15 async API changes (`cookies()`, `params`) against a model's older training data
- Env var set locally but missing in Vercel — works in dev, breaks on deploy

## Related

- `internal/guidelines/06-deliverables.md` — the deliverable spec
- `prompt-log` skill — for notable prompts, which go to `docs/03-prompt-log.md` instead
