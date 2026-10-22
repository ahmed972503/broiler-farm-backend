# Architectural & Business Assumptions

This document records sensible defaults, domain decisions, and architectural choices made for the Broiler Farm Management System (Pakistan 5-Shed Broiler Operation).

## 1. Domain & Farm Operations (Broiler in Pakistan)

- **Currency**: All monetary values are in **Pakistani Rupee (PKR, Rs.)**.
- **Standard Feed Bag Weight**: Default bag weight is **50.0 kg**, configurable in farm settings.
- **Language**: Bilingual system supporting **English** and **Roman Urdu** (defaulting to Roman Urdu for worker views).
  - Common terminology:
    - _Mortality_: Murda Choozay / Mout
    - _Cull_: Kamzor Choozay / Zaya
    - _Feed_: Daana / Khorak
    - _Water_: Paani
    - _Temperature_: Darja Hararat
    - _Litter_: Bichauna (Dry / Khushk, Normal, Wet / Geela)
    - _Vaccine_: Teeka / Vaccine
    - _Weight_: Wazan (in Grams)
    - _Sale_: Murghi Farokht
    - _Expense_: Kharcha
- **Standard Broiler Target Curve (⚠️ Requires Veterinary Verification)**:
  > _Veterinary Notice: Cobb 500 and Ross 308 weight standards represent reference genetic potential. Actual flock targets must be verified and adjusted by a registered poultry veterinarian according to local feed formulation and housing ventilation._
  - Cobb 500 / Ross 308 standards:
    - Day 7: 185g
    - Day 14: 475g
    - Day 21: 950g
    - Day 28: 1550g
    - Day 35: 2200g
    - Day 42: 2850g
- **Vaccination Standard Broiler Schedule (⚠️ Requires Veterinary Verification)**:
  > _Veterinary Notice: The pre-configured 42-day vaccination schedule is an empirical baseline for commercial broiler sheds in Pakistan. All vaccine types, brands, routes, and timing MUST be verified by a qualified poultry veterinarian in accordance with maternal antibody titer profiles and regional epidemiological alerts._
  - Day 1: ND + IB (Spray / Eye drop at hatchery/day 1)
  - Day 7: ND Lasota / Clone (Eye drop / Drinking water)
  - Day 11: IBD / Gumboro Mild (Drinking water with skimmed milk stabilizer)
  - Day 18: IBD Intermediate Plus Booster (Drinking water)
  - Day 22: ND Booster (Lasota in drinking water)
  - Day 28: Hydropericardium / Angara Disease vaccine (Subcutaneous injection, if indicated)

## 2. Roles & Permissions (RBAC)

- **Admin**:
  - Full CRUD on Sheds, Batches, Daily Records (including unlock), Weights, Vaccines, Feed, Inventory, Expenses, Sales, Staff, Reports, Users, Farm Settings.
  - Oversees all 5 sheds directly, with dedicated focus on Shed 5.
- **Worker**:
  - Fixed assignment to a single shed (Shed 1 to 4).
  - Can view their shed's active batch details.
  - Can submit and update today's daily record for their shed.
  - Can view and mark assigned vaccination tasks done.
  - Can record weekly sample weights.
  - **Strictly Restricted**: Workers cannot view finances, profit/loss, expenses, sales, other sheds, or manage users/settings. Enforced on both backend API middleware and frontend UI guards.

## 3. Daily Record Locking

- Daily record entries are allowed for the current calendar day.
- At end of day (or on subsequent dates), records become locked (`isLocked: true`) to maintain audit integrity.
- Admin has an explicit unlock action (`POST /api/daily-records/:id/unlock`) with audit logging.

## 4. Offline Sync & Conflict Resolution

- **Sync Model**: Offline-first client write queue.
- **Local Storage**: Local SQLite database on native platforms (Android/iOS) with LocalStorage/IndexedDB fallback on Web.
- **Queue**: Every mutation creates a SyncQueue item with unique client UUID, entity type, action (CREATE/UPDATE/DELETE), payload, and timestamp.
- **Resolution Policy**: **Last-Write-Wins (LWW)** based on client/server timestamps, accompanied by an immutable `AuditLog` entry detailing actor, previous state, and new state.
- If an entity was deleted on server, client updates fail gracefully with an audit log conflict notification rather than reviving orphaned records.

## 5. Business Formulas & Calculations

- **Mortality %**:
  $$\text{Mortality \%} = \frac{\text{Placed} - \text{Birds Remaining}}{\text{Placed}} \times 100$$
- **Birds Remaining**:
  $$\text{Birds Remaining} = \text{Placed} - \text{Cumulative Mortality} - \text{Culls} - \text{Birds Sold}$$
- **FCR (Feed Conversion Ratio)**:
  $$\text{FCR} = \frac{\text{Total Feed Consumed (kg)}}{\text{Total Live Weight (kg)}}$$
  _(For active batches, live weight is estimated by $\text{Birds Remaining} \times \frac{\text{Average Sample Weight (g)}}{1000}$. For closed batches, live weight is the actual total kg sold + remaining)_
- **Cost per kg**:
  $$\text{Cost per kg} = \frac{\text{Total Batch Cost}}{\text{Total Live Weight Sold (kg)}}$$
- **Profit**:
  $$\text{Profit} = \text{Total Sales} - \text{Total Batch Expenses}$$
- **Livability %**:
  $$\text{Livability \%} = 100 - \text{Mortality \%} = \frac{\text{Birds Remaining} + \text{Birds Sold}}{\text{Placed}} \times 100$$
- **EPEF (European Production Efficiency Factor)**:
  $$\text{EPEF} = \frac{\text{Livability \%} \times \text{Average Live Weight (kg)}}{\text{Age in Days} \times \text{FCR}} \times 100$$
- Edge cases: When denominators are 0 (e.g., zero birds sold, age = 0, weight = 0), formulas safely return 0 without throws or NaN.
