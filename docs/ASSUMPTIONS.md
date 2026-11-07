# Architectural & Business Assumptions

This document records domain decisions, architectural choices, and operational assumptions made for the Broiler Farm Management System (Pakistan 5-Shed Broiler Operation with ~19,900 chicks per flock).

---

## 1. Domain & Farm Operations (Pakistan Broiler Farm Context)

- **Currency**: All monetary values are in **Pakistani Rupee (PKR, Rs.)**.
- **Standard Feed Bag Weight**: Default bag weight is **50.0 kg**, configurable in farm settings.
- **Language**: Bilingual system supporting **English** and **Roman Urdu** (defaulting to Roman Urdu for worker views to ensure complete daily entries in <60 seconds).
  - Common terminology:
    - _Mortality_: Murda Choozay / Mout (separate Day and Night shift counts)
    - _Cull_: Kamzor Choozay / Zaya
    - _Feed_: Daana / Khorak (bags in Day and Night shifts)
    - _Water_: Paani (Liters)
    - _Temperature_: Darja Hararat (Min / Max Celsius)
    - _Litter_: Bichauna (Dry / Khushk, Normal, Wet / Geela)
    - _Vaccine_: Teeka / Vaccine
    - _Weight_: Wazan (Sampled in Grams)
    - _Sale / Catching_: Murghi Farokht / Gari Bharai
    - _Expense_: Kharcha
- **Standard Broiler Target Curve (⚠️ Requires Veterinary Verification)**:
  > _Veterinary Notice: Cobb 500 and Ross 308 weight standards represent reference genetic potential. Actual flock targets must be verified and adjusted by a registered poultry veterinarian according to local feed formulation and housing ventilation._
  - Cobb 500 / Ross 308 reference standards:
    - Day 7: 185g
    - Day 14: 475g
    - Day 21: 950g
    - Day 28: 1550g
    - Day 35: 2200g
    - Day 42: 2850g
- **Vaccination Schedule (⚠️ Requires Veterinary Verification)**:
  > _Veterinary Notice: The pre-configured 42-day vaccination schedule is an empirical baseline for commercial broiler sheds in Pakistan. All vaccine types, brands, routes, and timing MUST be verified by a qualified poultry veterinarian in accordance with maternal antibody titer profiles and regional epidemiological alerts._
  - Day 1: ND + IB (Spray / Eye drop at hatchery/day 1)
  - Day 7: ND Lasota / Clone (Eye drop / Drinking water)
  - Day 11: IBD / Gumboro Mild (Drinking water with skimmed milk stabilizer)
  - Day 18: IBD Intermediate Plus Booster (Drinking water)
  - Day 22: ND Booster (Lasota in drinking water)
  - Day 28: Hydropericardium / Angara Disease vaccine (Subcutaneous injection, if indicated)

---

## 2. Real-World Paper Register Mirroring

### 2.1 Daily Register (Rozana Khata - 16 Columns)

The farm maintains a 45-day paper register with 16 columns:

1. Date
2. Day Number (1–45)
3. Opening Feed Stock (bags)
4. Feed Used DAY Shift (bags)
5. Feed Used NIGHT Shift (bags)
6. 24h Feed Total (bags = DAY + NIGHT)
7. Cumulative Feed (bags)
8. Closing Feed Stock (bags)
9. Opening Birds
10. Mortality DAY Shift (count + cause)
11. Mortality NIGHT Shift (count + cause)
12. 24h Mortality Total (count = DAY + NIGHT)
13. Cumulative Mortality
14. Closing Birds
15. Custom Column ("E.S")
16. Feed In/Out Remarks (text notes, e.g. "5 bags Star Feed borrowed from Shed 2")

### 2.2 Day and Night Shift Merging Without Overwrite

Day and night entries are frequently submitted by different shift workers from separate mobile devices. The backend and offline sync service merge shift metrics atomically:

- A day-shift submission (`shift: "day"`) records daytime feed and mortality without zeroing out nighttime fields.
- A night-shift submission (`shift: "night"`) records nighttime feed and mortality without clearing daytime entries.
- The 24h totals and cumulative balances are dynamically reconciled from both shifts.

### 2.3 Daily Stock Reconciliation & Shortage Alerts

Closing stock must equal:
$$\text{Expected Closing Stock} = \text{Opening Stock} - \text{Total Feed 24h} + \text{Feed Received} - \text{Feed Transferred Out}$$
If the reported physical closing stock is less than expected, the app flags a `Stock Shortage Alert` (`⚠️ Khurak Ki Kami`) with the exact bag shortage.

---

## 3. Key Finding: Farm Legacy "F.C.R" vs TRUE FCR

The farm's paper notebooks compute:
$$\text{Farm Legacy Metric} = \frac{\text{Total Live Weight (kg)}}{\text{Total Feed (bags)}}$$
For example, Week 1: $3948.8 \text{ kg} / 63 \text{ bags} = 62.68 \text{ kg/bag}$.
This metric is the **inverse** of scientific FCR and measures kg live bird produced per 50-kg feed bag.

The system explicitly decouples and clearly labels both metrics:

1. **TRUE FCR**:
   $$\text{TRUE FCR} = \frac{\text{Total Feed (kg)}}{\text{Total Live Weight (kg)}}$$
   (Calculated using configurable bag weight, default 50.0 kg. Week 5 is ~1.45, Week 1 is ~0.80).
2. **Farm method (kg/bag)**:
   $$\text{Farm method} = \frac{\text{Total Live Weight (kg)}}{\text{Total Feed (bags)}}$$
   (Displayed clearly as "Farm method (weight kg per feed bag)", eliminating confusion while preserving familiar notebook values).
   **Rule**: The app never mixes TRUE FCR and Farm method under one label.

---

## 4. Unconfirmed Domain Items & Configurable Design

### 4.1 Shed vs. Farm-Level Architecture (Assumption A)

- **Status**: Paper registers did not specify whether notebook pages tracked individual sheds or the entire 5-shed farm.
- **Architectural Solution**:
  - Workers enter data **PER SHED** (Shed 1–4, and Shed 5).
  - Admin has two views:
    1. **Farm-Level Register**: Aggregated sum of all 5 sheds matching the paper notebook format.
    2. **Per-Shed Register**: Detailed breakdown for individual sheds.
  - Configurable **Batch Scope** in Admin Settings:
    - `multi_shed` (default): Single farm-wide flock allocated across multiple sheds.
    - `per_shed`: Independent batch per shed.

### 4.2 "E.S" Column (Assumption B)

- **Status**: The paper register includes a small numeric column labelled "E.S", whose operational meaning is unconfirmed.
- **Architectural Solution**:
  - Admin-configurable optional numeric column:
    - Default label: `"E.S"` (editable by admin).
    - Status: Enable/disable toggle in Settings.
    - Stored per day and per shed.
    - Rendered in daily registers, CSV exports, and PDF printouts.
    - **Excluded from all formulas** (mortality, feed, FCR, P&L) until the admin explicitly assigns an operational meaning.

---

## 5. Feed In/Out Ledger & Bags Running Balance

Farms in Pakistan lend feed to each other in **BAGS**, not cash.

- **Feed Purchases**: Track brand (e.g. Star Feed, Chenab Feed), type (starter, grower, finisher), bag count, and supplier.
- **Feed Transfers**: Track feed lent to or borrowed from neighboring farms and individuals.
- **Party Ledger**: Maintains a running bag balance per party:
  $$\text{Net Balance (Bags)} = \text{Bags Received} - \text{Bags Given Out}$$
  - Positive balance: Party owes us feed (`Owes Us`).
  - Negative balance: We owe party feed (`We Owe`).
- Closing stock reconciles all transfers.

---

## 6. Catching (Lifting) Notes & Flock Consistency

Birds are harvested in multiple partial lots over several days:

1. **Auto-Computed Bird Count**:
   $$\text{Birds Sold} = \text{round}\left(\frac{\text{Total Live Weight (kg)}}{\text{Average Bird Weight (kg)}}\right)$$
   Example: $3475 \text{ kg} / 2.25 \text{ kg} = 1544 \text{ birds}$.
   Example: $3111 \text{ kg} / 2.56 \text{ kg} = 1215 \text{ birds}$.
2. **Manual Override**:
   Workers or admin can manually override the computed bird count (e.g. physical crate tally), but must provide a mandatory `overrideReason`.
3. **Flock Consistency Check**:
   $$\text{Expected Remaining} = \text{Chicks Placed} - \text{Cumulative Mortality} - \text{Total Lifted Birds}$$
   The screen displays a live consistency reconciliation card (`Placed - Mortality - Lifted = Remaining`) with tolerance warnings if reported counts deviate.

---

## 7. Medicine & Vaccine Register

Daily medicine entries mirror the farm notebook:

- 4–8 items per day: vitamins, electrolytes, antibiotics, respiratory medicines, acidifiers, and vaccines (e.g. IB, ND killed injection).
- Vaccines and water medications written on the same daily sheet.
- **Autocomplete**: Pre-populates previously used medicine names.
- **"Copy Yesterday's List" (Ditto)**: 1-tap pre-fill from yesterday's sheet, eliminating redundant repetitive entry.
- Clear structural separation between **Scheduled Vaccines** (linked to vaccination protocol) and **Water Medication/Supplements**.

---

## 8. Real Flock 45-Day Fixture & Notebook Typo Resolution

A real-flock test fixture from a 19,888 chick placement across 45 days is implemented in `@broiler/shared` and API test suites:

- **Cumulative Feed (bags) at weeks 1–5**: 63, 210, 436, 729, 1057.
- **Weekly Mortality weeks 1–5**: 144, 79, 84, 447, 1140 (Cumulative 1894 after week 5, 2555 final).
- **Average Weights (grams) weeks 1–5**: 200g, 493g, 883g, 1404g, 2025g.
- **Weekly Feed Typo Resolution**: The paper register listed Week 5 weekly feed as 428 bags, which contradicts the cumulative feed difference ($1057 - 729 = 328$ bags). The app calculates weekly feed dynamically from daily records, correctly producing 328 bags and eliminating notebook arithmetic typos.

---

## 9. Offline-First Storage & Security

- **Local Storage Engine**: `expo-sqlite` with Write-Ahead Logging (WAL) mode is the local database for offline writes and sync queue.
- **Security**:
  - `mustChangePassword: true` is enforced for all seeded and admin-created users.
  - Seed script refuses to execute in production (`NODE_ENV === "production"`).
  - Quick demo login buttons are conditionally compiled only in `__DEV__`.
