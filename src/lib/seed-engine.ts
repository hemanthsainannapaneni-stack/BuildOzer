import { PrismaClient } from '@prisma/client'

// ═══════════════════════════════════════════════════════════════════════
// INDIAN DATA CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const MALE_FIRST_NAMES = [
  'Ravi','Suresh','Mahesh','Rajesh','Anil','Sunil','Naresh','Dinesh','Ramesh','Ganesh',
  'Kiran','Naveen','Pradeep','Srinivas','Venkatesh','Raju','Mohan','Arun','Vijay','Santosh',
  'Gopal','Krishna','Balaji','Shankar','Hari','Devendra','Prakash','Ashok','Ratan','Manoj',
  'Amit','Rahul','Rajender','Narasimha','Upendra','Eswar','Nagaraju','Murali','Sridhar','Subhash',
  'Tarun','Vikram','Vishal','Pavan','Harish','Deepak','Sanjay','Ajay','Bhaskar','Chandra',
  'Dhananjay','Govind','Jagan','Kalyan','Sai Kumar','Padma Rao','Eswara Rao','Manoj Kumar','Suresh Kumar','Ramesh Kumar',
  'Harish Kumar','Ravi Kumar','Rajesh Kumar','Venkat Rao','Naveen Kumar','Pradeep Kumar',
]

const FEMALE_FIRST_NAMES = [
  'Lakshmi','Saraswati','Padma','Kavitha','Sunitha','Anitha','Geetha','Priya','Sridevi','Uma',
  'Kumari','Devi','Rani','Sujatha','Meena','Latha','Bharathi','Vanitha','Nagamani','Sarojini',
  'Pushpa','Kamala','Nirmala','Vijaya','Padmavathi','Parvathi','Savithri','Annapurna','Mahalakshmi','Durga',
  'Sumathi','Bhavani','Jayalakshmi','Kousalya','Srilakshmi','Anjali',
]

const SURNAMES = [
  'Reddy','Sharma','Kumar','Singh','Patel','Rao','Gupta','Verma','Yadav','Naik',
  'Das','Iyer','Nair','Menon','Pillai','Choudhary','Jha','Mishra','Pandey','Tiwari',
  'Kulkarni','Deshmukh','Patil','Gowda','Hegde','Shetty','Kamath','Bhat','Acharya','Prasad',
  'Bhatt','Saxena','Agarwal','Joshi','Ranganathan','Subramanian','Krishnamurthy','Venkatachalam','Iyengar','Rajan',
  'Varma','Nambiar','Panicker','Thampi','Kaimal','Warrier','Murthy','Sastry','Chari','Dikshitulu',
]

const AP_AREAS = [
  'Amaravati','Tadepalli','Mangalagiri','Vijayawada','Guntur','Tenali','Penumaka','Undavalli',
  'Kondaveedu','Thullur','Pedakurapadu','Mangalagiri Tadepalle','Tadikonda','Sattenapalle','Narsaraopet',
  'Guntur Rural','Prathipadu','Bapatla','Repalle','Chilakaluripet','Kakumanu','Ponnur','Chebrolu',
  'Duggirala','Krosuru','Sattenapalle Rural','Machavaram','Arundalpadu','Konduru','Vinukonda',
  'Narasaraopet Rural','Piduguralla','Muppalla','Rajupalem','Karampudi','Bellamkonda','Atchampet',
]

const INDIAN_STATES = [
  'Andhra Pradesh','Telangana','Odisha','West Bengal','Bihar','Uttar Pradesh',
  'Maharashtra','Karnataka','Tamil Nadu','Rajasthan','Madhya Pradesh','Chhattisgarh',
  'Jharkhand','Assam','Kerala','Gujarat','Punjab','Haryana','Uttarakhand',
  'Himachal Pradesh','Jammu & Kashmir','Delhi','Goa','Sikkim','Meghalaya',
  'Tripura','Manipur','Nagaland','Arunachal Pradesh','Mizoram',
]

const OUTSIDE_STATES = INDIAN_STATES.filter(s => s !== 'Andhra Pradesh')

const OUTSIDE_CITIES = [
  { city: 'Hyderabad', state: 'Telangana', pinPrefix: '500' },
  { city: 'Warangal', state: 'Telangana', pinPrefix: '506' },
  { city: 'Bhubaneswar', state: 'Odisha', pinPrefix: '751' },
  { city: 'Kolkata', state: 'West Bengal', pinPrefix: '700' },
  { city: 'Patna', state: 'Bihar', pinPrefix: '800' },
  { city: 'Lucknow', state: 'Uttar Pradesh', pinPrefix: '226' },
  { city: 'Mumbai', state: 'Maharashtra', pinPrefix: '400' },
  { city: 'Pune', state: 'Maharashtra', pinPrefix: '411' },
  { city: 'Bangalore', state: 'Karnataka', pinPrefix: '560' },
  { city: 'Chennai', state: 'Tamil Nadu', pinPrefix: '600' },
  { city: 'Jaipur', state: 'Rajasthan', pinPrefix: '302' },
  { city: 'Bhopal', state: 'Madhya Pradesh', pinPrefix: '462' },
  { city: 'Raipur', state: 'Chhattisgarh', pinPrefix: '492' },
  { city: 'Ranchi', state: 'Jharkhand', pinPrefix: '834' },
  { city: 'Guwahati', state: 'Assam', pinPrefix: '781' },
  { city: 'Thiruvananthapuram', state: 'Kerala', pinPrefix: '695' },
  { city: 'Nagpur', state: 'Maharashtra', pinPrefix: '440' },
  { city: 'Gwalior', state: 'Madhya Pradesh', pinPrefix: '474' },
]

const STREETS = [
  'Main Road','Colony','Nagar','Extension','Layout','Street','Lane','Cross Road',
  'Basti','Ward','Block','Society','Enclave','Habitat','Residency',
]

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
const ZONES = ['A','B','C','D','E']
const SHIFTS = ['6AM-2PM','2PM-10PM','6AM-6PM']

const RELATIONSHIPS = ['Spouse','Father','Mother','Brother','Sister','Friend','Uncle']

const SUPERVISORS = [
  'M. Srinivas Reddy','K. Rajesh Kumar','A. Venkatesh','P. Narasimha Rao',
  'S. Mahesh Babu','V. Ramesh Chary','D. Prakash Rao','G. Sridhar Reddy',
  'N. Anand Kumar','T. Sai Prakash','R. Kalyan Chari','B. Devendra Rao',
]

const DOCTORS = [
  'Dr. A. Ramesh','Dr. K. Lakshmi','Dr. P. Suresh Babu','Dr. V. Padmavathi',
  'Dr. M. Srinivas','Dr. S. Geetha Devi','Dr. N. Ravi Shankar','Dr. B. Annapurna',
]

const HOSPITALS = [
  'ESI Hospital, Vijayawada','Apollo Hospital, Guntur','KIMS Hospital, Amaravati',
  'Care Hospital, Tenali','Govt General Hospital, Guntur','Ramesh Hospital, Vijayawada',
]

const SITE_LOCATIONS: Record<string, string> = {
  'ASM': 'Assembly Area, Amaravati','HC': 'High Court Area, Amaravati','GAD': 'GAD Tower, Secretariat, Amaravati',
  'Z7': 'Zone 7, Amaravati','Z9': 'Zone 9, Amaravati','E3P1': 'E3 Phase 1, Amaravati',
  'E5R': 'E5 Corridor, Guntur','N5': 'N5 Highway, Guntur Dist.','N13': 'N13 Highway, Prakasam Dist.',
}

const FACILITIES = [
  'Transport','Rest/Shelter','Water','Food','Cleanliness',
  'Washrooms','Safety Tools','Waste Disposal','Fire Safety','CCTV','Theft Prevention',
]

const SECURITY_ITEMS = ['PPE Compliance','Barricading','Excavation Safety','Fatal Accident Prevention','Sign Boards']

const MED_INFRA_ITEMS = ['Medical Room','First Aid','Ambulance','Emergency Contacts']

// ═══════════════════════════════════════════════════════════════════════
// DESIGNATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

interface DesigConfig {
  name: string
  category: string
  count: number
  dailyRateRange: [number, number]
  wageCategory: string
  skillLevel: string
  qualWeights: Record<string, number>
  trainingTitles: string[]
}

const DESIG_CONFIGS: DesigConfig[] = [
  { name:'Helper', category:'General', count:70, dailyRateRange:[500,650], wageCategory:'Unskilled', skillLevel:'Unskilled',
    qualWeights:{'Below 10th':60,'10th':30,'Other':10}, trainingTitles:['General Construction Safety'] },
  { name:'Mason', category:'General', count:45, dailyRateRange:[700,900], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'Below 10th':25,'10th':40,'ITI':20,'12th':15}, trainingTitles:['Masonry Work Safety Practices','Scaffold Safety Awareness'] },
  { name:'Electrician', category:'Safety-Critical', count:15, dailyRateRange:[700,850], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'10th':25,'ITI':45,'12th':15,'Diploma':15}, trainingTitles:['Electrical Safety & Lockout/Tagout','Working at Heights - Electrical'] },
  { name:'Plumber', category:'General', count:12, dailyRateRange:[650,780], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'Below 10th':20,'10th':40,'ITI':25,'12th':15}, trainingTitles:['Plumbing Safety & Tool Handling'] },
  { name:'Carpenter', category:'General', count:12, dailyRateRange:[700,880], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'Below 10th':20,'10th':35,'ITI':30,'12th':15}, trainingTitles:['Carpentry Workshop Safety','Scaffold Safety Awareness'] },
  { name:'Welder', category:'Safety-Critical', count:10, dailyRateRange:[750,920], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'10th':20,'ITI':45,'12th':15,'Diploma':20}, trainingTitles:['Welding Safety & Fire Prevention','Fire Safety & Emergency Response'] },
  { name:'Painter', category:'General', count:10, dailyRateRange:[600,720], wageCategory:'SemiSkilled', skillLevel:'SemiSkilled',
    qualWeights:{'Below 10th':25,'10th':40,'ITI':20,'12th':15}, trainingTitles:['Painting & Chemical Safety'] },
  { name:'Fitter', category:'General', count:8, dailyRateRange:[700,850], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'Below 10th':15,'10th':35,'ITI':35,'12th':15}, trainingTitles:['Mechanical Fitting Safety','Tool Safety & Handling'] },
  { name:'Steel Fixer', category:'General', count:12, dailyRateRange:[680,820], wageCategory:'SemiSkilled', skillLevel:'SemiSkilled',
    qualWeights:{'Below 10th':25,'10th':40,'ITI':25,'12th':10}, trainingTitles:['Reinforcement Steel Work Safety','Cutting & Bending Safety'] },
  { name:'Bar Bender', category:'General', count:10, dailyRateRange:[660,800], wageCategory:'SemiSkilled', skillLevel:'SemiSkilled',
    qualWeights:{'Below 10th':25,'10th':40,'ITI':25,'12th':10}, trainingTitles:['Bar Bending Machine Safety','Cutting & Bending Safety'] },
  { name:'Shuttering Carpenter', category:'General', count:10, dailyRateRange:[720,900], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'Below 10th':20,'10th':35,'ITI':30,'12th':15}, trainingTitles:['Formwork & Shuttering Safety','Scaffold Safety Awareness'] },
  { name:'Concreting Worker', category:'General', count:10, dailyRateRange:[620,750], wageCategory:'SemiSkilled', skillLevel:'SemiSkilled',
    qualWeights:{'Below 10th':30,'10th':40,'ITI':15,'12th':15}, trainingTitles:['Concreting & Curing Safety','Working with Wet Concrete'] },
  { name:'Rigger', category:'Safety-Critical', count:6, dailyRateRange:[780,950], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'10th':20,'ITI':45,'12th':15,'Diploma':20}, trainingTitles:['Rigging & Slinging Safety','Working at Heights','Crane Signaling'] },
  { name:'Crane Operator', category:'Safety-Critical', count:4, dailyRateRange:[950,1250], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'10th':15,'ITI':40,'12th':20,'Diploma':25}, trainingTitles:['Crane Operation Safety Certification','Heavy Equipment Safety','Load Calculation & Rigging'] },
  { name:'JCB Operator', category:'Safety-Critical', count:4, dailyRateRange:[900,1200], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'10th':20,'ITI':40,'12th':20,'Diploma':20}, trainingTitles:['JCB/Backhoe Operation Safety','Excavation Safety','Heavy Equipment Safety'] },
  { name:'Dumper Driver', category:'Safety-Critical', count:4, dailyRateRange:[820,1050], wageCategory:'SemiSkilled', skillLevel:'SemiSkilled',
    qualWeights:{'10th':25,'ITI':35,'12th':20,'Diploma':20}, trainingTitles:['Heavy Vehicle Driving Safety','Dump Site Safety Procedures'] },
  { name:'Safety Officer', category:'Supervisory', count:4, dailyRateRange:[1100,1600], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'Diploma':25,'Graduate':50,'ITI':15,'12th':10}, trainingTitles:['POSH Awareness Training','Fire Safety & Emergency Response','Incident Investigation & Reporting','First Aid & CPR Certification'] },
  { name:'Supervisor', category:'Supervisory', count:6, dailyRateRange:[1050,1500], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'12th':15,'ITI':25,'Diploma':35,'Graduate':25}, trainingTitles:['Supervisory Safety Training','Workforce Management & Safety','Incident Investigation & Reporting'] },
  { name:'Surveyor', category:'Supervisory', count:4, dailyRateRange:[950,1300], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'Diploma':35,'Graduate':50,'ITI':15}, trainingTitles:['Surveying Equipment Safety','Total Station Operation Safety'] },
  { name:'QC Inspector', category:'Supervisory', count:4, dailyRateRange:[1050,1550], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'Diploma':25,'Graduate':60,'ITI':15}, trainingTitles:['Quality Control & Safety Standards','Concrete Testing Procedures'] },
  { name:'Site Engineer', category:'Supervisory', count:3, dailyRateRange:[1500,2200], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'Graduate':100}, trainingTitles:['Site Engineering & Safety Management','Construction Management Safety','Advanced Safety Leadership'] },
  { name:'Foreman', category:'Supervisory', count:3, dailyRateRange:[1000,1450], wageCategory:'Skilled', skillLevel:'Skilled',
    qualWeights:{'12th':20,'ITI':25,'Diploma':30,'Graduate':25}, trainingTitles:['Foreman Safety Responsibilities','Workforce Management & Safety','Tool & Equipment Safety'] },
]

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomDigits(n: number): string {
  let s = ''
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10)
  return s
}

function randomPhone(): string {
  const prefixes = ['6','7','8','9']
  return pick(prefixes) + randomDigits(9)
}

function randomAadhaar(): string {
  return randomDigits(12)
}

function randomUAN(): string {
  return randomDigits(12)
}

function computeDOB(age: number): Date {
  const now = new Date()
  return new Date(now.getFullYear() - age, now.getMonth(), randInt(1, 28))
}

function generateAddress(): string {
  if (Math.random() < 0.75) {
    // AP local area (Amaravati region)
    const area = pick(AP_AREAS)
    const street = pick(STREETS)
    const hno = `${randInt(1,50)}-${randInt(1,50)}-${randInt(1,999)}`
    const pin = `522${String(randInt(1,99)).padStart(2,'0')}${String(randInt(1,9))}`
    return `H.No. ${hno}, ${area} ${street}, Amaravati, Andhra Pradesh - ${pin}`
  } else {
    // Outside cities
    const oc = pick(OUTSIDE_CITIES)
    const street = pick(STREETS)
    const hno = `${randInt(1,200)}-${randInt(1,50)}-${randInt(1,999)}`
    const pin = `${oc.pinPrefix}${randomDigits(3)}`
    return `H.No. ${hno}, ${pick(AP_AREAS)} Area, ${street}, ${oc.city}, ${oc.state} - ${pin}`
  }
}

function weightedPick<T extends string>(weights: Record<string, number>): T {
  const entries = Object.entries(weights) as [string, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [key, w] of entries) {
    r -= w
    if (r <= 0) return key as T
  }
  return entries[entries.length - 1][0] as T
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

function monthsAgo(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════

export async function runDemoSeed(db: PrismaClient): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  const t0 = Date.now()

  // ─── STEP 1: DELETE ALL EXISTING DATA ─────────────────────────────
  console.log('[SEED] Clearing existing data...')
  await db.auditLog.deleteMany()
  await db.notification.deleteMany()
  await db.grievance.deleteMany()
  await db.incidentFollowUp.deleteMany()
  await db.incidentWorker.deleteMany()
  await db.incident.deleteMany()
  await db.materialTransaction.deleteMany()
  await db.hazardousMaterial.deleteMany()
  await db.vehicleDocument.deleteMany()
  await db.vehicle.deleteMany()
  await db.attendance.deleteMany()
  await db.insurance.deleteMany()
  await db.wageRecord.deleteMany()
  await db.trainingRecord.deleteMany()
  await db.medicalRecord.deleteMany()
  await db.workerFitness.deleteMany()
  await db.nominee.deleteMany()
  await db.emergencyContact.deleteMany()
  await db.worker.deleteMany()
  await db.systemUser.deleteMany()
  await db.labourCamp.deleteMany()
  await db.siteFacility.deleteMany()
  await db.siteSecurityItem.deleteMany()
  await db.medInfraItem.deleteMany()
  await db.legalCompliance.deleteMany()
  await db.site.deleteMany()
  await db.designation.deleteMany()
  await db.contractor.deleteMany()
  console.log('[SEED] All data cleared.')

  // ─── STEP 2: MASTER DATA ──────────────────────────────────────────
  console.log('[SEED] Creating master data...')

  // Contractors
  const contractorData = [
    { name: 'BSR', code: 'BSR', gstNumber: '37AABCB1234F1Z5', address: 'BSR Constructions, Amaravati, Andhra Pradesh', phone: '9876543210' },
    { name: 'NCC', code: 'NCC', gstNumber: '37AABCN5678G2H6', address: 'NCC Limited, Vijayawada, Andhra Pradesh', phone: '9876543211' },
    { name: 'L&T', code: 'LNT', gstNumber: '37AABCL9012H3I7', address: 'Larsen & Toubro, Guntur, Andhra Pradesh', phone: '9876543212' },
    { name: 'MEIL', code: 'MEIL', gstNumber: '37AABCM3456I4J8', address: 'Megha Engineering, Mangalagiri, Andhra Pradesh', phone: '9876543213' },
    { name: 'RVR', code: 'RVR', gstNumber: '37AABCR7890J5K9', address: 'RVR Infra, Tadepalli, Andhra Pradesh', phone: '9876543214' },
  ]
  const contractors = await Promise.all(contractorData.map(c => db.contractor.create({ data: c })))
  counts.contractors = contractors.length
  console.log(`  Created ${contractors.length} contractors`)

  // Sites
  const siteData = [
    { name: 'Assembly', code: 'ASM', address: 'New Assembly Building, Amaravati' },
    { name: 'High Court', code: 'HC', address: 'High Court Complex, Amaravati' },
    { name: 'GAD Tower', code: 'GAD', address: 'GAD Tower, Secretariat, Amaravati' },
    { name: 'Zone 7', code: 'Z7', address: 'Zone 7, Amaravati Region' },
    { name: 'Zone 9', code: 'Z9', address: 'Zone 9, Amaravati Region' },
    { name: 'E3 Phase 1', code: 'E3P1', address: 'E3 Phase 1, Amaravati' },
    { name: 'E5 Road', code: 'E5R', address: 'E5 Corridor, Guntur' },
    { name: 'N5', code: 'N5', address: 'N5 Highway, Guntur District' },
    { name: 'N13', code: 'N13', address: 'N13 Highway, Prakasam District' },
  ]
  const sites = await Promise.all(siteData.map(s => db.site.create({ data: s })))
  counts.sites = sites.length
  console.log(`  Created ${sites.length} sites`)

  // Designations
  const designations = await Promise.all(
    DESIG_CONFIGS.map(d => db.designation.create({ data: { name: d.name, category: d.category } }))
  )
  const desigMap = new Map(designations.map((d, i) => [DESIG_CONFIGS[i].name, d.id]))
  counts.designations = designations.length
  console.log(`  Created ${designations.length} designations`)

  // Labour Camps (per contractor-site)
  const camps: Array<{ id: string; contractorId: string; siteId: string; name: string }> = []
  for (const c of contractors) {
    for (const s of sites) {
      const id = `camp-${c.code.toLowerCase()}-${s.code.toLowerCase()}`
      camps.push({ id, contractorId: c.id, siteId: s.id, name: `${c.name} Camp - ${s.name}` })
    }
  }
  await db.labourCamp.createMany({ data: camps.map(c => ({
    ...c,
    address: `${pick(AP_AREAS)} Camp Area, Amaravati`,
    capacity: randInt(50, 200),
    currentOccupancy: 0,
  }))})
  counts.labourCamps = camps.length
  console.log(`  Created ${camps.length} labour camps`)

  // System Users
  const users = [
    { username: 'admin', password: 'admin123', fullName: 'System Administrator', role: 'ADMIN' },
    ...sites.map(s => ({
      username: `pmc-${s.code.toLowerCase()}`,
      password: 'pmc123',
      fullName: `PMC Officer - ${s.name}`,
      role: 'PMC' as const,
      siteId: s.id,
    })),
    { username: 'safety-officer', password: 'safety123', fullName: 'K. Ravi Kumar', role: 'SAFETY_OFFICER' },
    { username: 'hr-coordinator', password: 'hr123', fullName: 'L. Padma', role: 'HR_COORDINATOR' },
    { username: 'legal-advisor', password: 'legal123', fullName: 'M. Sharma', role: 'LEGAL_ADVISOR' },
  ]
  await db.systemUser.createMany({ data: users })
  counts.systemUsers = users.length
  console.log(`  Created ${users.length} system users`)

  // Build camp lookup: contractorId-siteId → campId
  const campLookup = new Map<string, string>()
  for (const c of camps) {
    campLookup.set(`${c.contractorId}-${c.siteId}`, c.id)
  }

  // ─── STEP 3: CREATE WORKERS ───────────────────────────────────────
  console.log('[SEED] Creating workers...')
  const totalWorkers = DESIG_CONFIGS.reduce((s, d) => s + d.count, 0)
  console.log(`  Total workers to create: ${totalWorkers}`)

  const workerData: Array<{
    employeeNumber: string; fullName: string; dateOfBirth: Date; age: number;
    gender: string; aadhaarNumber: string; permanentAddress: string;
    bloodGroup: string; qualification: string; designationId: string;
    contractorId: string; siteId: string; zone: string; labourCampId: string;
    reportingSupervisor: string; uanNumber: string; isActive: boolean; nativeState: string;
  }> = []

  let empCounter = 1
  for (const cfg of DESIG_CONFIGS) {
    const desigId = desigMap.get(cfg.name)!
    for (let i = 0; i < cfg.count; i++) {
      // Gender: 80% Male, 20% Female (per user request: male and female only)
      const genderRoll = Math.random() * 100
      const gender = genderRoll < 80 ? 'Male' : 'Female'

      let firstName: string
      if (gender === 'Male') {
        firstName = pick(MALE_FIRST_NAMES)
      } else if (gender === 'Female') {
        firstName = pick(FEMALE_FIRST_NAMES)
      } else {
        firstName = Math.random() < 0.5 ? pick(MALE_FIRST_NAMES) : pick(FEMALE_FIRST_NAMES)
      }

      const surname = pick(SURNAMES)
      const fullName = `${firstName} ${surname}`
      const age = randInt(18, 55)
      const contractor = pick(contractors)
      const site = pick(sites)
      const campId = campLookup.get(`${contractor.id}-${site.id}`)!

      workerData.push({
        employeeNumber: `APCRDA-${String(empCounter).padStart(4, '0')}`,
        fullName,
        dateOfBirth: computeDOB(age),
        age,
        gender,
        aadhaarNumber: randomAadhaar(),
        permanentAddress: generateAddress(),
        bloodGroup: pick(BLOOD_GROUPS),
        qualification: weightedPick<string>(cfg.qualWeights),
        designationId: desigId,
        contractorId: contractor.id,
        siteId: site.id,
        zone: pick(ZONES),
        nativeState: Math.random() < 0.30 ? 'Andhra Pradesh' : pick(OUTSIDE_STATES),
        labourCampId: campId,
        reportingSupervisor: pick(SUPERVISORS),
        uanNumber: randomUAN(),
        isActive: Math.random() < 0.92,
      })
      empCounter++
    }
  }

  await db.worker.createMany({ data: workerData })
  counts.workers = workerData.length
  console.log(`  Created ${workerData.length} workers`)

  // Fetch all workers with IDs
  const allWorkers = await db.worker.findMany({ select: { id: true, employeeNumber: true, contractorId: true, siteId: true } })
  const workerMap = new Map(allWorkers.map(w => [w.employeeNumber, w.id]))
  const workerIds = allWorkers.map(w => w.id)
  console.log(`  Fetched ${allWorkers.length} worker IDs`)

  // Build a lookup: employeeNumber → { contractorId, siteId }
  const workerMetaMap = new Map(allWorkers.map(w => [w.employeeNumber, { contractorId: w.contractorId, siteId: w.siteId }]))

  // ─── STEP 4: EMERGENCY CONTACTS ───────────────────────────────────
  console.log('[SEED] Creating emergency contacts...')
  const emergencyContacts = workerData.map(w => {
    const rel = pick(RELATIONSHIPS)
    const isSpouseOrParent = rel === 'Spouse' || rel === 'Father' || rel === 'Mother'
    return {
      workerId: workerMap.get(w.employeeNumber)!,
      name: isSpouseOrParent ? `${pick(MALE_FIRST_NAMES.length > 0 ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES)} ${pick(SURNAMES)}` : `${pick([...MALE_FIRST_NAMES, ...FEMALE_FIRST_NAMES])} ${pick(SURNAMES)}`,
      relationship: rel,
      phone: randomPhone(),
      isPrimary: true,
    }
  })
  await db.emergencyContact.createMany({ data: emergencyContacts })
  counts.emergencyContacts = emergencyContacts.length

  // ─── STEP 5: NOMINEES ─────────────────────────────────────────────
  console.log('[SEED] Creating nominees...')
  const nominees = workerData.map(w => ({
    workerId: workerMap.get(w.employeeNumber)!,
    name: `${pick([...FEMALE_FIRST_NAMES, ...MALE_FIRST_NAMES])} ${pick(SURNAMES)}`,
    relationship: pick(['Wife','Husband','Father','Mother','Son','Daughter','Brother']),
    idNumber: randomAadhaar(),
    contactNumber: randomPhone(),
  }))
  await db.nominee.createMany({ data: nominees })
  counts.nominees = nominees.length

  // ─── STEP 6: WORKER FITNESS ───────────────────────────────────────
  console.log('[SEED] Creating worker fitness records...')
  const fitnessRecords = workerData.map((w, i) => {
    const cfg = DESIG_CONFIGS.find(c => w.designationId === desigMap.get(c.name))!
    return {
      workerId: workerIds[i],
      fitnessStatus: Math.random() < 0.9 ? 'Fit' : Math.random() < 0.5 ? 'FitWithRestriction' : 'Unfit',
      fitnessValidityDate: daysAgo(-randInt(30, 365)),
      totalExperienceYears: randFloat(1, 25, 1),
      relevantExperienceYears: randFloat(0.5, 20, 1),
      relevantExperienceDesc: `${cfg.name} work in construction industry`,
      priorEmployer: Math.random() < 0.7 ? `${pick(['Ramky','NRD','GVK','Shapoorji','Tata','Simplex','Afcons'])} Constructions` : null,
      skillLevel: cfg.skillLevel,
    }
  })
  await db.workerFitness.createMany({ data: fitnessRecords })
  counts.workerFitness = fitnessRecords.length

  // ─── STEP 7: MEDICAL RECORDS ──────────────────────────────────────
  console.log('[SEED] Creating medical records...')
  const chronicDiseases = ['diabetes','hypertension','asthma','cardiac','none']
  const medicalRecords: Array<{
    workerId: string; examinationDate: Date; examinationType: string;
    examiningDoctor: string; examiningFacility: string; result: string;
    previousHealthIssues: string | null; chronicDiseases: string | null;
    chronicDiseaseNotes: string | null; nextCheckupDate: Date | null;
    checkupFrequencyMonths: number; remarks: string | null;
  }> = []

  for (let i = 0; i < workerData.length; i++) {
    const w = workerData[i]
    const wid = workerIds[i]
    // Pre-employment medical (all workers)
    const diseases = [pick(chronicDiseases)]
    if (diseases[0] !== 'none' && Math.random() < 0.3) diseases.push(pick(chronicDiseases.filter(d => d !== diseases[0])))

    medicalRecords.push({
      workerId: wid,
      examinationDate: daysAgo(randInt(30, 365)),
      examinationType: 'PreEmployment',
      examiningDoctor: pick(DOCTORS),
      examiningFacility: pick(HOSPITALS),
      result: Math.random() < 0.88 ? 'Fit' : Math.random() < 0.5 ? 'Conditional' : 'Unfit',
      previousHealthIssues: JSON.stringify(Math.random() < 0.3 ? [pick(['Back pain','Knee pain','Allergy','Eye strain','Skin allergy'])] : []),
      chronicDiseases: JSON.stringify(diseases.filter(d => d !== 'none')),
      chronicDiseaseNotes: diseases.includes('none') ? null : 'Under regular medication',
      nextCheckupDate: daysAgo(-randInt(30, 180)),
      checkupFrequencyMonths: 12,
      remarks: diseases.includes('none') ? 'No significant health issues found' : 'Requires periodic monitoring',
    })

    // Periodic medical (40% chance)
    if (Math.random() < 0.4) {
      medicalRecords.push({
        workerId: wid,
        examinationDate: daysAgo(randInt(1, 60)),
        examinationType: 'Periodic',
        examiningDoctor: pick(DOCTORS),
        examiningFacility: `Site Medical Room, ${pick(AP_AREAS)}`,
        result: Math.random() < 0.92 ? 'Fit' : 'Conditional',
        previousHealthIssues: null,
        chronicDiseases: null,
        chronicDiseaseNotes: null,
        nextCheckupDate: daysAgo(-randInt(30, 180)),
        checkupFrequencyMonths: 12,
        remarks: 'Periodic health checkup completed',
      })
    }
  }

  // Batch insert medical records
  const MEDICAL_BATCH = 2000
  for (let i = 0; i < medicalRecords.length; i += MEDICAL_BATCH) {
    await db.medicalRecord.createMany({ data: medicalRecords.slice(i, i + MEDICAL_BATCH) })
  }
  counts.medicalRecords = medicalRecords.length
  console.log(`  Created ${medicalRecords.length} medical records`)

  // ─── STEP 8: TRAINING RECORDS ─────────────────────────────────────
  console.log('[SEED] Creating training records...')
  const trainingRecords: Array<{
    workerId: string; trainingType: string; trainingTitle: string;
    dateConducted: Date; durationHours: number; trainerName: string | null;
    trainingAgency: string | null; certificateNumber: string | null;
    validityDate: Date | null; status: string; isCompleted: boolean; remarks: string | null;
  }> = []

  const trainers = ['K. Suresh Reddy','M. Ravi Shankar','A. Padma Rao','V. Narasimha','S. Hari Prasad']
  const agencies = ['National Safety Council','DGFASLI','CIFAT','In-house Safety Team','NISD']

  for (let i = 0; i < workerData.length; i++) {
    const w = workerData[i]
    const wid = workerIds[i]
    const cfg = DESIG_CONFIGS.find(c => w.designationId === desigMap.get(c.name))!

    // Safety Induction (all workers)
    trainingRecords.push({
      workerId: wid,
      trainingType: 'SafetyInduction',
      trainingTitle: 'Construction Safety Induction',
      dateConducted: daysAgo(randInt(5, 60)),
      durationHours: 4,
      trainerName: pick(trainers),
      trainingAgency: 'In-house Safety Team',
      certificateNumber: `SI-${randomDigits(6)}`,
      validityDate: daysAgo(-365),
      status: 'Valid',
      isCompleted: true,
      remarks: 'Mandatory safety induction completed',
    })

    // Job-specific trainings (1-2 more)
    const numJobTrainings = randInt(1, Math.min(2, cfg.trainingTitles.length))
    const jobTitles = pickN(cfg.trainingTitles, numJobTrainings)
    for (const title of jobTitles) {
      const isPOSH = title.includes('POSH')
      trainingRecords.push({
        workerId: wid,
        trainingType: isPOSH ? 'POSH' : 'JobSpecific',
        trainingTitle: title,
        dateConducted: daysAgo(randInt(10, 180)),
        durationHours: randInt(2, 8),
        trainerName: pick(trainers),
        trainingAgency: pick(agencies),
        certificateNumber: `TR-${randomDigits(6)}`,
        validityDate: daysAgo(-randInt(180, 730)),
        status: Math.random() < 0.9 ? 'Valid' : Math.random() < 0.5 ? 'ExpiringSoon' : 'Expired',
        isCompleted: true,
        remarks: null,
      })
    }

    // Mock Drill training (20% of workers, to ensure coverage)
    if (Math.random() < 0.20) {
      const mockDrillTitles = ['Fire Evacuation Mock Drill','Chemical Spill Response Drill','Scaffold Collapse Emergency Drill','First Aid Mock Drill']
      trainingRecords.push({
        workerId: wid,
        trainingType: 'MockDrill',
        trainingTitle: pick(mockDrillTitles),
        dateConducted: daysAgo(randInt(5, 90)),
        durationHours: randInt(1, 3),
        trainerName: pick(trainers),
        trainingAgency: 'In-house Safety Team',
        certificateNumber: `MD-${randomDigits(6)}`,
        validityDate: daysAgo(-randInt(90, 365)),
        status: Math.random() < 0.85 ? 'Valid' : 'ExpiringSoon',
        isCompleted: true,
        remarks: 'Emergency mock drill participated',
      })
    }

    // Special training (10% of workers)
    if (Math.random() < 0.10) {
      const specialTitles = ['Confined Space Entry Training','Working at Heights Advanced','Excavation Safety Certification','Electrical Safety Refresher']
      trainingRecords.push({
        workerId: wid,
        trainingType: 'Special',
        trainingTitle: pick(specialTitles),
        dateConducted: daysAgo(randInt(15, 120)),
        durationHours: randInt(4, 16),
        trainerName: pick(trainers),
        trainingAgency: pick(agencies),
        certificateNumber: `SP-${randomDigits(6)}`,
        validityDate: daysAgo(-randInt(180, 730)),
        status: Math.random() < 0.9 ? 'Valid' : Math.random() < 0.5 ? 'ExpiringSoon' : 'Expired',
        isCompleted: true,
        remarks: null,
      })
    }
  }

  const TRAINING_BATCH = 2000
  for (let i = 0; i < trainingRecords.length; i += TRAINING_BATCH) {
    await db.trainingRecord.createMany({ data: trainingRecords.slice(i, i + TRAINING_BATCH) })
  }
  counts.trainingRecords = trainingRecords.length
  console.log(`  Created ${trainingRecords.length} training records`)

  // ─── STEP 9: ATTENDANCE ────────────────────────────────────────────
  console.log('[SEED] Creating attendance records...')
  const attendanceRecords: Array<{
    workerId: string; date: Date; status: string;
    shiftTiming: string | null; isBiometric: boolean;
    overtimeHours: number; remarks: string | null;
  }> = []

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = daysAgo(dayOffset)
    // Skip Sundays
    if (date.getDay() === 0) continue

    for (let i = 0; i < workerData.length; i++) {
      const w = workerData[i]
      const isActive = w.isActive
      // Inactive workers have lower attendance
      if (!isActive && Math.random() < 0.7) continue

      const roll = Math.random() * 100
      const status = roll < 85 ? 'Present' : roll < 95 ? 'Absent' : 'HalfDay'

      attendanceRecords.push({
        workerId: workerIds[i],
        date,
        status,
        shiftTiming: pick(SHIFTS),
        isBiometric: Math.random() < 0.8,
        overtimeHours: (status === 'Present' || status === 'HalfDay') && Math.random() < 0.3 ? randFloat(0.5, 3, 1) : 0,
        remarks: status === 'Absent' ? pick(['Leave','Sick Leave','Personal Work','Not Reported']) : null,
      })
    }
  }

  const ATTENDANCE_BATCH = 3000
  for (let i = 0; i < attendanceRecords.length; i += ATTENDANCE_BATCH) {
    await db.attendance.createMany({ data: attendanceRecords.slice(i, i + ATTENDANCE_BATCH) })
  }
  counts.attendance = attendanceRecords.length
  console.log(`  Created ${attendanceRecords.length} attendance records`)

  // ─── STEP 10: INSURANCE ───────────────────────────────────────────
  console.log('[SEED] Creating insurance records...')
  const insurers = ['LIC of India','New India Assurance','National Insurance Company','United India Insurance','ICICI Lombard']
  const insurances = workerData.map((w, i) => {
    const policyType = Math.random() < 0.5 ? 'ESI' : Math.random() < 0.5 ? 'WC' : 'GroupPersonalAccident'
    const coverage = policyType === 'ESI' ? randFloat(150000, 500000, 0) :
                     policyType === 'WC' ? randFloat(200000, 800000, 0) :
                     randFloat(500000, 2000000, 0)
    return {
      workerId: workerIds[i],
      policyType,
      policyNumber: `${policyType.charAt(0)}-${randomDigits(10)}`,
      insurerName: pick(insurers),
      coverageAmount: coverage,
      validityStartDate: daysAgo(randInt(30, 365)),
      validityEndDate: daysAgo(-randInt(30, 365)),
      nomineeName: `${pick(FEMALE_FIRST_NAMES)} ${pick(SURNAMES)}`,
      remarks: null,
    }
  })
  await db.insurance.createMany({ data: insurances })
  counts.insurances = insurances.length

  // ─── STEP 11: WAGE RECORDS ────────────────────────────────────────
  console.log('[SEED] Creating wage records...')
  const wageRecords: Array<{
    workerId: string; month: string; dailyRate: number; monthlyRate: number;
    wageCategory: string; workingDays: number; totalWages: number;
    overtimeAmount: number; deductionPF: number; deductionESI: number;
    deductionOther: number; netPay: number; bankAccountNumber: string;
    uanNumber: string; pfContributionPct: number; employerPF: number;
    employeePF: number; esiNumber: string; remarks: string | null;
  }> = []

  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const month = monthsAgo(monthOffset)
    const workingDays = randInt(22, 26)

    for (let i = 0; i < workerData.length; i++) {
      const w = workerData[i]
      const cfg = DESIG_CONFIGS.find(c => w.designationId === desigMap.get(c.name))!
      const dailyRate = randFloat(cfg.dailyRateRange[0], cfg.dailyRateRange[1], 0)
      const totalWages = dailyRate * workingDays
      const overtimeAmount = randFloat(0, 5000, 0)
      const pfPct = 12
      const employeePF = Math.round(totalWages * pfPct / 100)
      const employerPF = Math.round(totalWages * pfPct / 100)
      const deductionESI = Math.round(totalWages * 0.75 / 100)
      const deductionOther = Math.round(totalWages * 0.5 / 100)
      const netPay = totalWages + overtimeAmount - employeePF - deductionESI - deductionOther

      wageRecords.push({
        workerId: workerIds[i],
        month,
        dailyRate,
        monthlyRate: dailyRate * 30,
        wageCategory: cfg.wageCategory,
        workingDays,
        totalWages,
        overtimeAmount,
        deductionPF: employeePF,
        deductionESI,
        deductionOther,
        netPay: Math.max(0, netPay),
        bankAccountNumber: `${randInt(1000,9999)}${randomDigits(6)}${randInt(10,99)}`,
        uanNumber: w.uanNumber,
        pfContributionPct: pfPct,
        employerPF,
        employeePF,
        esiNumber: `ESI-${randomDigits(10)}`,
        remarks: null,
      })
    }
  }

  const WAGE_BATCH = 2000
  for (let i = 0; i < wageRecords.length; i += WAGE_BATCH) {
    await db.wageRecord.createMany({ data: wageRecords.slice(i, i + WAGE_BATCH) })
  }
  counts.wageRecords = wageRecords.length
  console.log(`  Created ${wageRecords.length} wage records`)

  // ─── STEP 12: INCIDENTS ───────────────────────────────────────────
  console.log('[SEED] Creating incidents...')
  const incidentTemplates = [
    { type:'MinorInjury', desc:'Worker slipped on wet surface near scaffolding area and sustained minor abrasions on left hand.', severity:'Low' },
    { type:'MinorInjury', desc:'Spark from welding activity caused minor burn on worker\'s forearm. First aid administered on site.', severity:'Low' },
    { type:'MinorInjury', desc:'Worker sustained a small cut on finger while handling sharp steel reinforcement bars.', severity:'Low' },
    { type:'MinorInjury', desc:'Dust particle entered worker\'s eye during concreting work. Eye wash given, referred to hospital.', severity:'Low' },
    { type:'MinorInjury', desc:'Worker twisted ankle while walking on uneven surface near excavation area.', severity:'Low' },
    { type:'MinorInjury', desc:'Minor bruise on shoulder due to falling debris from first floor slab work.', severity:'Low' },
    { type:'MinorInjury', desc:'Worker complained of back pain after prolonged manual lifting of cement bags.', severity:'Low' },
    { type:'MinorInjury', desc:'Minor electric shock received from exposed wiring. Worker was wearing rubber gloves, no serious injury.', severity:'Low' },
    { type:'FireInjury', desc:'Electrical short circuit in temporary wiring caused minor fire. Extinguished by safety team within minutes.', severity:'Medium' },
    { type:'FireInjury', desc:'Welding sparks ignited nearby insulation material. Fire extinguisher used immediately.', severity:'Medium' },
    { type:'MinorInjury', desc:'Nail penetration through shoe sole during shuttering work. Tetanus injection administered.', severity:'Medium' },
    { type:'MajorFatalInjury', desc:'Worker fell from scaffolding at height of 12 feet. Sustained fracture in right leg. Hospitalized.', severity:'High' },
    { type:'MajorFatalInjury', desc:'Concrete block fell from height hitting worker on shoulder. Suspected hairline fracture. Admitted to hospital.', severity:'High' },
    { type:'MajorFatalInjury', desc:'Worker\'s finger got crushed between steel bars during bar bending activity. Partial amputation required.', severity:'High' },
    { type:'MajorFatalInjury', desc:'JCB tilted near excavation edge. Operator sustained back injury. Vehicle grounded immediately.', severity:'High' },
    { type:'MajorFatalInjury', desc:'Crane wire rope snapped during material lifting. Load fell on nearby shelter. No casualties but structural damage.', severity:'Critical' },
    { type:'MinorInjury', desc:'Helper experienced heat exhaustion during peak summer afternoon work. Rested in shade, ORS given.', severity:'Medium' },
    { type:'MinorInjury', desc:'Worker hit by falling tool from above during concurrent work at different levels.', severity:'Medium' },
    { type:'FireInjury', desc:'Fuel spill near generator area caught fire. Fire extinguished. Area cordoned off for safety.', severity:'Medium' },
    { type:'MinorInjury', desc:'Worker sustained chemical burn from contact with paint thinner. First aid and hospital referral done.', severity:'Medium' },
    { type:'MajorFatalInjury', desc:'Partial collapse of temporary support structure. Two workers escaped with minor injuries. Work stopped.', severity:'Critical' },
    { type:'MinorInjury', desc:'Worker slipped and fell in muddy area near water tank excavation. Minor bruises on knee and elbow.', severity:'Low' },
    { type:'MinorInjury', desc:'Eye irritation due to cement dust exposure during concrete mixing. Washed with clean water.', severity:'Low' },
    { type:'MajorFatalInjury', desc:'Worker fell into unmarked excavation pit at night. Sustained leg injury. Emergency response activated.', severity:'High' },
    { type:'FireInjury', desc:'Gas cylinder leak detected near welding bay. Area evacuated. Leak sealed by emergency team.', severity:'High' },
    { type:'MinorInjury', desc:'Repetitive strain injury reported by mason after continuous work for 15 days. Advised rest.', severity:'Low' },
    { type:'MajorFatalInjury', desc:'Scaffolding partially collapsed during concrete pouring. One worker injured seriously. Hospitalized.', severity:'Critical' },
    { type:'Death', desc:'Worker died after falling from 5th floor slab due to missing safety net. Police notified, post-mortem ordered.', severity:'Critical' },
    { type:'Death', desc:'Fatal electric shock from high-voltage panel. Worker was not authorized for electrical work. Investigation underway.', severity:'Critical' },
    { type:'Death', desc:'Crane collapse during heavy lift operation killed operator. Structural failure suspected. Site shut down.', severity:'Critical' },
    { type:'MinorInjury', desc:'Dumper truck reversed without spotter, narrowly missing a helper. Near-miss reported and documented.', severity:'Medium' },
  ]

  const locationsOnSite = [
    'Ground Floor - Column Work','First Floor - Slab Casting','Excavation Area - Zone A',
    'Scaffolding Zone - Block B','Material Storage Area','Electrical Panel Room',
    'Welding Bay','Staircase Area - Tower 3','Lift Shaft - Zone D','Roof Level - Water Tank',
    'Bar Bending Yard','Concrete Mixing Area','Crane Operation Zone','Parking Area',
  ]

  const incidentStatuses: Array<{status:string; isDeath:boolean}> = [
    {status:'Closed', isDeath:false}, {status:'Closed', isDeath:false}, {status:'Closed', isDeath:false},
    {status:'UnderInvestigation', isDeath:false}, {status:'UnderInvestigation', isDeath:false},
    {status:'Open', isDeath:false}, {status:'Open', isDeath:false},
    {status:'Open', isDeath:true}, {status:'Open', isDeath:true}, {status:'UnderInvestigation', isDeath:true},
  ]

  const incidentFollowUpActions = [
    'Conduct safety toolbox talk with all workers',
    'Install additional safety signage at the location',
    'Provide replacement PPE to affected worker',
    'Schedule safety audit of scaffolding',
    'Review and update risk assessment',
    'Conduct emergency drill within one week',
    'Repair and inspect all electrical connections',
    'Issue show-cause notice to responsible supervisor',
    'Submit incident report to labour department',
    'Arrange medical re-examination of affected worker',
    'Install additional barricading at excavation edges',
    'Review and strengthen safe work permit system',
  ]

  const NUM_INCIDENTS = 12
  const incidents: Array<{
    incidentNumber: string; incidentType: string; date: Date; time: string | null;
    locationOnSite: string | null; description: string; rootCause: string | null;
    immediateAction: string | null; firstResponder: string | null; hospitalReferred: string | null;
    severity: string; status: string; isDeath: boolean; policeFIRReference: string | null;
    employerNotifiedAt: Date | null; compensationStatus: string | null;
    familyNotified: boolean; closureStatus: string | null;
    contractorId: string | null; siteId: string | null;
  }> = []
  const incidentWorkers: Array<{incidentId:string; workerId:string|null; workerName:string|null; injuryDesc:string|null}> = []
  const incidentFollowUps: Array<{incidentId:string; action:string; dueDate:Date|null; responsiblePerson:string|null; completed:boolean; completedAt:Date|null; remarks:string|null}> = []

  for (let i = 0; i < NUM_INCIDENTS; i++) {
    const tmpl = incidentTemplates[i % incidentTemplates.length]
    const incStatus = incidentStatuses[i % incidentStatuses.length]
    const contractor = pick(contractors)
    const site = pick(sites)
    const incidentDate = daysAgo(randInt(5, 300))
    const incNum = `INC-${String(i + 1).padStart(4, '0')}`

    incidents.push({
      incidentNumber: incNum,
      incidentType: tmpl.type,
      date: incidentDate,
      time: `${String(randInt(6,18)).padStart(2,'0')}:${String(randInt(0,59)).padStart(2,'0')}`,
      locationOnSite: pick(locationsOnSite),
      description: tmpl.desc,
      rootCause: pick(['Lack of awareness','PPE not worn properly','Wet/slippery surface','Equipment malfunction','Improper housekeeping','Fatigue','Inadequate training','Communication gap','Procedural violation','Environmental factors']),
      immediateAction: 'First aid administered, area secured, safety officer notified immediately',
      firstResponder: pick(SUPERVISORS),
      hospitalReferred: tmpl.severity === 'High' || tmpl.severity === 'Critical' ? pick(HOSPITALS) : null,
      severity: tmpl.severity,
      status: incStatus.status,
      isDeath: incStatus.isDeath,
      policeFIRReference: tmpl.severity === 'Critical' ? `FIR/${randomDigits(4)}/2025` : null,
      employerNotifiedAt: tmpl.severity === 'Critical' ? new Date(incidentDate.getTime() + 3600000) : null,
      compensationStatus: incStatus.status === 'Closed' ? 'Completed' : tmpl.severity === 'High' || tmpl.severity === 'Critical' ? 'InProgress' : 'NotApplicable',
      familyNotified: tmpl.severity === 'High' || tmpl.severity === 'Critical',
      closureStatus: incStatus.status === 'Closed' ? 'Complete' : incStatus.status === 'UnderInvestigation' ? 'Pending' : 'N/A',
      contractorId: contractor.id,
      siteId: site.id,
    })

    // Incident workers (1-2 per incident)
    const numWorkers = randInt(1, 2)
    const involvedWorkers = pickN(workerData.slice(0, 50), numWorkers)
    for (const w of involvedWorkers) {
      incidentWorkers.push({
        incidentId: incNum, // placeholder, will fix after create
        workerId: workerMap.get(w.employeeNumber)!,
        workerName: w.fullName,
        injuryDesc: tmpl.severity === 'Low' ? 'Minor abrasions/bruises' : tmpl.severity === 'Medium' ? 'Moderate injury requiring treatment' : 'Serious injury requiring hospitalization',
      })
    }

    // Follow-ups (2-3 per incident)
    const numFollowUps = randInt(2, 3)
    const actions = pickN(incidentFollowUpActions, numFollowUps)
    for (const action of actions) {
      const completed = incStatus.status === 'Closed' ? true : Math.random() < 0.3
      incidentFollowUps.push({
        incidentId: incNum,
        action,
        dueDate: daysAgo(-randInt(1, 30)),
        responsiblePerson: pick(SUPERVISORS),
        completed,
        completedAt: completed ? daysAgo(randInt(0, 10)) : null,
        remarks: completed ? 'Action completed successfully' : 'In progress',
      })
    }
  }

  // Create incidents and get IDs
  const createdIncidents = []
  for (const inc of incidents) {
    const created = await db.incident.create({ data: inc })
    createdIncidents.push(created)
  }
  counts.incidents = createdIncidents.length

  // Build incident number → id map
  const incidentIdMap = new Map(createdIncidents.map(inc => [inc.incidentNumber, inc.id]))

  // Fix incident IDs in workers and follow-ups
  const incidentWorkersFixed = incidentWorkers.map(iw => ({...iw, incidentId: incidentIdMap.get(iw.incidentId)!}))
  await db.incidentWorker.createMany({ data: incidentWorkersFixed })
  counts.incidentWorkers = incidentWorkersFixed.length

  const incidentFollowUpsFixed = incidentFollowUps.map(fu => ({...fu, incidentId: incidentIdMap.get(fu.incidentId)!}))
  await db.incidentFollowUp.createMany({ data: incidentFollowUpsFixed })
  counts.incidentFollowUps = incidentFollowUpsFixed.length
  console.log(`  Created ${createdIncidents.length} incidents, ${incidentWorkersFixed.length} workers, ${incidentFollowUpsFixed.length} follow-ups`)

  // ─── STEP 13: GRIEVANCES ──────────────────────────────────────────
  console.log('[SEED] Creating grievances...')
  const grievanceTemplates = [
    { category:'Wage', desc:'Monthly wages for April 2025 have been delayed by 12 days. Requesting immediate disbursement as family expenses are pending.', severity:'High' },
    { category:'Wage', desc:'Overtime payment for March 2025 not reflected in salary slip. Worked 15 hours overtime as per site register.', severity:'Medium' },
    { category:'Wage', desc:'Deduction of Rs.500 without proper explanation in last month salary. Requesting clarification.', severity:'Low' },
    { category:'Safety', desc:'Safety goggles provided are scratched and visibility is poor. Requesting replacement for the entire team.', severity:'Medium' },
    { category:'Safety', desc:'Scaffolding at Block B first floor is unstable and wobbling. Immediate inspection required.', severity:'High' },
    { category:'Safety', desc:'Fire extinguisher near welding bay expired last month. Needs immediate replacement.', severity:'High' },
    { category:'Safety', desc:'No safety net installed below the slab casting area at height. Risk of falling objects.', severity:'Critical' },
    { category:'Facility', desc:'Drinking water facility not available at Zone 7 work area since last one week.', severity:'Medium' },
    { category:'Facility', desc:'Toilet facilities are unclean and not maintained. No running water available.', severity:'Medium' },
    { category:'Facility', desc:'Labour camp room is overcrowded. 12 workers accommodated in a room meant for 6.', severity:'High' },
    { category:'Facility', desc:'Food quality in canteen has deteriorated. Multiple workers reporting stomach issues.', severity:'Medium' },
    { category:'Facility', desc:'No first aid kit available at remote work site N5 package. Emergency medical supplies needed.', severity:'High' },
    { category:'Harassment', desc:'Supervisor using abusive language repeatedly. Requesting transfer to different shift.', severity:'High' },
    { category:'Harassment', desc:'Contractor staff demanding bribe for approving leave application.', severity:'Critical' },
    { category:'Other', desc:'Transport facility pickup point changed without prior intimation. Workers unable to reach on time.', severity:'Low' },
    { category:'Other', desc:'Identity card not issued yet after 2 months of joining. Facing difficulty at site entry.', severity:'Low' },
    { category:'Wage', desc:'PF deduction shown but UAN number not provided. Unable to check PF balance online.', severity:'Medium' },
    { category:'Safety', desc:'Crane operator working double shift continuously for 5 days. Safety concern due to fatigue.', severity:'High' },
    { category:'Facility', desc:'No shade/rest area available during peak summer afternoons at E5 Road works.', severity:'Medium' },
  ]

  const grievanceStatuses = ['Open','InProgress','Resolved','Resolved','Resolved','Escalated']
  const grievanceAssignees = ['SafetyOfficer','PMC','HR','SafetyOfficer','PMC']

  const NUM_GRIEVANCES = 8
  const grievanceData = []
  for (let i = 0; i < NUM_GRIEVANCES; i++) {
    const tmpl = grievanceTemplates[i % grievanceTemplates.length]
    const status = grievanceStatuses[i % grievanceStatuses.length]
    const raisedByWorker = pick(workerData.slice(0, 100))
    const isResolved = status === 'Resolved'
    const raisedDate = daysAgo(randInt(5, 180))

    grievanceData.push({
      grievanceNumber: `GRV-${String(i + 1).padStart(4, '0')}`,
      dateRaised: raisedDate,
      raisedBy: workerMap.get(raisedByWorker.employeeNumber)!,
      raisedByName: raisedByWorker.fullName,
      category: tmpl.category,
      isPOSH: tmpl.category === 'Harassment',
      description: tmpl.desc,
      severity: tmpl.severity,
      assignedTo: grievanceAssignees[i % grievanceAssignees.length],
      status,
      resolutionDetails: isResolved ? 'Issue resolved after investigation. Corrective actions implemented and verified by PMC.' : null,
      resolutionDate: isResolved ? daysAgo(randInt(0, 15)) : null,
      closedBy: isResolved ? 'PMC' : null,
      slaDays: 7,
    })
  }
  await db.grievance.createMany({ data: grievanceData })
  counts.grievances = grievanceData.length
  console.log(`  Created ${grievanceData.length} grievances`)

  // ─── STEP 14: VEHICLES ────────────────────────────────────────────
  console.log('[SEED] Creating vehicles...')
  const vehicleTemplates = [
    { type:'Dumper', count:5 },
    { type:'JCB', count:3 },
    { type:'Crane', count:2 },
    { type:'Tanker', count:2 },
    { type:'Passenger', count:3 },
    { type:'Other', count:2 },
  ]

  const vehicleDocTypes: Array<{docType:string; prefix:string}> = [
    { docType:'RC', prefix:'AP' },
    { docType:'Fitness', prefix:'FT' },
    { docType:'Insurance', prefix:'VI' },
    { docType:'PUC', prefix:'PU' },
  ]

  let vehicleCounter = 0
  const vehiclesData: Array<{
    vehicleNumber: string; vehicleType: string; owner: string; condition: string;
    lastInspectionDate: Date | null; nextInspectionDue: Date | null;
    contractorId: string | null; siteId: string | null; driverId: string | null;
    isActive: boolean;
  }> = []
  const vehicleDocuments: Array<{
    vehicleNumber: string; // placeholder
    docType: string; docNumber: string | null; issueDate: Date | null;
    expiryDate: Date | null; status: string;
  }> = []

  for (const vt of vehicleTemplates) {
    for (let i = 0; i < vt.count; i++) {
      vehicleCounter++
      const rtoCode = `AP-${String(randInt(1,52)).padStart(2,'0')}`
      const vehicleNumber = `${rtoCode}-${String.fromCharCode(65 + randInt(0,25))}${String.fromCharCode(65 + randInt(0,25))}-${String(randInt(1,9999)).padStart(4,'0')}`
      const condition = Math.random() < 0.8 ? 'Fit' : Math.random() < 0.5 ? 'NeedsRepair' : 'Grounded'
      const contractor = pick(contractors)
      const site = pick(sites)
      const isActive = condition === 'Fit'

      // Try to assign a driver (only for Dumper, JCB, Crane, Passenger types)
      let driverId: string | null = null
      if (['Dumper','JCB','Crane','Passenger'].includes(vt.type)) {
        const driverDesig = vt.type === 'Dumper' ? 'Dumper Driver' : vt.type === 'JCB' ? 'JCB Operator' : vt.type === 'Crane' ? 'Crane Operator' : 'Helper'
        const driverDesigId = desigMap.get(driverDesig)
        if (driverDesigId) {
          const driver = allWorkers.find(w => {
            const wd = workerData.find(ww => workerMap.get(ww.employeeNumber) === w.id)
            return wd && wd.designationId === driverDesigId && w.siteId === site.id
          })
          if (driver) driverId = driver.id
        }
      }

      vehiclesData.push({
        vehicleNumber,
        vehicleType: vt.type,
        owner: Math.random() < 0.7 ? 'Contractor' : 'Rented',
        condition,
        lastInspectionDate: daysAgo(randInt(5, 60)),
        nextInspectionDue: daysAgo(-randInt(30, 180)),
        contractorId: contractor.id,
        siteId: site.id,
        driverId,
        isActive,
      })

      // 2-4 documents per vehicle
      const numDocs = randInt(2, 4)
      const docs = pickN(vehicleDocTypes, Math.min(numDocs, vehicleDocTypes.length))
      for (const doc of docs) {
        const isExpired = Math.random() < 0.15
        vehicleDocuments.push({
          vehicleNumber, // placeholder
          docType: doc.docType,
          docNumber: `${doc.prefix}-${randomDigits(10)}`,
          issueDate: daysAgo(randInt(180, 730)),
          expiryDate: isExpired ? daysAgo(randInt(1, 30)) : daysAgo(-randInt(30, 365)),
          status: isExpired ? 'Expired' : Math.random() < 0.2 ? 'ExpiringSoon' : 'Valid',
        })
      }
    }
  }

  // Create vehicles and get IDs
  const createdVehicles = []
  for (const v of vehiclesData) {
    const created = await db.vehicle.create({ data: v })
    createdVehicles.push(created)
  }
  counts.vehicles = createdVehicles.length

  const vehicleIdMap = new Map(createdVehicles.map(v => [v.vehicleNumber, v.id]))

  // Fix vehicle IDs in documents
  const vehicleDocsFixed = vehicleDocuments.map(vd => ({
    ...vd,
    vehicleId: vehicleIdMap.get(vd.vehicleNumber)!,
    vehicleNumber: undefined as unknown as string, // remove placeholder
  }))
  // Remove vehicleNumber from data
  const vehicleDocsClean = vehicleDocsFixed.map(({ vehicleNumber: _, ...rest }) => rest)
  await db.vehicleDocument.createMany({ data: vehicleDocsClean as any })
  counts.vehicleDocuments = vehicleDocsClean.length
  console.log(`  Created ${createdVehicles.length} vehicles, ${vehicleDocsClean.length} documents`)

  // ─── STEP 15: HAZARDOUS MATERIALS ─────────────────────────────────
  console.log('[SEED] Creating hazardous materials...')
  const hazmatTemplates = [
    { name:'OPC Cement (43 Grade)', category:'General', hazardClassification:null, quantityCurrent:450, quantityMax:500, unit:'BAGS', location:'Cement Godown - Zone A' },
    { name:'OPC Cement (53 Grade)', category:'General', hazardClassification:null, quantityCurrent:320, quantityMax:400, unit:'BAGS', location:'Cement Godown - Zone B' },
    { name:'Paint Thinner (Turpentine)', category:'Chemical', hazardClassification:'Flammable', quantityCurrent:180, quantityMax:200, unit:'LTR', location:'Paint Store Room' },
    { name:'Diesel (HSD)', category:'Chemical', hazardClassification:'Flammable', quantityCurrent:2500, quantityMax:3000, unit:'LTR', location:'Fuel Storage Area' },
    { name:'Petrol (MS)', category:'Chemical', hazardClassification:'Flammable', quantityCurrent:400, quantityMax:500, unit:'LTR', location:'Fuel Storage Area' },
    { name:'LPG Cylinders', category:'Hazardous', hazardClassification:'Flammable', quantityCurrent:24, quantityMax:30, unit:'NOS', location:'Gas Cylinder Yard' },
    { name:'Oxygen Cylinders', category:'Hazardous', hazardClassification:'Flammable', quantityCurrent:18, quantityMax:20, unit:'NOS', location:'Welding Bay Storage' },
    { name:'Acetylene Cylinders', category:'Hazardous', hazardClassification:'Flammable', quantityCurrent:12, quantityMax:15, unit:'NOS', location:'Welding Bay Storage' },
    { name:'Hydrochloric Acid', category:'Chemical', hazardClassification:'Corrosive', quantityCurrent:45, quantityMax:50, unit:'LTR', location:'Chemical Store' },
    { name:'Sulphuric Acid', category:'Chemical', hazardClassification:'Corrosive', quantityCurrent:30, quantityMax:40, unit:'LTR', location:'Chemical Store' },
    { name:'Epoxy Resin (Adhesive)', category:'Chemical', hazardClassification:'Irritant', quantityCurrent:85, quantityMax:100, unit:'KG', location:'Adhesive Store Room' },
    { name:'TMT Steel Bars (12mm)', category:'General', hazardClassification:null, quantityCurrent:12000, quantityMax:15000, unit:'KG', location:'Steel Yard - Block A' },
    { name:'TMT Steel Bars (16mm)', category:'General', hazardClassification:null, quantityCurrent:8000, quantityMax:10000, unit:'KG', location:'Steel Yard - Block B' },
    { name:'PVC Solvent Cement', category:'Chemical', hazardClassification:'Irritant', quantityCurrent:60, quantityMax:80, unit:'LTR', location:'Plumbing Store' },
    { name:'Bitumen (VG-30)', category:'Chemical', hazardClassification:'Flammable', quantityCurrent:5000, quantityMax:6000, unit:'KG', location:'Bitumen Heating Area' },
    { name:'Form Oil (Release Agent)', category:'Chemical', hazardClassification:'Flammable', quantityCurrent:120, quantityMax:150, unit:'LTR', location:'Shuttering Store' },
    { name:'Benzene (Cleaning Agent)', category:'Chemical', hazardClassification:'Toxic', quantityCurrent:15, quantityMax:20, unit:'LTR', location:'Chemical Store' },
    { name:'Hydraulic Oil (68 Grade)', category:'Chemical', hazardClassification:'Flammable', quantityCurrent:200, quantityMax:250, unit:'LTR', location:'Equipment Maintenance Yard' },
  ]

  const hazmatData: Array<{
    materialName: string; category: string; hazardClassification: string | null;
    quantityCurrent: number; quantityMaxPermissible: number; unit: string;
    storageLocation: string | null; storageConditionCompliant: boolean;
    handlingResponsiblePerson: string; siteId: string | null;
    storageLicenseNumber: string | null; storageLicenseExpiry: Date | null;
  }> = []
  const materialTransactions: Array<{
    materialName: string; // placeholder
    transactionType: string; quantity: number; runningBalance: number; date: Date; remarks: string | null;
  }> = []

  for (const hmt of hazmatTemplates) {
    const site = pick(sites)
    hazmatData.push({
      materialName: hmt.name,
      category: hmt.category,
      hazardClassification: hmt.hazardClassification,
      quantityCurrent: hmt.quantityCurrent,
      quantityMaxPermissible: hmt.quantityMax,
      unit: hmt.unit,
      storageLocation: hmt.location,
      storageConditionCompliant: Math.random() < 0.9,
      handlingResponsiblePerson: pick(SUPERVISORS),
      siteId: site.id,
      storageLicenseNumber: hmt.category !== 'General' ? `SL-${randomDigits(8)}` : null,
      storageLicenseExpiry: hmt.category !== 'General' ? daysAgo(-randInt(60, 365)) : null,
    })

    // 2-3 transactions per material
    const numTxns = randInt(2, 3)
    let balance = hmt.quantityCurrent
    for (let t = 0; t < numTxns; t++) {
      const isIn = Math.random() < 0.5
      const qty = randInt(5, 50)
      balance = isIn ? balance + qty : Math.max(0, balance - qty)
      materialTransactions.push({
        materialName: hmt.name,
        transactionType: isIn ? 'In' : 'Out',
        quantity: qty,
        runningBalance: balance,
        date: daysAgo(randInt(0, 30)),
        remarks: isIn ? 'Received from supplier' : 'Issued for construction work',
      })
    }
  }

  const createdHazmats = []
  for (const hm of hazmatData) {
    const created = await db.hazardousMaterial.create({ data: hm })
    createdHazmats.push(created)
  }
  counts.hazardousMaterials = createdHazmats.length

  const hazmatIdMap = new Map(createdHazmats.map(h => [h.materialName, h.id]))
  const matTxnsFixed = materialTransactions.map(mt => ({
    ...mt,
    materialId: hazmatIdMap.get(mt.materialName)!,
    materialName: undefined as unknown as string,
  }))
  const matTxnsClean = matTxnsFixed.map(({ materialName: _, ...rest }) => rest)
  await db.materialTransaction.createMany({ data: matTxnsClean as any })
  counts.materialTransactions = matTxnsClean.length
  console.log(`  Created ${createdHazmats.length} hazardous materials, ${matTxnsClean.length} transactions`)

  // ─── STEP 16: LEGAL COMPLIANCE ────────────────────────────────────
  console.log('[SEED] Creating legal compliance records...')
  const legalTypes = [
    { type:'LabourLicense', authority:'Commissioner of Labour, Andhra Pradesh', prefix:'LL' },
    { type:'BOCW', authority:'Assistant Labour Commissioner, Amaravati', prefix:'BOCW' },
    { type:'ContractLabour', authority:'Registering Officer, CLRA, Amaravati', prefix:'CLRA' },
    { type:'StatutoryRegister', authority:'Labour Department, Andhra Pradesh', prefix:'SR' },
  ]

  const legalData: Array<{
    contractorId: string; complianceType: string; licenseNumber: string | null;
    issuingAuthority: string | null; issueDate: Date | null; expiryDate: Date | null;
    renewalReminderDays: number; status: string; remarks: string | null;
  }> = []

  for (const contractor of contractors) {
    for (const lt of legalTypes) {
      const isExpired = Math.random() < 0.15
      const isExpiring = !isExpired && Math.random() < 0.2
      legalData.push({
        contractorId: contractor.id,
        complianceType: lt.type,
        licenseNumber: `${lt.prefix}-${contractor.code}-${randomDigits(6)}`,
        issuingAuthority: lt.authority,
        issueDate: daysAgo(randInt(180, 730)),
        expiryDate: isExpired ? daysAgo(randInt(1, 30)) : daysAgo(-randInt(30, 365)),
        renewalReminderDays: 30,
        status: isExpired ? 'Expired' : isExpiring ? 'ExpiringSoon' : 'Valid',
        remarks: isExpired ? 'License expired, renewal initiated' : null,
      })
    }
  }
  await db.legalCompliance.createMany({ data: legalData })
  counts.legalCompliances = legalData.length
  console.log(`  Created ${legalData.length} legal compliance records`)

  // ─── STEP 17: SITE FACILITIES, SECURITY, MED INFRA ────────────────
  console.log('[SEED] Creating site-level checklists...')

  const siteFacilitiesData: Array<{
    siteId: string; item: string; status: string;
    lastInspectionDate: Date | null; inspector: string | null; remarks: string | null;
  }> = []
  const siteSecurityData: Array<{
    siteId: string; item: string; status: string; compliancePct: number | null;
    lastInspectionDate: Date | null; inspector: string | null; remarks: string | null;
  }> = []
  const medInfraData: Array<{
    siteId: string; item: string; status: string;
    lastInspectionDate: Date | null; inspector: string | null; remarks: string | null;
  }> = []

  for (const site of sites) {
    for (const facility of FACILITIES) {
      const isCompliant = Math.random() < 0.85
      siteFacilitiesData.push({
        siteId: site.id,
        item: facility,
        status: isCompliant ? 'Compliant' : Math.random() < 0.5 ? 'NonCompliant' : 'Pending',
        lastInspectionDate: daysAgo(randInt(1, 14)),
        inspector: pick(SUPERVISORS),
        remarks: isCompliant ? 'Facility is in good condition and meets standards' : 'Minor issues noted, corrective action in progress',
      })
    }

    for (const item of SECURITY_ITEMS) {
      const isCompliant = Math.random() < 0.88
      siteSecurityData.push({
        siteId: site.id,
        item,
        status: isCompliant ? 'Compliant' : 'NonCompliant',
        compliancePct: isCompliant ? randFloat(90, 100, 0) : randFloat(50, 85, 0),
        lastInspectionDate: daysAgo(randInt(1, 14)),
        inspector: pick(SUPERVISORS),
        remarks: isCompliant ? 'All safety items available and in good condition' : 'Some items need replacement, procurement initiated',
      })
    }

    for (const item of MED_INFRA_ITEMS) {
      const isCompliant = Math.random() < 0.9
      medInfraData.push({
        siteId: site.id,
        item,
        status: isCompliant ? 'Compliant' : 'Pending',
        lastInspectionDate: daysAgo(randInt(1, 14)),
        inspector: pick(SUPERVISORS),
        remarks: isCompliant ? 'Medical infrastructure is adequate and maintained' : 'Supplies need replenishment, ordered',
      })
    }
  }

  await db.siteFacility.createMany({ data: siteFacilitiesData })
  counts.siteFacilities = siteFacilitiesData.length
  await db.siteSecurityItem.createMany({ data: siteSecurityData })
  counts.siteSecurityItems = siteSecurityData.length
  await db.medInfraItem.createMany({ data: medInfraData })
  counts.medInfraItems = medInfraData.length
  console.log(`  Created ${siteFacilitiesData.length} site facilities, ${siteSecurityData.length} security items, ${medInfraData.length} med infra items`)

  // ─── STEP 18: NOTIFICATIONS ───────────────────────────────────────
  console.log('[SEED] Creating notifications...')
  const notificationTemplates = [
    { type:'TrainingExpiry', title:'Safety Training Expiring Soon', message:'Safety Induction training for {worker} expires in 15 days. Schedule renewal training.', entityType:'Worker', priority:'Medium' },
    { type:'TrainingExpiry', title:'Welding Safety Certificate Expiring', message:'Welding Safety training for {worker} expires in 7 days. Immediate renewal required.', entityType:'Worker', priority:'High' },
    { type:'MedicalDue', title:'Periodic Medical Checkup Due', message:'{worker} is due for periodic medical examination. Last checkup was 11 months ago.', entityType:'Worker', priority:'Medium' },
    { type:'MedicalDue', title:'Medical Checkup Overdue', message:'{worker} has not completed periodic medical checkup. Follow up immediately.', entityType:'Worker', priority:'High' },
    { type:'VehicleDocExpiry', title:'Vehicle Insurance Expiring', message:'Insurance for vehicle {entity} expires in 10 days. Renew to avoid non-compliance.', entityType:'Vehicle', priority:'Medium' },
    { type:'VehicleDocExpiry', title:'Vehicle Fitness Certificate Expired', message:'Fitness certificate for vehicle {entity} has expired. Vehicle should be grounded until renewed.', entityType:'Vehicle', priority:'Critical' },
    { type:'LicenseRenewal', title:'Labour License Renewal Due', message:'Labour License for {contractor} expires in 30 days. Initiate renewal process.', entityType:'Contractor', priority:'High' },
    { type:'LicenseRenewal', title:'BOCW Registration Renewal', message:'BOCW registration for {contractor} is expiring in 20 days.', entityType:'Contractor', priority:'High' },
    { type:'GrievanceSLA', title:'Grievance SLA Breach Warning', message:'Grievance {entity} is approaching SLA deadline. Current status: Open. Assigned to: Safety Officer.', entityType:'Grievance', priority:'High' },
    { type:'MaterialNearLimit', title:'Diesel Stock Below Threshold', message:'Current diesel stock ({qty} L) is below minimum threshold. Place refill order immediately.', entityType:'Material', priority:'High' },
    { type:'MaterialNearLimit', title:'Oxygen Cylinder Stock Low', message:'Only {qty} oxygen cylinders remaining. Reorder before stock runs out.', entityType:'Material', priority:'Critical' },
    { type:'TrainingExpiry', title:'Crane Operation Certificate Expiring', message:'Crane Operation Safety certification for {worker} expires soon. Schedule recertification.', entityType:'Worker', priority:'High' },
    { type:'MedicalDue', title:'Pre-employment Medical Pending', message:'New worker {worker} has not completed pre-employment medical examination.', entityType:'Worker', priority:'High' },
    { type:'VehicleDocExpiry', title:'PUC Certificate Expired', message:'Pollution Under Control certificate for vehicle {entity} has expired.', entityType:'Vehicle', priority:'Medium' },
    { type:'GrievanceSLA', title:'Grievance Escalated', message:'Grievance {entity} has been escalated due to non-resolution within SLA period.', entityType:'Grievance', priority:'Critical' },
  ]

  const notificationsData = []
  for (let i = 0; i < 25; i++) {
    const tmpl = notificationTemplates[i % notificationTemplates.length]
    const workerName = pick(workerData.slice(0, 30)).fullName
    const contractorName = pick(contractors).name
    let message = tmpl.message
      .replace('{worker}', workerName)
      .replace('{contractor}', contractorName)
      .replace('{entity}', `#${String(randInt(1, 50)).padStart(3, '0')}`)
      .replace('{qty}', String(randInt(5, 50)))

    notificationsData.push({
      type: tmpl.type,
      title: tmpl.title,
      message,
      entityType: tmpl.entityType,
      entityId: null,
      isRead: Math.random() < 0.4,
      priority: tmpl.priority,
    })
  }
  await db.notification.createMany({ data: notificationsData })
  counts.notifications = notificationsData.length
  console.log(`  Created ${notificationsData.length} notifications`)

  // ─── DONE ─────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n[SEED] ✅ Demo seed completed in ${elapsed}s`)
  console.log(`[SEED] Record counts:`, JSON.stringify(counts, null, 2))
  return counts
}
