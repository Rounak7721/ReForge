# Demo video script — 2:55 target

Working document, not a deliverable. Everything here is measured against the
deployed app on 2026-08-27.

---

## Two tracks: a demo, then diagrams

Beats 1 and 2 are the product, screen-recorded. **Beats 3 to 7 are diagrams with
voice over them** — no repo, no scrolling, no terminal.

The reason is bluntly practical. Markdown scrolled on camera is unreadable at
video speed, and the viewer spends the beat squinting at text instead of
listening to you. A still diagram is legible in one glance, which frees the
whole beat for the narration. It also makes the slides cut cleanly against the
dark app footage.

Mermaid source for all five is in `video-diagrams.md`. Two of them already exist
in the repo docs; render them at mermaid.live rather than redrawing.

---

## The one thing that decides whether this works

**The model calls take longer than the whole video.** Measured on production:

| Step | Wall clock |
|---|---|
| Analyze (with screenshot) | ~35 s |
| Build My Product | ~35 s |
| Refine concept | ~30 s |
| Build starter site | ~40 s |
| Edit the page | ~45 s |

That is **3 minutes 05 seconds of waiting** in a 3 minute video.

So: **record the screen silently in one pass, then cut every wait, then lay the
voice over the finished cut.** Do not narrate while you click. Narrating live
forces you to talk through spinners, and it makes every wait uncuttable because
your sentence is running across it.

Two tracks that do not line up 1:1:

- **Video** — the product flow, cut tight.
- **Voice** — starts on the product, then moves to process, architecture and
  Claude *while the product keeps moving underneath*.

That overlap is the only reason the required beats fit.

---

## Before you record

- [ ] `pnpm seed:demo` — the published `demo@reforge.app` account stays as it
      is. You record on a **separate** new account, so seeding cannot interfere
- [ ] Sign out everywhere. Record in a clean incognito window
- [ ] Browser zoom 110%, window 1440x900, bookmarks bar hidden
- [ ] Theme: **dark**. The ember accent reads better, and the dark-mode page edit
      lands harder against a dark shell
- [ ] Close every other tab. A stray tab title is the cheapest way to look sloppy
- [ ] **Read the script aloud once with a timer**, without recording. No model
      calls, and it is the only rehearsal you need for pacing
- [ ] **Know your spare addresses.** Signup fails on an address that already
      exists, so a take that dies *after* the signup beat burns that address.
      Take them in order: `newuser@reforge.app`, then `take2@reforge.app`, then
      `take3@reforge.app`. All three are confirmed free
- [ ] Check the Groq minute budget: leave **40 seconds** between "Build starter
      site" and the page edit. Both in one minute exceeds 8000 tokens/minute and
      the UI says "Slow down a moment". You will cut the gap anyway

---

## Input values — type these exactly

### Sign up

| Field | Value |
|---|---|
| Email | `newuser@reforge.app` |
| Password | `reforge-video-2026` |

A fresh account, separate from the published `demo@reforge.app`. Two reasons:

- The signup beat needs an **empty** dashboard. The demo account has a finished
  project in it, which would contradict the story you are telling.
- Nothing personal reaches the screen. A plus-addressed Gmail would put your
  real inbox in the video.

Verified on 2026-08-27: a real self-signup through the deployed form with an
`@reforge.app` address returns `{"signedIn":true}`. Supabase refuses some
domains outright — it rejects `.test` — so this was tested, not assumed. See
debugging entry 3.

Email confirmation is off, thus signup returns a session immediately and there
is no inbox step on camera. The address does not need a real mailbox.

### New project

| Field | Value |
|---|---|
| Website URL | `https://stripe.com` |
| What do you want to build? | `A dead-simple invoicing tool for freelance designers — send a branded invoice in under a minute and get paid by card.` |
| Who is it for? | `Freelance designers and small studios who bill 5 to 20 clients a month and hate accounting software.` |

Why Stripe: the analyzer attaches a screenshot, and Stripe's gradient and purple
CTA give the model something visible to describe. Verified output includes
"multi-coloured diagonal gradient" and "bold, saturated purple". That beat only
lands on a visually distinctive site.

### Refinement 1 — the concept

```
Add a recurring retainer plan and make the tone more premium.
```

**Use this one.** It is additive, so it lands on any draft the builder produces.

The brief's own example is *"Remove the pricing page."* — but removal only works
if the concept happens to contain a pricing page, and the builder does not emit
one reliably. With no rehearsal you will not know until the concept is on
screen. If you glance at the page list and a `/pricing` page **is** there, you
may swap to the removal instead; it is the stronger beat, because deletions read
clearly in the diff panel. Do not gamble the take on it.

Either way the diff panel proves the point: an instruction in English changed a
typed object, and you can see exactly what moved.

### Refinement 2 — the generated page

```
Make it dark mode with a deep charcoal background.
```

Chosen because the change is total and instant. A copy tweak is invisible at
this speed; a palette flip is unmistakable.

---

## Required beat coverage

The brief names seven things the video must show. This is the map.

| # | Required beat | When | Visual |
|---|---|---|---|
| 1 | What you built | 0:00–0:14 | Landing page |
| 2 | How it works | 0:14–1:05 | **Screen recording** — the live flow |
| 3 | **Architecture** | 1:05–1:28 | Diagram |
| 4 | **AI tools used** | 1:28–1:47 | Diagram |
| 5 | **How you used Claude** | 1:47–2:16 | Diagram |
| 6 | One debugging example | 2:16–2:39 | Diagram |
| 7 | **What you would build next** | 2:39–2:58 | Diagram |

Beats 1 and 2 are recorded from the product. Beats 3 to 7 are still diagrams
with voice over them — source in `video-diagrams.md`.

Sub-beat times inside beat 2 are soft. The narration runs continuously over
continuous footage there, so only the beat total is a real constraint.

Beats 3, 4 and 5 were the thin ones. Architecture had no segment at all, and
"AI tools" and "how you used Claude" are two different questions that were
sharing one block. They now hold 73 seconds between them, because that is where
the marks are: AI-agent usage is 20 points, the video itself is 5.

The demo flow is compressed to match. Sign-up, login and logout belong to the
5-point database-and-auth category, which the deployed URL and the README
already prove. They appear. They are not dwelt on.

### The narration is timed, not just written

**469 spoken words — about 2:51 of speech inside a 2:58 video.** The remaining
10 seconds are pauses, and beat 7 now carries real content rather than a list. You cannot talk continuously for three minutes and stay
listenable, and every beat below is allotted its measured need plus ten per
cent.

Do not add sentences. The first draft of this script ran 634 words, which is
4:14 of speech and unreadable in the runtime. If you want to say more somewhere,
take the words from somewhere else.

**Let the screen carry what the screen can carry.** Nothing below narrates a
click you can already see.

---

## The script

**On screen** is what the viewer sees after editing. **Say** is the voice track.

### BEAT 1 · 0:00–0:14 · What you built

**On screen:** landing page, slow scroll past the hero panel.

> **Say:** "This is Reforge. Point it at a product you admire, say what you want
> to build instead, and it drafts your own product concept — which you then argue
> with in plain English."

---

### BEAT 2 · 0:14–1:05 · How it works

#### 0:14–0:17 · Sign up

**On screen:** sign up, submit, empty dashboard.

> **Say:** "Supabase Auth, row level security on every table."

#### 0:17–0:21 · The input

**On screen:** New project, type the three fields, click Analyze.

> **Say:** "A reference site, what to build, who it's for."

#### 0:21–0:33 · Teardown

**On screen:** *cut the 35-second wait.* Scroll the seven fields. **Hold on
Visual impression.**

> **Say:** "Page text goes to Gemini with a screenshot on the same call, so
> vision costs nothing extra. This field is read from the screenshot — it caught
> the gradient and the purple button."

#### 0:33–0:39 · Build

**On screen:** Build My Product. *Cut the wait.* Scroll the concept.

> **Say:** "Name, features, navigation, pages, a UI direction. Strict JSON,
> zod-validated, cached in Postgres."

#### 0:39–0:51 · Refine, and the diff

**On screen:** type refinement 1. *Cut the wait.* **Hold on the diff panel.**

> **Say:** "Not a chat transcript. The instruction edits the concept object and
> you get a diff. It returns the whole object, not a patch — so undo is the
> previous row."

#### 0:51–0:55 · Preview

**On screen:** Preview tab, template render, one page switch.

> **Say:** "The concept renders as a real page. Zero model calls."

#### 0:55–1:01 · Real code

**On screen:** Build starter site. *Cut the wait.* Click a nav link so it
scrolls. Refinement 2. *Cut the wait.* The page goes dark.

> **Say:** "Or generate the real thing, on a second provider — so it can't
> exhaust the quota analysis needs."

#### 1:01–1:05 · Downloads, persistence, out

**On screen:** download the HTML, the PDF export, Ctrl+P — **two seconds** —
then reopen the project, then log out.

> **Say:** "Download it, export the brief. Reopening never calls a model."

---

### BEAT 3 · 1:05–1:28 · Architecture

**On screen:** the architecture diagram from `video-diagrams.md`, held still for
the whole beat.

> **Say:** "One Next.js app on Vercel. Every mutation goes through a route
> handler, every model call is server side, and row level security enforces
> ownership — not the middleware. All model calls go through one provider layer,
> so changing vendor is an environment variable. That's how code generation runs
> on Groq while the pipeline stays on Gemini."

---

### BEAT 4 · 1:28–1:47 · AI tools used

**On screen:** the AI-tools diagram. The three cut items are on it deliberately
— name them out loud when you reach that box.

> **Say:** "Claude Code, with three MCP servers: Context7 for current docs,
> Supabase for schema, Playwright to drive the deployed app. Four skills live in
> the repo — two of them force these logs to be written as things happen. No
> subagents, no framework. Both cut deliberately."

---

### BEAT 5 · 1:47–2:16 · How you used Claude ← **the highest-scoring 30 seconds**

**On screen:** the review-loop diagram. It carries the three findings in a red
box; land on that box as you say them.

> **Say:** "It works under a written agreement it re-reads every turn. Plan
> before building. One phase at a time. Ask before anything irreversible. After
> every phase it reviews its own diff — which found a real SSRF, an open
> redirect in the login flow, and a middleware bug that threw away rotated auth
> cookies. I rejected about a third of what it found. The gate produces
> candidates. A person still decides."

---

### BEAT 6 · 2:16–2:39 · One debugging example

**On screen:** the truncation diagram. Hold on the final box.

> **Say:** "The page generator returned two hundred — valid JSON, schema-valid,
> finish reason 'stop'. And a document cut off mid-tag at exactly 10,240
> characters. Ten times 1024. Models don't stop on power-of-two boundaries;
> buffers do. The vendor's decoder had truncated the string and closed the
> object around it. Every signal said success. Now the schema requires the
> closing tag."

---

### BEAT 7 · 2:39–2:58 · What you would build next

**On screen:** the "what comes next" diagram — today's three calls beside the
five-agent pro tier, plus the two extensions.

> **Say:** "The obvious next build is the five-agent pipeline — which I've built
> elsewhere. Five chained calls is nearly three minutes per click, so it's a pro
> tier rather than the default. After that: competitive teardowns across several
> URLs, and scaffolding a real repo instead of one HTML file."

---

## If you run over 3:00

Cut in this order. Each line is the least valuable remaining second.

1. **The print dialog** — one frame. It is proof, not content
2. **The page switcher** — drop it, the template render already made the point
3. **The logout** — reopening already proved persistence
4. **The landing scroll** — 14 seconds to 8
5. **Speed the demo footage** to 1.25x under the beat 2 narration

Only 7 seconds of the runtime is pause, which is tight. If the read feels
rushed, take it out of beat 2 rather than a diagram beat: the demo footage can
run under silence and still make sense, and a diagram held in silence cannot.

Do **not** cut beats 3 to 6. Those are the ones the brief names and the rubric
pays for.

---

## Editing notes

- **Cut every wait to under a second.** A speed-ramp is fine and reads as
  honest. Do not fake latency by trimming to look instant with no ramp — a
  reviewer who has used a free tier will notice
- **Burn in subtitles.** Not optional, see below
- **Hold two shots longer than feels right:** the diff panel, and the page going
  dark. Those are the two moments that prove the product does something
- **Do not zoom around.** One steady window. Cursor movement should be slow
- **Cut the OS print dialog to about 2 seconds.** It is necessary proof and
  visually dull

---

## Voiceover: my take

**Record your own voice. Burn in subtitles regardless.**

**Why your own voice.** The largest single scoring category is your account of
how you used the AI, and the brief calls "how you used Claude" its centre of
gravity. A person explaining a decision they made — *"I rejected about a third
of what it found"* — reads as ownership. The same sentence in a synthetic voice
reads as a product advertisement. For an AI engineering role, the thing being
assessed is your judgement about the AI, and judgement sounds like a person.

**Why subtitles regardless of what you choose.** Reviewers watch muted, at 1.5x,
and in noisy rooms. Captions also survive autoplay-muted embeds. This is cheap
and it is pure downside protection.

**When AI voiceover is the right call.** If you are not comfortable speaking, a
*scripted* synthetic read beats a human take with hesitation and dead air. The
failure mode that costs marks is not a synthetic voice — it is rambling. If you
choose AI, keep the script exactly as written; it is already timed.

**Either way, record audio separately from the screen.** It is the single
biggest quality difference for the least effort: you can re-record a fluffed
sentence without redoing the capture, and you can cut the model-call waits
without cutting your own sentence in half.

**Practical:** read the script aloud once with a timer before recording. If you
are over 3:00, cut from 0:22–0:34 (the input beat) — the values are readable on
screen and do not need narration.

**Going in without a rehearsal** puts more weight on the edit than on the take.
Record the screen in one long pass and keep rolling through any fumble; a bad
thirty seconds is a cut, not a retake, as long as the signup succeeded. The only
failure that forces a genuine restart is a failed signup, and that is what the
spare addresses are for.
