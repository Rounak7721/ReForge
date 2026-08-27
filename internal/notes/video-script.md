# Demo video script — 2:55 target

Working document, not a deliverable. Everything here is measured against the
deployed app on 2026-08-27.

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

## The script

Times are cumulative. **On screen** is what the viewer sees after editing.
**Say** is the voice track.

### 0:00–0:12 · What it is

**On screen:** landing page, slow scroll past the hero panel.

> **Say:** "This is Reforge. You give it a product you admire and a description
> of what you want to build. It reads the site, takes the product apart, and
> drafts your own product concept — which you then argue with in plain English."

### 0:12–0:22 · Sign up

**On screen:** Sign up, type the email and password, submit, land on the empty
dashboard.

> **Say:** "New account, no email confirmation step. Supabase Auth, with row
> level security on every table from the first migration."

> A brand-new account with an empty dashboard. The `demo@reforge.app` account in
> the README is separate and already holds a finished project, for reviewers who
> arrive after the daily quota is spent.

### 0:22–0:34 · The input

**On screen:** New project. Type the three fields. Hover "Analyze this product".

> **Say:** "Three inputs: a reference site, what you want to build, and who it
> is for. One model call."

### 0:34–0:52 · Teardown

**On screen:** *cut the 35-second wait.* Teardown appears. Scroll through the
seven fields. **Pause on Visual impression.**

> **Say:** "It fetches the page, strips it to text, and sends it to Gemini with a
> screenshot attached to the same call — so vision costs no extra quota. Seven
> fields. This last one is read from the screenshot: it picked up the gradient
> and the purple call-to-action."

### 0:52–1:08 · Build

**On screen:** "Your product" tab. Build My Product. *Cut the wait.* Concept
appears — scroll the features, navigation, page structure, palette.

> **Say:** "Build turns the teardown into a concept: a name, features,
> navigation, every page and its sections, and a UI direction. Strict JSON,
> validated with zod, cached in Postgres."

### 1:08–1:24 · Refine, and the diff

**On screen:** type refinement 1 into the command bar. *Cut the wait.* The diff
panel appears. **Hold on it.**

> **Say:** "Refinement is not a chat transcript. The instruction edits the
> concept object, and you get a diff — what was added, removed and changed. The
> editor returns the whole object, not a patch, so undo is just the previous
> row."

### 1:24–1:38 · Preview

**On screen:** Preview tab. Template render. Click through the page switcher.

> **Say:** "The concept renders as an actual page. This costs nothing — it is a
> pure function over data already in the database, so it works with the daily
> quota fully spent."

### 1:38–1:58 · Real code, and an edit

**On screen:** Build starter site. *Cut the wait.* The page appears. **Click one
nav link so it scrolls.** Then type refinement 2. *Cut the wait.* The page goes
dark.

> **Say:** "Or generate the real thing — one self-contained HTML page, on a
> second provider so it cannot exhaust the quota the analysis needs. Then change
> it in plain English."

### 1:58–2:08 · Take it with you

**On screen:** Download (HTML) — show the file land. Then Download PDF — show the
paper-styled export page, Ctrl+P, and the Save-as-PDF preview. Close the dialog.

> **Say:** "Download the page, or export the whole concept as a brief."

### 2:08–2:16 · It persists, then out

**On screen:** back to the dashboard, reopen the project — it renders instantly.
Then log out.

> **Say:** "Reopening a saved project renders from Postgres and never calls a
> model again. That is a cost rule enforced in code, not a preference."

### 2:16–2:38 · How it was built ← **the highest-scoring 22 seconds**

**On screen:** split or cut to: the repo tree, then `docs/02-ai-tools-and-workflow.md`,
then a `code-review` finding in the terminal.

> **Say:** "All of this was built with Claude Code, under a written working
> agreement it reads every turn: plan before building, one phase at a time, and
> an AI code review on its own diff after each phase — which found a real SSRF,
> an open redirect, and a middleware bug that discarded rotated auth cookies. I
> rejected about a third of what it found. The gate produces candidates; a
> person still decides."

### 2:38–2:50 · The debugging beat

**On screen:** `docs/04-debugging-log.md`, scrolled to entry 12.

> **Say:** "The best example is in the debugging log. Clicking a nav link in the
> generated site logged you out — a srcdoc iframe inherits its parent's base
> URL, so the link walked into the app's own routes. I fixed it, verified it,
> and reported it fixed. My check read the iframe's `src` attribute, which a
> srcdoc navigation never sets — so it could not fail. Reading `location.href`
> from inside the frame showed it was still broken."

### 2:50–2:58 · What's next

**On screen:** README "Known limitations".

> **Say:** "Next: Google sign-in, a Postgres-backed rate limiter, and the
> five-agent pipeline — which is cut on cost, not design. The limitations are
> all written down. Thanks for watching."

---

## After you record

The recording account is a throwaway. The published demo account was never
touched, thus there is nothing to restore.

1. **Upload, then replace `YOUTUBE_ID` in the README** — in **both** places, the
   thumbnail URL and the watch URL. They must carry the same id.
2. **Clean up the recording accounts** — `newuser@`, and `take2@`/`take3@` if
   you needed them. Leaving them is harmless, but deleting them returns the
   database to the one demo account plus your own, which is what the
   architecture notes describe. Ask Claude; there is a script that enumerates
   first and proves the cascade ran.
3. **Check the demo account still opens** at `https://reforge.rounak.co` with
   the README credentials, in a fresh incognito window.

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
