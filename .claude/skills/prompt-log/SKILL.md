---
name: prompt-log
description: Append a notable prompt to docs/03-prompt-log.md with all four required answers filled in. Use when a prompt in this session unblocked something, shaped the architecture, or failed instructively — and at session wrap-up to catch anything unlogged. Also use when the user says "log that prompt" or "add this to prompts".
---

# prompt-log

**Only log prompts the HUMAN wrote.** Your own slash-command invocations and
your own reasoning are not prompts for this log — they are process, and they
belong in `docs/01-ai-development-process.md` or `docs/02-ai-tools-and-workflow.md`.
Five real human prompts beat ten padded with your own. If you are unsure whose
prompt it was, it was yours: do not log it.

`docs/03-prompt-log.md` is a graded deliverable (part of the 20-point AI-agent-usage category — the largest on the rubric). The brief asks for **5–10 best prompts**, each answering four specific questions.

**This log is Claude's job.** The user never edits it and should never have to review it for cleanup. That means every entry is complete and clean at the moment it's written — no placeholders, no "fill in later".

## When to log

Log a prompt when it did real work:

- It unblocked something that was stuck
- It shaped an architectural decision
- It produced something that needed significant correction — **these are often the best entries**, because the correction is the evidence of judgment
- It demonstrates a technique worth showing (constraint-first framing, output-shape pinning, giving the model a rejection criterion)

Do **not** log routine prompts. Ten mediocre entries score worse than six sharp ones. Target 5–10 total by submission.

## How to log

Append to `docs/03-prompt-log.md` **in the same turn the prompt proved notable** — never batched at the end. The fourth question in particular cannot be reconstructed days later.

Before writing the entry:

1. **Correct spelling and typos** in the prompt text. Record the corrected version, not the raw one. Fix mechanics only — never rewrite the prompt to look smarter than it was, and never invent a prompt that wasn't sent.
2. **Answer all four questions now**, from what actually happened in this session.
3. Number the entry sequentially and set the phase from `internal/guidelines/08-mvp-checklist.md`.

## Entry format

```markdown
## N. <Short title>

**Phase:** <MVP phase> · **Date:** <YYYY-MM-DD>

### What I asked
> <the prompt, verbatim, typos corrected>

### Why I structured it that way
<the reasoning — what constraints were stated up front, why the output shape was
pinned, why this framing over the obvious one>

### What the AI produced
<what came back — including anything wrong, over-scoped, or subtly off>

### What I changed / fixed afterward
<the edit and the reason. Never "nothing" — if the output truly shipped
unchanged, say what was verified before trusting it and why that check mattered.>
```

## The fourth question is the one that scores

"What I changed and why" is what separates a prompt log from a transcript dump. It's the section that shows the model was supervised rather than obeyed. Strong material:

- Output was correct but over-scoped — what was cut, and why the smaller version was right
- A plausible-looking pattern that would have broken a project constraint (a vendor SDK imported outside `lib/llm`, an unvalidated `JSON.parse` on a model response, the service-role client reaching a Client Component)
- A suggestion rejected on cost grounds — this project's binding constraint
- Two options offered, one picked, with the tradeoff named

## Related

- `internal/guidelines/06-deliverables.md` — the deliverable spec
- `internal/guidelines/07-scoring-map.md` — why this is worth so much
- `debug-log` skill — for failures, which go to `docs/04-debugging-log.md` instead
