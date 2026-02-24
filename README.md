# WildPath

> Making Wildlife Data Accessible, Interactive, and Fun

WildPath is a web application that redesigns animal tracking around clarity, accessibility, and engagement. Instead of expert-focused tools packed with dense data, it presents wildlife information through intuitive, interactive maps approachable to everyday users.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│           React + Vite + Mapbox GL JS               │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP (REST)
┌─────────────────────▼───────────────────────────────┐
│               Node.js + Express API                 │
│              (serves processed data)                │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              Supabase (PostgreSQL + PostGIS)         │
│             (stores processed wildlife data)        │
└─────────────────────▲───────────────────────────────┘
                      │ write
┌─────────────────────┴───────────────────────────────┐
│            Python Ingestion Pipeline                │
│         pandas · MoveBank API · iNaturalist         │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Frontend    | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Map         | Mapbox GL JS, react-map-gl                      |
| Data Fetching | TanStack React Query, Axios                  |
| Backend     | Node.js, Express, TypeScript                    |
| Database    | Supabase (PostgreSQL + PostGIS)                 |
| Data APIs   | MoveBank API, iNaturalist API                   |
| Pipeline    | Python, pandas, Supabase Python SDK             |

---

## Project Structure

```
WildPath/
├── frontend/        # React + Vite app
├── backend/         # Node.js + Express API server
├── pipeline/        # Python data ingestion scripts
├── package.json     # Root workspace + dev scripts
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Python](https://www.python.org/) 3.11+
- [pip](https://pip.pypa.io/)
- A [Supabase](https://supabase.com/) project
- A [Mapbox](https://www.mapbox.com/) account (for the access token)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/wildpath.git
cd wildpath
```

### 2. Install Node.js dependencies

```bash
npm install
```

This installs dependencies for both `frontend/` and `backend/` via npm workspaces.

### 3. Install Python dependencies

```bash
cd pipeline
pip install -r requirements.txt
```

### 4. Set up environment variables

Copy each `.env.example` file and fill in your credentials:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp pipeline/.env.example pipeline/.env
```

See the [Environment Variables](#environment-variables) section below for details.

---

## Running the Dev Servers

Run both frontend and backend simultaneously from the root:

```bash
npm run dev
```

Or run them individually:

```bash
npm run dev:frontend   # http://localhost:5173
npm run dev:backend    # http://localhost:3001
```

---

## Running the Data Pipeline

The pipeline fetches animal tracking data from MoveBank, processes it with pandas, and loads it into Supabase.

```bash
cd pipeline
python src/ingest.py
```

> Note: MoveBank allows only one concurrent request per IP. The pipeline is designed to run as a scheduled task, not in real-time.

---

## Environment Variables

### `frontend/.env`

| Variable           | Description                          |
|--------------------|--------------------------------------|
| `VITE_API_URL`     | URL of the Express backend (e.g. `http://localhost:3001`) |
| `VITE_MAPBOX_TOKEN`| Your Mapbox public access token      |

### `backend/.env`

| Variable               | Description                              |
|------------------------|------------------------------------------|
| `PORT`                 | Port for the Express server (default: `3001`) |
| `SUPABASE_URL`         | Your Supabase project URL                |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (keep secret!) |
| `FRONTEND_ORIGIN`      | Frontend URL for CORS (e.g. `http://localhost:5173`) |

### `pipeline/.env`

| Variable               | Description                              |
|------------------------|------------------------------------------|
| `SUPABASE_URL`         | Your Supabase project URL                |
| `SUPABASE_SERVICE_KEY` | Supabase service role key                |
| `MOVEBANK_USERNAME`    | Your MoveBank account username           |
| `MOVEBANK_PASSWORD`    | Your MoveBank account password           |

---

## Team

**Team DRAKKN**

| Name         | Role                    |
|--------------|-------------------------|
| Kaitlyn Tran | Frontend Dev            |
| Daniel Dovale | Backend Dev            |
| Arnav        | Frontend Dev            |
| Ronald       | Data Integration        |
| Kavi Patel   | Backend Dev             |
