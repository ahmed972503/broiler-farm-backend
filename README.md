# 🐔 Broiler Farm Management System (پولٹری فارم مینجمنٹ سسٹم)

A production-grade, offline-first mobile application and responsive web admin system purpose-built for commercial broiler chicken operations. Engineered specifically for farm environments with unreliable or zero cellular connectivity (such as enclosed metal poultry sheds) and tailored for high-speed operation by non-technical farm workers alongside comprehensive flock analytics for the farm owner.

---

## 🌟 Key Highlights & Architectural Strengths

- **Offline-First Multi-Master Sync**: Every write (daily mortality, feed usage, vaccination, sample weights) persists locally to SQLite/AsyncStorage and queues seamlessly. Once internet connectivity is restored, mutations sync via Last-Write-Wins (LWW) with server conflict resolution, idempotency registers, and visible sync indicators.
- **Ultra-Fast Worker Flow (<60 Seconds)**: Worker UI defaults to Roman Urdu (`Mout/Mortality`, `Khorak/Feed`, `Rozana Khata`) with large touch targets, high contrast, auto-population of flock age, and a single "Save" tap.
- **Multi-Platform Support**: Built on React Native with Expo Router. The exact same codebase runs natively on Android, iOS, and responsive Desktop Web (for admin laptop view with persistent sidebar navigation).
- **Strict Role-Based Access Control (RBAC)**:
  - **Worker**: Locked strictly to their assigned shed. Absolutely forbidden from viewing financial ledgers, sales revenue, feed purchasing costs, or other sheds.
  - **Admin**: Full oversight across all 5 sheds, flock life cycles, feed inventory, buyer accounts, expenses, staff payroll, and PDF/CSV reporting.
- **Production Formulas & Anomaly Alerts**: Tested pure functions calculate Feed Conversion Ratio (FCR), European Production Efficiency Factor (EPEF), Cost per Kg, Net Profit/Loss, and Livability with safe zero-division handling. Background engines detect mortality spikes (>1.0% in 24h), missed worker entries, vaccine due dates, and low feed reserves.

---

## 📁 Monorepo Layout

```text
├── packages/
│   └── shared/                 # Pure domain types, constants, formulas & Zod schemas
│       ├── src/formulas/       # Pure business math (FCR, EPEF, P&L, Mortality %, ADG)
│       ├── src/schemas/        # Zod validation contracts
│       ├── src/constants/      # Cobb 500 growth curve, standard vaccination schedule
│       └── src/types/          # Universal TypeScript interfaces
├── apps/
│   ├── api/                    # Node.js + Express + TypeScript + MongoDB
│   │   ├── src/models/         # Mongoose models with compound indexes & audit trails
│   │   ├── src/middleware/     # JWT Auth, Shed-level RBAC, Zod validation, Rate limiter
│   │   ├── src/services/       # Batch lifecycle, Alert engine, LWW Sync, Report CSV
│   │   └── src/utils/seed.ts   # Comprehensive 30-day realistic demo seed script
│   └── mobile/                 # React Native (Expo) Android, iOS & Web Admin App
│       ├── app/                # Expo Router file-based navigation
│       │   ├── (auth)/         # Login screen with instant demo toggles
│       │   ├── (worker)/       # Today, Daily Entry, Vaccines, Weight, History
│       │   └── (admin)/        # Dashboard, Sheds, Batches, Feed, Sales, Reports, Staff
│       ├── src/theme/          # Custom Design System (Color tokens, Spacing, Typography)
│       ├── src/db/offlineStore # Persistent offline mutation queue & local entity cache
│       └── src/i18n/           # English and Roman Urdu translations (i18next)
├── docs/                       # Complete engineering documentation
│   ├── ARCHITECTURE.md         # System architecture, sync lifecycle, Mermaid diagrams
│   ├── API.md                  # Comprehensive REST endpoint specifications
│   ├── DATA_MODEL.md           # ER diagram, schema contracts, indexes
│   ├── USER_GUIDE.md           # Worker guide (Roman Urdu) & Admin manual
│   ├── ASSUMPTIONS.md          # Business domain assumptions & resolved decisions
│   ├── DEPLOYMENT.md           # Docker, MongoDB backup/restore, EAS Android release
│   ├── QA_CHECKLIST.md         # Manual quality verification test cases
│   └── TEST_REPORT.md          # Automated test execution report (83/83 passing)
├── docker-compose.yml          # Production multi-container composition
└── .github/workflows/ci.yml    # CI pipeline running lint, type-check & test suites
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites

- Node.js v20+ LTS
- npm v10+
- MongoDB v6+ (or run via Docker)

### 1. Installation

Clone the repository and install all dependencies from the root:

```bash
git clone <repo-url>
cd "Poultary Farm"
npm install
```

### 2. Build Shared Package

```bash
npm run build:shared
```

### 3. Run Automated Tests & Static Verification

Run all 83 unit, component, middleware, and formula test suites:

```bash
npm test
```

Run strict TypeScript type checking across all 3 workspaces (Shared, API, Mobile):

```bash
npm run type-check
```

### 4. Seed Realistic Demo Data

Populate MongoDB with 1 Admin, 4 Workers, 5 Sheds, 5 active flocks at staggered ages (Days 5 to 35), 30 days of daily logs, feed inventory, buyer ledgers, and 1 closed flock with completed sales:

```bash
npm run seed
```

### 5. Launch Backend API

```bash
npm run dev:api
```

The API server starts on `http://localhost:5000`.

### 6. Launch Mobile App & Admin Web View

In a new terminal:

```bash
# To run responsive web dashboard on laptop browser:
npm run dev:web

# Or to start Expo for iOS/Android:
npm run dev:mobile
```

Press `w` in the terminal to open the web browser at `http://localhost:8081`.

---

## 👥 Demo Credentials & Test Roles

The login screen provides quick one-tap demo buttons to easily switch between roles:

| Role              | Username  | Password    | Assigned Shed     | Permissions                                         |
| :---------------- | :-------- | :---------- | :---------------- | :-------------------------------------------------- |
| **Admin (Owner)** | `admin`   | `admin123`  | _All Sheds (1–5)_ | Full access to finances, P&L, sales, reports, users |
| **Worker 1**      | `worker1` | `worker123` | **Shed 1**        | Daily entries, vaccines, weights for Shed 1 only    |
| **Worker 2**      | `worker2` | `worker123` | **Shed 2**        | Daily entries, vaccines, weights for Shed 2 only    |
| **Worker 3**      | `worker3` | `worker123` | **Shed 3**        | Daily entries, vaccines, weights for Shed 3 only    |
| **Worker 4**      | `worker4` | `worker123` | **Shed 4**        | Daily entries, vaccines, weights for Shed 4 only    |

---

## 🧪 Automated Testing Breakdown

All 83 test suites execute in memory with zero external dependencies:

1. **`packages/shared`** (48 tests):
   - FCR, EPEF, Cost per Kg, ADG, Livability %, Bag conversions, and Payroll wage formulas.
   - Zod validation schemas for all domain entities.
2. **`apps/mobile`** (14 tests):
   - `OfflineStore`: queue FIFO preservation, client mutation ID generation, atomic removal, local entity caching.
   - Design System UI: `Button`, `Badge`, `Card`, `StatCard`, `EmptyState`, `SyncStatusBanner`.
3. **`apps/api`** (21 tests):
   - `auth_middleware`: JWT token decoding, expired token detection (`TOKEN_EXPIRED`), inactive user rejection.
   - `rbac_middleware`: strict shed isolation, worker restriction enforcement, admin bypass.
   - `services`: RFC 4180 CSV export with quotation escaping and flock harvest metric reconciliation.

---

## 🚢 Production Deployment & Containers

To deploy the entire production stack (API + MongoDB) with a single command:

```bash
docker compose up -d --build
```

Refer to [docs/DEPLOYMENT.md](file:///d:/Poultary%20Farm/docs/DEPLOYMENT.md) for automated nightly MongoDB backup scripts, disaster recovery restore commands, Nginx reverse proxy configuration, and EAS build instructions for compiling standalone Android `.apk` files.

---

## 📚 Complete Documentation Index

- [Architecture & Sync Engine](file:///d:/Poultary%20Farm/docs/ARCHITECTURE.md)
- [REST API Specifications](file:///d:/Poultary%20Farm/docs/API.md)
- [Data Model & ER Diagram](file:///d:/Poultary%20Farm/docs/DATA_MODEL.md)
- [User Guide (Roman Urdu & English)](file:///d:/Poultary%20Farm/docs/USER_GUIDE.md)
- [Assumptions & Business Rules](file:///d:/Poultary%20Farm/docs/ASSUMPTIONS.md)
- [Deployment & Operations](file:///d:/Poultary%20Farm/docs/DEPLOYMENT.md)
- [QA Verification Checklist](file:///d:/Poultary%20Farm/docs/QA_CHECKLIST.md)
- [Automated Test Report](file:///d:/Poultary%20Farm/docs/TEST_REPORT.md)
