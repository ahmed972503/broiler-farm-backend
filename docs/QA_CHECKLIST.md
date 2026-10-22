# Broiler Farm Management System - Manual QA Verification Checklist

This quality assurance document covers comprehensive test scenarios across all 15 modules, offline synchronization edge cases, role-based security boundaries, and responsive multi-platform layout verification.

---

## 1. Authentication & Security (Module 1)

- [x] **TC-AUTH-01**: Admin login with valid credentials (`admin` / `admin123`) navigates to Admin Dashboard.
- [x] **TC-AUTH-02**: Worker login (`worker1` / `worker123`) navigates directly to Worker Today screen.
- [x] **TC-AUTH-03**: Login rejection with incorrect password returns 401 error and clears input.
- [x] **TC-AUTH-04**: JWT tokens securely saved into `expo-secure-store` (mobile) and localStorage (web).
- [x] **TC-AUTH-05**: Token expiration triggers silent refresh via `/api/auth/refresh` without user interruption.
- [x] **TC-AUTH-06**: Admin creates new worker with assigned shed; worker can immediately log in.
- [x] **TC-AUTH-07**: Admin resets worker password; old password fails, new password authenticates.
- [x] **TC-AUTH-08**: Deactivated worker account is immediately blocked from logging in (401).

---

## 2. Shed & Batch Lifecycle (Modules 2 & 3)

- [x] **TC-SHED-01**: All 5 sheds display with correct capacity, assigned worker, and active flock age.
- [x] **TC-BATCH-01**: Admin creates new flock; shed status updates to `active`.
- [x] **TC-BATCH-02**: System blocks creating a second active flock in an already occupied shed.
- [x] **TC-BATCH-03**: Standard broiler vaccination schedule (ND, IB, IBD, Hydro) auto-instantiates on batch creation.
- [x] **TC-BATCH-04**: Batch close computes exact P&L, FCR, EPEF, Cost per Kg, and Livability %.
- [x] **TC-SHED-02**: Closing batch transitions shed status to `cleaning`.

---

## 3. Worker Daily Record & Offline Sync Flow (Module 4)

- [x] **TC-WRK-01**: Worker Today screen displays current shed name, flock age, and big "Add Daily Entry" button.
- [x] **TC-WRK-02**: Worker submits daily entry (Mortality, Feed Bags, Feed Type, Temp, Litter) in <60 seconds.
- [x] **TC-WRK-03**: Completed entry displays green checkmark badge on Today screen.
- [x] **TC-WRK-04**: **Offline Simulation**: Turn off Wi-Fi/Data -> submit entry -> entry saves locally -> banner shows `Offline Mode - 1 Pending Write`.
- [x] **TC-WRK-05**: **Reconnection**: Turn on internet -> tap "Tap to Sync" -> mutation syncs to server -> banner turns green `All changes synced`.
- [x] **TC-WRK-06**: Worker can edit today's entry on the same day.
- [x] **TC-WRK-07**: Past days' entries lock automatically past midnight; worker cannot edit without Admin unlock.
- [x] **TC-WRK-08**: Unsubmitted entry displays yellow warning card: `Missing Today's Entry`.

---

## 4. Role-Based Access Control (RBAC Security)

- [x] **TC-RBAC-01**: Worker 1 assigned to Shed 1 CANNOT view or access Shed 2, 3, 4, or 5 records.
- [x] **TC-RBAC-02**: Worker CANNOT view Financial Dashboard, Expenses, Sales, Profit, or Staff Wages.
- [x] **TC-RBAC-03**: Worker making API call to `/api/expenses` or `/api/sales` is rejected with 403 Forbidden.
- [x] **TC-RBAC-04**: Worker making API call to `/api/daily-records` for another shed is rejected with 403 Forbidden.
- [x] **TC-RBAC-05**: Admin has unrestricted read/write access across all 5 sheds and financial ledgers.

---

## 5. Weight Sampling & Growth Curves (Module 5)

- [x] **TC-WGT-01**: Worker logs weekly sample weighing (sample size, total weight kg).
- [x] **TC-WGT-02**: System computes average weight in grams and compares against Cobb 500 standard curve.
- [x] **TC-WGT-03**: History view plots actual flock growth vs target growth trajectory.

---

## 6. Vaccination & Medication Engine (Module 6)

- [x] **TC-VAC-01**: Worker marks vaccine task completed with a single tap.
- [x] **TC-VAC-02**: Completed task stores worker name, timestamp, and changes status badge to green `Completed`.
- [x] **TC-VAC-03**: Pending vaccine due today or overdue triggers urgent banner on Admin Dashboard.
- [x] **TC-VAC-04**: Admin can edit vaccination templates for future flocks.

---

## 7. Feed Management & Inventory (Modules 7 & 8)

- [x] **TC-FEED-01**: Admin records feed purchase (Starter, Grower, Finisher); stock level increases.
- [x] **TC-FEED-02**: Admin issues feed to Shed 1; warehouse inventory decreases.
- [x] **TC-FEED-03**: Daily worker feed usage reconciles against issued shed inventory.
- [x] **TC-FEED-04**: Warehouse feed dropping below threshold (50 bags) generates `Low Feed Stock` alert.
- [x] **TC-INV-01**: Medicine with expiry date within 30 days triggers `Medicine Expiry` alert.

---

## 8. Expenses, Sales & Buyer Ledgers (Modules 9 & 10)

- [x] **TC-EXP-01**: Admin records expense categorized by Chicks, Feed, Medicine, Electricity, Labour, etc.
- [x] **TC-EXP-02**: Expense linked to a batch accurately updates batch total cost.
- [x] **TC-SALE-01**: Admin logs bird harvest sale; _rate per kg is manually editable_.
- [x] **TC-SALE-02**: System computes total revenue, live weight sold, and average bird weight.
- [x] **TC-SALE-03**: Partial payment updates buyer running balance and sets status to `partial`.
- [x] **TC-SALE-04**: Buyer ledger displays complete chronological payment and delivery history.

---

## 9. Staff Attendance & Payroll (Module 11)

- [x] **TC-STF-01**: Admin logs daily attendance (Present, Absent, Half Day, Leave).
- [x] **TC-STF-02**: Admin logs cash advance disbursed to staff member.
- [x] **TC-STF-03**: Monthly wage summary automatically calculates: `(Present Days * Daily Wage) + (Half Days * 0.5 * Daily Wage) - Advances = Net Payable`.

---

## 10. Admin Dashboard & Anomaly Alerts (Modules 12 & 13)

- [x] **TC-DASH-01**: Live shed cards show age, live birds, mortality %, feed used, and last entry timestamp.
- [x] **TC-DASH-02**: Summary statistics (Active Birds, Mortality %, Feed Stock, Receivables, Net Profit) update in real time.
- [x] **TC-ALRT-01**: Mortality spike (>1.0% in 24 hours) immediately flags critical red alert.
- [x] **TC-ALRT-02**: Missed daily entry after cutoff hour triggers warning alert.
- [x] **TC-ALRT-03**: Admin can click "Resolve" to mark alert investigated.

---

## 11. Reports & Data Exports (Module 14)

- [x] **TC-REP-01**: Admin exports comprehensive Batch Report with FCR, EPEF, and financials.
- [x] **TC-REP-02**: Shed comparison report displays side-by-side performance across Sheds 1–5.
- [x] **TC-REP-03**: CSV export downloads valid RFC 4180 file with escaped commas and quotes.
- [x] **TC-REP-04**: Financial Ledger export opens cleanly in Microsoft Excel / Google Sheets.

---

## 12. Settings, i18n & Aesthetics (Module 15)

- [x] **TC-I18N-01**: Language switch toggles instantly between English and Roman Urdu across all worker screens.
- [x] **TC-THEME-01**: Light / Dark theme toggle smoothly updates background and text color tokens.
- [x] **TC-RESP-01**: Desktop web view displays wide sidebar navigation with responsive layout.
- [x] **TC-RESP-02**: Mobile view provides bottom tabs with large, high-contrast touch targets for farm workers.
