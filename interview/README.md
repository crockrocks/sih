# InterviewAssist — Frontend

React 18 + Vite frontend for the InterviewAssist platform.

## Setup

```bash
npm install
npm run dev       # http://localhost:5174
npm run build     # production build → dist/
npm run preview   # preview production build
```

## Key dependencies

| Package | Purpose |
|---------|---------|
| `react-router-dom` | Client-side routing |
| `axios` | API calls to FastAPI backend |
| `tailwindcss` | Utility-first styling |
| `@headlessui/react` | Accessible UI primitives |
| `framer-motion` | Animations |
| `lucide-react` / `react-icons` | Icon sets |
| `react-circular-progressbar` | Score display |

## Component overview

```
src/
├── App.jsx                     # Route definitions
├── api.js                      # Axios instance & API helpers
└── Components/
    ├── Login.jsx               # Auth (login + register)
    ├── Dashboard.jsx           # Candidate / employee home
    ├── InterviewForm.jsx       # Profile & resume submission
    ├── CandidateDetails.jsx    # Full candidate profile view
    ├── ScoreDisplay.jsx        # LangGraph screening results
    ├── TopExperts.jsx          # Recommended internal experts
    ├── Header.jsx              # Nav bar
    ├── AlternatePage.jsx       # Job listings & apply flow
    └── ui/custom-components.jsx
```

The backend API runs at `http://localhost:8000`. See the root [README](../README.md) for full setup instructions.
