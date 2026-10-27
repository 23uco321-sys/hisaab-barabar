// Sector and application configuration for Hisaab Barabar
export const DEFAULT_CONFIG = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: 'Hisaab Barabar',
  sdgTagline: 'UN SDG 8: Decent Work & Economic Growth',
  sectors: {
    construction: {
      id: 'construction',
      name: 'Construction Sector',
      siteName: 'Metro Phase-3 Site (Pier 14-22)',
      description: 'Heavy civil infrastructure, formwork, rebar tying, and site scaffolding.',
      standardShiftHours: 8.0,
      hourlyBaseRate: 120.0, // ₹120.00 / hr
      overtimeMultiplier: 1.5, // 1.5x for OT beyond standard shift
      deductions: {
        pfRate: 0.04, // 4% Building & Construction Workers Welfare Cess / PF
        canteenFixed: 30.0 // ₹30 per shift meal subsidy copay
      },
      fatigueThresholdHours: 10.0, // Single shift > 10h triggers fatigue warning
      maxWeeklyHours: 48.0,
      hazardCategories: [
        'Scaffolding & Fall Risk',
        'Heavy Equipment & Crane Safety',
        'Exposed Electrical Wiring',
        'Excavation Trench Collapse Risk',
        'Heat Exhaustion & Hydration',
        'Missing Safety Harness / PPE'
      ]
    },
    college: {
      id: 'college',
      name: 'College & Campus Services',
      siteName: 'St. Jude Academic Campus',
      description: 'Campus maintenance, chemistry lab sanitation, night security, and facility crews.',
      standardShiftHours: 7.0,
      hourlyBaseRate: 150.0, // ₹150.00 / hr
      overtimeMultiplier: 1.5,
      deductions: {
        pfRate: 0.05, // 5% Campus Staff Welfare Fund
        canteenFixed: 20.0 // ₹20 meal deduction
      },
      fatigueThresholdHours: 9.0, // Single shift > 9h triggers fatigue warning
      maxWeeklyHours: 42.0,
      hazardCategories: [
        'Chemical Vapor & Lab Exhaust Failure',
        'Wet Slippery Floor / Spill',
        'Electrical Panel / High Voltage',
        'Inadequate Night Lighting / Perimeter',
        'Ergonomic Strain / Bulk Material Moving',
        'Broken Emergency Exit / Fire Access'
      ]
    }
  }
};
