# ADHD Behavior Tracker

> AI-powered daily behavior tracking app for parents of children with ADHD — built to support therapists and families with data-driven insights.

What are the problems we are solving?
Parents do not have any tracker where they can digitally record the changes in behaviors of the kid
Parents do no have any ways to track the improvements or decline in kids behavioral changes
Lack of week by week or year by year comparable data to measure the effectiveness of the therapy the kid is taking.

## Features

### For Parents
- **Quick Daily Logging** — tap-to-select triggers, behaviors, and severity levels in under a minute
- **Behavior History** — charts showing meltdown trends, focus levels, and top triggers over 7/14/30/90 days
- **Share with Therapist** — generate a formatted report with one tap; export as `.txt` file
- **Smart Reminders** — browser notifications remind you to log if no entry in 20+ hours

### AI Monitoring Agent
Powered by **Claude claude-sonnet-4-6**, the monitoring agent:
- Identifies recurring triggers and behavioral patterns
- Tracks therapy progress week-over-week (improving / stable / declining)
- If **no improvement observed for 4+ weeks** — recommends reviewing the therapy approach with 3 specific improvement areas to look for in a new therapist

### AI Therapist Finder Agent
Also powered by Claude claude-sonnet-4-6:
- Enter your city/state to get 5–6 ADHD therapist profiles
- Results include: name, credentials, phone number, address, telehealth availability, therapy approaches
- Curated links to real directories: Psychology Today, CHADD, TherapyDen, Zocdoc

---
## Core Metrics 
Number of activities logged

Accuracy of AI Analyser per entered logs

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| AI | Anthropic Claude claude-sonnet-4-6 |
| Backend | Vercel Serverless Functions (TypeScript, `/api` folder) |
| Storage | localStorage (all data stays on your device) |
| Deployment | Vercel (free tier) |
| AI Evals - Arize AX

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx         # Overview + recent logs
│   │   ├── BehaviorLogger.tsx    # 4-step log entry form
│   │   ├── HistoryView.tsx       # Charts + log list
│   │   ├── AIInsights.tsx        # AI monitoring agent UI
│   │   ├── TherapistFinder.tsx   # AI therapist search UI
│   │   ├── Settings.tsx          # Profile + export + notifications
│   │   ├── SetupProfile.tsx      # First-run onboarding
│   │   └── Navigation.tsx        # Responsive nav (sidebar/bottom tabs)
│   ├── types/index.ts            # TypeScript types + predefined options
│   ├── utils/storage.ts          # localStorage helpers + export
│   └── App.tsx                   # Root component + routing
│
├── api/
│   ├── ai-insights.ts            # Monitoring agent (Vercel serverless, Claude API)
│   └── therapist-finder.ts       # Therapist search agent (Vercel serverless, Claude API)
│
└── vercel.json                   # Vercel build + routing config
```

---

## Privacy

All behavior data is stored **locally on your device** using `localStorage`. No personal data is sent to any server except anonymized behavior logs sent to the Claude API for analysis.

---

## License

MIT
