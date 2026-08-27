# Internal — working material

This folder is **not** part of the deliverable. It is the material that built
the project: the original brief, the requirement checklists that came from it,
and the session notes.

It lives here so that the repository root shows the product and the required
documentation first. Read this folder to see how the work was divided and
tracked. Do not read it to learn how the application works — the
[root README](../README.md) and [`docs/`](../docs/) hold that.

---

## What is here

```
internal/
  guidelines/   The distilled brief. The working source of truth.
  guidelines/   The brief, changed into gradeable checklists.
  notes/        Session handover and audits.
```

### `guidelines/`

`AI FS Engineer Technical Task.pdf` is the assignment.

After the team wrote the guidelines, **nobody read this PDF again**. The
checklists became the working source of truth. This was deliberate. A prose
brief invites interpretation. A checklist does not.

### `guidelines/`

Nine documents. They turn the brief into literal tickboxes.

| File | Content |
|---|---|
| `README.md` | Index, and the three things that are easy to forget |
| `01-assignment-brief.md` | Objective, the challenge, the time limit |
| `02-functional-requirements.md` | The seven required areas as tickboxes |
| `03-tech-stack.md` | Stack, cost rules, environment variables |
| `04-execution-flows.md` | The core loop, the pipeline, the failure modes |
| `05-bonus-features.md` | All seven bonus items, with effort and verdict |
| `06-deliverables.md` | The five submissions and the pre-submission checklist |
| `07-scoring-map.md` | The 100-point score mapped onto actions |
| `08-mvp-checklist.md` | **The live tracker.** It shows what is built and verified. |
| `09-tooling.md` | The MCP servers, skills and subagents, with reasons |

Each document marks the team's own choices with **[OUR DECISION]**. This keeps
"required by the brief" separate from "chosen by us".

`08-mvp-checklist.md` is the file to open first. Its legend is strict:

| Mark | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | Built, but **not** seen working on the deployed URL |
| `[x]` | Done **and** verified on the deployed URL |
| `[-]` | Cut, with the reason recorded |

Nothing becomes `[x]` because the code exists. A person must see it work on
production.

### `notes/`

| File | Content |
|---|---|
| `notes/HANDOFF.md` | The state at the end of the last session, and the next actions |
| `notes/ARCHITECTURE.md` | An earlier architecture document. The root README replaced it. |
| `notes/UI-AUDIT.md` | The AI interface audit that started the redesign |

`notes/HANDOFF.md` is written for a reader with no memory of the session that wrote
it. Each session started by reading it.

`ARCHITECTURE.md` is kept for the record only. The nine required sections now
live in the root README, which the brief asks for. **Where the two disagree,
the root README is correct.**

---

## Where the deliverables are

| Deliverable | Location |
|---|---|
| Live product | https://reforge.rounak.co |
| Technical README, nine sections | [`README.md`](../README.md) |
| AI development process | [`docs/01-ai-development-process.md`](../docs/01-ai-development-process.md) |
| AI tools used | [`docs/02-ai-tools-and-workflow.md`](../docs/02-ai-tools-and-workflow.md) |
| AI prompt log | [`docs/03-prompt-log.md`](../docs/03-prompt-log.md) |
| Debugging log | [`docs/04-debugging-log.md`](../docs/04-debugging-log.md) |
