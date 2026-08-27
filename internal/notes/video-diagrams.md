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

Every diagram opens with the same `init` block, so they read as one system and
render identically for every viewer.

### Every theme variable is pinned

This is not decoration. GitHub renders a README in the viewer's theme, and a
diagram that sets only *some* colours inherits the rest — so cluster
backgrounds, subgraph titles and edge labels came out dark-on-dark for anyone
using dark mode, while the nodes stayed light. The fix is to pin all of them:
text, lines, node fills, `clusterBkg`, `clusterBorder`, `edgeLabelBackground`
and `titleColor`.

The diagrams therefore render as light cards in both themes, which is the same
behaviour an exported image would have.

### Line types mean something

Three edge styles, used the same way everywhere:

| Edge | Syntax | Means |
|---|---|---|
| Solid | `-->` | The normal path. What happens by default |
| Dotted | `-.->` | Optional, conditional, rejected, or a side effect |
| Label | `-->\|"text"\|` | Names the condition on the edge |

Thick edges (`==>`) are **not** used. They read as a fourth meaning that no
diagram here needs, and they were the main source of the inconsistency.

### Shapes carry meaning

| Shape | Syntax | Means |
|---|---|---|
| Rounded | `([text])` | A process or a step |
| Rectangle | `[text]` | A component or a file |
| Cylinder | `[(text)]` | A datastore |
| Diamond | `{text}` | A decision |
| Hexagon | `{{text}}` | An external service, or a verification |
| Doubled | `[[text]]` | A subsystem with internals |

### Six colour classes

`core` (ours) · `data` (persistence) · `ext` (someone else's) · `gate` (a
decision) · `bad` (a failure) · `good` (a verified state). All are keyed to the
app's ember accent so the slides and the product look like one thing.

---

## 1 · Architecture

Video beat 3 · also in `README.md`.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'ui-sans-serif, system-ui, -apple-system, sans-serif','fontSize':'14px','textColor':'#1c1917','primaryTextColor':'#1c1917','secondaryTextColor':'#1c1917','tertiaryTextColor':'#1c1917','nodeTextColor':'#1c1917','titleColor':'#1c1917','lineColor':'#57534e','mainBkg':'#ffffff','nodeBorder':'#57534e','background':'#ffffff','clusterBkg':'#fafaf9','clusterBorder':'#d6d3d1','edgeLabelBackground':'#f5f5f4','primaryColor':'#ffffff','primaryBorderColor':'#57534e','secondaryColor':'#fafaf9','tertiaryColor':'#f5f5f4'},'flowchart':{'curve':'linear','nodeSpacing':45,'rankSpacing':55,'padding':10,'htmlLabels':true}}}%%
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
        PV1["gemini.ts"]
        PV2["openai-compatible.ts"]
    end

    DB[("Postgres<br/><small>Row Level Security</small>")]
    GEM{{"Gemini API"}}
    GRQ{{"Groq API"}}
    SHOT{{"microlink"}}

    U --> MW
    MW --> RH
    RH --> REG
    REG --> PV1
    REG --> PV2
    PV1 --> GEM
    PV2 --> GRQ
    RH --> DB
    AN -.-> SHOT
    DB -.->|"cached · no model call"| U

    classDef core fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#1c1917
    classDef data fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef ext fill:#f8fafc,stroke:#64748b,stroke-width:1.5px,color:#0f172a
    classDef gate fill:#fffbeb,stroke:#b45309,stroke-width:2px,color:#78350f
    classDef bad fill:#fef2f2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    classDef good fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    class U,MW,AN,BU,RE,GE,REG,PV1,PV2 core
    class DB data
    class GEM,GRQ,SHOT ext
```

---

## 2 · AI tools used

Video beat 4 · also in `docs/02`.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'ui-sans-serif, system-ui, -apple-system, sans-serif','fontSize':'14px','textColor':'#1c1917','primaryTextColor':'#1c1917','secondaryTextColor':'#1c1917','tertiaryTextColor':'#1c1917','nodeTextColor':'#1c1917','titleColor':'#1c1917','lineColor':'#57534e','mainBkg':'#ffffff','nodeBorder':'#57534e','background':'#ffffff','clusterBkg':'#fafaf9','clusterBorder':'#d6d3d1','edgeLabelBackground':'#f5f5f4','primaryColor':'#ffffff','primaryBorderColor':'#57534e','secondaryColor':'#fafaf9','tertiaryColor':'#f5f5f4'},'flowchart':{'curve':'linear','nodeSpacing':40,'rankSpacing':70,'padding':10,'htmlLabels':true}}}%%
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
    CC -.->|"rejected"| NO

    classDef core fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#1c1917
    classDef data fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef ext fill:#f8fafc,stroke:#64748b,stroke-width:1.5px,color:#0f172a
    classDef gate fill:#fffbeb,stroke:#b45309,stroke-width:2px,color:#78350f
    classDef bad fill:#fef2f2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    classDef good fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    class CC,PL,DL,DP,WU core
    class C7,SB,PW ext
    class NA,NF bad
```

---

## 3 · How Claude Code was used

Video beat 5 · also in `docs/01` and `docs/02`.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'ui-sans-serif, system-ui, -apple-system, sans-serif','fontSize':'14px','textColor':'#1c1917','primaryTextColor':'#1c1917','secondaryTextColor':'#1c1917','tertiaryTextColor':'#1c1917','nodeTextColor':'#1c1917','titleColor':'#1c1917','lineColor':'#57534e','mainBkg':'#ffffff','nodeBorder':'#57534e','background':'#ffffff','clusterBkg':'#fafaf9','clusterBorder':'#d6d3d1','edgeLabelBackground':'#f5f5f4','primaryColor':'#ffffff','primaryBorderColor':'#57534e','secondaryColor':'#fafaf9','tertiaryColor':'#f5f5f4'},'flowchart':{'curve':'linear','nodeSpacing':40,'rankSpacing':50,'padding':10,'htmlLabels':true}}}%%
flowchart TB
    B(["Plan, from the requirement checklist"])
    C{"Human approves?"}
    D(["Write the code"])
    E(["Review its own diff"])
    F{"Real defect?"}
    G(["lint · types · checks · build, then deploy"])
    I{{"Verify on production, then tick and commit"}}
    FOUND["Found by the gate: SSRF through a redirect ·<br/>open redirect at login · discarded auth cookies"]

    B --> C
    C -.->|"no"| B
    C -->|"yes"| D
    D --> E
    E --> F
    F -.->|"yes · two thirds"| D
    F -->|"no · one third rejected"| G
    G --> I
    I -.->|"next phase"| B
    E -.- FOUND

    classDef core fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#1c1917
    classDef gate fill:#fffbeb,stroke:#b45309,stroke-width:2px,color:#78350f
    classDef good fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef bad fill:#fef2f2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    class B,D,E,G core
    class C,F gate
    class I good
    class FOUND bad
```

---

## 4 · The debugging example

Video beat 6 · also in `docs/04`, entry 10.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'ui-sans-serif, system-ui, -apple-system, sans-serif','fontSize':'14px','textColor':'#1c1917','primaryTextColor':'#1c1917','secondaryTextColor':'#1c1917','tertiaryTextColor':'#1c1917','nodeTextColor':'#1c1917','titleColor':'#1c1917','lineColor':'#57534e','mainBkg':'#ffffff','nodeBorder':'#57534e','background':'#ffffff','clusterBkg':'#fafaf9','clusterBorder':'#d6d3d1','edgeLabelBackground':'#f5f5f4','primaryColor':'#ffffff','primaryBorderColor':'#57534e','secondaryColor':'#fafaf9','tertiaryColor':'#f5f5f4'},'flowchart':{'curve':'linear','nodeSpacing':30,'rankSpacing':45,'padding':10,'htmlLabels':true}}}%%
flowchart TB
    R{{"Response from the model"}}

    subgraph SIG["Every signal available"]
        direction LR
        S1["HTTP 200"] ~~~ S2["Valid JSON"] ~~~ S3["Matches the schema"] ~~~ S4["finish_reason: stop"]
    end

    OK(["SUCCESS"])
    BAD["The document ends mid-attribute at exactly 10,240 characters<br/><small>10 x 1024 — models do not stop on power-of-two boundaries. Buffers do.</small>"]
    CAUSE["The vendor's JSON decoder caps a string<br/>and closes the object around the stump"]
    FIX(["Assert the CLOSING condition:<br/>the document must end in &lt;/html&gt;"])

    R --> SIG
    SIG --> OK
    OK --> BAD
    BAD --> CAUSE
    CAUSE --> FIX



    classDef core fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#1c1917
    classDef data fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef ext fill:#f8fafc,stroke:#64748b,stroke-width:1.5px,color:#0f172a
    classDef gate fill:#fffbeb,stroke:#b45309,stroke-width:2px,color:#78350f
    classDef bad fill:#fef2f2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    classDef good fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    class R,S1,S2,S3,S4 ext
    class OK good
    class BAD,CAUSE bad
    class FIX core
```

---

## 5 · What comes next

Video beat 7 · also in `README.md`.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'ui-sans-serif, system-ui, -apple-system, sans-serif','fontSize':'14px','textColor':'#1c1917','primaryTextColor':'#1c1917','secondaryTextColor':'#1c1917','tertiaryTextColor':'#1c1917','nodeTextColor':'#1c1917','titleColor':'#1c1917','lineColor':'#57534e','mainBkg':'#ffffff','nodeBorder':'#57534e','background':'#ffffff','clusterBkg':'#fafaf9','clusterBorder':'#d6d3d1','edgeLabelBackground':'#f5f5f4','primaryColor':'#ffffff','primaryBorderColor':'#57534e','secondaryColor':'#fafaf9','tertiaryColor':'#f5f5f4'},'flowchart':{'curve':'linear','nodeSpacing':30,'rankSpacing':45,'padding':10,'htmlLabels':true}}}%%
flowchart TB
    subgraph NOW["Today · free tier — 3 calls, about 35s each"]
        direction LR
        N1(["Analyzer"]) --> N2(["Builder"]) --> N3(["Editor"])
    end

    subgraph PRO["Pro tier · deep analysis — 5 calls, about 3 minutes"]
        direction LR
        A1(["Research"]) --> A2(["Product"]) --> A3(["UI"]) --> A4(["Coding"]) --> A5(["QA"])
        CP["LangGraph checkpoints each stage,<br/><small>so a failure at stage four does not discard one to three</small>"]
    end

    subgraph ALSO["Also next"]
        direction LR
        F1["Competitive teardown<br/><small>3 URLs, one synthesis</small>"]
        F2["Scaffold a real repo<br/><small>not one HTML file</small>"]
    end

    NOW -->|"opt in when you want thorough over instant"| PRO
    NOW -.-> ALSO

    classDef core fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#1c1917
    classDef data fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    classDef ext fill:#f8fafc,stroke:#64748b,stroke-width:1.5px,color:#0f172a
    classDef gate fill:#fffbeb,stroke:#b45309,stroke-width:2px,color:#78350f
    classDef bad fill:#fef2f2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    classDef good fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#14532d
    class N1,N2,N3 good
    class A1,A2,A3,A4,A5 core
    class CP,F1,F2 ext
```

---

## Rendering for the video

- **2x export.** A 1x PNG looks soft at 1080p.
- **One diagram per beat, held still.** No build-on animation — the voice does
  the sequencing, and a diagram that assembles itself competes with it.
- **Check the smallest label on a phone** before committing to a render. If it
  is unreadable there, cut the label rather than shrinking the diagram.
