# ADHD Behavior Tracker

> An AI-powered daily behavior tracker that helps parents of children with ADHD log meltdowns, triggers, and focus changes — and turns that data into therapist-ready reports and AI-generated insights.

## Table of Contents

- [Problem Statement](#problem-statement)
- [Project Overview](#project-overview)
- [Architecture & How It Works](#architecture--how-it-works)
- [Metrics](#metrics)
- [AI Observability & Evals](#ai-observability--evals)
- [Folder Structure](#folder-structure)
- [Tools Used](#tools-used)
- [Step-by-Step Tutorial](#step-by-step-tutorial)
  - [Step 1: Set Up Your Child's Profile](#step-1-set-up-your-childs-profile)
  - [Step 2: Log a Behavior Event](#step-2-log-a-behavior-event)
  - [Step 3: Review History & Trends](#step-3-review-history--trends)
  - [Step 4: Run the AI Monitoring Agent](#step-4-run-the-ai-monitoring-agent)
  - [Step 5: Find a Therapist with the AI Finder Agent](#step-5-find-a-therapist-with-the-ai-finder-agent)
  - [Step 6: Share a Report with Your Therapist](#step-6-share-a-report-with-your-therapist)
- [How to Run It](#how-to-run-it)
- [Prompt Reference](#prompt-reference)
- [Privacy](#privacy)
- [License](#license)

## Problem Statement

- Parents have no digital tracker to record day-to-day changes in their child's behavior — logging happens, if at all, in scattered notebooks, texts, or memory.
- There's no easy way to tell whether a child is improving or declining over time, since nothing is recorded consistently enough to compare.
- There's no week-by-week or month-by-month comparable data to measure whether a given therapy approach is actually working, so treatment often continues unchanged even when it isn't helping.
- There's no fast path to get behavior data in front of the therapist between sessions — therapists make treatment decisions mostly from what's remembered and reported verbally during the appointment itself.

## Project Overview

Parents of kids with ADHD are usually told to "keep a log" of meltdowns, triggers, and focus issues for their therapist — but there's rarely a real tool for it. Notes end up scattered across notebooks, texts, and memory, which makes it hard to spot patterns or know whether therapy is actually working.

This app solves that with three pieces:

1. **A fast daily logger** — record a trigger, behavior, severity, and what helped, in under a minute.
2. **An AI monitoring agent** — reads the accumulated logs, finds recurring triggers, tracks whether the child is improving, and tells you when it's time to consider changing therapeutic approach.
3. **An AI therapist-finder agent** — generates a shortlist of ADHD therapists (name, phone, location, specialty) so parents have a starting point when a change is recommended.

Everything is logged locally on the parent's device; only the log data itself is sent to Claude when an AI agent is explicitly run.

## Architecture & How It Works

**Concept 1 — Local-first data, no backend database.**
The app has no user accounts and no database. `ChildProfile` and every `BehaviorLog` are stored in the browser's `localStorage` (see `src/utils/storage.ts`). This keeps the app free to host, fast, and private — but it also means data lives on one device/browser unless exported.

**Concept 2 — Two independent serverless AI agents, called on demand.**
The frontend never calls Claude directly. It POSTs to two Vercel serverless functions under `/api`, each a thin wrapper around the Anthropic SDK:

| Agent | Endpoint | Input | Output |
|---|---|---|---|
| Monitoring agent | `POST /api/ai-insights` | child profile + behavior logs | trends, top triggers, weekly averages, insights, therapist-change recommendation |
| Therapist-finder agent | `POST /api/therapist-finder` | location, child age, diagnosis, specialty focus | 5–6 therapist profiles with contact info |

**Concept 3 — The monitoring agent's decision rule.**
The AI is instructed (see the system/user prompt in `api/ai-insights.ts`) to compute a `trend` (`improving` / `stable` / `declining`) from week-over-week meltdown, focus, and mood averages, and to only set `recommendChangeTherapist: true` if there are **4+ weeks of data with no improvement**. When that flag is true, it also returns 3 specific `improvementAreas` — concrete things to look for in the next therapist (e.g. "sensory integration experience").

**Concept 4 — Request flow for a single agent call.**
```
BehaviorLogger / AIInsights component
        │  user taps "Run Analysis"
        ▼
fetch('/api/ai-insights', { profile, logs })
        │
        ▼
Vercel Function (api/ai-insights.ts)
        │  builds system + user prompt from logs
        ▼
Anthropic Claude (claude-sonnet-4-6)
        │  returns structured JSON
        ▼
Function parses + returns JSON
        │
        ▼
AIInsights component renders insights, saves via saveAnalysis()
```

**Key design decisions:**
- **No routing library.** Views are switched with a single `useState<View>` in `App.tsx` rather than React Router — the app only has 6 screens, so a switch statement is simpler than a router.
- **JSON-only LLM responses.** Both prompts explicitly forbid markdown/code fences and demand an exact JSON shape, so the functions can `JSON.parse` the response directly (with a regex fallback to strip code fences if the model adds them anyway).
- **Stateless functions.** Each Vercel function takes the full profile/logs in the request body and returns a result — no server-side session or queue, which keeps the free tier sufficient for this workload.

## Metrics

What we track to know whether the app and its agents are actually useful:

| Metric | What it tells us |
|---|---|
| Activities logged | How consistently a parent is using the daily logger — the AI agents need a steady stream of entries to be useful |
| Sessions analyzed | How often the monitoring agent is actually run against accumulated logs |
| Trend accuracy | Whether the agent's `improving` / `stable` / `declining` call matches what the therapist independently observes |
| Therapist-change recommendation precision | How often a `recommendChangeTherapist: true` flag corresponds to a real, therapist-confirmed lack of progress (avoiding false alarms) |
| Therapist-finder relevance | Whether returned therapist profiles match the requested location, specialty, and age group |
| Time-to-log | Median time a parent spends completing one behavior log entry (target: under a minute) |

These are tracked manually today by reviewing logged data and analysis runs.

## AI Observability & Evals

Every call the monitoring agent makes to Claude is traced with **Arize AX**, an LLM observability platform, so the agent's reasoning is inspectable rather than a black box.

**What's captured per call** (`api/ai-insights.ts`):
- Full prompt and response text (input/output)
- Model name and token usage (prompt / completion / total)
- Latency (start/end timestamps)
- Span kind tagged `LLM`, grouped under the `adhd-behavior-tracker` project

**How it works:** after each successful Claude response, the function builds an OpenTelemetry-style span and POSTs it to Arize's OTLP endpoint (`https://otlp.arize.com/v1/traces`), authenticated with `ARIZE_API_KEY` / `ARIZE_SPACE_ID` environment variables. Tracing is best-effort — if those env vars aren't set, the function skips it silently and the user-facing response is unaffected.

**Evals:** beyond raw tracing, Arize is used to run **usefulness evaluations** against the monitoring agent's real outputs — checking that:
- `trend` only reports `"declining"` when the rule (3+ weeks worsening) is actually met
- `recommendChangeTherapist` is only `true` after 4+ weeks of no improvement, never as a false alarm
- `topTriggers` and insights are grounded in the actual logs sent in, not fabricated
- the agent explicitly says when it lacks data, rather than guessing

Eval datasets are built from **real traces** of this app's own input/output pairs (not generic templates), so scores reflect whether the agent is doing the specific job it was prompted to do.

**To set this up yourself:** add `ANTHROPIC_API_KEY`, `ARIZE_API_KEY`, and `ARIZE_SPACE_ID` as environment variables in your Vercel project (Production environment), then trigger a few analyses from the **Insights** view — traces will appear in your Arize space under the `adhd-behavior-tracker` project within a minute.

## Folder Structure

```
ADHD-AgenticApp/
├── api/
│   ├── ai-insights.ts          # Monitoring agent — Vercel serverless function
│   └── therapist-finder.ts     # Therapist-finder agent — Vercel serverless function
├── src/
│   ├── components/
│   │   ├── SetupProfile.tsx    # First-run onboarding (child profile form)
│   │   ├── Dashboard.tsx       # Overview, recent logs, quick stats
│   │   ├── BehaviorLogger.tsx  # Step-by-step log entry form
│   │   ├── HistoryView.tsx     # Recharts trend charts + full log list
│   │   ├── AIInsights.tsx      # Calls the monitoring agent, renders insights
│   │   ├── TherapistFinder.tsx # Calls the therapist-finder agent
│   │   ├── Settings.tsx        # Profile editing, export, reset
│   │   └── Navigation.tsx      # Responsive nav (sidebar on desktop, tabs on mobile)
│   ├── types/
│   │   └── index.ts            # ChildProfile, BehaviorLog, AIAnalysis types + predefined option lists
│   ├── utils/
│   │   └── storage.ts          # localStorage read/write helpers + .txt export
│   └── App.tsx                 # Root component, view switching, reminder logic
├── vite.config.ts              # Dev server, proxies /api to local Vercel dev server
├── vercel.json                 # Vercel build + routing config
└── package.json
```

## Tools Used

| Tool | Cost | Used For |
|---|---|---|
| Node.js & npm | Free | Running the app locally and installing dependencies |
| Anthropic Claude API | Paid (pay-per-use) | Powers both AI agents — behavior analysis and therapist search |
| Vercel | Free tier | Hosting the website and the two AI agent functions |
| Arize AX | Free tier | Monitoring AI agent calls and evaluating answer quality (optional) |

## Step-by-Step Tutorial

### Step 1: Set Up Your Child's Profile

**Why:** The AI agents need context (age, diagnosis, current therapist, therapy start date) to give relevant analysis — without it, insights would be generic.

**How:** On first load, `App.tsx` checks `getProfile()`; if there's no saved profile it renders `SetupProfile.tsx`, a form for name, age, diagnosis, therapist contact info, therapy start date, location, medications, and notes.

**Output:** A `ChildProfile` object is written to `localStorage` under `adhd_tracker_profile`, and the app moves to the Dashboard.

### Step 2: Log a Behavior Event

**Why:** This is the core data the rest of the app runs on — without enough logs (minimum 3), the AI monitoring agent won't have anything to analyze.

**How:** Open the **Log** view (`BehaviorLogger.tsx`). Pick from predefined triggers/behaviors (`src/types/index.ts`), set meltdown/focus/mood levels (1–5 scales), duration, location, and what resolution strategy worked. Saving calls `saveLog()`, which prepends the entry to the array stored under `adhd_tracker_logs`.

**Output:** A new `BehaviorLog` entry appears immediately on the Dashboard and in History.

### Step 3: Review History & Trends

**Why:** Spotting patterns by eye (e.g. "meltdowns spike after screen time") is the first, fastest signal — before even running the AI agent.

**How:** The **History** view (`HistoryView.tsx`) filters logs by 7/14/30/90-day windows and renders Recharts `AreaChart`/`BarChart` views of meltdown severity, focus, and mood over time, plus a filterable list of raw entries.

**Output:** Visual trend charts and a searchable log list — no AI call required for this step.

### Step 4: Run the AI Monitoring Agent

**Why:** This is the agent that does what a parent can't easily do by hand: aggregate weeks of logs, compute trend direction, and flag when therapy doesn't seem to be working.

**How:** From the **Insights** view (`AIInsights.tsx`), tap "Run Analysis." This POSTs the profile and up to the 60 most recent logs to `/api/ai-insights`. The serverless function builds a prompt (see [Prompt Reference](#prompt-reference)) and calls Claude with `max_tokens: 2000`.

**Output:** An `AIAnalysis` object: top triggers, trend (`improving`/`stable`/`declining`), weekly averages, 3–5 categorized insights (pattern/warning/success/recommendation) with action items, and — if 4+ weeks show no improvement — `recommendChangeTherapist: true` plus 3 concrete improvement areas to search for next.

**Tip:** The analysis is cached via `saveAnalysis()`, so it persists across reloads until you run a fresh analysis.

### Step 5: Find a Therapist with the AI Finder Agent

**Why:** If the monitoring agent recommends a change (or a parent just wants options), they need somewhere to start — without leaving the app to manually search directories.

**How:** Open **Therapists** (`TherapistFinder.tsx`), enter a location (and optionally a specialty focus). This POSTs to `/api/therapist-finder`, which prompts Claude to generate 5–6 realistic therapist profiles for that area.

**Output:** A list of `TherapistResult` cards — name, credentials, phone, email, address, telehealth availability, approaches, years of experience — plus a disclaimer to verify details on Psychology Today or CHADD before reaching out.

### Step 6: Share a Report with Your Therapist

**Why:** The whole point of logging is to get this data in front of the actual therapist treating the child, in a format they can act on.

**How:** From **Settings** or **History**, export logs as plain text via `exportLogsAsText()` in `src/utils/storage.ts`, which formats every log (date, triggers, behaviors, levels, duration, resolution, notes) into a readable report.

**Output:** A downloadable `.txt` file ready to email or hand to the therapist.

## How to Run It

### First-Time Setup

```bash
git clone https://github.com/Sreyashi/ADHD-AgenticApp.git
cd ADHD-AgenticApp
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm install -g vercel   # if you don't already have it
```

### Daily Usage

| Task | Command |
|---|---|
| Run the full app locally (frontend + API) | `vercel dev` |
| Run frontend only (no AI agents) | `npm run dev` |
| Type-check + build for production | `npm run build` |
| Preview the production build | `npm run preview` |
| Deploy to Vercel | `vercel --prod` (or push to a branch connected to Vercel) |

## Prompt Reference

**Monitoring agent system prompt** (`api/ai-insights.ts`):
> "You are an expert AI assistant specializing in ADHD behavior analysis for parents and therapists. Analyze behavior logs, identify patterns, track therapy progress, and provide actionable insights. Be empathetic, data-driven, and practical. Always respond with valid JSON only — no markdown, no code blocks."

**Monitoring agent decision rules** (embedded in the user prompt):
- `trend = "improving"` if meltdown levels are decreasing and focus is increasing; `"declining"` if worsening for 3+ weeks; otherwise `"stable"`.
- `recommendChangeTherapist = true` **only** if there are 4+ weeks of data showing no improvement.
- `improvementAreas` lists 3 specific therapy specializations to search for next, meaningful only when a change is recommended.

**Therapist-finder agent system prompt** (`api/therapist-finder.ts`):
> "You are a helpful assistant that helps parents of children with ADHD find qualified therapists. You have extensive knowledge of therapist directories and ADHD treatment specialists across the US. Always respond with valid JSON only — no markdown, no code blocks."

## Privacy

All behavior data is stored **locally on your device** via `localStorage`. The only data sent off-device is what you explicitly submit when running an AI agent (profile + logs to `/api/ai-insights`, or location/diagnosis to `/api/therapist-finder`) — and that data goes only to the Claude API for that single request.

## License

MIT
