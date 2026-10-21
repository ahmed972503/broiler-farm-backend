import { AlertThresholds, FarmSettings, VaccinationScheduleItem } from '../types';

export const DEFAULT_FEED_BAG_WEIGHT_KG = 50.0;

/**
 * Standard Cobb 500 / Ross 308 weight for age in days (grams)
 */
export const TARGET_WEIGHTS_BY_DAY: Record<number, number> = {
  0: 42,
  1: 55,
  2: 70,
  3: 88,
  4: 110,
  5: 135,
  6: 160,
  7: 185, // Week 1
  8: 215,
  9: 250,
  10: 290,
  11: 335,
  12: 385,
  13: 440,
  14: 500, // Week 2
  15: 565,
  16: 635,
  17: 710,
  18: 790,
  19: 875,
  20: 965,
  21: 1060, // Week 3
  22: 1160,
  23: 1265,
  24: 1375,
  25: 1490,
  26: 1610,
  27: 1735,
  28: 1860, // Week 4
  29: 1990,
  30: 2125,
  31: 2260,
  32: 2400,
  33: 2540,
  34: 2680,
  35: 2825, // Week 5
  36: 2970,
  37: 3115,
  38: 3260,
  39: 3400,
  40: 3540,
  41: 3680,
  42: 3820  // Week 6
};

/**
 * Standard Broiler Vaccination Schedule for Pakistan
 */
export const STANDARD_BROILER_VACCINATION_SCHEDULE: VaccinationScheduleItem[] = [
  {
    ageInDays: 1,
    vaccineName: 'ND + IB Live (Newcastle + Infectious Bronchitis)',
    route: 'spray',
    notes: 'Coarse spray or eye drop at hatchery / day of arrival. Essential primer.',
    isMandatory: true
  },
  {
    ageInDays: 7,
    vaccineName: 'ND Lasota / Clone 30',
    route: 'eye_drop',
    notes: 'Eye drop preferred for 100% flock uptake; or fresh drinking water with milk stabilizer.',
    isMandatory: true
  },
  {
    ageInDays: 11,
    vaccineName: 'IBD / Gumboro (Intermediate / D78 strain)',
    route: 'drinking_water',
    notes: 'Administer in cool morning water with 2g/L skimmed milk powder.',
    isMandatory: true
  },
  {
    ageInDays: 18,
    vaccineName: 'IBD / Gumboro Booster (Intermediate Plus / 228E)',
    route: 'drinking_water',
    notes: 'Crucial booster against hot strains in endemic zones.',
    isMandatory: true
  },
  {
    ageInDays: 22,
    vaccineName: 'ND Lasota Booster',
    route: 'drinking_water',
    notes: 'Booster for Newcastle Disease protection up to harvest.',
    isMandatory: true
  },
  {
    ageInDays: 28,
    vaccineName: 'Hydropericardium (Angara Disease) Inactivated',
    route: 'injection_sc',
    notes: '0.25ml Subcutaneous injection in neck if endemic in region.',
    isMandatory: false
  }
];

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  mortalitySpikePercentDaily: 0.8, // > 0.8% mortality in a single day
  mortalitySpikePercent3Day: 2.0,  // > 2.0% cumulative in 3 days
  lowFeedStockBags: 20,           // Warning if feed stock drops below 20 bags
  tempMinCelsius: 20.0,           // Broiler comfort range lower limit
  tempMaxCelsius: 34.0,           // Broiler heat stress risk upper limit
  medicineExpiryWarningDays: 30,  // 30 days before medicine expiration
  paymentOverdueDays: 14          // Pending balance overdue warning
};

export const DEFAULT_FARM_SETTINGS: FarmSettings = {
  farmName: 'Al-Barakah Broiler Farm',
  location: 'Okara / Faisalabad Road, Punjab, Pakistan',
  ownerName: 'Muhammad Ahmed',
  phone: '0300-1234567',
  totalSheds: 5,
  defaultFeedBagWeightKg: DEFAULT_FEED_BAG_WEIGHT_KG,
  currency: 'PKR',
  defaultLanguage: 'ur',
  alertThresholds: DEFAULT_ALERT_THRESHOLDS
};

export const FEED_TYPES = ['starter', 'grower', 'finisher'] as const;
export const SHED_STATUSES = ['empty', 'active', 'cleaning'] as const;
export const BATCH_STATUSES = ['active', 'closed'] as const;
export const LITTER_CONDITIONS = ['dry', 'normal', 'wet'] as const;
export const EXPENSE_CATEGORIES = [
  'chicks',
  'feed',
  'medicine',
  'electricity',
  'labour',
  'fuel_generator',
  'transport',
  'maintenance',
  'misc'
] as const;
