import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

async function getUser(request, db) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  const session = await db.collection('sessions').findOne({ token })
  if (!session) return null
  return await db.collection('users').findOne({ id: session.user_id })
}

// ===================== SEED DATA (Real KFDC) =====================
const SEED_DATA = {
  divisions: [
    { id: 'div-bangalore', name: 'Bangalore', code: 'BLR' },
    { id: 'div-dharwad', name: 'Dharwad', code: 'DWD' },
    { id: 'div-shimoga', name: 'Shivamogga', code: 'SHM' },
    { id: 'div-chikmagalur', name: 'Chikkamagaluru', code: 'CKM' },
  ],
  ranges: [
    { id: 'rng-svpura', division_id: 'div-bangalore', name: 'S.V. Pura' },
    { id: 'rng-mulbagilu', division_id: 'div-bangalore', name: 'Mulabagilu' },
    { id: 'rng-dvhalli', division_id: 'div-bangalore', name: 'D.V. Halli' },
    { id: 'rng-malur', division_id: 'div-bangalore', name: 'Malur' },
    { id: 'rng-bangarpet', division_id: 'div-bangalore', name: 'Bangarpet' },
    { id: 'rng-bidadi', division_id: 'div-bangalore', name: 'Bidadi' },
    { id: 'rng-dharwad', division_id: 'div-dharwad', name: 'Dharwad' },
    { id: 'rng-alloli', division_id: 'div-dharwad', name: 'Alloli-Kanasolli' },
    { id: 'rng-akrali', division_id: 'div-dharwad', name: 'Akrali' },
    { id: 'rng-gunji', division_id: 'div-dharwad', name: 'Gunji' },
    { id: 'rng-dhundashi', division_id: 'div-dharwad', name: 'Dhundashi' },
    { id: 'rng-khanapur', division_id: 'div-dharwad', name: 'Khanapur' },
    { id: 'rng-sagara', division_id: 'div-shimoga', name: 'Sagara' },
    { id: 'rng-soraba', division_id: 'div-shimoga', name: 'Soraba' },
    { id: 'rng-siddapur', division_id: 'div-shimoga', name: 'Siddapur' },
    { id: 'rng-hosanagar', division_id: 'div-shimoga', name: 'Hosanagar' },
    { id: 'rng-koppa', division_id: 'div-chikmagalur', name: 'Koppa' },
    { id: 'rng-narasimharajapura', division_id: 'div-chikmagalur', name: 'Narasimharajapura' },
    { id: 'rng-sringeri', division_id: 'div-chikmagalur', name: 'Sringeri' },
  ],
  users: [
    { id: 'usr-ro1', email: 'ro.dharwad@kfdc.in', password: 'pass123', name: 'Ramesh Kumar', role: 'RO', division_id: 'div-dharwad', range_id: 'rng-dharwad' },
    { id: 'usr-ro2', email: 'ro.svpura@kfdc.in', password: 'pass123', name: 'Suresh Gowda', role: 'RO', division_id: 'div-bangalore', range_id: 'rng-svpura' },
    { id: 'usr-ro3', email: 'ro.sagara@kfdc.in', password: 'pass123', name: 'Manjunath Hegde', role: 'RO', division_id: 'div-shimoga', range_id: 'rng-sagara' },
    { id: 'usr-ro4', email: 'ro.alloli@kfdc.in', password: 'pass123', name: 'Basavaraj Patil', role: 'RO', division_id: 'div-dharwad', range_id: 'rng-alloli' },
    { id: 'usr-dm1', email: 'dm.dharwad@kfdc.in', password: 'pass123', name: 'Anjali Sharma', role: 'DM', division_id: 'div-dharwad', range_id: null },
    { id: 'usr-dm2', email: 'dm.bangalore@kfdc.in', password: 'pass123', name: 'Priya Hegde', role: 'DM', division_id: 'div-bangalore', range_id: null },
    { id: 'usr-dm3', email: 'dm.shimoga@kfdc.in', password: 'pass123', name: 'Nagaraj Rao', role: 'DM', division_id: 'div-shimoga', range_id: null },
    { id: 'usr-admin1', email: 'admin@kfdc.in', password: 'pass123', name: 'Dr. Venkatesh Rao', role: 'ADMIN', division_id: null, range_id: null },
  ],
  activities: [
    { id: 'act-survey', name: 'Survey & Demarcation', category: 'Advance Works', unit: 'Per Km', ssr_no: '71' },
    { id: 'act-dozing', name: 'Dozing & Ripping (Fuel cost)', category: 'Advance Works', unit: 'Per Hectare', ssr_no: '-' },
    { id: 'act-jungle', name: 'Jungle Clearance', category: 'Advance Works', unit: 'Per Hectare', ssr_no: '72(C)' },
    { id: 'act-debris', name: 'Lifting & Heaping of Debris', category: 'Advance Works', unit: 'Per Hectare', ssr_no: '73(a)' },
    { id: 'act-preweeding', name: 'Pre-weeding before Planting', category: 'Planting Works', unit: 'Per Hectare', ssr_no: '88(i)' },
    { id: 'act-loading', name: 'Loading & Unloading of RTS/PBS', category: 'Planting Works', unit: 'Per 1000 Sdls', ssr_no: '81(i)' },
    { id: 'act-transport', name: 'Transportation of Seedlings', category: 'Planting Works', unit: 'Per 1000 Sdls', ssr_no: '81(ii)' },
    { id: 'act-antitermite', name: 'Anti-termite Pesticide Treatment', category: 'Planting Works', unit: 'Per Hectare', ssr_no: '82' },
    { id: 'act-dipping', name: 'Dipping of RT/Pbs in Solution', category: 'Planting Works', unit: 'Per 1000 Sdls', ssr_no: '95(i)' },
    { id: 'act-conveyance', name: 'Conveyance of RT to Planting Spot', category: 'Planting Works', unit: 'Per 1000 Sdls', ssr_no: '96(i)' },
    { id: 'act-planting', name: 'Planting of Seedlings', category: 'Planting Works', unit: 'Per 1000 Sdls', ssr_no: '97(ii)' },
    { id: 'act-fertilizer', name: 'Application of Fertilizer (NPK/DAP)', category: 'Maintenance', unit: 'Per Hectare', ssr_no: '86' },
    { id: 'act-fertcost', name: 'Cost of Fertilizer', category: 'Maintenance', unit: 'Per 1000 Sdls', ssr_no: '87' },
    { id: 'act-ferttrans', name: 'Transportation of Fertilizers', category: 'Maintenance', unit: 'Per 1000 Sdls', ssr_no: '103a' },
    { id: 'act-weeding1', name: '1st Clear Weeding (100% area)', category: 'Maintenance', unit: 'Per Hectare', ssr_no: '88(ii)' },
    { id: 'act-weeding2', name: '2nd Clear Weeding', category: 'Maintenance', unit: 'Per Hectare', ssr_no: '88(ii)' },
    { id: 'act-fireline', name: 'Clearing 5m Wide Fire Lines', category: 'Maintenance', unit: 'Per Hectare', ssr_no: '99(a)' },
    { id: 'act-firewatch', name: 'Engaging Fire Watchers', category: 'Protection', unit: 'Per Month', ssr_no: '76(1)' },
    { id: 'act-watchward', name: 'Watch & Ward (270 days)', category: 'Protection', unit: 'Per 20 Ha', ssr_no: '76' },
    { id: 'act-fencing', name: 'Brush Wood Fencing', category: 'Maintenance', unit: 'Per Hectare', ssr_no: '86' },
    { id: 'act-cpt', name: 'CPT Excavation (Cattle Proof Trench)', category: 'Maintenance', unit: 'Per Rmtr', ssr_no: '-' },
    { id: 'act-interplough', name: 'Interploughing (Bulldozer Fuel)', category: 'Maintenance', unit: 'Per Hectare', ssr_no: '72(C)' },
    { id: 'act-nursery', name: 'Nursery Raising (Clonal/Seedling)', category: 'Nursery', unit: 'Per 1000 Sdls', ssr_no: '-' },
    { id: 'act-nameboard', name: 'Cement/Stone Plantation Name Board', category: 'Planting Works', unit: 'Per Unit', ssr_no: '-' },
    { id: 'act-misc', name: 'Miscellaneous (Implements, Spray pump etc)', category: 'Maintenance', unit: 'Lump Sum', ssr_no: '-' },
  ],
  norms: [
    { id: 'norm-a1', activity_id: 'act-survey', applicable_age: 0, species_id: null, standard_rate: 1534.16, financial_year: '2026-27' },
    { id: 'norm-a2', activity_id: 'act-dozing', applicable_age: 0, species_id: null, standard_rate: 12600, financial_year: '2026-27' },
    { id: 'norm-a3', activity_id: 'act-jungle', applicable_age: 0, species_id: null, standard_rate: 12600, financial_year: '2026-27' },
    { id: 'norm-a4', activity_id: 'act-debris', applicable_age: 0, species_id: null, standard_rate: 2854.48, financial_year: '2026-27' },
    { id: 'norm-p1', activity_id: 'act-preweeding', applicable_age: 1, species_id: null, standard_rate: 1199.94, financial_year: '2026-27' },
    { id: 'norm-p2', activity_id: 'act-loading', applicable_age: 1, species_id: null, standard_rate: 259.89, financial_year: '2026-27' },
    { id: 'norm-p3', activity_id: 'act-transport', applicable_age: 1, species_id: null, standard_rate: 595.97, financial_year: '2026-27' },
    { id: 'norm-p4', activity_id: 'act-antitermite', applicable_age: 1, species_id: null, standard_rate: 300, financial_year: '2026-27' },
    { id: 'norm-p5', activity_id: 'act-dipping', applicable_age: 1, species_id: null, standard_rate: 400.16, financial_year: '2026-27' },
    { id: 'norm-p6', activity_id: 'act-conveyance', applicable_age: 1, species_id: null, standard_rate: 918.66, financial_year: '2026-27' },
    { id: 'norm-p7', activity_id: 'act-planting', applicable_age: 1, species_id: null, standard_rate: 1521.71, financial_year: '2026-27' },
    { id: 'norm-p8', activity_id: 'act-fertilizer', applicable_age: 1, species_id: null, standard_rate: 1555, financial_year: '2026-27' },
    { id: 'norm-p9', activity_id: 'act-fertcost', applicable_age: 1, species_id: null, standard_rate: 570.86, financial_year: '2026-27' },
    { id: 'norm-p10', activity_id: 'act-weeding1', applicable_age: 1, species_id: null, standard_rate: 3586.11, financial_year: '2026-27' },
    { id: 'norm-p11', activity_id: 'act-weeding2', applicable_age: 1, species_id: null, standard_rate: 3211.18, financial_year: '2026-27' },
    { id: 'norm-p12', activity_id: 'act-watchward', applicable_age: 1, species_id: null, standard_rate: 4994, financial_year: '2026-27' },
    { id: 'norm-p13', activity_id: 'act-fencing', applicable_age: 1, species_id: null, standard_rate: 2997.22, financial_year: '2026-27' },
    { id: 'norm-p14', activity_id: 'act-nameboard', applicable_age: 1, species_id: null, standard_rate: 5000, financial_year: '2026-27' },
    { id: 'norm-m2a', activity_id: 'act-weeding1', applicable_age: 2, species_id: null, standard_rate: 3586.11, financial_year: '2026-27' },
    { id: 'norm-m2b', activity_id: 'act-weeding2', applicable_age: 2, species_id: null, standard_rate: 3211.18, financial_year: '2026-27' },
    { id: 'norm-m2c', activity_id: 'act-fertilizer', applicable_age: 2, species_id: null, standard_rate: 1555, financial_year: '2026-27' },
    { id: 'norm-m2d', activity_id: 'act-fertcost', applicable_age: 2, species_id: null, standard_rate: 570.86, financial_year: '2026-27' },
    { id: 'norm-m2e', activity_id: 'act-fireline', applicable_age: 2, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m2f', activity_id: 'act-firewatch', applicable_age: 2, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m2g', activity_id: 'act-watchward', applicable_age: 2, species_id: null, standard_rate: 4994, financial_year: '2026-27' },
    { id: 'norm-m3a', activity_id: 'act-weeding1', applicable_age: 3, species_id: null, standard_rate: 3586.11, financial_year: '2026-27' },
    { id: 'norm-m3b', activity_id: 'act-fertilizer', applicable_age: 3, species_id: null, standard_rate: 1555, financial_year: '2026-27' },
    { id: 'norm-m3c', activity_id: 'act-fertcost', applicable_age: 3, species_id: null, standard_rate: 570.86, financial_year: '2026-27' },
    { id: 'norm-m3d', activity_id: 'act-interplough', applicable_age: 3, species_id: null, standard_rate: 12600, financial_year: '2026-27' },
    { id: 'norm-m3e', activity_id: 'act-fireline', applicable_age: 3, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m3f', activity_id: 'act-firewatch', applicable_age: 3, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    ...([4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,25,27,28,30,31,32,40].flatMap(age => [
      { id: `norm-m${age}a`, activity_id: 'act-fireline', applicable_age: age, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
      { id: `norm-m${age}b`, activity_id: 'act-firewatch', applicable_age: age, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    ])),
    { id: 'norm-n1', activity_id: 'act-nursery', applicable_age: 0, species_id: null, standard_rate: 47762, financial_year: '2026-27' },
  ],
  plantations: [
    { id: 'plt-d01', range_id: 'rng-dharwad', name: 'Varavanagalavi', species: 'Acacia Auriculiformis', year_of_planting: 2014, total_area_ha: 25, village: 'Varavanagalavi', taluk: 'Dharwad', district: 'Dharwad', vidhana_sabha: '', lok_sabha: '', latitude: 15.4589, longitude: 75.0078 },
    { id: 'plt-d02', range_id: 'rng-dharwad', name: 'Varavanagalavi (Casuarina)', species: 'Casuarina', year_of_planting: 2017, total_area_ha: 10, village: 'Varavanagalavi', taluk: 'Dharwad', district: 'Dharwad', vidhana_sabha: '', lok_sabha: '', latitude: 15.4590, longitude: 75.0080 },
    { id: 'plt-d03', range_id: 'rng-dharwad', name: 'Varavanagalavi (2011)', species: 'Acacia Auriculiformis', year_of_planting: 2011, total_area_ha: 22, village: 'Varavanagalavi', taluk: 'Dharwad', district: 'Dharwad', vidhana_sabha: '', lok_sabha: '', latitude: 15.4591, longitude: 75.0082 },
    { id: 'plt-d04', range_id: 'rng-dharwad', name: 'Ninganakoppa-Kanvihalkatti', species: 'Acacia Auriculiformis', year_of_planting: 2004, total_area_ha: 15.5, village: 'Ninganakoppa', taluk: 'Dharwad', district: 'Dharwad', vidhana_sabha: '', lok_sabha: '', latitude: 15.43, longitude: 74.98 },
    { id: 'plt-d05', range_id: 'rng-dharwad', name: 'Degaon', species: 'Acacia Auriculiformis', year_of_planting: 2018, total_area_ha: 14.6, village: 'Degaon', taluk: 'Dharwad', district: 'Dharwad', vidhana_sabha: '', lok_sabha: '', latitude: 15.44, longitude: 75.01 },
    { id: 'plt-d06', range_id: 'rng-alloli', name: 'Alloli-Kanasolli XXV 11,13', species: 'Eucalyptus Pellita', year_of_planting: 2004, total_area_ha: 15.5, village: 'Alloli-Kanasolli', taluk: 'Khanapur', district: 'Belagavi', vidhana_sabha: '', lok_sabha: '', latitude: 15.63, longitude: 74.50 },
    { id: 'plt-d07', range_id: 'rng-alloli', name: 'Akrali-VII 13p', species: 'Eucalyptus Pellita', year_of_planting: 2006, total_area_ha: 81.1, village: 'Akrali', taluk: 'Khanapur', district: 'Belagavi', vidhana_sabha: '', lok_sabha: '', latitude: 15.64, longitude: 74.52 },
    { id: 'plt-d08', range_id: 'rng-akrali', name: 'Balekoppa', species: 'Acacia Auriculiformis', year_of_planting: 2014, total_area_ha: 60, village: 'Balekoppa', taluk: 'Khanapur', district: 'Uttara Kannada', vidhana_sabha: '', lok_sabha: '', latitude: 15.50, longitude: 74.55 },
    { id: 'plt-d09', range_id: 'rng-gunji', name: 'Salakinakoppa', species: 'Acacia Auriculiformis', year_of_planting: 2004, total_area_ha: 29.63, village: 'Salakinakoppa', taluk: 'Khanapur', district: 'Uttara Kannada', vidhana_sabha: '', lok_sabha: '', latitude: 15.55, longitude: 74.60 },
    { id: 'plt-d10', range_id: 'rng-gunji', name: 'Unchalli-Bidralli', species: 'Acacia Auriculiformis', year_of_planting: 2023, total_area_ha: 15, village: 'Unchalli', taluk: 'Yellapur', district: 'Uttara Kannada', vidhana_sabha: '', lok_sabha: '', latitude: 14.85, longitude: 74.71 },
    { id: 'plt-d11', range_id: 'rng-khanapur', name: 'Kinaye R.F 166', species: 'Acacia Auriculiformis', year_of_planting: 2025, total_area_ha: 41.5, village: 'Kinaye', taluk: 'Khanapur', district: 'Belagavi', vidhana_sabha: '', lok_sabha: '', latitude: 15.62, longitude: 74.48 },
    { id: 'plt-b01', range_id: 'rng-svpura', name: 'Agara', species: 'Eucalyptus Seed', year_of_planting: 2001, total_area_ha: 65, village: 'Vadigepalli', taluk: 'S.V. Pura', district: 'Kolar', vidhana_sabha: '', lok_sabha: '', latitude: 13.08, longitude: 78.22 },
    { id: 'plt-b02', range_id: 'rng-svpura', name: 'A.M. Palli', species: 'Eucalyptus Clonal', year_of_planting: 2011, total_area_ha: 37.24, village: 'Erathimmanapalli', taluk: 'S.V. Pura', district: 'Kolar', vidhana_sabha: '', lok_sabha: '', latitude: 13.10, longitude: 78.20 },
    { id: 'plt-b03', range_id: 'rng-dvhalli', name: 'Guduvamahalli', species: 'Eucalyptus Clonal', year_of_planting: 2004, total_area_ha: 77.5, village: 'Koramangala', taluk: 'D.V. Halli', district: 'Doddaballapura', vidhana_sabha: '', lok_sabha: '', latitude: 13.42, longitude: 77.52 },
    { id: 'plt-b04', range_id: 'rng-bidadi', name: 'Hejjala', species: 'Corymbia', year_of_planting: 2025, total_area_ha: 81.91, village: 'Hejjala', taluk: 'Kanakapura', district: 'Ramanagara', vidhana_sabha: '', lok_sabha: '', latitude: 12.72, longitude: 77.38 },
    { id: 'plt-s01', range_id: 'rng-sagara', name: 'Sagara Acacia Block', species: 'Acacia Auriculiformis', year_of_planting: 2020, total_area_ha: 45, village: 'Sagara', taluk: 'Sagara', district: 'Shivamogga', vidhana_sabha: '', lok_sabha: '', latitude: 14.16, longitude: 75.02 },
    { id: 'plt-s02', range_id: 'rng-sagara', name: 'Sagara Eucalyptus Block', species: 'Eucalyptus Pellita', year_of_planting: 2023, total_area_ha: 27, village: 'Sagara', taluk: 'Sagara', district: 'Shivamogga', vidhana_sabha: '', lok_sabha: '', latitude: 14.17, longitude: 75.03 },
    { id: 'plt-c01', range_id: 'rng-koppa', name: 'Koppa Plantation', species: 'Acacia Auriculiformis', year_of_planting: 2018, total_area_ha: 29, village: 'Koppa', taluk: 'Koppa', district: 'Chikkamagaluru', vidhana_sabha: '', lok_sabha: '', latitude: 13.53, longitude: 75.35 },
  ],
}

// ===================== ROUTE HANDLER =====================
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'KFDC iFMS API v2.0 - Works Edition', status: 'running' }))
    }

    // =================== SEED ===================
    if (route === '/seed' && method === 'POST') {
      const collections = ['users', 'divisions', 'ranges', 'activity_master', 'norms_config', 'plantations', 'apo_headers', 'works', 'work_logs', 'sessions']
      for (const col of collections) {
        try { await db.collection(col).drop() } catch (e) { /* ignore */ }
      }

      await db.collection('divisions').insertMany(SEED_DATA.divisions)
      await db.collection('ranges').insertMany(SEED_DATA.ranges)
      await db.collection('users').insertMany(SEED_DATA.users)
      await db.collection('activity_master').insertMany(SEED_DATA.activities)
      await db.collection('norms_config').insertMany(SEED_DATA.norms)
      await db.collection('plantations').insertMany(SEED_DATA.plantations.map(p => ({ ...p, created_at: new Date() })))

      // Sample APO with Works (new structure)
      const sampleApos = [
        { id: 'apo-001', financial_year: '2026-27', status: 'SANCTIONED', total_sanctioned_amount: 185997, created_by: 'usr-ro1', approved_by: 'usr-dm1', created_at: new Date('2026-04-01'), updated_at: new Date('2026-04-05') },
        { id: 'apo-002', financial_year: '2026-27', status: 'DRAFT', total_sanctioned_amount: 0, created_by: 'usr-ro1', approved_by: null, created_at: new Date('2026-05-20'), updated_at: new Date('2026-05-20') },
      ]
      await db.collection('apo_headers').insertMany(sampleApos)

      // Sample Works (NEW entity)
      const sampleWorks = [
        {
          id: 'wrk-001', apo_id: 'apo-001', plantation_id: 'plt-d01', name: '12th Year Maintenance - Varavanagalavi',
          items: [
            { id: 'wi-001', activity_id: 'act-fireline', activity_name: 'Clearing 5m Wide Fire Lines', unit: 'Per Hectare', ssr_no: '99(a)', sanctioned_rate: 5455.86, sanctioned_qty: 25, total_cost: 136396.5 },
            { id: 'wi-002', activity_id: 'act-firewatch', activity_name: 'Engaging Fire Watchers', unit: 'Per Month', ssr_no: '76(1)', sanctioned_rate: 1784.01, sanctioned_qty: 25, total_cost: 44600.25 },
            { id: 'wi-003', activity_id: 'act-misc', activity_name: 'Miscellaneous (Implements, Spray pump etc)', unit: 'Lump Sum', ssr_no: '-', sanctioned_rate: 5000, sanctioned_qty: 1, total_cost: 5000 },
          ],
          total_estimated_cost: 185996.75, created_by: 'usr-ro1', created_at: new Date('2026-04-01'), updated_at: new Date('2026-04-01'),
        },
        {
          id: 'wrk-002', apo_id: 'apo-002', plantation_id: 'plt-d05', name: '8th Year Maintenance - Degaon',
          items: [
            { id: 'wi-004', activity_id: 'act-fireline', activity_name: 'Clearing 5m Wide Fire Lines', unit: 'Per Hectare', ssr_no: '99(a)', sanctioned_rate: 5455.86, sanctioned_qty: 14.6, total_cost: 79655.56 },
            { id: 'wi-005', activity_id: 'act-firewatch', activity_name: 'Engaging Fire Watchers', unit: 'Per Month', ssr_no: '76(1)', sanctioned_rate: 1784.01, sanctioned_qty: 14.6, total_cost: 26046.55 },
          ],
          total_estimated_cost: 105702.11, created_by: 'usr-ro1', created_at: new Date('2026-05-20'), updated_at: new Date('2026-05-20'),
        },
      ]
      await db.collection('works').insertMany(sampleWorks)

      // Sample work logs
      const sampleWorkLogs = [
        { id: 'wl-001', work_item_id: 'wi-001', work_id: 'wrk-001', apo_id: 'apo-001', work_date: new Date('2026-05-15'), actual_qty: 10, expenditure: 54558.6, logged_by: 'usr-ro1', created_at: new Date('2026-05-15') },
      ]
      await db.collection('work_logs').insertMany(sampleWorkLogs)

      return handleCORS(NextResponse.json({ message: 'Database seeded with KFDC data (Works edition)', counts: { divisions: 4, ranges: 19, users: 8, activities: 25, norms: SEED_DATA.norms.length, plantations: SEED_DATA.plantations.length, apos: 2, works: 2 } }))
    }

    // =================== AUTH ===================
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      const { email, password } = body
      if (!email || !password) return handleCORS(NextResponse.json({ error: 'Email and password required' }, { status: 400 }))
      const user = await db.collection('users').findOne({ email, password })
      if (!user) return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }))
      const token = uuidv4()
      await db.collection('sessions').insertOne({ token, user_id: user.id, created_at: new Date() })
      const { password: _, _id, ...userData } = user
      return handleCORS(NextResponse.json({ token, user: userData }))
    }

    if (route === '/auth/me' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const { password: _, _id, ...userData } = user
      let divisionName = null, rangeName = null
      if (userData.division_id) { const d = await db.collection('divisions').findOne({ id: userData.division_id }); divisionName = d?.name }
      if (userData.range_id) { const r = await db.collection('ranges').findOne({ id: userData.range_id }); rangeName = r?.name }
      return handleCORS(NextResponse.json({ ...userData, division_name: divisionName, range_name: rangeName }))
    }

    if (route === '/auth/logout' && method === 'POST') {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) { await db.collection('sessions').deleteOne({ token: authHeader.split(' ')[1] }) }
      return handleCORS(NextResponse.json({ message: 'Logged out' }))
    }

    // =================== DIVISIONS / RANGES / ACTIVITIES ===================
    if (route === '/divisions' && method === 'GET') {
      const divisions = await db.collection('divisions').find({}).toArray()
      return handleCORS(NextResponse.json(divisions.map(({ _id, ...d }) => d)))
    }
    if (route === '/ranges' && method === 'GET') {
      const url = new URL(request.url)
      const divisionId = url.searchParams.get('division_id')
      const filter = divisionId ? { division_id: divisionId } : {}
      const ranges = await db.collection('ranges').find(filter).toArray()
      return handleCORS(NextResponse.json(ranges.map(({ _id, ...r }) => r)))
    }
    if (route === '/activities' && method === 'GET') {
      const url = new URL(request.url)
      const fy = url.searchParams.get('financial_year')
      const pltAge = url.searchParams.get('plantation_age')
      const activities = await db.collection('activity_master').find({}).toArray()
      
      // If age+fy provided, enrich with norms rates
      if (fy && pltAge != null) {
        const age = parseInt(pltAge)
        let norms = await db.collection('norms_config').find({ applicable_age: age, financial_year: fy }).toArray()
        if (norms.length === 0 && age > 0) {
          const allN = await db.collection('norms_config').find({ financial_year: fy, applicable_age: { $lte: age, $gt: 0 } }).sort({ applicable_age: -1 }).toArray()
          if (allN.length > 0) { const na = allN[0].applicable_age; norms = allN.filter(n => n.applicable_age === na) }
        }
        const normMap = {}
        norms.forEach(n => { normMap[n.activity_id] = n.standard_rate })
        const enriched = activities.map(({ _id, ...a }) => ({ ...a, standard_rate: normMap[a.id] || null, has_norm: !!normMap[a.id] }))
        return handleCORS(NextResponse.json(enriched))
      }
      return handleCORS(NextResponse.json(activities.map(({ _id, ...a }) => a)))
    }

    // =================== NORMS ===================
    if (route === '/norms' && method === 'GET') {
      const norms = await db.collection('norms_config').find({}).toArray()
      const activities = await db.collection('activity_master').find({}).toArray()
      const actMap = {}
      activities.forEach(a => { actMap[a.id] = a })
      const enriched = norms.map(({ _id, ...n }) => ({ ...n, activity_name: actMap[n.activity_id]?.name || 'Unknown', category: actMap[n.activity_id]?.category || 'Unknown', unit: actMap[n.activity_id]?.unit || 'Unknown', ssr_no: actMap[n.activity_id]?.ssr_no || '-' }))
      return handleCORS(NextResponse.json(enriched))
    }
    if (route === '/norms' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user || user.role !== 'ADMIN') return handleCORS(NextResponse.json({ error: 'Only Admin can manage the Rate Card' }, { status: 403 }))
      const body = await request.json()
      const norm = { id: uuidv4(), activity_id: body.activity_id, applicable_age: body.applicable_age, species_id: body.species_id || null, standard_rate: parseFloat(body.standard_rate), financial_year: body.financial_year || '2026-27' }
      await db.collection('norms_config').insertOne(norm)
      return handleCORS(NextResponse.json(norm, { status: 201 }))
    }

    // =================== PLANTATIONS ===================
    if (route === '/plantations' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      let filter = {}
      if (user.role === 'RO') filter = { range_id: user.range_id }
      else if (user.role === 'DM') {
        const divRanges = await db.collection('ranges').find({ division_id: user.division_id }).toArray()
        filter = { range_id: { $in: divRanges.map(r => r.id) } }
      }
      const plantations = await db.collection('plantations').find(filter).toArray()
      const ranges = await db.collection('ranges').find({}).toArray()
      const divisions = await db.collection('divisions').find({}).toArray()
      const rangeMap = {}, divMap = {}
      ranges.forEach(r => { rangeMap[r.id] = r }); divisions.forEach(d => { divMap[d.id] = d })
      const enriched = plantations.map(({ _id, ...p }) => {
        const range = rangeMap[p.range_id]; const division = range ? divMap[range.division_id] : null
        return { ...p, range_name: range?.name, division_name: division?.name, age: new Date().getFullYear() - p.year_of_planting }
      })
      return handleCORS(NextResponse.json(enriched))
    }

    if (route === '/plantations' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user || user.role !== 'RO') return handleCORS(NextResponse.json({ error: 'Only RO can create plantations' }, { status: 403 }))
      const body = await request.json()
      const plantation = {
        id: uuidv4(), range_id: user.range_id, name: body.name, species: body.species,
        year_of_planting: parseInt(body.year_of_planting), total_area_ha: parseFloat(body.total_area_ha),
        village: body.village || null, taluk: body.taluk || null, district: body.district || null,
        vidhana_sabha: body.vidhana_sabha || '', lok_sabha: body.lok_sabha || '',
        latitude: body.latitude ? parseFloat(body.latitude) : null, longitude: body.longitude ? parseFloat(body.longitude) : null,
        created_at: new Date(),
      }
      await db.collection('plantations').insertOne(plantation)
      return handleCORS(NextResponse.json(plantation, { status: 201 }))
    }

    // Plantation Edit (NEW)
    const plantationEditMatch = route.match(/^\/plantations\/([^/]+)$/)
    if (plantationEditMatch && method === 'PUT') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const pId = plantationEditMatch[1]
      const body = await request.json()
      const updateFields = {}
      const allowed = ['name', 'species', 'year_of_planting', 'total_area_ha', 'village', 'taluk', 'district', 'vidhana_sabha', 'lok_sabha', 'latitude', 'longitude']
      allowed.forEach(f => { if (body[f] !== undefined) updateFields[f] = body[f] })
      if (updateFields.year_of_planting) updateFields.year_of_planting = parseInt(updateFields.year_of_planting)
      if (updateFields.total_area_ha) updateFields.total_area_ha = parseFloat(updateFields.total_area_ha)
      if (updateFields.latitude) updateFields.latitude = parseFloat(updateFields.latitude)
      if (updateFields.longitude) updateFields.longitude = parseFloat(updateFields.longitude)
      await db.collection('plantations').updateOne({ id: pId }, { $set: updateFields })
      const updated = await db.collection('plantations').findOne({ id: pId })
      const { _id, ...data } = updated
      return handleCORS(NextResponse.json(data))
    }

    if (plantationEditMatch && method === 'GET') {
      const pId = plantationEditMatch[1]
      const plantation = await db.collection('plantations').findOne({ id: pId })
      if (!plantation) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      const { _id, ...p } = plantation
      const range = await db.collection('ranges').findOne({ id: p.range_id })
      const division = range ? await db.collection('divisions').findOne({ id: range.division_id }) : null
      return handleCORS(NextResponse.json({ ...p, age: new Date().getFullYear() - p.year_of_planting, range_name: range?.name, division_name: division?.name }))
    }

    const plantationHistoryMatch = route.match(/^\/plantations\/([^/]+)\/history$/)
    if (plantationHistoryMatch && method === 'GET') {
      const pId = plantationHistoryMatch[1]
      // Find all works for this plantation
      const works = await db.collection('works').find({ plantation_id: pId }).sort({ created_at: -1 }).toArray()
      return handleCORS(NextResponse.json(works.map(({ _id, ...w }) => w)))
    }

    // =================== APO (Now a collection of Works) ===================
    if (route === '/apo' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      if (user.role !== 'RO') return handleCORS(NextResponse.json({ error: 'Only RO can create APOs' }, { status: 403 }))
      const body = await request.json()
      const apo = {
        id: uuidv4(), financial_year: body.financial_year || '2026-27',
        status: 'DRAFT', total_sanctioned_amount: 0,
        created_by: user.id, approved_by: null,
        created_at: new Date(), updated_at: new Date(),
      }
      await db.collection('apo_headers').insertOne(apo)
      const { _id, ...result } = apo
      return handleCORS(NextResponse.json(result, { status: 201 }))
    }

    if (route === '/apo' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      let filter = {}
      if (user.role === 'RO') filter = { created_by: user.id }
      else if (user.role === 'DM') {
        const divRanges = await db.collection('ranges').find({ division_id: user.division_id }).toArray()
        const divUsers = await db.collection('users').find({ range_id: { $in: divRanges.map(r => r.id) } }).toArray()
        filter = { created_by: { $in: divUsers.map(u => u.id) } }
      }
      const url = new URL(request.url)
      const statusFilter = url.searchParams.get('status')
      if (statusFilter) filter.status = statusFilter

      const apos = await db.collection('apo_headers').find(filter).sort({ created_at: -1 }).toArray()
      const users = await db.collection('users').find({}).toArray()
      const userMap = {}; users.forEach(u => { userMap[u.id] = u })

      // Enrich each APO with works count and total
      const enriched = []
      for (const apo of apos) {
        const works = await db.collection('works').find({ apo_id: apo.id }).toArray()
        const totalAmount = works.reduce((s, w) => s + (w.total_estimated_cost || 0), 0)
        const plantationIds = [...new Set(works.map(w => w.plantation_id))]
        const plantationNames = []
        for (const pid of plantationIds) {
          const plt = await db.collection('plantations').findOne({ id: pid })
          if (plt) plantationNames.push(plt.name)
        }
        const { _id, ...a } = apo
        enriched.push({
          ...a, works_count: works.length, total_amount: totalAmount,
          plantation_names: plantationNames,
          created_by_name: userMap[a.created_by]?.name || 'Unknown',
          approved_by_name: a.approved_by ? userMap[a.approved_by]?.name : null,
        })
      }
      return handleCORS(NextResponse.json(enriched))
    }

    // APO Detail
    const apoDetailMatch = route.match(/^\/apo\/([^/]+)$/)
    if (apoDetailMatch && method === 'GET') {
      const apoId = apoDetailMatch[1]
      const apo = await db.collection('apo_headers').findOne({ id: apoId })
      if (!apo) return handleCORS(NextResponse.json({ error: 'APO not found' }, { status: 404 }))
      
      const works = await db.collection('works').find({ apo_id: apoId }).toArray()
      const creator = await db.collection('users').findOne({ id: apo.created_by })
      const approver = apo.approved_by ? await db.collection('users').findOne({ id: apo.approved_by }) : null

      // Enrich works with plantation info and work logs
      const enrichedWorks = []
      for (const work of works) {
        const plt = await db.collection('plantations').findOne({ id: work.plantation_id })
        // Get work logs for each item in this work
        const itemsWithLogs = []
        for (const item of (work.items || [])) {
          const logs = await db.collection('work_logs').find({ work_item_id: item.id }).toArray()
          const totalSpent = logs.reduce((s, l) => s + l.expenditure, 0)
          itemsWithLogs.push({
            ...item, total_spent: totalSpent,
            remaining_budget: item.total_cost - totalSpent,
            utilization_pct: item.total_cost > 0 ? Math.round((totalSpent / item.total_cost) * 100) : 0,
            work_logs: logs.map(({ _id, ...l }) => l),
          })
        }
        const { _id, ...wd } = work
        enrichedWorks.push({
          ...wd, items: itemsWithLogs,
          plantation_name: plt?.name, species: plt?.species,
          total_area_ha: plt?.total_area_ha,
          plantation_age: plt ? new Date().getFullYear() - plt.year_of_planting : null,
        })
      }

      const totalAmount = enrichedWorks.reduce((s, w) => s + (w.total_estimated_cost || 0), 0)
      const totalSpent = enrichedWorks.reduce((s, w) => s + w.items.reduce((ss, i) => ss + (i.total_spent || 0), 0), 0)

      const { _id, ...apoData } = apo
      return handleCORS(NextResponse.json({
        ...apoData, works: enrichedWorks, total_amount: totalAmount, total_spent: totalSpent,
        utilization_pct: totalAmount > 0 ? Math.round((totalSpent / totalAmount) * 100) : 0,
        created_by_name: creator?.name, approved_by_name: approver?.name,
      }))
    }

    // APO Status Update
    const apoStatusMatch = route.match(/^\/apo\/([^/]+)\/status$/)
    if (apoStatusMatch && method === 'PATCH') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const apoId = apoStatusMatch[1]
      const body = await request.json()
      const { status } = body
      const apo = await db.collection('apo_headers').findOne({ id: apoId })
      if (!apo) return handleCORS(NextResponse.json({ error: 'APO not found' }, { status: 404 }))

      const validTransitions = { 'DRAFT': ['PENDING_APPROVAL'], 'PENDING_APPROVAL': ['SANCTIONED', 'REJECTED'], 'REJECTED': ['DRAFT'] }
      if (!validTransitions[apo.status]?.includes(status)) {
        return handleCORS(NextResponse.json({ error: `Cannot transition from ${apo.status} to ${status}` }, { status: 400 }))
      }
      if (['SANCTIONED', 'REJECTED'].includes(status) && !['DM', 'ADMIN'].includes(user.role)) {
        return handleCORS(NextResponse.json({ error: 'Only DM/Admin can approve or reject APOs' }, { status: 403 }))
      }

      // On submit, recalculate total from works
      const works = await db.collection('works').find({ apo_id: apoId }).toArray()
      const totalAmount = works.reduce((s, w) => s + (w.total_estimated_cost || 0), 0)

      const updateData = { status, total_sanctioned_amount: totalAmount, updated_at: new Date() }
      if (['SANCTIONED', 'REJECTED'].includes(status)) updateData.approved_by = user.id

      await db.collection('apo_headers').updateOne({ id: apoId }, { $set: updateData })
      return handleCORS(NextResponse.json({ message: `APO ${status.toLowerCase()}`, apo_id: apoId, new_status: status, total_amount: totalAmount }))
    }

    // =================== WORKS (NEW) ===================
    if (route === '/works' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      if (user.role !== 'RO') return handleCORS(NextResponse.json({ error: 'Only RO can create works' }, { status: 403 }))

      const body = await request.json()
      const { apo_id, plantation_id, name, items } = body

      // Validate APO exists and is DRAFT
      const apo = await db.collection('apo_headers').findOne({ id: apo_id })
      if (!apo) return handleCORS(NextResponse.json({ error: 'APO not found' }, { status: 404 }))
      if (apo.status !== 'DRAFT') return handleCORS(NextResponse.json({ error: 'Can only add works to DRAFT APOs' }, { status: 400 }))

      const plantation = await db.collection('plantations').findOne({ id: plantation_id })
      if (!plantation) return handleCORS(NextResponse.json({ error: 'Plantation not found' }, { status: 404 }))

      const workItems = (items || []).map(item => ({
        id: uuidv4(),
        activity_id: item.activity_id,
        activity_name: item.activity_name,
        unit: item.unit || '',
        ssr_no: item.ssr_no || '-',
        sanctioned_rate: parseFloat(item.sanctioned_rate),
        sanctioned_qty: parseFloat(item.sanctioned_qty),
        total_cost: Math.round(parseFloat(item.sanctioned_rate) * parseFloat(item.sanctioned_qty) * 100) / 100,
      }))

      const totalCost = workItems.reduce((s, i) => s + i.total_cost, 0)

      const work = {
        id: uuidv4(), apo_id, plantation_id,
        name: name || `${plantation.name} - Maintenance`,
        items: workItems, total_estimated_cost: Math.round(totalCost * 100) / 100,
        created_by: user.id, created_at: new Date(), updated_at: new Date(),
      }
      await db.collection('works').insertOne(work)

      // Update APO total
      const allWorks = await db.collection('works').find({ apo_id }).toArray()
      const apoTotal = allWorks.reduce((s, w) => s + (w.total_estimated_cost || 0), 0)
      await db.collection('apo_headers').updateOne({ id: apo_id }, { $set: { total_sanctioned_amount: apoTotal, updated_at: new Date() } })

      const { _id, ...result } = work
      return handleCORS(NextResponse.json(result, { status: 201 }))
    }

    if (route === '/works' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const url = new URL(request.url)
      const apoId = url.searchParams.get('apo_id')
      const filter = apoId ? { apo_id: apoId } : { created_by: user.id }
      const works = await db.collection('works').find(filter).sort({ created_at: -1 }).toArray()
      
      const plantations = await db.collection('plantations').find({}).toArray()
      const pltMap = {}; plantations.forEach(p => { pltMap[p.id] = p })

      const enriched = works.map(({ _id, ...w }) => ({
        ...w, plantation_name: pltMap[w.plantation_id]?.name, species: pltMap[w.plantation_id]?.species,
        plantation_age: pltMap[w.plantation_id] ? new Date().getFullYear() - pltMap[w.plantation_id].year_of_planting : null,
      }))
      return handleCORS(NextResponse.json(enriched))
    }

    // Delete Work (only from DRAFT APO)
    const workDeleteMatch = route.match(/^\/works\/([^/]+)$/)
    if (workDeleteMatch && method === 'DELETE') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const workId = workDeleteMatch[1]
      const work = await db.collection('works').findOne({ id: workId })
      if (!work) return handleCORS(NextResponse.json({ error: 'Work not found' }, { status: 404 }))
      const apo = await db.collection('apo_headers').findOne({ id: work.apo_id })
      if (apo?.status !== 'DRAFT') return handleCORS(NextResponse.json({ error: 'Can only remove works from DRAFT APOs' }, { status: 400 }))
      
      await db.collection('works').deleteOne({ id: workId })
      // Update APO total
      const remaining = await db.collection('works').find({ apo_id: work.apo_id }).toArray()
      const newTotal = remaining.reduce((s, w) => s + (w.total_estimated_cost || 0), 0)
      await db.collection('apo_headers').updateOne({ id: work.apo_id }, { $set: { total_sanctioned_amount: newTotal, updated_at: new Date() } })
      return handleCORS(NextResponse.json({ message: 'Work removed' }))
    }

    // =================== WORK LOGS ===================
    if (route === '/work-logs' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      if (user.role !== 'RO') return handleCORS(NextResponse.json({ error: 'Only RO can log work' }, { status: 403 }))

      const body = await request.json()
      const { work_item_id, work_id, actual_qty, expenditure, work_date } = body

      // Find the work and validate
      const work = await db.collection('works').findOne({ id: work_id })
      if (!work) return handleCORS(NextResponse.json({ error: 'Work not found' }, { status: 404 }))
      const apo = await db.collection('apo_headers').findOne({ id: work.apo_id })
      if (!apo || apo.status !== 'SANCTIONED') return handleCORS(NextResponse.json({ error: 'Can only log work against sanctioned APOs' }, { status: 400 }))

      const item = work.items?.find(i => i.id === work_item_id)
      if (!item) return handleCORS(NextResponse.json({ error: 'Work item not found' }, { status: 404 }))

      // Budget check
      const existingLogs = await db.collection('work_logs').find({ work_item_id }).toArray()
      const totalSpent = existingLogs.reduce((s, l) => s + l.expenditure, 0)
      if (totalSpent + parseFloat(expenditure) > item.total_cost) {
        return handleCORS(NextResponse.json({ error: 'Budget Exceeded', detail: `Budget: ${item.total_cost}, Spent: ${totalSpent}, Requested: ${expenditure}, Available: ${Math.round((item.total_cost - totalSpent) * 100) / 100}` }, { status: 400 }))
      }

      const log = {
        id: uuidv4(), work_item_id, work_id, apo_id: work.apo_id,
        work_date: work_date ? new Date(work_date) : new Date(),
        actual_qty: parseFloat(actual_qty), expenditure: parseFloat(expenditure),
        logged_by: user.id, created_at: new Date(),
      }
      await db.collection('work_logs').insertOne(log)
      const { _id, ...result } = log
      return handleCORS(NextResponse.json(result, { status: 201 }))
    }

    if (route === '/work-logs' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const url = new URL(request.url)
      const workItemId = url.searchParams.get('work_item_id')
      const filter = workItemId ? { work_item_id: workItemId } : {}
      if (user.role === 'RO') filter.logged_by = user.id
      const logs = await db.collection('work_logs').find(filter).sort({ created_at: -1 }).toArray()
      return handleCORS(NextResponse.json(logs.map(({ _id, ...l }) => l)))
    }

    // =================== DASHBOARD STATS ===================
    if (route === '/dashboard/stats' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      let apoFilter = {}, plantationFilter = {}
      if (user.role === 'RO') {
        apoFilter = { created_by: user.id }; plantationFilter = { range_id: user.range_id }
      } else if (user.role === 'DM') {
        const divRanges = await db.collection('ranges').find({ division_id: user.division_id }).toArray()
        const rangeIds = divRanges.map(r => r.id)
        const divUsers = await db.collection('users').find({ range_id: { $in: rangeIds } }).toArray()
        apoFilter = { created_by: { $in: divUsers.map(u => u.id) } }
        plantationFilter = { range_id: { $in: rangeIds } }
      }

      const totalPlantations = await db.collection('plantations').countDocuments(plantationFilter)
      const allApos = await db.collection('apo_headers').find(apoFilter).toArray()
      const plantations = await db.collection('plantations').find(plantationFilter).toArray()
      const totalArea = plantations.reduce((s, p) => s + (p.total_area_ha || 0), 0)

      const sanctionedApoIds = allApos.filter(a => a.status === 'SANCTIONED').map(a => a.id)
      const allWorks = await db.collection('works').find({ apo_id: { $in: sanctionedApoIds } }).toArray()
      const totalSanctioned = allWorks.reduce((s, w) => s + (w.total_estimated_cost || 0), 0)

      const allItemIds = allWorks.flatMap(w => (w.items || []).map(i => i.id))
      const workLogs = await db.collection('work_logs').find({ work_item_id: { $in: allItemIds } }).toArray()
      const totalExpenditure = workLogs.reduce((s, l) => s + l.expenditure, 0)

      // Budget by activity for chart
      const budgetByActivity = {}
      for (const w of allWorks) {
        for (const item of (w.items || [])) {
          const key = item.activity_name || 'Unknown'
          if (!budgetByActivity[key]) budgetByActivity[key] = { sanctioned: 0, spent: 0 }
          budgetByActivity[key].sanctioned += item.total_cost
        }
      }
      for (const log of workLogs) {
        for (const w of allWorks) {
          const item = (w.items || []).find(i => i.id === log.work_item_id)
          if (item) { const key = item.activity_name || 'Unknown'; if (budgetByActivity[key]) budgetByActivity[key].spent += log.expenditure; break }
        }
      }

      return handleCORS(NextResponse.json({
        total_plantations: totalPlantations, total_area_ha: totalArea,
        total_apos: allApos.length, draft_apos: allApos.filter(a => a.status === 'DRAFT').length,
        pending_apos: allApos.filter(a => a.status === 'PENDING_APPROVAL').length,
        sanctioned_apos: allApos.filter(a => a.status === 'SANCTIONED').length,
        rejected_apos: allApos.filter(a => a.status === 'REJECTED').length,
        total_works: allWorks.length,
        total_sanctioned_amount: Math.round(totalSanctioned), total_expenditure: Math.round(totalExpenditure),
        utilization_pct: totalSanctioned > 0 ? Math.round((totalExpenditure / totalSanctioned) * 100) : 0,
        budget_chart: Object.entries(budgetByActivity).map(([name, data]) => ({ name, sanctioned: Math.round(data.sanctioned), spent: Math.round(data.spent) })),
      }))
    }

    // =================== GENERATE SUGGESTED ACTIVITIES (for Work creation) ===================
    if (route === '/works/suggest-activities' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const body = await request.json()
      const { plantation_id, financial_year } = body
      const plantation = await db.collection('plantations').findOne({ id: plantation_id })
      if (!plantation) return handleCORS(NextResponse.json({ error: 'Plantation not found' }, { status: 404 }))

      const age = new Date().getFullYear() - plantation.year_of_planting
      let norms = await db.collection('norms_config').find({ applicable_age: age, financial_year }).toArray()
      if (norms.length === 0 && age > 0) {
        const allN = await db.collection('norms_config').find({ financial_year, applicable_age: { $lte: age, $gt: 0 } }).sort({ applicable_age: -1 }).toArray()
        if (allN.length > 0) { const na = allN[0].applicable_age; norms = allN.filter(n => n.applicable_age === na) }
      }

      const activities = await db.collection('activity_master').find({}).toArray()
      const actMap = {}; activities.forEach(a => { actMap[a.id] = a })

      const suggestions = norms.map(n => ({
        activity_id: n.activity_id, activity_name: actMap[n.activity_id]?.name || 'Unknown',
        category: actMap[n.activity_id]?.category || 'Unknown', unit: actMap[n.activity_id]?.unit || 'Unknown',
        ssr_no: actMap[n.activity_id]?.ssr_no || '-', sanctioned_rate: n.standard_rate,
        suggested_qty: plantation.total_area_ha, total_cost: Math.round(n.standard_rate * plantation.total_area_ha * 100) / 100,
      }))

      return handleCORS(NextResponse.json({
        plantation_id, plantation_name: plantation.name, species: plantation.species,
        age, financial_year, total_area_ha: plantation.total_area_ha,
        suggested_activities: suggestions, total_estimated_cost: suggestions.reduce((s, i) => s + i.total_cost, 0),
      }))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
