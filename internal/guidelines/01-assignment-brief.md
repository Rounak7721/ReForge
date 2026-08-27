# 01 — Assignment Brief

Source: `internal/brief/AI FS Engineer Technical Task.pdf` (10 pages). Everything here is from the PDF unless marked **[OUR DECISION]**.

## Role being assessed

Technical Assessment — **AI Product Engineer / Claude & Codex Expert**.

## Objective

Build and deploy a **production-quality AI SaaS MVP** using AI coding tools (Claude Code, GPT Codex, Cursor, or equivalent).

They are evaluating the ability to go end to end across this chain:

> Idea → Product thinking → AI prompting → UI → Backend → AI integration → Database → Deployment → Debugging

Explicit instruction from the brief:

> "You are expected to use AI heavily. **Do not manually code everything.** We want to see how effectively you can use AI coding agents to build a real product."

This reframes the whole task: the artifact being graded is *how the product was built*, not only the product. See `07-scoring-map.md` — AI-agent usage is the single largest scoring category (20/100), larger than frontend + backend combined.

## The challenge — "AI Website-to-Product Agent"

The user gives the app **a website URL + a short description of what they want to build**. The product analyzes that website and helps turn the idea into a functional software product / SaaS landing page / web application.

Worked example from the brief:

```
Website: https://example.com
Prompt:  "Build me a modern SaaS version of this product for small businesses."
```

The application must then:

1. Analyze the website/content
2. Understand the product and its positioning
3. Generate a product summary
4. Identify key features
5. Generate a proposed product structure
6. Generate a modern UI/landing-page concept
7. Allow the user to modify the generated concept through chat/instructions

Steps 1–2 are the Analyzer, 3–6 are the Builder, 7 is the Editor. See `04-execution-flows.md`.

## Time limit

- **48–72 hours** from receiving the assignment.
- "Do not spend weeks polishing it."
- Primary evaluation axes stated: **speed + product thinking + AI usage + engineering ability + execution**.
- "There is nothing right or wrong outcome, our idea is to judge the skills, how to get best out of these tools."

The PDF was generated **2026-08-25 13:42 IST**, so the 72h window closes around **2026-08-28** if it was received the same day. Confirm the actual received time before planning the schedule.

**[OUR DECISION]** We are compressing this into ~24h. Optimize for a working, demoable MVP over polish. Cut bonus features before cutting required ones.

## Final test — may or may not happen

At the end of the interview they may ask for a **live change to the deployed application using Claude Code/Codex, while screen sharing**.

Example given: *"Add Google authentication and create a new analytics page."*

Implications for how we build:

- The repo must be **clean and navigable under pressure** — someone else (and you, live) must find the right file fast.
- Auth must be structured so adding an OAuth provider is a config change, not a refactor. Supabase Auth handles this.
- Adding a new page to the protected dashboard should be a copy-paste of an existing route pattern. Keep route structure boringly consistent.
- Keep `pnpm dev` fast and the build green at all times — a red build during a live demo is fatal.

Closing line of the brief: *"We are looking for builders who can use AI to turn ideas into production software — not people who simply know how to write prompts."*

## Contact

Lalit — `lalit@sensegrass.com`, or via LinkedIn. Reach out with doubts.
