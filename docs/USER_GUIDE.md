# Broiler Farm Management System - User Guide (صارف رہنمائی)

---

# Part 1: Worker Guide (شیڈ ورکر کے لیے رہنمائی - Roman Urdu)

Ye application khas tor par poultry farm ke workers ke liye banai gayi hai taake kam se kam waqt (60 seconds se kam) mein daily entry mukammal ki ja sakay, chahay shed mein internet ho ya bilkul na ho.

### 1. App Mein Login Kaise Karein (لاگ اِن کرنے کا طریقہ)

1. App open karein.
2. Apna **Username** (maslan: `worker1`) aur **Password** darj karein.
   - Demo ke liye screen par **"Demo Worker 1"** ka green button dabayein.
3. **Login** button par click karein.
4. Apni zaban tabdeel karne ke liye ooper diye gaye **"Roman Urdu"** ya **"English"** toggle par click kar sakte hain.

---

### 2. Rozana Khata Entry (Daily Entry < 60 Seconds)

Har roz subha ya sham ko sirf 1 minute mein apne shed ka record darj karein:

1. Login hone ke baad **"Aaj Ka Khata (Today)"** screen nazar aayegi.
2. Bada green button dabayein: **"Rozana Khata Darj Karein (Add Daily Entry)"**.
3. Form mein mandarja zail cheezain likhein:
   - **Mout (Mortality)**: Aaj marne walay choozon ki tadad (agar koi nahi mara to 0 likhein).
   - **Mout Ki Wajah (Optional)**: Agar koi khas wajah ho (maslan garmi, loose motion, etc.).
   - **Kamzor Choozay (Culls)**: Jo bimar ya naqis choozay alag kiye gaye hon.
   - **Khorak (Feed Bags)**: Aaj kitni borian feed dali gayi (maslan 8 ya 10 borian).
   - **Khorak Ki Qism (Feed Type)**: Starter, Grower, ya Finisher select karein.
   - **Pani (Water Liters - Optional)**: Kitnay liter pani piya gaya.
   - **Kam se kam aur Ziada se ziada Temperature (°C)**: Thermometer ki reading darj karein.
   - **Buraada / Boora Halat (Litter Condition)**: Khushk (Good), Theek (Fair), ya Geela (Wet) select karein.
4. **"Entry Mehfooz Karein (Save Daily Entry)"** dabayein.
5. Entry fauran save ho jayegi!

> **Zaroori Baat (Offline Kaam)**:
> Agar shed mein Wi-Fi ya mobile data nahi hai, to pareshan na hon! Entry aapke phone ke andar mehfooz ho jayegi. Screen ke ooper **"Offline Mode - X Pending Writes"** nazar aayega. Jaise hi aap shed se bahar niklenge aur internet aayega, ye khud-ba-khud server par sync ho jayegi.

---

### 3. Teeka / Vaccine Tasks (Vaccination Tracker)

1. Neechay diye gaye menu se **"Vaccine"** tab par click karein.
2. Yahan aapko apne batch ki tamam vaccines ki tareekh aur din (Age in days) nazar aayengi:
   - **ND + IB** (Day 1 - Spray / Eye Drop)
   - **Gumboro / IBD** (Day 10 & Day 18 - Peenay Ka Pani)
   - **Hydro / ND Booster** (Day 24)
3. Jab aap vaccine pila dein ya laga dein, to **"Mukammal Karein (Mark Done)"** button dabayein. Aapka naam aur waqt record ho jayega.

---

### 4. Wazan Ka Record (Weekly Weight Sampling)

1. Har hafte ke aakhir mein 50 ya 100 choozay pakar kar wazan karein.
2. Menu se **"Wazan (Weight)"** tab par jayein.
3. **Sample Size** (maslan 50 birds) aur **Average Wazan (grams)** darj karein.
4. Target wazan ke sath muqabla karein taake pata chal sakay ke choozay sahi barh rahay hain ya nahi.

---

### 5. Pichla Record (History)

- Pichlay tamam dinon ka record dekhne ke liye **"Tareekh (History)"** tab par click karein. Yahan har din ki mortality, feed consumption, aur temperature ka khata mojood hota hai.

---

# Part 2: Farm Admin / Manager Guide (English)

The Admin web and mobile interface provides real-time oversight of all 5 sheds, flock life cycles, feed inventory, financial ledgers, staff payroll, automated anomaly alerts, and PDF/CSV reporting.

### 1. Admin Dashboard (Command Center)

- **Live Shed Cards**: Instantly view all 5 sheds with flock age (days), current bird count, cumulative mortality %, today's feed consumption, and timestamp of the worker's latest entry.
- **Top Metrics**:
  - Total Active Birds across all 5 sheds.
  - Overall Farm Mortality %.
  - 30-Day Feed Inventory & Burn Rate.
  - Cash Balance, Pending Receivables from Buyers, and Net Profit.
- **Urgent Farm Alerts**: Displays instant red/yellow cards for mortality spikes (>1.0% in 24h), missed worker entries past 6:00 PM, pending vaccines due today, or feed stock below 50 bags.

---

### 2. Flock / Batch Management

- **Placing New Chicks**:
  1. Navigate to **Batches** -> click **+ New Batch**.
  2. Select Shed (Shed 1 to 5), enter batch number, chicks placed count, supplier (e.g., Big Bird, Jadeed), chick rate (PKR), and placement date.
  3. The system automatically initializes the 42-day standard vaccination calendar for this flock.
- **Closing a Batch & Calculating Harvest Metrics**:
  1. Once all birds are sold, click **Close Batch**.
  2. The system computes final flock statistics:
     - Total Feed Consumed (kg) & Final **FCR** (Feed Conversion Ratio).
     - **Cost Per Kg** (Chicks + Feed + Medicine + Electricity + Labour).
     - Total Revenue, Total Cost, and **Net Profit/Loss (PKR)**.
     - **EPEF** (European Production Efficiency Factor) and Livability %.
  3. Once closed, the shed status switches to `cleaning` until disinfected for the next batch.

---

### 3. Feed & Consumables Inventory

- **Feed Purchases**: Record bulk feed deliveries (Starter, Grower, Finisher) with supplier name, bag count, and purchase rate per bag (default: 50.0 kg/bag).
- **Feed Issuance**: Track feed bags moved from central store to Shed 1–5.
- **Stock Reconciliation**: Real-time alerts when physical bags dip below configured threshold (e.g., 50 bags).

---

### 4. Sales & Buyer Accounts (Ledger)

- **Bird Harvest Entry**:
  - Enter Buyer Name, Birds Sold, Total Live Weight (kg), and Rate per kg.
  - _Rate is always manually editable_ to match fluctuating daily poultry mandi market rates.
  - System automatically calculates average bird weight and total amount.
- **Payment Tracking**:
  - Record upfront cash, bank transfers, or credit balance.
  - Running ledger shows exact receivables per buyer with partial payment logging.

---

### 5. Staff Attendance & Payroll

- **Daily Attendance**: Mark staff as Present, Absent, Half Day, or Leave.
- **Advances**: Log cash advances disbursed to workers.
- **Monthly Wages**: System automatically computes gross wages, advance deductions, and net payable wages based on daily wage rates.

---

### 6. Reports & Analytics Export (PDF + CSV)

- Access **Reports** module to generate:
  1. **Batch Performance Report**: Comprehensive flock summary including FCR, EPEF, growth curves, and P&L.
  2. **Shed-wise Comparison**: Side-by-side benchmarking of feed efficiency across Sheds 1 to 5.
  3. **Mortality Trends**: Daily death graphs highlighting disease onset or heat stress.
  4. **Financial Ledger & Profit/Loss**: Exportable to CSV / Excel for farm accounting.
