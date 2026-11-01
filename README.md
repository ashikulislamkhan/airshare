# AirShare (#ShareOnAir) — v3.0

> **Zero-Dollar Cloud Drive Architecture**: Vercel (UI Delivery) + Google Cloud Run (Always Free Compute) + Google Cloud Firestore (NoSQL Metadata) + Telegram MTProto (Unlimited Raw Binary Chunk Storage).

---

## 🏗 System Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (HOBBY TIER)                      │
│            Next.js App Router (UI Delivery Only)            │
│  * Strictly Bypasses 4.5 MB Vercel Serverless Function Limit *
└──────────────────────────────┬──────────────────────────────┘
                               │ Direct HTTPS / CORS
                               │ Header: Authorization: Bearer <Firebase_ID_Token>
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             GOOGLE CLOUD RUN (ALWAYS FREE TIER)             │
│    FastAPI (Containerized) | Scale-to-Zero | Zero-RAM Pipe   │
│    Timeout: 3,600s | CPU only during request processing     │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
       GCP SDK  │                             │ MTProto TCP/Abridged
                ▼                             ▼
┌──────────────────────────────┐    ┌─────────────────────────┐
│ GOOGLE CLOUD FIRESTORE       │    │ TELEGRAM STORAGE CLOUD  │
│ • Firebase Auth (Google Only)│    │ • AirShare Storage 001  │
│ • users, files, folders      │    │ • AirShare Storage 002  │
│ • chunks, shares, trash      │    │ • AirShare Storage N    │
│ • Cloud Scheduler (30-day)   │    │ (Max 1.90 GB per chunk) │
└──────────────────────────────┘    └─────────────────────────┘
```

---

## 🚀 Features

* **Zero-Dollar Infrastructure:** Runs 100% within the Always Free tiers of Google Cloud and Vercel.
* **Direct-to-Cloud-Run Streaming:** Uploads and downloads bypass Vercel serverless proxies completely, eliminating the 4.5 MB request ceiling.
* **1.90 GB (1,945 MB) Max Chunking:** Perfectly tuned below Telegram's 2,000 MiB free MTProto ceiling.
* **Zero-RAM HTTP 206 Partial Content:** Seamless video seeking and audio streaming across chunk boundaries via Telethon's `iter_download(offset=..., limit=...)`.
* **Multi-Format Preview Engine:**
  * **Images:** Zoom, pan, and rotate.
  * **Video / Audio:** Native HTML5 player with byte-range seek.
  * **PDF:** Embedded PDF.js viewer.
  * **Office (.docx, .xlsx, .pptx):** Embedded Google/Microsoft Docs previewer via 15-minute signed preview tokens.
* **Scoped Trash & Retention:** Owner sees all trashed items in their drive; collaborators see their own deleted items. 30-day auto-purge removes chunks from Telegram and Firestore records.
* **Google Sign-In ONLY:** Firebase Client SDK authentication.

---

## 🛠 Local Development Setup

### 1. Telegram MTProto Configuration
1. Obtain `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` from [my.telegram.org](https://my.telegram.org).
2. Create one or more private Telegram channels (e.g. `AirShare Storage 001`). Note their channel IDs (e.g., `-1001234567890`).
3. Generate a Telethon String Session:
   ```bash
   python -c "from telethon.sync import TelegramClient; from telethon.sessions import StringSession; print(TelegramClient(StringSession(), YOUR_API_ID, 'YOUR_API_HASH').start().session.save())"
   ```

### 2. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows (or source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
cp .env.example .env
# Fill in your GCP_PROJECT_ID, TELEGRAM credentials, and TELEGRAM_STORAGE_CHANNELS in .env
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

### 3. Frontend Setup (Next.js)
```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL="http://localhost:8080/api" and fill in your Firebase Web app keys
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Production Deployment

### 1. Backend on Google Cloud Run
Deploy with the following flags to guarantee zero idle cost:
```bash
gcloud run deploy airshare-backend \
  --source ./backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --concurrency 20 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 3600 \
  --no-cpu-throttling=false \
  --set-env-vars="GCP_PROJECT_ID=your-project-id,TELEGRAM_API_ID=...,TELEGRAM_API_HASH=...,TELEGRAM_STRING_SESSION=...,TELEGRAM_STORAGE_CHANNELS=-1001234567890"
```

### 2. Frontend on Vercel
1. Push the repository to GitHub.
2. Import the `frontend` folder into Vercel.
3. Configure the environment variables:
   * `NEXT_PUBLIC_API_URL`: Your Cloud Run URL (e.g., `https://airshare-backend-xxxxxx-uc.a.run.app/api`)
   * `NEXT_PUBLIC_FIREBASE_*`: Your Firebase config keys.
4. Deploy!

### 3. Cloud Scheduler (30-Day Auto Trash Purge)
Create a daily Cloud Scheduler cron job:
```bash
gcloud scheduler jobs create http airshare-daily-trash-purge \
  --schedule="0 3 * * *" \
  --uri="https://airshare-backend-xxxxxx-uc.a.run.app/api/scheduler/purge-trash" \
  --http-method=POST \
  --headers="X-CloudScheduler=true"
```
