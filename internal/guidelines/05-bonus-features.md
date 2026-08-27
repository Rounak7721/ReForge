# 05 — Bonus Features

> "These are optional but will **significantly improve your score**."

Seven bonuses listed in the PDF, verbatim below. Note they map onto the high-value scoring categories (AI-agent usage 20 pts, AI/LLM integration 10 pts), so a cheap one is worth more than extra polish on a required feature.

**Build none of these until the required 3-call flow works end to end and is deployed.**

| # | Bonus (PDF wording) | What it means | Effort | Verdict |
|---|---|---|---|---|
| 1 | **Website Screenshot Analysis** — "capture/analyze the website visually and understand its UI" | microlink.io screenshot → pass image to Gemini Flash vision alongside the text | Low | **Do it.** Cheapest bonus; Flash is multimodal already; visibly impressive in the video |
| 2 | **Generate Actual UI** — "generate an actual working UI/page from the analysis" | Render the concept as a real styled page, not a JSON dump | Medium | **Do it.** Overlaps with Product-quality points; a rendered mock is far more demoable than a field list |
| 3 | **Code Generation** — "generate actual starter code for one of the proposed product pages" | One more LLM call → a React/Tailwind component string in a code viewer with copy button | Low–Medium | **Strong candidate.** Reuses the existing llm layer; scoped to one page |
| 4 | **AI Agent Workflow** — "Research Agent → Product Agent → UI Agent → Coding Agent → QA Agent" | Replace the 3-call chain with 5 specialized agents | High | **CUT — future scope.** See below |
| 5 | **Live Preview** — "allow the user to preview the generated product" | Render the generated UI in an iframe / preview pane | Medium | Pairs naturally with #2 — do them together or not at all |
| 6 | **Iterative AI Development** — user says "Change the homepage," AI modifies the generated application | Refine, but targeting generated *code/UI* rather than the concept object | High | Only meaningful after #3 + #5 |
| 7 | **Automated QA** — "AI agent to inspect the application and identify UI/functionality problems" | Playwright MCP + a qa-tester subagent walking the deployed app | Low | **Do it** — it costs almost nothing since the tooling is already available, and it produces material for the video and for `docs/04-debugging-log.md` |

## Status as of 2026-08-26 — **[LIVE]**

| # | Bonus | Status | Notes |
|---|---|---|---|
| 1 | Screenshot analysis | **Planned — phase 3** | No microlink call and no image part exists yet |
| 2 | Generate actual UI | **Partial → phase 1** | Concept renders as *structure* (nav bar, page outline, palette mock). Not yet a rendered page |
| 3 | Code generation | **Planned — phase 2** | Groq + Qwen, HTML out |
| 4 | Agent workflow | **CUT** | Reason stated below; keep it cut |
| 5 | Live preview | **Partial → phase 1** | Only the small palette mock exists |
| 6 | Iterative AI dev | **Planned — phase 2** | Un-cut: it depended on #3 + #5, both now planned |
| 7 | Automated QA | **Done as process, NOT as a feature** | Real AI-driven inspection happened (`internal/notes/UI-AUDIT.md`, the contrast audit, the frame-sampling that caught the analyze flash). It is a development practice, not something the product does. **Claim it as process; do not claim it as a shipped feature.** |

The full phase plan lives in `internal/notes/HANDOFF.md`.

## Recommended order **[OUR DECISION]**

If time remains after deploy, in this order:

1. **#7 Automated QA** — nearly free, and its output feeds two graded deliverables
2. **#1 Screenshot analysis** — one API call, big visual payoff
3. **#2 + #5 Generate actual UI + live preview** — the largest jump in perceived product quality
4. **#3 Code generation** — self-contained, easy to demo
5. **#4 Agent workflow** — only if there is genuinely spare time and RPM headroom

Stop at whatever point the deadline is 4 hours away, and spend those 4 hours on the video, README, and prompt log. An unfinished bonus scores zero; a missing README loses 5 guaranteed points plus credibility.

## Watch the rate limit

Bonuses #4 and #6 multiply LLM calls per user action. At ~10–15 RPM on the free tier, a 5-agent chain is 5 calls for one click. If you build #4, serialize the chain and show per-agent progress in the UI — which incidentally makes it *look* more sophisticated than a single spinner.


## Cut: the multi-agent workflow **[OUR DECISION]**

Bonus #4 is **not being built**, and bonus #6 falls with it.

**Why:** five chained model calls per user action against a ~10–15 RPM free tier is not viable — a single "Build My Product" click would consume a third of the minute's budget, and the grader running two projects back to back would hit 429s. It also adds no *required* capability: the 3-call pipeline already satisfies every bullet in `02-functional-requirements.md`. Spending the largest remaining time block on the highest rate-limit risk, for zero requirement coverage, is the wrong trade at 48 hours.

**Future scope framing** — say this in the README's "Known limitations" and in the video's "what I'd build next" beat:

> The Research → Product → UI → Coding → QA agent pipeline is a natural **LangGraph** fit: each agent becomes a node with typed state on the edges, and orchestration, retries, conditional branching, and human-in-the-loop checkpoints come from the framework rather than being hand-rolled. What blocks it here is cost, not design — the graph needs a paid-tier rate limit to run end to end. The current 3-call chain is the same pipeline collapsed to fit the free tier.

A cut with a stated reason and a concrete plan reads as product judgment. An unexplained gap reads as an unfinished feature — make sure it's visibly the former.