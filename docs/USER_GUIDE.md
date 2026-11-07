# Broiler Farm Management System - User Guide (صارف رہنمائی)

---

# Part 1: Worker Guide (شیڈ ورکر کے لیے رہنمائی - Roman Urdu)

Ye application khas tor par Pakistan ke poultry farm workers ke liye banai gayi hai taake rozana ka khata paper register ki tarah sirf **60 seconds se kam waqt** mein darj ho sakay, chahay shed mein kamzor cellular network ho ya internet bilkul band ho.

---

### 1. App Mein Dakhil Hona (Login Ka Tareeqa)

1. App open karein.
2. Apna **Username** (maslan: `worker1`) aur **Password** likhein.
3. **"Dakhil Hon (Log In)"** button dabayein.
4. **Pehli Dafa Password Badalna**:
   - Company security policy ke mutabiq har naye user ko pehli dafa login par naya password muqarrar karna lazmi hota hai. Apna naya password rakhein aur yaad rakhein.
5. **Zaban Tabdeel Karna (Language Switch)**:
   - Screen ke ooper diye gaye pill button se aap kisi bhi waqt **Roman Urdu** aur **English** ke darmian switch kar sakte hain.

---

### 2. Rozana Khata Entry (45 Din Ka Paper Register - < 60 Seconds)

Paper register ke 16 columns ko mobile screen par aasan aur tez tareeqay se design kiya gaya hai:

#### Step 1: Shift Muntakhab Karein

- **Din Ka Shift (DAY)**: Subah ki shift ka daana aur mortality.
- **Raat Ka Shift (NIGHT)**: Raat ki shift ka daana aur mortality.
- **Poora Din (24h FULL)**: Agar aik hi worker 24 ghantay ka hisab aik sath darj kar raha ho.

> **Aham Baat**: Agar subah ka worker din ka khata darj karta hai aur raat ka worker baad mein raat ka khata bhejta hai, to purana record overwrite nahi hoga balkay dono shifts aapas mein mehfooz tareeqay se jud (merge) jayengi!

#### Step 2: Mortality (Murda Choozay)

- Choozon ki tadad likhein ya tez steppers dabayein: **+1**, **+5**, **-1**.
- Din ya raat ki mout ki wajah (maslan: Garmi, Kamzori, Loose motion).
- Zaya ya kamzor choozay (Culls).

#### Step 3: Khorak (Feed Bags)

- Khorak ki qisam select karein: **Starter**, **Grower**, ya **Finisher**.
- Bags ki tadad likhein ya tez button dabayein (**+1 Bag**, **+5 Bags**, **-1 Bag**).

#### Step 4: Borian Ka Hisab (Stock Reconciliation)

- **Opening Stock**: Subah shed mein kitni borian mojood theen.
- **Aamad (Received)**: Aaj bahir se ya doosre shed se kitni borian aaeen.
- **Di Gaeen (Transferred Out)**: Kisi doosre shed ya farm ko udhar di gaeen borian.
- **Reported Closing Stock**: Aaj sham ko ginti ke baad shed mein bachi hui borian.
- **Shortage Alert (⚠️ Khurak Ki Kami)**: Agar ginti ki bachi hui borian hisab se kam hon, to fauran surkh rang ka alert aayega ke itni borian gayab ya kam hain.

#### Step 5: Paper Register Khas Column ("E.S")

- Agar farm munshi register mein "E.S" column likhta hai, to yahan number darj karein. Yeh number kisi formula ko kharab nahi karega.

#### Step 6: Mahol (Paani, Temp, Bichauna)

- Paani (Litre), Kam se kam aur Ziada se ziada temperature (°C), aur bichauna (Khushk, Mamool, Geela).

#### Step 7: Mehfooz Karein (Save Daily Entry)

- **"✓ Mehfooz Karein (Darj Karein)"** button dabayein.
- Fauran sabz card aayega: **"✓ Mehfooz Ho Gaya! (Bila Internet Phone Mein Safe Hai)"**.

---

### 3. Dawai Aur Teeka (Medicine & Vaccination Sheet)

> ⚠️ **Veterinary Verification Required**:
> Tamam teekay aur dawaiyan registered poultry doctor (veterinary doctor) ke mashwaray aur schedule ke mutabiq istemal karein.

#### A. Scheduled Vaccines (Muqarrar Kardah Teekay)

- Schedule mein har teeka (ND, IB, Gumboro) tareekh aur din ke sath nazar aata hai.
- Vaccine lagane ke baad **"Mark Done"** dabayein.

#### B. Rozana Peenay Ka Paani Dawai (Water Medicines)

- Rozana 4 se 8 items (Vitamins, Electrolytes, Antibiotics, Acidifiers, etc.).
- **Kal Ki List Copy Karein (Ditto Button)**:
  - Agar pichli dawai aaj bhi chal rahi hai, to sirf **"Copy Yesterday (Ditto)"** dabayein; kal ke tamam items khud-ba-khud form mein load ho jayenge!
- **Autocomplete Chips**:
  - Dawai ka naam likhte hi purani istemal shuda dawaiyon ke chips aa jatay hain, jinpar click karke naam foran select ho jata hai.

---

### 4. Gari Bharai / Catching (Lifting Notes)

Jab murghi mandee ya dealer ko farokht karne ke liye gari bhari jaati hai:

1. **Total Wazan (kg)** darj karein (maslan: 3475 kg).
2. **Average Wazan (kg)** darj karein (maslan: 2.25 kg).
3. **Auto Bird Count**:
   - App khud-ba-khud choozon ki tadad nikal legi: $3475 \div 2.25 = 1544 \text{ birds}$.
4. **Manual Override (Agar ginti mukhtalif ho)**:
   - Agar kandon par khoka ginti mukhtalif aayi ho, to **"Manually override bird count?"** switch on karein, sahi tadad likhein, aur wajah (Reason) lazmi darj karein.
5. **Rate per kg**: Mandee ka rate likhein (maslan: Rs. 420/kg). Kul raqam khud calculate ho jayegi.
6. **Flock Reconciliation Card**:
   - Screen par nazar aayega: $\text{Placed} - \text{Mortality} - \text{Lifted} = \text{Remaining Birds}$.

---

# Part 2: Farm Owner & Admin Guide (Laptop & Mobile)

Farm owner ya manager ke liye mukammal command center aur paper-notebook register view:

---

### 1. Rozana Ka 16-Column Paper Register View

- **Menu**: `Reports -> Daily Register (Paper)`
- Laptop aur tablet par paper notebook ke exact columns mein horizontal scrollable table nazar aati hai:
  - _Date, Day #, Op Feed, Feed Day, Feed Night, 24h Feed, Cum Feed, Cls Feed, Op Birds, Mort Day, Mort Night, 24h Mort, Cum Mort, Cls Birds, E.S, Feed Remarks_.
- **Download CSV**: Kisi bhi waqt Excel ya notebook mein print karne ke liye CSV download karein.

---

### 2. Haftawar Flock Summary (Weeks 1–6) & FCR Clarification

- **Menu**: `Reports -> Weekly Summary (FCR)`
- **Aham Tareen Farm Metric**:
  - **TRUE FCR**:
    $$\text{TRUE FCR} = \frac{\text{Total Feed (kg)}}{\text{Total Live Weight (kg)}}$$
    (Standard poultry scientific ratio, default bag 50kg, week 5 target ~1.45–1.55).
  - **Farm method (Legacy Notebook Figure)**:
    $$\text{Farm method} = \frac{\text{Total Live Weight (kg)}}{\text{Total Feed (bags)}}$$
    (Farm notebook ka purana tariqa: har feed ki bori par kitnay kilo murghi paida hui, maslan Week 1 par ~62.7).
  - App dono ko alag alag columns mein dikhati hai taake owner ko koi ghalat fehmi na ho.

---

### 3. Feed Party Ledger (Boriyon Ka Udhar Khata)

- **Menu**: `Reports -> Feed Party Ledger`
- Pakistan mein poultry farms feed cash ke bajaye **boriyon** mein udhar letay aur detay hain.
- Party ledger har party (maslan Star Feed, Chenab Feed, Haji Aslam Farm) ka running hisab dikhata hai:
  - Bags Received, Bags Given Out, aur Net Balance in Bags (**Owes Us** ya **We Owe**).

---

### 4. Purane Flock Ka CSV Import (Historical Data)

- **Menu**: `Reports -> CSV Import History`
- Agar farm ke purane flocks ka paper data Excel mein mojood hai, to text area mein paste karke **"Validate & Import CSV Rows"** dabayein.
- App har row ko check karti hai aur kamyabi se database mein save kar leti hai.

---

### 5. Automated Alerts & Background Sweeps

App mein automated alert background scheduler chalta hai:

1. **Mortality Spike**: Agar 24 ghantay mein 1.0% se ziada murghi mar jaye to foran red alert.
2. **Weekly Mortality**: Agar hafte ki kul mortality 3.5% se barh jaye.
3. **Feed Stock Shortage**: Agar physical stock hisab ke closing stock se kam ho.
4. **Shift Entry Missing**: Agar din ya raat ki shift ka khata time par darj na ho to phone par push reminder notification bheja jata hai.
