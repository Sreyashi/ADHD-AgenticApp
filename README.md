# ADHD Behavior Tracker

> An AI-powered daily behavior tracker that helps parents of children with ADHD log meltdowns, triggers, and focus changes — and turns that data into therapist-ready reports and AI-generated insights.

## Table of Contents

- [Problem Statement](#problem-statement)
- [Project Overview](#project-overview)
- [Architecture & How It Works](#architecture--how-it-works)
- [Metrics](#metrics)
- [AI Observability & Evals](#ai-observability--evals)
- [Data Storage & Roadmap](#data-storage--roadmap)
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

## Data Storage & Roadmap

**Where data lives today:** All behavior data is stored **locally in the parent's browser** using `localStorage` — there is no backend database. A child's profile, every logged behavior entry, the latest AI analysis, and reminder timestamps are each kept under their own key, all on-device.

**Why this was the right call for an MVP:**
- Zero infrastructure cost and zero setup — a parent can start logging in seconds with nothing to sign up for.
- Strong privacy by default — nothing about a specific family sits on a server unless an AI agent is explicitly run for that one request.
- Fast enough to validate the core idea (does logging + AI analysis actually help parents and therapists?) before investing in backend infrastructure.

**Where this breaks down as usage grows:**
- Data is tied to one browser on one device — clearing browser storage or switching devices loses everything, with no recovery.
- No way for a therapist to see a parent's data directly; the only handoff today is the manual text export (Step 6).
- No way to aggregate or learn across users — every family's experience is siloed, even though patterns across many children could make the AI agent smarter over time.

**Planned next step — beyond ~50 users:** migrate behavior logs and profiles from `localStorage` to a proper **relational database** (e.g. Postgres, via a managed provider like Vercel Postgres or Supabase), with:
- Lightweight parent accounts so data survives device loss and syncs across phone/desktop.
- A read-only, shareable view a therapist can open directly, replacing the manual `.txt` export.
- A real audit trail of AI analyses over time, instead of caching only the single latest result.
- The same privacy posture preserved — only behavior data needed for analysis would ever be sent to Claude, regardless of where it's persisted.

This migration is intentionally deferred rather than built upfront, since it adds real infrastructure cost and complexity that isn't justified until there's enough usage to need multi-device sync and therapist-facing access.

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

**Why this feature exists:** Every other feature in the app — especially the two AI agents — needs context to be useful. Without knowing the child's age, diagnosis, and therapy history, any AI-generated insight would be generic and unhelpful.

**No AI call here.** This step is a plain form (name, age, diagnosis, current therapist, therapy start date, location, medications, notes). It just collects the context that later gets handed to the AI agents.

**Outcome:** The profile is saved, and it's automatically included in every future AI prompt so insights are personalized rather than generic.

### Step 2: Log a Behavior Event

**Why this feature exists:** This is the raw data everything else depends on. A parent records one incident at a time — what triggered it, what behavior showed up, how severe the meltdown was, focus and mood levels, how long it lasted, and what helped.

**No AI call here either** — logging needs to be fast (under a minute) and reliable, so it's a simple structured form, not an AI conversation. The AI agents only get involved once there's enough data to analyze.

**Outcome:** One more data point added to the child's history. The monitoring agent needs at least 3 logged entries before it has enough to say anything meaningful.

### Step 3: Review History & Trends

**Why this feature exists:** Before asking AI for an opinion, a parent should be able to eyeball the data themselves — e.g. "meltdowns spike after screen time" is often visible at a glance.

**No AI call here.** This is just charts and filtering (7/14/30/90-day windows) over the logs already collected. It's the "free, instant" insight layer before the AI agent is invoked.

**Outcome:** Visual trend lines for meltdown severity, focus, and mood — lets a parent decide *when* it's worth running the AI analysis below.

### Step 4: Run the AI Monitoring Agent

**Why this feature exists:** This is the core "agentic" feature — automating the kind of pattern-spotting a parent or therapist would otherwise have to do manually across weeks of notes, and proactively recommending a therapy change when the data says it isn't working.

**What prompt runs, and why it's worded that way:**
The agent is given the child's profile plus up to 60 recent behavior logs, and asked to return a strict JSON object — never a sentence response — so the app can render it reliably without lots of post-processing.

> *"You are an expert AI assistant specializing in ADHD behavior analysis for parents and therapists. Analyze behavior logs, identify patterns, track therapy progress, and provide actionable insights. Be empathetic, data-driven, and practical."*

The prompt then sets explicit decision rules, instead of leaving judgment calls to the model's discretion — this is the most important design choice in the whole app, because it's the difference between an AI that's "encouraging" and one that's trustworthy enough to act on:
- Trend is only called `"improving"` if meltdowns are decreasing *and* focus is increasing — not just a vibe.
- Trend is only called `"declining"` if things have worsened for 3+ straight weeks — a single bad week isn't enough to alarm a parent.
- A therapist-change is only recommended after **4+ weeks of flat or no improvement** — this guards against suggesting parents abandon a therapist over normal week-to-week noise.
- When a change *is* recommended, the agent must name 3 concrete specialty areas to look for next (e.g. "sensory integration experience") — not just "find someone better," which wouldn't be actionable for a parent.

**Outcome:** A structured report — top triggers, the trend call, week-by-week averages, 3-5 plain-language insights, and (if warranted) a therapist-change flag with specific things to search for next. It's saved so it persists until the parent runs a fresh analysis.

### Step 5: Find a Therapist with the AI Finder Agent

**Why this feature exists:** If Step 4 recommends a change, a parent shouldn't be left with just "go find someone better" — they need an actual starting list. This agent exists purely to remove that next-step friction.

**What prompt runs, and why:** The agent is given the parent's location, the child's age and diagnosis, and an optional specialty focus, then asked to return 5-6 therapist profiles as strict JSON — again, never free text, because the result needs to render as cards in the UI.

> *"You are a helpful assistant that helps parents of children with ADHD find qualified therapists. You have extensive knowledge of therapist directories and ADHD treatment specialists across the US."*

Because the model can generate plausible-but-unverified contact details, every response carries a built-in disclaimer telling the parent to verify the information through Psychology Today or CHADD before reaching out — this was a deliberate trust/safety call, not an oversight: the feature is meant to save a parent's search time, not to be treated as a verified directory.

**Outcome:** A shortlist of therapist cards — name, credentials, phone, address, telehealth availability, specialty approach — plus the verification disclaimer.

### Step 6: Share a Report with Your Therapist

**Why this feature exists:** Logging data is only valuable if it actually reaches the therapist treating the child. This closes the loop back to the real-world problem the app set out to solve.

**No AI call here** — this step simply formats the already-logged data (dates, triggers, behaviors, severity levels, what helped) into a clean, readable report.

**Outcome:** A downloadable text file the parent can email or hand to the therapist directly — no AI interpretation involved, just the raw facts laid out clearly.

## How to Run It

### First-Time Setup — The Journey

This is the actual path this app was built and shipped on — four stops, in order:

1. **Open Claude → Enter Prompt**
   Start a Claude Code session and describe the app in one prompt — what it tracks, who it's for, and the two AI agents it needs. Claude scaffolds the full React + TypeScript + Vite frontend and the two Vercel serverless agent functions (`/api/ai-insights`, `/api/therapist-finder`) in one pass.

2. **Set Up Vercel**
   Push the generated repo to GitHub, then import it into Vercel — it auto-detects the Vite framework and the `/api` functions with zero config. Add `ANTHROPIC_API_KEY` as an environment variable in the Vercel project settings, then deploy. The live app and both AI agents are now running on a real URL.

3. **Go Back to Claude → Enter Prompts to Enhance the App and Add Analytics**
   Return to Claude with follow-up prompts as real needs come up — e.g. "add Vercel Web Analytics so I can see page-by-page drop-off," "add a daily reminder notification," "fix the blank screen a user reported on Android Chrome." Each prompt becomes a focused commit pushed to the branch Vercel watches, which auto-redeploys on every push — no separate deploy step needed.

4. **Go to Arize → Connect It to Vercel and Claude, Build the Trace**
   Create a free Arize AX account and grab `ARIZE_API_KEY` and `ARIZE_SPACE_ID`. Add both as environment variables in the same Vercel project. From that point on, every call the monitoring agent makes to Claude is automatically traced into Arize — full input/output, token usage, and latency per call — and you can run usefulness evals directly against those real traces.

**To follow along exactly, here are the equivalent commands:**

```bash
git clone https://github.com/Sreyashi/ADHD-AgenticApp.git
cd ADHD-AgenticApp
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm install -g vercel   # if you don't already have it
```

## Privacy

All behavior data is stored **locally on your device** via `localStorage`. The only data sent off-device is what you explicitly submit when running an AI agent (profile + logs to `/api/ai-insights`, or location/diagnosis to `/api/therapist-finder`) — and that data goes only to the Claude API for that single request.

## License

MIT
