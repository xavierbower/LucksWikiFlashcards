# Pipeline Comparison: API vs In-Session Extraction

## Overview

Both approaches process the same 419 substantive wiki pages (>200 chars) from the Lucks Lab GitHub Wiki (432 total pages, 1.5MB of markdown).

---

## Approach 1: Anthropic API Pipeline

**Model:** `claude-haiku-4-5` (switched from `claude-sonnet-4-5` mid-run to reduce cost)

### Process
1. **Clone wiki** — `git clone` of 432 .md files (~2 seconds)
2. **Parse pages** — Markdown splitting, git blame for authors (~3 seconds)
3. **Extract knowledge** — 222 batched API calls (small pages grouped, trivial pages skipped) (~35 minutes)
4. **Build relationships** — 1 API call with all takeaway summaries (~10 seconds)
5. **Generate flashcards** — Ran out of budget; switched to local templates (~0.2 seconds)
6. **Export** — Copy to frontend (~0.1 seconds)

### Results
| Metric | Value |
|--------|-------|
| Total time | ~38 minutes |
| Extraction time (step 3) | ~35 minutes |
| API cost | ~$4.74 of $5.00 budget |
| Takeaways extracted | 929 |
| Relationships found | 647 |
| Flashcards generated | 2,787 (template-based, 3 per takeaway) |
| Source pages covered | 325 of 419 |
| API calls | 223 total (222 extraction + 1 relationship) |
| Errors/skips | ~50 pages failed (JSON truncation on large pages) |

### Strengths
- Takeaway extraction leverages Claude's reasoning about domain-specific content
- Relationship building via a single holistic API call sees cross-page connections
- Can be automated via GitHub Actions (weekly cron)

### Weaknesses
- **Cost**: $4.74 for a single run; ongoing cost for updates
- **Fragility**: JSON parsing errors on large pages (haiku's 2048 max_tokens was insufficient for some)
- **Rate limits**: Sequential API calls create a bottleneck
- **Budget exhaustion**: Step 5 (flashcard generation) couldn't run via API — budget ran out

---

## Approach 2: In-Session Extraction (Claude Code)

**Model:** Claude Opus 4.6 (Claude Code session), with subagents for parallelism

### Process
1. **Read pages** — Pre-parsed `pages.json` already available from step 1-2 (~0 seconds, reused)
2. **Extract knowledge** — 55 parallel subagent batches, each reading ~7-16 pages (~19 minutes)
3. **Build relationships** — Tag-overlap algorithm (deterministic, no API) (~0.5 seconds)
4. **Generate flashcards** — Same template approach as API fallback (~0.2 seconds)

### Results
| Metric | Value |
|--------|-------|
| Total time | ~31 minutes |
| Extraction time (step 2) | ~19 minutes |
| API cost | $0.00 (included in Claude Code session) |
| Takeaways extracted | 468 |
| Relationships found | 674 |
| Flashcards generated | 1,404 (template-based, 3 per takeaway) |
| Source pages covered | 343 of 419 |
| Subagent batches | 55 (parallelized) |
| Errors/skips | 0 JSON errors |

### Strengths
- **Zero incremental cost** — uses existing Claude Code session
- **Parallelism** — 55 agents process batches concurrently (vs sequential API calls)
- **No JSON parsing errors** — agents write valid JSON directly
- **Higher coverage** — 343 pages vs 325 (no truncation failures)
- **Better error handling** — agents can reason about edge cases

### Weaknesses
- **Fewer takeaways** — 468 vs 929 (agents were more selective/conservative)
- **Relationship quality** — tag-overlap heuristic vs Claude's semantic understanding
- **Not automatable** — requires an interactive Claude Code session
- **Page content truncated** — batch files capped at 8KB per page to fit context
- **Session cost** — Claude Code Pro subscription is the underlying cost ($100-200/month)

---

## Head-to-Head Comparison

| Dimension | API Pipeline | In-Session |
|-----------|-------------|------------|
| **Wall-clock time** | ~38 min | ~31 min |
| **Extraction time** | ~35 min (sequential) | ~19 min (parallel) |
| **Marginal cost** | $4.74 | $0.00 |
| **Takeaways** | 929 | 468 |
| **Takeaways/page** | 2.9 | 1.4 |
| **Relationships** | 647 (semantic) | 674 (tag-based) |
| **Flashcards** | 2,787 | 1,404 |
| **Coverage** | 325/419 pages | 343/419 pages |
| **Automatable** | Yes (GitHub Actions) | No (interactive) |
| **Reproducible** | Yes (same prompts) | Partially (agent behavior varies) |
| **JSON errors** | ~50 pages | 0 |

---

## Key Insights

### 1. Cost Model
The API approach has a clear per-run cost (~$5 for this wiki). The in-session approach is "free" if you already have a Claude Code subscription, but the subscription itself is the cost. For a wiki that updates weekly, the API approach costs ~$260/year; the subscription costs ~$1200-2400/year but includes unlimited other uses.

### 2. Quality vs Quantity
The API pipeline (with haiku) produced more takeaways (929 vs 468) but with lower per-takeaway quality (more generic, some truncated). The in-session approach produced fewer but more carefully curated takeaways. Neither approach is clearly superior — it depends on whether you want breadth or depth.

### 3. Parallelism
The in-session approach's biggest advantage is parallelism. 55 concurrent subagents completed extraction in 19 minutes vs 35 minutes for sequential API calls. The API could theoretically be parallelized too (concurrent requests), but rate limits constrain this.

### 4. Relationship Quality
The API approach used Claude to semantically identify relationships ("this protocol uses this tool"), while the in-session approach used a deterministic tag-overlap heuristic. The API relationships are likely more meaningful, but the tag-based approach found a similar count (674 vs 647) and is reproducible.

### 5. Automation
The API pipeline can run unattended via GitHub Actions on a schedule. The in-session approach requires a human to initiate a Claude Code session. For a production system, the API pipeline is the clear choice.

---

## Recommendation

**For production use**: Run the API pipeline with `claude-haiku-4-5` for steps 1-4, and use local templates for step 5 (flashcard generation). This gives the best cost/quality tradeoff at ~$2-3/run.

**For one-off or development**: Use the in-session approach — it's faster, free, and produces good-quality results without worrying about API key management or budget.

**Hybrid approach**: Use Claude Code to iterate on prompt design and template quality, then deploy the API pipeline for automated updates.
