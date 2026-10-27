# HISAAB BARABAR

> **“Every hour should count.”**  
> *Fair pay. Safer workplaces. A voice for every worker.*

[![Node.js CI](https://img.shields.io/badge/Node.js-20+-brightgreen.svg)](https://nodejs.org)
[![UN SDG](https://img.shields.io/badge/UN%20SDG-8%3A%20Decent%20Work-blue.svg)](https://sdgs.un.org/goals/goal8)
[![Deployment](https://img.shields.io/badge/Deploy-Google%20Cloud%20Run-blue.svg)](https://cloud.google.com/run)
[![Tests](https://img.shields.io/badge/Tests-Node%20Built--in%20Runner-success.svg)](https://nodejs.org/api/test.html)
[![Zero Build Step](https://img.shields.io/badge/Frontend-Vanilla%20%7C%20Zero%20Build-orange.svg)](#design-system)

---

## 1. Executive Summary & UN SDG 8 Alignment

**Hisaab Barabar** (“Fair Accounting” in Hindi/Urdu) is a production-grade working prototype engineered for **Prompt Wars 2026**, addressing **United Nations Sustainable Development Goal 8: Decent Work and Economic Growth**.

In high-risk labor environments—specifically **civil construction** and **sprawling college campuses**—informal and contractual workers routinely suffer from unrecorded overtime, arbitrary wage deductions, excessive shift fatigue, and unaddressed safety hazards.

Hisaab Barabar bridges this divide by delivering:
- **UN SDG Target 8.5 (Equal Pay & Fair Remuneration):** Transparent, deterministic labor accounting where base hours, overtime rates ($1.5\times$), and statutory deductions (Welfare/PF cess) are computed without opaque third-party intermediaries.
- **UN SDG Target 8.8 (Safe & Secure Workplaces):** Direct safety hazard triage with multi-tier severity classifications and automated fatigue warnings when workers exceed legally mandated shift caps.

---

## 2. Editorial Design Philosophy

The user interface rejects generic AI-generated SaaS dashboard tropes (no neon gradients, no glassmorphism, no generic card grids, and no bulky drop-shadows). Instead, it adopts an **editorial portfolio aesthetic** inspired by physical publishing and architectural ledgers:

- **Warm pale butter-yellow background:** `#F5EBCB`
- **Near-black text:** `#171710`
- **Large, elegant serif headlines:** Playfair Display / Georgia display typography
- **Small uppercase labels:** Generous letter spacing (`0.14em` tracking)
- **Thin charcoal and muted olive rules:** Crisp horizontal dividers (`1px solid #171710`)
- **Restrained status palette:** Olive green (`#2B422F`) for verified compliance, orange-red (`#A63826`) for critical safety hazards and fatigue alerts, and ochre amber (`#8A6424`) for warnings
- **Zero Frontend Build Step / Zero External CDN:** 100% self-contained vanilla HTML5, CSS3, and modern ES6 JavaScript. No external fonts or third-party CSS frameworks are required.
- **Accessibility:** Touch targets exceed 48px, keyboard focus rings are visible, and high-contrast color ratios are maintained.

---

## 3. Configurable Sectors

The prototype comes pre-configured with two distinct sectors:

| Parameter | Construction Sector (Metro Phase 3) | College & Campus Services (St. Jude Campus) |
|---|---|---|
| **Trade Profile** | Master masons, steel fixers, scaffolders | Campus electricians, lab cleaners, night security |
| **Standard Shift** | 8.0 Hours | 7.0 Hours |
| **Hourly Base Rate** | ₹120.00 / hr | ₹150.00 / hr |
| **Overtime Multiplier** | 1.50× (₹180.00 / hr) | 1.50× (₹225.00 / hr) |
| **Fatigue Safety Threshold** | > 10.0 Hours single shift | > 9.0 Hours single shift |
| **Weekly Legal Cap** | 48.0 Hours | 42.0 Hours |
| **Statutory Deduction** | 4% Building Workers Welfare Cess | 5% Staff Welfare / ESI Fund |
| **Meal Copay Adjustment** | ₹30.00 / full shift | ₹20.00 / full shift |
| **Hazard Focus** | Falls from height, cranes, trench cave-ins | Fume hoods, chemical vapors, wet sub-stations |

*All economic and safety parameters can be inspected and updated dynamically via the Employer Portal.*

---

## 4. Key Capabilities & Architecture

```
Hisaab-Barabar/
├── Dockerfile                   # Cloud Run container definition (Node 20 Alpine)
├── .dockerignore                # Container build exclusions
├── .gitignore                   # Git version control ignore rules
├── .env.example                 # Environment configuration template
├── package.json                 # Dependency definitions and test scripts
├── README.md                    # System documentation and runbook
├── src/
│   ├── server.js                # Express app, security headers, routing
│   ├── config.js                # Sector parameters and application defaults
│   ├── store.js                 # In-memory transactional data store & demo seeds
│   ├── calculations.js          # Deterministic hours, overtime, payslip & fatigue math
│   ├── routes/
│   │   └── api.js               # REST API endpoints (/shifts, /hazards, /sectors, etc.)
│   └── views/
│       ├── landing.html         # Landing page (/)
│       ├── worker.html          # Mobile-first Worker Portal (/worker)
│       └── admin.html           # Employer Dashboard & Safety Triage (/admin)
├── public/
│   ├── css/
│   │   └── editorial.css        # Butter-yellow editorial design system
│   └── js/
│       ├── worker.js            # Worker time clock, payslip viewer & speech dictation
│       └── admin.js             # Employer shift audit, hazard triage & policy editor
└── test/
    ├── calculations.test.js     # Unit tests for overtime, pay math & fatigue logic
    └── api.test.js              # Integration tests for /healthz, shifts & hazards
```

### 1. Worker Portal (`/worker`)
- **Identity & Sector Selection:** Switch effortlessly between demo workers or register a new worker on the fly.
- **Time Clock:** Live check-in/check-out with elapsed timer.
- **Deterministic Payslip Slip:** Instant printable receipt (`PS-XXXX`) breaking down standard pay, overtime pay, statutory deductions, net pay, and fatigue status.
- **Shift Simulator:** One-click simulation for judges to test 8.0h standard, 10.5h overtime, and 12.0h critical fatigue scenarios.
- **Safety Hazard Reporting:** Anonymous or attributed reporting with severity selection and a built-in **Push-to-Talk Voice Note** feature using the Web Speech API.

### 2. Employer Dashboard (`/admin`)
- **Attendance & Shift Ledger:** Full audit history of shifts, live clock-ins, and automated flags for shifts that exceed legal fatigue limits.
- **Safety Hazard Triage Queue:** Real-time queue allowing administrators to transition hazard statuses (`Reported` $\to$ `Investigating` $\to$ `Mitigated` $\to$ `Dismissed`) and attach corrective notes.
- **Policy Parameter Tuner:** Live editing of base rates, shift lengths, overtime multipliers, and deductions per sector.

### 3. Container & Cloud Run Healthcheck (`/healthz`)
- Responds with `200 OK` JSON metadata including system uptime, service name, version, and SDG commitment.

---

## 5. Local Setup & Testing (PowerShell)

### Prerequisites
- Node.js 20+ installed
- PowerShell terminal on Windows

### Exact PowerShell Commands:

```powershell
# 1. Clone or navigate to the project directory
cd c:\Users\acer\Desktop\Hisaab-Barabar

# 2. Install dependencies (sandboxed or direct)
npm install

# 3. Run all unit and integration tests (using Node.js built-in runner)
npm test

# 4. Start the application locally
npm start
```

Once running, access the application in your browser:
- **Landing Page:** [http://localhost:8080](http://localhost:8080)
- **Worker Portal:** [http://localhost:8080/worker](http://localhost:8080/worker)
- **Employer Dashboard:** [http://localhost:8080/admin](http://localhost:8080/admin)
- **Health Endpoint:** [http://localhost:8080/healthz](http://localhost:8080/healthz)

---

## 6. Pushing to a Public GitHub Repository (PowerShell)

To push this codebase to a public GitHub repository, run the following commands in your PowerShell terminal:

```powershell
# 1. Initialize Git repository
git init

# 2. Stage all files
git add .

# 3. Commit the implementation
git commit -m "feat: Hisaab Barabar prototype for Prompt Wars 2026 (UN SDG 8)"

# 4. Set the default branch to main
git branch -M main

# 5. Add your GitHub remote repository (replace with your actual GitHub username/repo)
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/hisaab-barabar.git

# 6. Push to GitHub
git push -u origin main
```

---

## 7. Deploying to Google Cloud Run (PowerShell)

Google Cloud Run is the designated deployment platform for this prototype.

### Method A: Direct Source-to-Cloud Deploy (Recommended)
This uses Google Cloud Build to build the container from the included `Dockerfile` and deploys it directly to Cloud Run without requiring a local Docker daemon.

```powershell
# 1. Authenticate with Google Cloud
gcloud auth login

# 2. Set your Google Cloud Project ID
gcloud config set project <YOUR-PROJECT-ID>

# 3. Enable required Google Cloud APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 4. Deploy directly from the source directory
gcloud run deploy hisaab-barabar `
  --source . `
  --region us-central1 `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --set-env-vars NODE_ENV=production
```

### Method B: Build & Deploy Container via Google Artifact Registry

```powershell
# 1. Authenticate Docker with Google Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# 2. Build the container image locally
docker build -t us-central1-docker.pkg.dev/<YOUR-PROJECT-ID>/hisaab-repo/hisaab-barabar:v1 .

# 3. Push container image to Google Artifact Registry
docker push us-central1-docker.pkg.dev/<YOUR-PROJECT-ID>/hisaab-repo/hisaab-barabar:v1

# 4. Deploy the image to Cloud Run
gcloud run deploy hisaab-barabar `
  --image us-central1-docker.pkg.dev/<YOUR-PROJECT-ID>/hisaab-repo/hisaab-barabar:v1 `
  --region us-central1 `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --set-env-vars NODE_ENV=production
```

After deployment completes, Cloud Run will print the publicly accessible Service URL:
```
Service URL: https://hisaab-barabar-<hash>-uc.a.run.app
```

Verify your deployment:
- Health check: `https://<YOUR-CLOUD-RUN-URL>/healthz`
- Worker portal: `https://<YOUR-CLOUD-RUN-URL>/worker`
- Employer dashboard: `https://<YOUR-CLOUD-RUN-URL>/admin`

---

## 8. Data Storage & Reset Policy

As an evaluation prototype for Prompt Wars 2026, the application utilizes an in-memory transactional store seeded with realistic workers, historical shifts, and open safety reports across Construction and College sectors.

- **Data Resets:** Because data resides in memory, restarting the container resets the ledger to demo defaults.
- **Interactive Re-seed:** A "Re-seed Demo Data" button is provided on both the Landing Page and the Admin Dashboard to reset data instantly at any time during judge evaluation.

---

## 9. License
MIT License. Created for **Prompt Wars 2026**.
Dedicated to the protection of labor rights and transparent compensation worldwide under **UN SDG 8**.
