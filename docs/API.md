# API Reference: Broiler Farm Management System

Base URL: `http://localhost:5000/api`

All requests expecting or returning data use `Content-Type: application/json`.
Protected routes require the `Authorization: Bearer <accessToken>` header.

---

## 1. Authentication & Users (`/api/auth`)

### `POST /api/auth/login`
- **Access**: Public
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "user": {
        "id": "65f0a...",
        "username": "admin",
        "name": "Haji Muhammad Ahmed",
        "role": "admin"
      }
    }
  }
  ```

### `POST /api/auth/refresh`
- **Access**: Public
- **Body**: `{ "refreshToken": "eyJhbGciOi..." }`
- **Response `200 OK`**: `{ "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }`

### `POST /api/auth/logout`
- **Access**: Authenticated

### `GET /api/auth/me`
- **Access**: Authenticated
- **Returns**: Current user session and assigned shed details.

### `POST /api/auth/users`
- **Access**: Admin only
- **Body**:
  ```json
  {
    "username": "worker2",
    "password": "workerPassword123",
    "name": "Rashid Khan",
    "phone": "03021234567",
    "role": "worker",
    "assignedShedId": "65f0a..."
  }
  ```

### `POST /api/auth/reset-password`
- **Access**: Admin only
- **Body**: `{ "userId": "...", "newPassword": "newSecretPassword" }`

---

## 2. Sheds (`/api/sheds`)

### `GET /api/sheds`
- **Access**: Authenticated (Workers only see their assigned shed)
- **Returns**: Array of sheds with assigned worker and active batch stats.

### `GET /api/sheds/:id`
- **Access**: Authenticated (Workers restricted to assigned shed)

### `POST /api/sheds`
- **Access**: Admin only
- **Body**: `{ "name": "Shed 1", "shedNumber": 1, "capacity": 5000, "status": "active" }`

### `PUT /api/sheds/:id`
- **Access**: Admin only

---

## 3. Batches / Flocks (`/api/batches`)

### `GET /api/batches`
- **Query Params**: `status=active|closed`, `shedId=...`
- **Access**: Authenticated

### `GET /api/batches/:id`
- **Access**: Authenticated (Workers restricted to their shed's flock)

### `POST /api/batches`
- **Access**: Admin only
- **Description**: Places a new flock in an empty shed. Computes initial chick cost and auto-instantiates vaccination tasks.
- **Body**:
  ```json
  {
    "batchNumber": "FLOCK-S1-2026-02",
    "shedId": "65f0a...",
    "chicksPlaced": 5000,
    "placementDate": "2026-03-01",
    "expectedCloseDate": "2026-04-08",
    "supplier": "Jadeed Chicks",
    "breed": "Cobb 500",
    "chickRate": 115
  }
  ```

### `POST /api/batches/:id/close`
- **Access**: Admin only
- **Description**: Harvests flock, computes FCR, mortality %, net profit, cost per kg, and sets shed to `cleaning`.
- **Body**:
  ```json
  {
    "closedAt": "2026-04-05",
    "finalMortalityAdjustment": 10,
    "finalCullsAdjustment": 2,
    "notes": "Flock lifted successfully"
  }
  ```

---

## 4. Daily Records (`/api/daily-records`)

### `GET /api/daily-records`
- **Query Params**: `batchId=...`, `shedId=...`, `date=YYYY-MM-DD`

### `GET /api/daily-records/today/:shedId?`
- **Access**: Authenticated (Worker receives today's record for their shed)

### `POST /api/daily-records`
- **Access**: Authenticated (Workers can only submit for their assigned shed)
- **Body**:
  ```json
  {
    "batchId": "65f0a...",
    "shedId": "65f0a...",
    "date": "2026-03-15",
    "mortalityCount": 4,
    "mortalityCause": "Heat stress",
    "culls": 1,
    "feedUsedBags": 8.5,
    "feedType": "grower",
    "waterLiters": 650,
    "minTemp": 24.5,
    "maxTemp": 31.0,
    "litterCondition": "normal",
    "notes": "Birds active, drinking well"
  }
  ```

### `PUT /api/daily-records/:id`
- **Access**: Authenticated (Only allowed for same-day unless unlocked by admin)

### `POST /api/daily-records/:id/unlock`
- **Access**: Admin only
- **Body**: `{ "reason": "Worker corrected counting error" }`

---

## 5. Weight Growth Tracking (`/api/weights`)

### `GET /api/weights`
- **Query Params**: `batchId=...`, `shedId=...`

### `POST /api/weights`
- **Body**:
  ```json
  {
    "batchId": "65f0a...",
    "shedId": "65f0a...",
    "date": "2026-03-21",
    "ageInDays": 21,
    "sampleSize": 50,
    "averageWeightGrams": 1060,
    "notes": "Sample weighed randomly across shed"
  }
  ```

---

## 6. Vaccinations & Medicines (`/api/vaccinations`)

### `GET /api/vaccinations/templates`
### `GET /api/vaccinations/tasks`
- **Query Params**: `batchId=...`, `shedId=...`, `status=pending|completed`

### `POST /api/vaccinations/tasks/:id/complete`
- **Body**: `{ "completedAt": "2026-03-08", "notes": "Administered in cool morning water" }`

### `POST /api/vaccinations/medicines`
- **Body**:
  ```json
  {
    "batchId": "...",
    "shedId": "...",
    "date": "2026-03-10",
    "medicineName": "Colistin Sulfate",
    "dosage": "1g per 2L water",
    "reason": "Enteritis",
    "withdrawalPeriodDays": 3
  }
  ```

---

## 7. Feed Management (`/api/feed`)

### `GET /api/feed/stock`
- Returns warehouse bags and kg live stock for Starter, Grower, and Finisher.

### `POST /api/feed/purchases`
- **Access**: Admin only
- **Body**: `{ "supplier": "National Feeds", "date": "2026-03-01", "feedType": "starter", "bags": 100, "ratePerBag": 4200, "amountPaid": 420000 }`

### `POST /api/feed/issues`
- **Access**: Admin only
- **Body**: `{ "date": "2026-03-02", "shedId": "...", "batchId": "...", "feedType": "starter", "bags": 10 }`

### `GET /api/feed/reconciliation`
- **Access**: Admin only
- Returns issued bags vs consumed bags with discrepancy variance.

---

## 8. Expenses (`/api/expenses`)

### `GET /api/expenses`
- **Access**: Admin only (Workers return 403 Forbidden)
- **Query Params**: `batchId=...`, `category=...`, `startDate=...`, `endDate=...`

### `POST /api/expenses`
- **Access**: Admin only
- **Body**: `{ "category": "electricity", "amount": 45000, "date": "2026-03-10", "description": "WAPDA Bill" }`

---

## 9. Sales & Buyers (`/api/sales`)

### `GET /api/sales`
- **Access**: Admin only (Workers return 403 Forbidden)

### `POST /api/sales`
- **Access**: Admin only
- **Body**:
  ```json
  {
    "batchId": "...",
    "shedId": "...",
    "buyerName": "Haji Aslam Chicken Merchant",
    "date": "2026-04-05",
    "birdsSold": 2500,
    "totalLiveWeightKg": 5500,
    "ratePerKg": 385,
    "amountPaid": 1500000
  }
  ```

### `POST /api/sales/payment`
- **Access**: Admin only
- Records installment payment from buyer and reduces balance.

---

## 10. Offline Synchronization (`/api/sync`)

### `POST /api/sync`
- **Access**: Authenticated
- **Description**: Idempotent batch ingestion endpoint for offline client mutations.
- **Body**:
  ```json
  {
    "deviceId": "android-worker-phone-1",
    "userId": "65f0a...",
    "items": [
      {
        "clientMutationId": "c8d62638-3482-4f3a-9e12-b1b51db8f801",
        "entityType": "DAILY_RECORD",
        "action": "CREATE",
        "payload": { "mortalityCount": 4, "feedUsedBags": 8 },
        "clientTimestamp": "2026-03-15T18:00:00.000Z"
      }
    ]
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "processedCount": 1,
    "results": [
      { "clientMutationId": "c8d62638-3482-4f3a-9e12-b1b51db8f801", "serverId": "65f0b...", "status": "synced" }
    ],
    "serverTimestamp": "2026-03-15T18:00:02.124Z"
  }
  ```

---

## 11. Reports & Exports (`/api/reports`)

### `GET /api/reports/batch/:id`
- Returns full performance metrics, FCR, cost per kg, and daily tables.

### `GET /api/reports/batch/:id/csv`
- Returns downloadable CSV attachment containing all daily logs.

### `GET /api/reports/sheds`
- Comparative performance across all 5 sheds.

### `GET /api/reports/feed`
### `GET /api/reports/expenses`
### `GET /api/reports/sales`
### `GET /api/reports/wages?month=YYYY-MM`
