# 🧠 Knowledge Guardian

Team Memory System — captures, structures, and surfaces organizational knowledge using AI.

---

## Tech Stack

- **Frontend** — React 18, React Router, Recharts
- **Backend** — Node.js, Express
- **Database** — PostgreSQL (Neon.tech)
- **AI** — Groq API (Llama 3.3 70B)
- **Auth** — JWT + bcrypt
- **File Parsing** — mammoth (.docx), pdf2json (.pdf)

---

## Project Structure

```
knowledge-guardian/
├── backend/
│   ├── server.js
│   ├── db/index.js
│   ├── middleware/auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── upload.js
│   │   ├── knowledge.js
│   │   └── chat.js
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── api.js
    │   ├── hooks/useAuth.js
    │   └── pages/
    │       ├── AuthPage.jsx
    │       └── Dashboard.jsx
    ├── public/index.html
    └── package.json
```

---

## Setup

### 1. Database
- Sign up at neon.tech
- Create project → Region: Asia Pacific - Singapore → PostgreSQL 16
- Copy connection string

### 2. Groq API Key
- Sign up at console.groq.com
- Create API Key (starts with gsk_...)

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in .env:
```
DATABASE_URL=your_neon_connection_string
GROQ_API_KEY=gsk_your_key
JWT_SECRET=your_random_secret
PORT=4000
FRONTEND_URL=http://localhost:3000
```

```bash
npm run dev
```

### 4. Frontend

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000

---

## Supported File Types

.txt .md .pdf .docx .json .csv .js .py .html .log

---

## App Tabs

| Tab | Description |
|-----|-------------|
| Dashboard | Charts, stats, knowledge overview |
| Capture | Upload documents |
| Knowledge | Browse, filter, search, delete items |
| Ask AI | Chat grounded in uploaded documents |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Sign in |
| GET | /auth/me | Current user |
| POST | /upload | Upload + extract file |
| GET | /knowledge | Get all items |
| GET | /knowledge/documents | List documents |
| DELETE | /knowledge/:id | Delete item |
| DELETE | /knowledge/document/:id | Delete document |
| POST | /chat | AI chat |

---

## NPM Packages

Backend:
```
npm install express cors dotenv multer pg uuid jsonwebtoken bcryptjs groq-sdk mammoth pdf2json nodemon
```

Frontend:
```
npm install react-router-dom recharts
```