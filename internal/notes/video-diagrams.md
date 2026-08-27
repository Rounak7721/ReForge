# Video diagrams — Mermaid source

Five diagrams, one per narrated beat. Paste each block into
**https://mermaid.live**, then export PNG at 2x and drop it on the timeline.

**Do not screen-record the repo for these.** Scrolling a markdown file is the
weakest visual available: the text is too small to read at video speed, and the
viewer spends the whole beat trying to read instead of listening. A single
diagram that stays still for twenty seconds reads instantly.

Diagrams 1 and 2 already exist in `README.md` and `docs/01`. They are repeated
here so every asset for the video is in one place, and so you can render them
without the surrounding page.

Colours match the app's ember accent, so the slides and the product look like
one thing.

---

## Beat 3 — Architecture (1:07–1:31)

```mermaid
flowchart TB
    U["Browser"]
    MW["middleware.ts<br/>session refresh · guards /dashboard"]

    subgraph RH["Route Handlers — every mutation, no server actions"]
        AN["/api/analyze"]
        BU["/api/build"]
        RE["/api/refine"]
        GE["/api/generate"]
    end

    subgraph LLM["lib/llm — the only place a vendor SDK exists"]
        REG["registry.ts<br/>selected by env var"]
        G["gemini"]
        O["openai-compatible<br/>OpenAI · Groq"]
    end

    PG[("Postgres<br/>Row Level Security")]
    GEM["Gemini API"]
    GRQ["Groq API"]
    SHOT["microlink<br/>screenshot"]

    U -->|fetch| MW --> RH
    AN --> SHOT
    AN & BU & RE & GE --> REG
    REG --> G --> GEM
    REG --> O --> GRQ
    RH --> PG
    PG -->|cached result<br/>no model call| U

    style LLM fill:#fde8d7,stroke:#c2410c,color:#000
    style PG fill:#dcfce7,stroke:#15803d,color:#000
    style RH fill:#e0e7ff,stroke:#4338ca,color:#000
```

**Say this over it:** the key is `lib/llm` sitting between features and vendors,
and RLS sitting under everything.

---

## Beat 4 — AI tools used (1:31–1:50)

```mermaid
flowchart LR
    CC["Claude Code<br/>Opus 5"]

    subgraph MCP["MCP servers"]
        C7["context7<br/>current library docs"]
        SB["supabase<br/>schema · RLS · seed"]
        PW["playwright<br/>drives the deployed app"]
    end

    subgraph SK["Skills committed to the repo"]
        PL["prompt-log"]
        DL["debug-log"]
        DP["deploy"]
        WU["wrap-up"]
    end

    subgraph NO["Considered and cut"]
        NA["subagents"]
        NF["LangChain"]
    end

    CC --> MCP
    CC --> SK
    CC -.rejected.-> NO

    style SK fill:#fde8d7,stroke:#c2410c,color:#000
    style NO fill:#fee2e2,stroke:#b91c1c,color:#000
    style MCP fill:#e0e7ff,stroke:#4338ca,color:#000
```

---

## Beat 5 — How Claude Code was used (1:50–2:20)

```mermaid
flowchart LR
    A["Requirement<br/>checklist"] --> B["Plan"]
    B --> C{"Human<br/>approves?"}
    C -- no --> B
    C -- yes --> D["Write the code"]
    D --> E["Review its own diff"]
    E --> F{"Real defect?"}
    F -- "yes · 2 of 3" --> D
    F -- "no · 1 of 3<br/>rejected" --> G["lint · types · checks · build"]
    G --> H["Deploy"]
    H --> I["Verify on production"]
    I --> J["Tick · commit"]

    FOUND["Found by the gate:<br/>SSRF via redirect<br/>open redirect at login<br/>discarded auth cookies"]
    E -.-> FOUND

    style C fill:#fef3c7,stroke:#b45309,color:#000
    style F fill:#fef3c7,stroke:#b45309,color:#000
    style FOUND fill:#fee2e2,stroke:#b91c1c,color:#000
    style I fill:#dcfce7,stroke:#15803d,color:#000
```

---

## Beat 6 — The debugging example (2:20–2:40)

Entry 10: the generated page that passed every check and was broken.

```mermaid
flowchart TB
    R["Response from the model"]
    R --> S1["HTTP 200"]
    R --> S2["Valid JSON"]
    R --> S3["Matches the zod schema"]
    R --> S4["finish_reason: stop"]
    S1 & S2 & S3 & S4 --> OK["Every signal says SUCCESS"]
    OK --> BAD["The document ends mid-attribute<br/>at exactly 10,240 characters"]
    BAD --> WHY["10 x 1024.<br/>Models do not stop on<br/>power-of-two boundaries.<br/>Buffers do."]
    WHY --> CAUSE["The vendor's JSON decoder caps a<br/>string value and closes the object<br/>cleanly around the stump"]
    CAUSE --> FIX["Assert the CLOSING condition:<br/>the document must end in &lt;/html&gt;"]

    style OK fill:#dcfce7,stroke:#15803d,color:#000
    style BAD fill:#fee2e2,stroke:#b91c1c,color:#000
    style FIX fill:#fde8d7,stroke:#c2410c,color:#000
```

**The beat lands on the last box.** For anything a model generates in one pass,
every other signal will tell you it worked.

---

## Beat 7 — What comes next (2:40–2:58)

```mermaid
flowchart LR
    subgraph NOW["Today — free tier"]
        direction TB
        N1["Analyzer"] --> N2["Builder"] --> N3["Editor"]
        N4["3 calls · about 35s each"]
    end

    subgraph PRO["Pro tier — deep analysis"]
        direction TB
        A1["Research"] --> A2["Product"] --> A3["UI"] --> A4["Coding"] --> A5["QA"]
        A6["5 calls · about 3 min<br/>LangGraph checkpoints each stage"]
    end

    subgraph ALSO["Also next"]
        direction TB
        F1["Competitive teardown<br/>3 URLs, one synthesis"]
        F2["Scaffold a real repo,<br/>not one HTML file"]
    end

    NOW ==>|"opt in when you want<br/>thorough over instant"| PRO
    NOW --> ALSO

    style NOW fill:#dcfce7,stroke:#15803d,color:#000
    style PRO fill:#fde8d7,stroke:#c2410c,color:#000
    style ALSO fill:#e0e7ff,stroke:#4338ca,color:#000
```

**Why this is the closing image.** It shows the cut was a tier boundary rather
than a dead end, it gives the latency number that justifies it, and it names two
features that extend what already works instead of inventing a new product.

---

## Rendering notes

- **2x export.** A 1x PNG looks soft at 1080p.
- **Light background.** The slides sit between screen-recorded segments of a
  dark app; alternating keeps the beats visually separate.
- **One diagram per beat, held still.** No build-on animation. The voice is
  doing the sequencing, and a diagram that assembles itself competes with it.
- **Check the smallest text on a phone** before you commit to a render. If a
  label is unreadable there, cut the label rather than shrinking the diagram.
