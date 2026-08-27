# Diagrams — Mermaid source

The canonical diagrams for this project. The same blocks appear in `README.md`,
`docs/01` and `docs/02`; this file is where they are edited and where the shared
style lives.

Paste any block into **https://mermaid.live**, then export PNG at 2x for the
video. GitHub renders them in place.

**Do not screen-record a markdown file for the video.** Scrolled text is
unreadable at video speed, and the viewer spends the beat squinting instead of
listening. A still diagram is legible in one glance.

---

## The shared style

Every diagram opens with the same `init` block, so they read as one system:

- `curve: 'linear'` — **straight lines, no bezier curves.** This is the single
  biggest change; the default curves make a technical diagram look hand-waved.
- Shapes carry meaning, and are used consistently:

| Shape | Syntax | Means |
|---|---|---|
| Rounded | `([text])` | A process or a step |
| Rectangle | `[text]` | A component or a file |
| Cylinder | `[(text)]` | A datastore |
| Diamond | `{text}` | A decision |
| Hexagon | `{{text}}` | An external service |
| Doubled | `[[text]]` | A subsystem with internals |

- Four colour classes, matched to the app's ember accent: `core` (ours),
  `data` (persistence), `ext` (someone else's), `gate` (a decision), `bad`
  (a failure), `good` (a verified state).

---

## 1 · Architecture

Video beat 3 · also in `README.md`.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'ui-sans-serif, system-ui, sans-serif','fontSize':'14px','lineColor':'#78716c','primaryTextColor':'#1c1917'},'flowchart':{'curve':'linear','nodeSpacing':45,'rankSpacing':55,'padding':10}}}%%
flowchart TB
    U(["Browser"])
    MW["middleware.ts<br/><small>session refresh · route guard</small>"]

    subgraph RH["Route Handlers — every mutation"]
        direction LR
        AN(["/api/analyze"])
        BU(["/api/build"])
        RE(["/api/refine"])
        GE(["/api/generate"])
    end

    subgraph LLM["lib/llm — the only place a vendor SDK exists"]
        direction LR
        REG[["registry.ts<br/><small>chosen by env var</small>"]]
        PG1["gemini.ts"]
        PG2["openai-compatible.ts"]
    end

    DB[("Postgres<br/><small>Row Level Security</small>")]
    GEM{{"Gemini API"}}
    GRQ{{"Groq API"}}
    SHOT{{"microlink"}}

    U -->|fetch| MW
    MW --> RH
    AN -.screenshot.-> SHOT
    RH --> REG
    REG --> PG1 --> GEM
    REG --> PG2 --> GRQ
    RH --> DB
    DB -->|"cached · no model call"| U

    classDef core fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#1c1917
    classDef data fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef ext fill:#f8fafc,stroke:#94a3b8,stroke-width:1.5px,color:#0f172a
    class REG,PG1,PG2 core
    class DB data
    class GEM,GRQ,SHOT ext
```

---

## 2 · AI tools used

Video beat 4 · also in `docs/02`.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'ui-sans-serif, system-ui, sans-serif','fontSize':'14px','lineColor':'#78716c','primaryTextColor':'#1c1917'},'flowchart':{'curve':'linear','nodeSpacing':40,'rankSpacing':70,'padding':10}}}%%
flowchart LR
    CC(["Claude Code · Opus 5"])

    subgraph MCP["MCP servers"]
        direction TB
        C7{{"context7<br/><small>current library docs</small>"}}
        SB{{"supabase<br/><small>schema · RLS · seed</small>"}}
        PW{{"playwright<br/><small>drives production</small>"}}
    end

    subgraph SK["Skills committed to the repo"]
        direction TB
        PL["prompt-log"]
        DL["debug-log"]
        DP["deploy"]
        WU["wrap-up"]
    end

    subgraph NO["Considered and cut"]
        direction TB
        NA["subagents"]
        NF["LangChain"]
    end

    CC --> MCP
    CC --> SK
    CC -.->|rejected| NO

    classDef core fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#1c1917
    classDef ext fill:#f8fafc,stroke:#94a3b8,stroke-width:1.5px,color:#0f172a
    classDef bad fill:#fef2f2,stroke:#b91c1c,stroke-width:1.5px,color:#7f1d1d
    class CC,PL,DL,DP,WU core
    class C7,SB,PW ext
    class NA,NF bad
```

---

## 3 · How Claude Code was used

Video beat 5 · also in `docs/01` and `docs/02`.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'ui-sans-serif, system-ui, sans-serif','fontSize':'14px','lineColor':'#78716c','primaryTextColor':'#1c1917'},'flowchart':{'curve':'linear','nodeSpacing':40,'rankSpacing':50,'padding':10}}}%%
flowchart LR
    A["Requirement<br/>checklist"] --> B(["Plan"])
    B --> C{"Human<br/>approves?"}
    C -->|no| B
    C -->|yes| D(["Write the code"])
    D --> E(["Review its own diff"])
    E --> F{"Real<br/>defect?"}
    F -->|"yes · two thirds"| D
    F -->|"no · one third<br/>rejected"| G(["lint · types · checks · build"])
    G --> H(["Deploy"])
    H --> I{{"Verify on production"}}
    I --> J["Tick · commit"]
    J --> A

    FOUND["Found by the gate:<br/>SSRF through a redirect<br/>open redirect at login<br/>discarded auth cookies"]
    E -.-> FOUND

    classDef core fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#1c1917
    classDef gate fill:#fffbeb,stroke:#b45309,stroke-width:2px,color:#78350f
    classDef good fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef bad fill:#fef2f2,stroke:#b91c1c,stroke-width:1.5px,color:#7f1d1d
    class B,D,E,G,H core
    class C,F gate
    class I good
    class FOUND bad
```

---

## 4 · The debugging example

Video beat 6 · also in `docs/04`, entry 10.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'ui-sans-serif, system-ui, sans-serif','fontSize':'14px','lineColor':'#78716c','primaryTextColor':'#1c1917'},'flowchart':{'curve':'linear','nodeSpacing':30,'rankSpacing':45,'padding':10}}}%%
flowchart TB
    R{{"Response from the model"}}

    subgraph SIG["Every signal available"]
        direction LR
        S1["HTTP 200"]
        S2["Valid JSON"]
        S3["Matches the schema"]
        S4["finish_reason: stop"]
    end

    R --> SIG
    SIG --> OK(["SUCCESS"])
    OK --> BAD["The document ends mid-attribute<br/>at exactly 10,240 characters"]
    BAD --> WHY{"10 x 1024.<br/>Models do not stop on<br/>power-of-two boundaries."}
    WHY -->|"buffers do"| CAUSE["The vendor's JSON decoder caps a string<br/>and closes the object around the stump"]
    CAUSE --> FIX(["Assert the CLOSING condition:<br/>the document must end in &lt;/html&gt;"])

    classDef good fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef bad fill:#fef2f2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    classDef gate fill:#fffbeb,stroke:#b45309,stroke-width:2px,color:#78350f
    classDef core fill:#fff7ed,stroke:#c2410c,stroke-width:2.5px,color:#1c1917
    classDef ext fill:#f8fafc,stroke:#94a3b8,stroke-width:1.5px,color:#0f172a
    class OK good
    class BAD,CAUSE bad
    class WHY gate
    class FIX core
    class R ext
```

---

## 5 · What comes next

Video beat 7 · also in `README.md`.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'ui-sans-serif, system-ui, sans-serif','fontSize':'14px','lineColor':'#78716c','primaryTextColor':'#1c1917'},'flowchart':{'curve':'linear','nodeSpacing':30,'rankSpacing':45,'padding':10}}}%%
flowchart TB
    subgraph NOW["Today · free tier — 3 calls, about 35s each"]
        direction LR
        N1(["Analyzer"]) --> N2(["Builder"]) --> N3(["Editor"])
    end

    subgraph PRO["Pro tier · deep analysis — 5 calls, about 3 minutes"]
        direction LR
        A1(["Research"]) --> A2(["Product"]) --> A3(["UI"]) --> A4(["Coding"]) --> A5(["QA"])
    end

    subgraph ALSO["Also next"]
        direction LR
        F1["Competitive teardown<br/><small>3 URLs, one synthesis</small>"]
        F2["Scaffold a real repo<br/><small>not one HTML file</small>"]
    end

    NOW ==>|"opt in when you want thorough over instant"| PRO
    PRO -.->|"LangGraph checkpoints each stage,<br/>so a failure at stage four<br/>does not discard one to three"| PRO
    NOW --> ALSO

    classDef good fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef core fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#1c1917
    classDef ext fill:#f8fafc,stroke:#94a3b8,stroke-width:1.5px,color:#0f172a
    class N1,N2,N3 good
    class A1,A2,A3,A4,A5 core
    class F1,F2 ext
```

---

## Rendering for the video

- **2x export.** A 1x PNG looks soft at 1080p.
- **One diagram per beat, held still.** No build-on animation — the voice does
  the sequencing, and a diagram that assembles itself competes with it.
- **Check the smallest label on a phone** before committing to a render. If it
  is unreadable there, cut the label rather than shrinking the diagram.
