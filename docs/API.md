# API Reference: Broiler Farm Management System

Base URL: `http://localhost:5000/api`

All requests expecting or returning data use `Content-Type: application/json`.
Protected routes require the `Authorization: Bearer <accessToken>` header.

---

## 1. Authentication & Users (`/api/auth`)

### `POST /api/auth/login`

- **Access**: Public
- **Body**: `{ "username": "admin", "password": "password123" }`
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
        "role": "admin",
        "mustChangePassword": true
      }
    }
  }
  ```

### `POST /api/auth/refresh`

- **Access**: Public
- **Body**: `{ "refreshToken": "eyJhbGciOi..." }`

### `POST /api/auth/logout`

- **Access**: Authenticated

### `GET /api/auth/me`

- **Access**: Authenticated
- **Returns**: Current user session and assigned shed details.

### `POST /api/auth/users`

- **Access**: Admin only
- **Body**: `{ "username": "worker2", "password": "...", "name": "...", "phone": "...", "role": "worker", "assignedShedId": "..." }`
- Note: New users are always created with `mustChangePassword: true`.

---

## 2. Daily Records & Shift Merging (`/api/daily-records`)

### `POST /api/daily-records`

- **Access**: Authenticated (Workers for assigned shed, Admin for all sheds)
- **Body**:
  ```json
  {
    "batchId": "65f0b...",
    "shedId": "65f0a...",
    "date": "2026-03-01",
    "shift": "day",
    "feedUsedDayShiftBags": 4,
    "feedUsedNightShiftBags": 0,
    "openingFeedStockBags": 50,
    "feedReceivedBags": 0,
    "feedTransferredOutBags": 0,
    "closingFeedStockBags": 46,
    "feedRemarks": "Day shift normal",
    "mortalityDayShift": 2,
    "mortalityDayCause": "Heat stress",
    "mortalityNightShift": 0,
    "mortalityNightCause": "",
    "culls": 0,
    "customColumnES": 12,
    "waterLiters": 600,
    "minTemp": 24.5,
    "maxTemp": 31.0,
    "litterCondition": "dry"
  }
  ```
- **Shift Merging**: When a record for this batch, shed, and date already exists, submitting a `"night"` shift atomically updates nighttime metrics without overwriting daytime metrics, and updates 24h totals and cumulative balances.

### `GET /api/daily-records`

- **Access**: Authenticated (Workers see only their shed)
- **Query Params**: `batchId`, `shedId`, `startDate`, `endDate`

### `POST /api/daily-records/:id/unlock`

- **Access**: Admin only
- **Body**: `{ "reason": "Admin approved correction" }`

---

## 3. Feed Lending & Transfers (`/api/transfers`)

### `POST /api/transfers`

- **Access**: Authenticated
- **Body**:
  ```json
  {
    "date": "2026-03-01",
    "partyName": "Star Feed Dealers",
    "transferType": "received",
    "feedBrand": "Star Feed",
    "feedType": "starter",
    "bagCount": 100,
    "notes": "100 bags borrowed until harvest"
  }
  ```
- `transferType`: `"received"` (borrowed from party) | `"given"` (lent to party).

### `GET /api/transfers`

- **Access**: Authenticated
- **Query Params**: `partyName`, `transferType`, `startDate`, `endDate`

### `GET /api/party-ledger`

- **Access**: Authenticated
- **Returns**: Running balance per party in bags:
  ```json
  {
    "success": true,
    "data": [
      {
        "partyName": "Star Feed Dealers",
        "bagsReceived": 200,
        "bagsGiven": 50,
        "netBalanceBags": 150
      }
    ]
  }
  ```

---

## 4. Catching (Lifting) & Sales (`/api/sales`)

### `POST /api/sales`

- **Access**: Admin only
- **Body**:
  ```json
  {
    "batchId": "65f0b...",
    "shedId": "65f0a...",
    "lotNumber": 1,
    "buyerName": "Haji Aslam Chicken Merchant",
    "buyerPhone": "0300-1234567",
    "date": "2026-04-12",
    "totalLiveWeightKg": 3475,
    "averageWeightKg": 2.25,
    "birdsSold": 1544,
    "isManualBirdCountOverride": false,
    "overrideReason": null,
    "ratePerKg": 420,
    "amountPaid": 1000000,
    "vehicleNo": "LES-1234"
  }
  ```
- **Auto Bird Computation**: `birdsSold` = `round(totalLiveWeightKg / averageWeightKg)`.
- If `isManualBirdCountOverride` is `true`, `overrideReason` is mandatory.

### `GET /api/sales/consistency/:batchId`

- **Access**: Authenticated
- **Returns**: Live reconciliation: `Placed - Cumulative Mortality - Lifted = Remaining Birds`:
  ```json
  {
    "success": true,
    "data": {
      "chicksPlaced": 19888,
      "totalMortality": 1894,
      "totalLifted": 2759,
      "expectedRemaining": 15235,
      "reportedRemaining": 15235,
      "difference": 0,
      "isConsistent": true,
      "warning": null
    }
  }
  ```

### `POST /api/sales/payment`

- **Access**: Admin only
- **Body**: `{ "saleId": "...", "amount": 459500, "date": "2026-04-15", "paymentMethod": "cash" }`

---

## 5. Daily Medicine & Vaccination Sheet (`/api/medicines`)

### `GET /api/medicines/autocomplete-names`

- **Access**: Authenticated
- **Returns**: Distinct previously logged medicine and supplement names for search and chip autocomplete.

### `GET /api/medicines/yesterday/:shedId`

- **Access**: Authenticated
- **Returns**: Yesterday's logged medicines for 1-tap pre-fill ("Copy yesterday's list / Ditto").

### `POST /api/medicines/daily-sheet`

- **Access**: Authenticated
- **Body**:
  ```json
  {
    "batchId": "65f0b...",
    "shedId": "65f0a...",
    "date": "2026-03-05",
    "items": [
      {
        "name": "Vitamin AD3E",
        "category": "vitamins",
        "quantity": "200",
        "unit": "ml",
        "cost": 850
      },
      {
        "name": "Electrolyte Power",
        "category": "electrolytes"
      }
    ]
  }
  ```

---

## 6. Reports & Paper Register Exports (`/api/reports`)

### `GET /api/reports/weekly-summary/:batchId`

- **Access**: Authenticated
- **Returns**: Weeks 1–6 flock performance table matching notebook layout, with TRUE FCR and Farm method clearly separated:
  - `totalChicks`, `remainingChicks`, `weeklyFeedBags`, `totalFeedBags`, `weeklyMortality`, `totalMortality`, `averageWeightGrams`, `totalWeightKg`
  - `trueFCR`: `totalFeedKg / totalLiveWeightKg` (e.g. 1.45 at Week 5)
  - `farmMethodWeightPerBag`: `totalLiveWeightKg / totalFeedBags` (e.g. 62.68 at Week 1).

### `GET /api/reports/weekly-summary/csv?batchId=...`

- **Access**: Authenticated
- **Returns**: Downloadable CSV of the Weekly Flock Summary in paper register columns.

### `GET /api/reports/daily-register/:batchId`

- **Access**: Authenticated
- **Returns**: 45-day daily sheet in the exact 16-column paper register order including custom "E.S" column.

### `GET /api/reports/daily-register/csv?batchId=...`

- **Access**: Authenticated
- **Returns**: Downloadable CSV of the Daily Register.

---

## 7. Historical CSV Import (`/api/import-history`)

### `POST /api/import-history`

- **Access**: Admin only
- **Body**:
  ```json
  {
    "csvText": "date,dayNumber,openingFeedStockBags,feedUsedDayBags,feedUsedNightBags,closingFeedStockBags,openingBirds,mortalityDay,mortalityNight,closingBirds,esColumnValue\n2026-03-01,1,100,4,4,92,19888,10,8,19870,5"
  }
  ```
- **Returns**: `{ "totalRows": 1, "importedRecords": 1, "errors": [] }`.

---

## 8. Offline Synchronization (`/api/sync`)

### `POST /api/sync`

- **Access**: Authenticated
- **Body**:
  ```json
  {
    "clientTimestamp": "2026-03-01T12:00:00.000Z",
    "mutations": [
      {
        "clientMutationId": "mut-uuid-1",
        "entityType": "DAILY_RECORD",
        "action": "CREATE",
        "payload": { ... },
        "clientTimestamp": "2026-03-01T12:00:00.000Z"
      }
    ]
  }
  ```
- **Response**: `{ "processedMutations": ["mut-uuid-1"], "failedMutations": [], "conflicts": [] }`.
