# 🧠 Knowledge Guardian — Full Stack

Institutional Memory System that captures, structures, and surfaces organizational knowledge using AI.

---

## Project Structure

```
knowledge-guardian/
├── backend/                  ← Node.js + Express API
│   ├── server.js             ← Entry point
│   ├── db/index.js           ← PostgreSQL connection + schema
│   ├── middleware/auth.js    ← JWT auth middleware
│   ├── routes/
│   │   ├── auth.js           ← Register / Login / Me
│   │   ├── upload.js         ← File upload + AI extraction
│   │   ├── knowledge.js      ← CRUD for knowledge items
│   │   └── chat.js           ← AI chat endpoint
│   ├── .env.example          ← Copy to .env
│   └── package.json
│
└── frontend/                 ← React app
    ├── src/
    │   ├── App.js            ← Routing
    │   ├── api.js            ← All backend API calls
    │   ├── hooks/useAuth.js  ← Auth context
    │   └── pages/
    │       ├── AuthPage.jsx  ← Login / Register
    │       └── Dashboard.jsx ← Main app (Capture, Knowledge, Chat)
    ├── public/index.html
    ├── .env.example
    └── package.json
```

---

## Setup Instructions

### Step 1 — Database

Option A: **Neon.tech** (free cloud PostgreSQL, recommended)
1. Go to https://neon.tech and create a free account
2. Create a new project called `knowledge-guardian`
3. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb`)

Option B: **Local PostgreSQL**
```bash
psql -U postgres
CREATE DATABASE knowledge_guardian;
```

---

### Step 2 — Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and fill in:
#   DATABASE_URL  → your Neon or local PostgreSQL URL
#   ANTHROPIC_API_KEY → from console.anthropic.com
#   JWT_SECRET → any random string (e.g. openssl rand -hex 32)

# Start the backend
npm run dev
```

The backend will auto-create the database tables on first run.
You should see: `✅ Database tables ready` and `🚀 Backend running on http://localhost:4000`

Test it's working:
```bash
curl http://localhost:4000/health
# Should return: {"status":"ok"}
```

---

### Step 3 — Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# REACT_APP_API_URL=http://localhost:4000 (default, no change needed for local dev)

# Start the frontend
npm start
```

Open http://localhost:3000 in your browser.

---

## How to Use

1. **Register** — Create an account with your name, email, org name
2. **Capture** — Upload `.txt`, `.md`, `.pdf`, `.json`, `.py`, `.js` files
3. **Knowledge Base** — Browse extracted items, filter by type, delete items
4. **Ask AI** — Chat with the AI grounded in your uploaded documents

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Create account | No |
| POST | /auth/login | Sign in | No |
| GET | /auth/me | Get current user | Yes |
| POST | /upload | Upload + extract file | Yes |
| GET | /knowledge | Get all knowledge items | Yes |
| GET | /knowledge?search=X | Search knowledge items | Yes |
| GET | /knowledge?type=warning | Filter by type | Yes |
| GET | /knowledge/documents | List all documents | Yes |
| DELETE | /knowledge/:id | Delete knowledge item | Yes |
| DELETE | /knowledge/document/:id | Delete document + items | Yes |
| POST | /chat | AI chat | Yes |

---

## Deploying to Production

### Backend → Railway.app (free)
1. Push code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Select the `backend` folder
4. Add environment variables in Railway dashboard
5. Railway gives you a URL like `https://your-app.railway.app`

### Frontend → Vercel (free)
1. Push code to GitHub
2. Go to vercel.com → New Project → Import from GitHub
3. Select the `frontend` folder
4. Set environment variable: `REACT_APP_API_URL=https://your-app.railway.app`
5. Deploy

---

## Knowledge Item Types

| Type | Icon | Description |
|------|------|-------------|
| decision | ⚖️ | Architectural or business decisions |
| process | 🔄 | Workflows and procedures |
| technical_fact | ⚙️ | Technical details and specs |
| best_practice | ✅ | Recommended approaches |
| warning | ⚠️ | Critical caveats and gotchas |
| contact | 👤 | People, teams, ownership |
