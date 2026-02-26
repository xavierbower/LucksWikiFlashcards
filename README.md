# Lucks Wiki Flashcards

A knowledge extraction and spaced-repetition learning platform for the [Lucks Lab](https://luckslab.org/) at Northwestern University. Transforms the lab's private GitHub Wiki into interactive, familiarity-calibrated flashcards served as a static site via GitHub Pages.

**[Try it live](https://xavierbower.github.io/LucksWikiFlashcards/)**

---

## How It Works

An automated pipeline reads every page of the Lucks Lab wiki, uses Claude (Anthropic's API) to extract structured knowledge, identifies relationships between concepts, and generates flashcards at three difficulty tiers. The result is a single JSON file that powers a zero-dependency frontend with SM-2 spaced repetition.

```
Wiki (.md pages)
  → Clone & parse sections
  → Extract takeaways (Claude API)
  → Build knowledge graph (Claude API)
  → Generate flashcards at 3 levels (Claude API)
  → Export to docs/data/flashcards.json
  → Serve via GitHub Pages
```

---

## Flashcard Levels

Each knowledge unit produces flashcards calibrated to three familiarity tiers:

| Level | Audience | Style |
|-------|----------|-------|
| **New Member** | Rotation students, new PhDs | Defines terms, includes hints, beginner-friendly |
| **Experienced** | Lab members with context | Assumes vocabulary, focuses on specifics and edge cases |
| **PI / Senior** | PIs, senior researchers | Strategic connections, cross-project implications |

---

## Features

- **Spaced repetition** — SM-2 algorithm schedules reviews based on recall quality
- **Browse mode** — Flip through all cards linearly without scheduling
- **Category filters** — Protocol, Concept, Tool, Project, Finding
- **Source filters** — Distinguish API-generated vs in-session flashcards
- **Related cards** — Knowledge graph links surface contextually related cards
- **Progress tracking** — Per-card review history, session stats, accuracy tracking
- **Dark mode** — Follows system preference or manual toggle
- **Export/Import** — Backup and restore learning progress as JSON
- **Incremental updates** — Only reprocess changed wiki pages on subsequent runs
- **No build step** — Pure HTML/CSS/JS frontend, deployed directly from `docs/`

---

## Project Structure

```
├── pipeline/                     # Knowledge extraction pipeline
│   ├── 01-clone-wiki.js          # Clone/pull wiki repo
│   ├── 02-parse-pages.js         # Parse markdown into sections
│   ├── 03-extract-knowledge.js   # Claude API: structured takeaways
│   ├── 04-build-relationships.js # Claude API: knowledge graph edges
│   ├── 05-generate-flashcards.js # Claude API: calibrated Q&A cards
│   ├── 06-export-site-data.js    # Assemble final JSON for frontend
│   ├── run-all.js                # Full pipeline orchestrator
│   ├── run-incremental.js        # Incremental (changed pages only)
│   └── lib/                      # Shared utilities
│       ├── claude-client.js      # Anthropic SDK wrapper
│       ├── prompts.js            # All prompt templates
│       ├── git-utils.js          # Clone, pull, diff, blame helpers
│       ├── markdown-parser.js    # Section splitter
│       └── schema-validators.js  # Zod schemas for all data types
│
├── docs/                         # Frontend (GitHub Pages root)
│   ├── index.html
│   ├── app.js                    # Main controller
│   ├── style.css
│   ├── components/
│   │   ├── card-viewer.js        # Flip animation + assessment
│   │   ├── deck-selector.js      # Level, category, source filters
│   │   ├── progress-tracker.js   # Session and overall stats
│   │   └── settings-panel.js     # Dark mode, export, reset
│   ├── lib/
│   │   ├── sm2.js                # SM-2 spaced repetition algorithm
│   │   ├── storage.js            # localStorage persistence
│   │   └── data-loader.js        # Fetch and index flashcards.json
│   └── data/
│       └── flashcards.json       # The single shipped artifact
│
└── .github/workflows/
    ├── build-knowledge.yml       # Weekly: run pipeline, commit output
    └── deploy-pages.yml          # On push to docs/: deploy to Pages
```

---

## Data Model

The pipeline produces three interconnected data types:

**Takeaways** — Structured knowledge units extracted from wiki pages. Each has a category, title, summary, detail bullets, tags, authors, and a confidence score.

**Relationships** — Edges in the knowledge graph linking takeaways (e.g., "RNA extraction *requires* RNase-free technique", "SHAPE-MaP *extends* DMS-MaPseq").

**Flashcards** — Question-answer pairs generated from takeaways at each familiarity level. Include optional hints and links to related cards.

---

## Setup

### Prerequisites

- Node.js >= 18
- An [Anthropic API key](https://console.anthropic.com/)
- A GitHub personal access token with `repo` scope (for wiki access)

### Install

```bash
npm install
```

### Configure

Create a `.env` file:

```
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
```

### Run the Pipeline

```bash
# Full run (all wiki pages)
npm run pipeline

# Incremental (only changed pages since last run)
npm run pipeline:incremental
```

### Preview Locally

```bash
npm run serve
# Opens at http://localhost:3000
```

---

## CI/CD

Two GitHub Actions workflows automate the system:

**build-knowledge.yml** — Runs the full pipeline weekly (Monday 6 AM UTC) or on manual trigger. Commits the updated `docs/data/flashcards.json` to main.

**deploy-pages.yml** — Deploys the `docs/` folder to GitHub Pages whenever it changes on main.

To use these, add `ANTHROPIC_API_KEY` and `WIKI_ACCESS_TOKEN` as repository secrets.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Pipeline | Node.js, ES modules, Anthropic SDK, Zod |
| Frontend | Vanilla HTML, CSS, JavaScript |
| AI Model | Claude Sonnet 4.5 |
| Data | JSON (version-controlled in git) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

---

## Current Stats

- **408** wiki pages processed
- **1,397** takeaways extracted
- **1,321** relationships identified
- **4,191** flashcards generated (2,787 API + 1,404 in-session)
