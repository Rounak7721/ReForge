# Debugging Log

Deliverable: **at least 2 examples** where AI-generated code failed. The brief marks this "This is important." Worth 10 points.

Maintained by Claude, logged at the moment of failure — not reconstructed afterward.

Required format for every entry:

```
## N. <Short title>

**Phase:** <which MVP phase> · **Date:** <YYYY-MM-DD>

### Problem
<the observed symptom — error text, wrong behaviour, what the user saw>

### AI prompt
> <the prompt that produced the broken code>

### Attempted solution
<what the AI generated and why it looked correct>

### Debugging
<how the real cause was found — the actual steps, dead ends included>

### Final solution
<the fix, and the underlying reason it works>
```

Log the failure **before** fixing it. A fixed bug with no record is a lost point.

Likely candidates for this stack: malformed LLM JSON surviving into `JSON.parse`, a 429 storm from the un-debounced chat box, an RLS policy blocking a legitimate read, the service-role client reaching a Client Component, or a Next.js 15 async-API change.

---

<!-- entries appended below -->
