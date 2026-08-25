# 07 — Scoring Map (100 Points)

The rubric verbatim, with what actually earns each category. Use this to arbitrate time trade-offs: when two tasks compete, the one attached to more unearned points wins.

| Category | Points | What earns it |
|---|---:|---|
| Product quality & UX | **15** | The landing page's nine sections; shadcn consistency; loading/error/empty states everywhere; it "looks like a real startup" |
| **Claude/Codex/AI-agent usage** | **20** | `docs/PROMPTS.md` (5–10 prompts × 4 parts); the AI development process narrative; the video segment on how Claude Code built it; visible process discipline (plan mode, review gate, small commits) |
| Frontend engineering | **10** | Server/Client Component split; typed props; no `any`; responsive; real component structure |
| Backend/API architecture | **10** | Three clean route handlers; input validation; typed error responses; consistent patterns across routes |
| AI/LLM integration | **10** | The swappable `lib/llm` layer; zod-validated LLM output; `maxOutputTokens`; 429 handling; caching |
| Database & authentication | **5** | Supabase schema, RLS on, sign-up/login/logout/protected dashboard |
| Deployment & production readiness | **10** | Public URL that works for a stranger; env vars set; no crashes; graceful degradation |
| Debugging/problem solving | **10** | `docs/DEBUGGING.md` with ≥2 full Problem→Prompt→Attempt→Debug→Fix trails |
| Code quality | **5** | TS strict, small modular files, no dead code, readable repo |
| Video + explanation | **5** | ≤3 min, all eight beats, recorded against production |
| **Total** | **100** | |

## What this implies

**35 of 100 points are documentation and process** — AI-agent usage (20) + debugging (10) + video (5). That is more than frontend (10) + backend (10) + AI integration (10) combined. Two consequences:

1. **`docs/PROMPTS.md` and `docs/DEBUGGING.md` are not chores.** They are the second-largest and joint-third-largest scoring items. Writing them as you go is the single highest-leverage habit in this project.
2. **A beautiful app with no prompt log caps out around 65.** A decent app with an excellent process trail scores higher than a great app with none.

**Deployment is worth 10 — the same as all of frontend engineering.** A polished app that isn't publicly reachable scores worse than a plain one that is. Deploy early, deploy a skeleton, keep it green.

**Debugging is worth 10, and requires failures to have happened.** Don't hide them or fix them silently. When AI-generated code breaks, that's a graded artifact — log it before fixing it.

## Time-allocation heuristic **[OUR DECISION]**

Given ~24h compressed from the 48–72h budget:

| Phase | Share | Notes |
|---|---|---|
| Scaffold + auth + DB + deploy skeleton | ~20% | Get a public URL on day one, even if it only shows the landing page |
| The 3-call pipeline + dashboard | ~35% | The core requirement; nothing else matters until this works |
| Landing page polish | ~15% | 15 points, and it's the first impression |
| Docs (PROMPTS / DEBUGGING / README) | ~15% | Written continuously, not in this block — the block is for tidying |
| Bonuses | ~10% | Only after deploy; see `05-bonus-features.md` |
| Video | ~5% | Script it; re-record rather than rambling |

Reserve the final 4 hours for video + README + prompt log regardless of feature state. Those are 25 guaranteed points that require no code.
