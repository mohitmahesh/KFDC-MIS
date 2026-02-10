import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

// MongoDB connection
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
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Auth middleware helper
async function getUser(request, db) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  const session = await db.collection('sessions').findOne({ token })
  if (!session) return null
  const user = await db.collection('users').findOne({ id: session.user_id })
  return user
}

// ===================== SEED DATA =====================
const SEED_DATA = {
  divisions: [
    { id: 'div-shimoga', name: 'Shimoga', code: 'SHM' },
    { id: 'div-mysore', name: 'Mysore', code: 'MYS' },
  ],
  ranges: [
    { id: 'rng-sagara', division_id: 'div-shimoga', name: 'Sagara Range' },
    { id: 'rng-soraba', division_id: 'div-shimoga', name: 'Soraba Range' },
    { id: 'rng-hunsur', division_id: 'div-mysore', name: 'Hunsur Range' },
    { id: 'rng-hdkote', division_id: 'div-mysore', name: 'H.D. Kote Range' },
  ],
  users: [
    { id: 'usr-ro1', email: 'ro.sagara@kfdc.in', password: 'pass123', name: 'Ramesh Kumar', role: 'RO', division_id: 'div-shimoga', range_id: 'rng-sagara' },
    { id: 'usr-ro2', email: 'ro.hunsur@kfdc.in', password: 'pass123', name: 'Suresh Gowda', role: 'RO', division_id: 'div-mysore', range_id: 'rng-hunsur' },
    { id: 'usr-dm1', email: 'dm.shimoga@kfdc.in', password: 'pass123', name: 'Anjali Sharma', role: 'DM', division_id: 'div-shimoga', range_id: null },
    { id: 'usr-dm2', email: 'dm.mysore@kfdc.in', password: 'pass123', name: 'Priya Hegde', role: 'DM', division_id: 'div-mysore', range_id: null },
    { id: 'usr-admin1', email: 'admin@kfdc.in', password: 'pass123', name: 'Dr. Venkatesh Rao', role: 'ADMIN', division_id: null, range_id: null },
  ],
  activities: [
    { id: 'act-weeding', name: 'Weeding', category: 'Maintenance', unit: 'Per Hectare' },
    { id: 'act-soilwork', name: 'Soil Working', category: 'Maintenance', unit: 'Per Hectare' },
    { id: 'act-fireline', name: 'Fire Line Tracing', category: 'Maintenance', unit: 'Per Km' },
    { id: 'act-firewatch', name: 'Fire Watching', category: 'Maintenance', unit: 'Per Hectare' },
    { id: 'act-casualty', name: 'Casualty Replacement', category: 'Maintenance', unit: 'Per Hectare' },
    { id: 'act-pruning', name: 'Pruning', category: 'Maintenance', unit: 'Per Hectare' },
    { id: 'act-thinning', name: 'Thinning', category: 'Harvesting', unit: 'Per Hectare' },
    { id: 'act-nursery', name: 'Nursery Raising', category: 'Nursery', unit: 'Per 1000 Seedlings' },
    { id: 'act-fencing', name: 'Fencing Repair', category: 'Maintenance', unit: 'Per Km' },
    { id: 'act-manuring', name: 'Manuring', category: 'Maintenance', unit: 'Per Hectare' },
  ],
  norms: [
    // Year 1 norms
    { id: 'norm-1', activity_id: 'act-weeding', applicable_age: 1, species_id: null, standard_rate: 5500, financial_year: '2025-26' },
    { id: 'norm-2', activity_id: 'act-soilwork', applicable_age: 1, species_id: null, standard_rate: 4200, financial_year: '2025-26' },
    { id: 'norm-3', activity_id: 'act-casualty', applicable_age: 1, species_id: null, standard_rate: 3800, financial_year: '2025-26' },
    { id: 'norm-4', activity_id: 'act-fencing', applicable_age: 1, species_id: null, standard_rate: 12000, financial_year: '2025-26' },
    { id: 'norm-5', activity_id: 'act-manuring', applicable_age: 1, species_id: null, standard_rate: 3500, financial_year: '2025-26' },
    // Year 2 norms
    { id: 'norm-6', activity_id: 'act-weeding', applicable_age: 2, species_id: null, standard_rate: 5000, financial_year: '2025-26' },
    { id: 'norm-7', activity_id: 'act-soilwork', applicable_age: 2, species_id: null, standard_rate: 4000, financial_year: '2025-26' },
    { id: 'norm-8', activity_id: 'act-fireline', applicable_age: 2, species_id: null, standard_rate: 8500, financial_year: '2025-26' },
    { id: 'norm-9', activity_id: 'act-firewatch', applicable_age: 2, species_id: null, standard_rate: 3000, financial_year: '2025-26' },
    { id: 'norm-10', activity_id: 'act-casualty', applicable_age: 2, species_id: null, standard_rate: 2500, financial_year: '2025-26' },
    // Year 3 norms
    { id: 'norm-11', activity_id: 'act-weeding', applicable_age: 3, species_id: null, standard_rate: 4500, financial_year: '2025-26' },
    { id: 'norm-12', activity_id: 'act-fireline', applicable_age: 3, species_id: null, standard_rate: 8500, financial_year: '2025-26' },
    { id: 'norm-13', activity_id: 'act-firewatch', applicable_age: 3, species_id: null, standard_rate: 3000, financial_year: '2025-26' },
    { id: 'norm-14', activity_id: 'act-pruning', applicable_age: 3, species_id: null, standard_rate: 6000, financial_year: '2025-26' },
    // Year 4+ norms
    { id: 'norm-15', activity_id: 'act-fireline', applicable_age: 4, species_id: null, standard_rate: 8500, financial_year: '2025-26' },
    { id: 'norm-16', activity_id: 'act-firewatch', applicable_age: 4, species_id: null, standard_rate: 3000, financial_year: '2025-26' },
    { id: 'norm-17', activity_id: 'act-pruning', applicable_age: 4, species_id: null, standard_rate: 6500, financial_year: '2025-26' },
    { id: 'norm-18', activity_id: 'act-thinning', applicable_age: 4, species_id: null, standard_rate: 15000, financial_year: '2025-26' },
    // Year 5
    { id: 'norm-19', activity_id: 'act-fireline', applicable_age: 5, species_id: null, standard_rate: 9000, financial_year: '2025-26' },
    { id: 'norm-20', activity_id: 'act-thinning', applicable_age: 5, species_id: null, standard_rate: 16000, financial_year: '2025-26' },
  ],
  plantations: [
    { id: 'plt-001', range_id: 'rng-sagara', name: 'Sagara Teak Block A', species: 'Teak', year_of_planting: 2024, total_area_ha: 25.5 },
    { id: 'plt-002', range_id: 'rng-sagara', name: 'Sagara Eucalyptus Block B', species: 'Eucalyptus', year_of_planting: 2023, total_area_ha: 40.0 },
    { id: 'plt-003', range_id: 'rng-soraba', name: 'Soraba Silver Oak Block C', species: 'Silver Oak', year_of_planting: 2022, total_area_ha: 18.0 },
    { id: 'plt-004', range_id: 'rng-soraba', name: 'Soraba Teak Block D', species: 'Teak', year_of_planting: 2021, total_area_ha: 30.0 },
    { id: 'plt-005', range_id: 'rng-hunsur', name: 'Hunsur Sandalwood Block E', species: 'Sandalwood', year_of_planting: 2023, total_area_ha: 12.0 },
    { id: 'plt-006', range_id: 'rng-hunsur', name: 'Hunsur Bamboo Block F', species: 'Bamboo', year_of_planting: 2020, total_area_ha: 55.0 },
    { id: 'plt-007', range_id: 'rng-hdkote', name: 'H.D. Kote Rosewood Block G', species: 'Rosewood', year_of_planting: 2022, total_area_ha: 22.0 },
    { id: 'plt-008', range_id: 'rng-hdkote', name: 'H.D. Kote Teak Block H', species: 'Teak', year_of_planting: 2024, total_area_ha: 35.0 },
  ],
}

// ===================== ROUTE HANDLER =====================
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // =================== ROOT ===================
    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'KFDC iFMS API v1.0', status: 'running' }))
    }

    // =================== SEED ===================
    if (route === '/seed' && method === 'POST') {
      // Drop existing collections
      const collections = ['users', 'divisions', 'ranges', 'activity_master', 'norms_config', 'plantations', 'apo_headers', 'apo_items', 'work_logs', 'sessions']
      for (const col of collections) {
        try { await db.collection(col).drop() } catch (e) { /* ignore if not exists */ }
      }

      await db.collection('divisions').insertMany(SEED_DATA.divisions)
      await db.collection('ranges').insertMany(SEED_DATA.ranges)
      await db.collection('users').insertMany(SEED_DATA.users)
      await db.collection('activity_master').insertMany(SEED_DATA.activities)
      await db.collection('norms_config').insertMany(SEED_DATA.norms)
      await db.collection('plantations').insertMany(SEED_DATA.plantations.map(p => ({ ...p, created_at: new Date() })))

      // Create sample APOs
      const sampleApos = [
        {
          id: 'apo-001',
          plantation_id: 'plt-002',
          financial_year: '2025-26',
          status: 'SANCTIONED',
          total_sanctioned_amount: 402500,
          created_by: 'usr-ro1',
          approved_by: 'usr-dm1',
          created_at: new Date('2025-04-01'),
          updated_at: new Date('2025-04-05'),
        },
        {
          id: 'apo-002',
          plantation_id: 'plt-004',
          financial_year: '2025-26',
          status: 'PENDING_APPROVAL',
          total_sanctioned_amount: 145000,
          created_by: 'usr-ro1',
          approved_by: null,
          created_at: new Date('2025-05-10'),
          updated_at: new Date('2025-05-10'),
        },
      ]
      await db.collection('apo_headers').insertMany(sampleApos)

      const sampleApoItems = [
        { id: 'apoi-001', apo_id: 'apo-001', activity_id: 'act-weeding', activity_name: 'Weeding', sanctioned_qty: 40, sanctioned_rate: 5000, total_cost: 200000, unit: 'Per Hectare' },
        { id: 'apoi-002', apo_id: 'apo-001', activity_id: 'act-soilwork', activity_name: 'Soil Working', sanctioned_qty: 40, sanctioned_rate: 4000, total_cost: 160000, unit: 'Per Hectare' },
        { id: 'apoi-003', apo_id: 'apo-001', activity_id: 'act-fireline', activity_name: 'Fire Line Tracing', sanctioned_qty: 5, sanctioned_rate: 8500, total_cost: 42500, unit: 'Per Km' },
        { id: 'apoi-004', apo_id: 'apo-002', activity_id: 'act-fireline', activity_name: 'Fire Line Tracing', sanctioned_qty: 8, sanctioned_rate: 8500, total_cost: 68000, unit: 'Per Km' },
        { id: 'apoi-005', apo_id: 'apo-002', activity_id: 'act-pruning', activity_name: 'Pruning', sanctioned_qty: 30, sanctioned_rate: 6500, total_cost: 195000, unit: 'Per Hectare' },
      ]
      await db.collection('apo_items').insertMany(sampleApoItems)

      // Sample work logs
      const sampleWorkLogs = [
        { id: 'wl-001', apo_item_id: 'apoi-001', work_date: new Date('2025-05-15'), actual_qty: 10, expenditure: 50000, logged_by: 'usr-ro1', created_at: new Date('2025-05-15') },
        { id: 'wl-002', apo_item_id: 'apoi-002', work_date: new Date('2025-05-20'), actual_qty: 15, expenditure: 60000, logged_by: 'usr-ro1', created_at: new Date('2025-05-20') },
      ]
      await db.collection('work_logs').insertMany(sampleWorkLogs)

      return handleCORS(NextResponse.json({ message: 'Database seeded successfully', counts: { divisions: 2, ranges: 4, users: 5, activities: 10, norms: 20, plantations: 8, apos: 2 } }))
    }

    // =================== AUTH ===================
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      const { email, password } = body
      if (!email || !password) {
        return handleCORS(NextResponse.json({ error: 'Email and password required' }, { status: 400 }))
      }
      const user = await db.collection('users').findOne({ email, password })
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }))
      }
      const token = uuidv4()
      await db.collection('sessions').insertOne({ token, user_id: user.id, created_at: new Date() })
      const { password: _, _id, ...userData } = user
      return handleCORS(NextResponse.json({ token, user: userData }))
    }

    if (route === '/auth/me' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const { password: _, _id, ...userData } = user
      // Get division and range names
      let divisionName = null
      let rangeName = null
      if (userData.division_id) {
        const div = await db.collection('divisions').findOne({ id: userData.division_id })
        divisionName = div?.name
      }
      if (userData.range_id) {
        const rng = await db.collection('ranges').findOne({ id: userData.range_id })
        rangeName = rng?.name
      }
      return handleCORS(NextResponse.json({ ...userData, division_name: divisionName, range_name: rangeName }))
    }

    if (route === '/auth/logout' && method === 'POST') {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        await db.collection('sessions').deleteOne({ token })
      }
      return handleCORS(NextResponse.json({ message: 'Logged out' }))
    }

    // =================== DIVISIONS ===================
    if (route === '/divisions' && method === 'GET') {
      const divisions = await db.collection('divisions').find({}).toArray()
      return handleCORS(NextResponse.json(divisions.map(({ _id, ...d }) => d)))
    }

    // =================== RANGES ===================
    if (route === '/ranges' && method === 'GET') {
      const url = new URL(request.url)
      const divisionId = url.searchParams.get('division_id')
      const filter = divisionId ? { division_id: divisionId } : {}
      const ranges = await db.collection('ranges').find(filter).toArray()
      return handleCORS(NextResponse.json(ranges.map(({ _id, ...r }) => r)))
    }

    // =================== ACTIVITIES ===================
    if (route === '/activities' && method === 'GET') {
      const activities = await db.collection('activity_master').find({}).toArray()
      return handleCORS(NextResponse.json(activities.map(({ _id, ...a }) => a)))
    }

    // =================== NORMS ===================
    if (route === '/norms' && method === 'GET') {
      const norms = await db.collection('norms_config').find({}).toArray()
      const activities = await db.collection('activity_master').find({}).toArray()
      const actMap = {}
      activities.forEach(a => { actMap[a.id] = a })
      const enriched = norms.map(({ _id, ...n }) => ({
        ...n,
        activity_name: actMap[n.activity_id]?.name || 'Unknown',
        category: actMap[n.activity_id]?.category || 'Unknown',
        unit: actMap[n.activity_id]?.unit || 'Unknown',
      }))
      return handleCORS(NextResponse.json(enriched))
    }

    if (route === '/norms' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user || user.role !== 'ADMIN') {
        return handleCORS(NextResponse.json({ error: 'Only Admin can manage norms' }, { status: 403 }))
      }
      const body = await request.json()
      const norm = {
        id: uuidv4(),
        activity_id: body.activity_id,
        applicable_age: body.applicable_age,
        species_id: body.species_id || null,
        standard_rate: parseFloat(body.standard_rate),
        financial_year: body.financial_year || '2025-26',
      }
      await db.collection('norms_config').insertOne(norm)
      return handleCORS(NextResponse.json(norm, { status: 201 }))
    }

    // =================== PLANTATIONS ===================
    if (route === '/plantations' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      let filter = {}
      if (user.role === 'RO') {
        filter = { range_id: user.range_id }
      } else if (user.role === 'DM') {
        const divRanges = await db.collection('ranges').find({ division_id: user.division_id }).toArray()
        const rangeIds = divRanges.map(r => r.id)
        filter = { range_id: { $in: rangeIds } }
      }
      // ADMIN sees all

      const plantations = await db.collection('plantations').find(filter).toArray()
      // Enrich with range/division names
      const ranges = await db.collection('ranges').find({}).toArray()
      const divisions = await db.collection('divisions').find({}).toArray()
      const rangeMap = {}
      const divMap = {}
      ranges.forEach(r => { rangeMap[r.id] = r })
      divisions.forEach(d => { divMap[d.id] = d })

      const enriched = plantations.map(({ _id, ...p }) => {
        const range = rangeMap[p.range_id]
        const division = range ? divMap[range.division_id] : null
        const age = new Date().getFullYear() - p.year_of_planting
        return { ...p, range_name: range?.name, division_name: division?.name, age }
      })
      return handleCORS(NextResponse.json(enriched))
    }

    if (route === '/plantations' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user || user.role !== 'RO') {
        return handleCORS(NextResponse.json({ error: 'Only Range Officers can create plantations' }, { status: 403 }))
      }
      const body = await request.json()
      const plantation = {
        id: uuidv4(),
        range_id: user.range_id,
        name: body.name,
        species: body.species,
        year_of_planting: parseInt(body.year_of_planting),
        total_area_ha: parseFloat(body.total_area_ha),
        created_at: new Date(),
      }
      await db.collection('plantations').insertOne(plantation)
      return handleCORS(NextResponse.json(plantation, { status: 201 }))
    }

    // Plantation detail & history
    const plantationDetailMatch = route.match(/^\/plantations\/([^/]+)$/)
    if (plantationDetailMatch && method === 'GET') {
      const pId = plantationDetailMatch[1]
      const plantation = await db.collection('plantations').findOne({ id: pId })
      if (!plantation) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      const { _id, ...p } = plantation
      const age = new Date().getFullYear() - p.year_of_planting
      const range = await db.collection('ranges').findOne({ id: p.range_id })
      const division = range ? await db.collection('divisions').findOne({ id: range.division_id }) : null
      return handleCORS(NextResponse.json({ ...p, age, range_name: range?.name, division_name: division?.name }))
    }

    const plantationHistoryMatch = route.match(/^\/plantations\/([^/]+)\/history$/)
    if (plantationHistoryMatch && method === 'GET') {
      const pId = plantationHistoryMatch[1]
      const apos = await db.collection('apo_headers').find({ plantation_id: pId }).sort({ created_at: -1 }).toArray()
      const result = []
      for (const apo of apos) {
        const items = await db.collection('apo_items').find({ apo_id: apo.id }).toArray()
        const { _id, ...apoData } = apo
        result.push({ ...apoData, items: items.map(({ _id, ...i }) => i) })
      }
      return handleCORS(NextResponse.json(result))
    }

    // =================== APO GENERATE DRAFT ===================
    if (route === '/apo/generate-draft' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      const body = await request.json()
      const { plantation_id, financial_year } = body
      if (!plantation_id || !financial_year) {
        return handleCORS(NextResponse.json({ error: 'plantation_id and financial_year required' }, { status: 400 }))
      }

      const plantation = await db.collection('plantations').findOne({ id: plantation_id })
      if (!plantation) return handleCORS(NextResponse.json({ error: 'Plantation not found' }, { status: 404 }))

      const age = new Date().getFullYear() - plantation.year_of_planting
      
      // Get norms for this age
      const norms = await db.collection('norms_config').find({
        applicable_age: age,
        financial_year: financial_year,
        $or: [{ species_id: null }, { species_id: plantation.species }]
      }).toArray()

      // Enrich with activity details
      const activities = await db.collection('activity_master').find({}).toArray()
      const actMap = {}
      activities.forEach(a => { actMap[a.id] = a })

      const draftItems = norms.map(n => ({
        activity_id: n.activity_id,
        activity_name: actMap[n.activity_id]?.name || 'Unknown',
        category: actMap[n.activity_id]?.category || 'Unknown',
        unit: actMap[n.activity_id]?.unit || 'Unknown',
        sanctioned_rate: n.standard_rate,
        suggested_qty: plantation.total_area_ha,
        total_cost: n.standard_rate * plantation.total_area_ha,
      }))

      return handleCORS(NextResponse.json({
        plantation_id,
        plantation_name: plantation.name,
        species: plantation.species,
        age,
        financial_year,
        total_area_ha: plantation.total_area_ha,
        items: draftItems,
        total_estimated_cost: draftItems.reduce((sum, i) => sum + i.total_cost, 0),
      }))
    }

    // =================== APO CRUD ===================
    if (route === '/apo' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      if (user.role !== 'RO') return handleCORS(NextResponse.json({ error: 'Only RO can create APOs' }, { status: 403 }))

      const body = await request.json()
      const { plantation_id, financial_year, items, status } = body

      const apoId = uuidv4()
      const apoItems = items.map(item => ({
        id: uuidv4(),
        apo_id: apoId,
        activity_id: item.activity_id,
        activity_name: item.activity_name,
        sanctioned_qty: parseFloat(item.sanctioned_qty),
        sanctioned_rate: parseFloat(item.sanctioned_rate),
        total_cost: parseFloat(item.sanctioned_qty) * parseFloat(item.sanctioned_rate),
        unit: item.unit,
      }))

      const totalAmount = apoItems.reduce((sum, i) => sum + i.total_cost, 0)

      const apoHeader = {
        id: apoId,
        plantation_id,
        financial_year,
        status: status || 'DRAFT',
        total_sanctioned_amount: totalAmount,
        created_by: user.id,
        approved_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      }

      await db.collection('apo_headers').insertOne(apoHeader)
      if (apoItems.length > 0) {
        await db.collection('apo_items').insertMany(apoItems)
      }

      const { _id, ...result } = apoHeader
      return handleCORS(NextResponse.json({ ...result, items: apoItems.map(({ _id, ...i }) => i) }, { status: 201 }))
    }

    if (route === '/apo' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      let filter = {}
      if (user.role === 'RO') {
        filter = { created_by: user.id }
      } else if (user.role === 'DM') {
        // Get all ROs in this division
        const divRanges = await db.collection('ranges').find({ division_id: user.division_id }).toArray()
        const rangeIds = divRanges.map(r => r.id)
        const divUsers = await db.collection('users').find({ range_id: { $in: rangeIds } }).toArray()
        const userIds = divUsers.map(u => u.id)
        filter = { created_by: { $in: userIds } }
      }
      // ADMIN sees all

      const url = new URL(request.url)
      const statusFilter = url.searchParams.get('status')
      if (statusFilter) filter.status = statusFilter

      const apos = await db.collection('apo_headers').find(filter).sort({ created_at: -1 }).toArray()
      
      // Enrich
      const plantations = await db.collection('plantations').find({}).toArray()
      const users = await db.collection('users').find({}).toArray()
      const pltMap = {}
      const userMap = {}
      plantations.forEach(p => { pltMap[p.id] = p })
      users.forEach(u => { userMap[u.id] = u })

      const enriched = apos.map(({ _id, ...a }) => ({
        ...a,
        plantation_name: pltMap[a.plantation_id]?.name || 'Unknown',
        species: pltMap[a.plantation_id]?.species,
        created_by_name: userMap[a.created_by]?.name || 'Unknown',
        approved_by_name: a.approved_by ? userMap[a.approved_by]?.name : null,
      }))
      return handleCORS(NextResponse.json(enriched))
    }

    // APO Detail
    const apoDetailMatch = route.match(/^\/apo\/([^/]+)$/)
    if (apoDetailMatch && method === 'GET') {
      const apoId = apoDetailMatch[1]
      const apo = await db.collection('apo_headers').findOne({ id: apoId })
      if (!apo) return handleCORS(NextResponse.json({ error: 'APO not found' }, { status: 404 }))
      const items = await db.collection('apo_items').find({ apo_id: apoId }).toArray()
      const plantation = await db.collection('plantations').findOne({ id: apo.plantation_id })
      const creator = await db.collection('users').findOne({ id: apo.created_by })
      const approver = apo.approved_by ? await db.collection('users').findOne({ id: apo.approved_by }) : null

      // Get work logs for each item
      const itemsWithLogs = []
      for (const item of items) {
        const logs = await db.collection('work_logs').find({ apo_item_id: item.id }).toArray()
        const totalSpent = logs.reduce((sum, l) => sum + l.expenditure, 0)
        const { _id, ...itemData } = item
        itemsWithLogs.push({
          ...itemData,
          total_spent: totalSpent,
          remaining_budget: itemData.total_cost - totalSpent,
          utilization_pct: itemData.total_cost > 0 ? Math.round((totalSpent / itemData.total_cost) * 100) : 0,
          work_logs: logs.map(({ _id, ...l }) => l),
        })
      }

      const { _id, ...apoData } = apo
      return handleCORS(NextResponse.json({
        ...apoData,
        plantation_name: plantation?.name,
        species: plantation?.species,
        total_area_ha: plantation?.total_area_ha,
        plantation_age: plantation ? new Date().getFullYear() - plantation.year_of_planting : null,
        created_by_name: creator?.name,
        approved_by_name: approver?.name,
        items: itemsWithLogs,
      }))
    }

    // APO Status Update
    const apoStatusMatch = route.match(/^\/apo\/([^/]+)\/status$/)
    if (apoStatusMatch && method === 'PATCH') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      const apoId = apoStatusMatch[1]
      const body = await request.json()
      const { status, comment } = body

      const apo = await db.collection('apo_headers').findOne({ id: apoId })
      if (!apo) return handleCORS(NextResponse.json({ error: 'APO not found' }, { status: 404 }))

      // Validate transitions
      const validTransitions = {
        'DRAFT': ['PENDING_APPROVAL'],
        'PENDING_APPROVAL': ['SANCTIONED', 'REJECTED'],
        'REJECTED': ['DRAFT'],
      }

      if (!validTransitions[apo.status]?.includes(status)) {
        return handleCORS(NextResponse.json({ error: `Cannot transition from ${apo.status} to ${status}` }, { status: 400 }))
      }

      // Only DM/ADMIN can approve/reject
      if (['SANCTIONED', 'REJECTED'].includes(status) && !['DM', 'ADMIN'].includes(user.role)) {
        return handleCORS(NextResponse.json({ error: 'Only DM/Admin can approve or reject APOs' }, { status: 403 }))
      }

      const updateData = {
        status,
        updated_at: new Date(),
      }
      if (status === 'SANCTIONED' || status === 'REJECTED') {
        updateData.approved_by = user.id
      }

      await db.collection('apo_headers').updateOne({ id: apoId }, { $set: updateData })
      return handleCORS(NextResponse.json({ message: `APO ${status.toLowerCase()}`, apo_id: apoId, new_status: status }))
    }

    // =================== WORK LOGS ===================
    if (route === '/work-logs' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      if (user.role !== 'RO') return handleCORS(NextResponse.json({ error: 'Only RO can log work' }, { status: 403 }))

      const body = await request.json()
      const { apo_item_id, actual_qty, expenditure, work_date } = body

      // Validate APO item exists and APO is sanctioned
      const apoItem = await db.collection('apo_items').findOne({ id: apo_item_id })
      if (!apoItem) return handleCORS(NextResponse.json({ error: 'APO item not found' }, { status: 404 }))

      const apo = await db.collection('apo_headers').findOne({ id: apoItem.apo_id })
      if (!apo || apo.status !== 'SANCTIONED') {
        return handleCORS(NextResponse.json({ error: 'Can only log work against sanctioned APOs' }, { status: 400 }))
      }

      // Budget check
      const existingLogs = await db.collection('work_logs').find({ apo_item_id }).toArray()
      const totalSpent = existingLogs.reduce((sum, l) => sum + l.expenditure, 0)
      if (totalSpent + parseFloat(expenditure) > apoItem.total_cost) {
        return handleCORS(NextResponse.json({
          error: 'Budget Exceeded',
          detail: `Budget: ₹${apoItem.total_cost}, Already Spent: ₹${totalSpent}, Requested: ₹${expenditure}, Available: ₹${apoItem.total_cost - totalSpent}`
        }, { status: 400 }))
      }

      const workLog = {
        id: uuidv4(),
        apo_item_id,
        work_date: work_date ? new Date(work_date) : new Date(),
        actual_qty: parseFloat(actual_qty),
        expenditure: parseFloat(expenditure),
        logged_by: user.id,
        created_at: new Date(),
      }

      await db.collection('work_logs').insertOne(workLog)
      const { _id, ...result } = workLog
      return handleCORS(NextResponse.json(result, { status: 201 }))
    }

    if (route === '/work-logs' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      const url = new URL(request.url)
      const apoItemId = url.searchParams.get('apo_item_id')
      const filter = apoItemId ? { apo_item_id: apoItemId } : {}

      if (user.role === 'RO') filter.logged_by = user.id

      const logs = await db.collection('work_logs').find(filter).sort({ created_at: -1 }).toArray()
      return handleCORS(NextResponse.json(logs.map(({ _id, ...l }) => l)))
    }

    // =================== DASHBOARD STATS ===================
    if (route === '/dashboard/stats' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      let apoFilter = {}
      let plantationFilter = {}

      if (user.role === 'RO') {
        apoFilter = { created_by: user.id }
        plantationFilter = { range_id: user.range_id }
      } else if (user.role === 'DM') {
        const divRanges = await db.collection('ranges').find({ division_id: user.division_id }).toArray()
        const rangeIds = divRanges.map(r => r.id)
        const divUsers = await db.collection('users').find({ range_id: { $in: rangeIds } }).toArray()
        const userIds = divUsers.map(u => u.id)
        apoFilter = { created_by: { $in: userIds } }
        plantationFilter = { range_id: { $in: rangeIds } }
      }

      const totalPlantations = await db.collection('plantations').countDocuments(plantationFilter)
      const allApos = await db.collection('apo_headers').find(apoFilter).toArray()
      
      const totalApos = allApos.length
      const draftApos = allApos.filter(a => a.status === 'DRAFT').length
      const pendingApos = allApos.filter(a => a.status === 'PENDING_APPROVAL').length
      const sanctionedApos = allApos.filter(a => a.status === 'SANCTIONED').length
      const rejectedApos = allApos.filter(a => a.status === 'REJECTED').length

      const totalSanctioned = allApos.filter(a => a.status === 'SANCTIONED').reduce((sum, a) => sum + (a.total_sanctioned_amount || 0), 0)

      // Get total expenditure
      const sanctionedApoIds = allApos.filter(a => a.status === 'SANCTIONED').map(a => a.id)
      const apoItems = await db.collection('apo_items').find({ apo_id: { $in: sanctionedApoIds } }).toArray()
      const apoItemIds = apoItems.map(i => i.id)
      const workLogs = await db.collection('work_logs').find({ apo_item_id: { $in: apoItemIds } }).toArray()
      const totalExpenditure = workLogs.reduce((sum, l) => sum + l.expenditure, 0)

      // Calculate total area
      const plantations = await db.collection('plantations').find(plantationFilter).toArray()
      const totalArea = plantations.reduce((sum, p) => sum + (p.total_area_ha || 0), 0)

      // Budget by activity for chart
      const budgetByActivity = {}
      for (const item of apoItems) {
        const key = item.activity_name || 'Unknown'
        if (!budgetByActivity[key]) budgetByActivity[key] = { sanctioned: 0, spent: 0 }
        budgetByActivity[key].sanctioned += item.total_cost
      }
      for (const log of workLogs) {
        const item = apoItems.find(i => i.id === log.apo_item_id)
        if (item) {
          const key = item.activity_name || 'Unknown'
          if (budgetByActivity[key]) budgetByActivity[key].spent += log.expenditure
        }
      }

      const chartData = Object.entries(budgetByActivity).map(([name, data]) => ({
        name,
        sanctioned: data.sanctioned,
        spent: data.spent,
      }))

      return handleCORS(NextResponse.json({
        total_plantations: totalPlantations,
        total_area_ha: totalArea,
        total_apos: totalApos,
        draft_apos: draftApos,
        pending_apos: pendingApos,
        sanctioned_apos: sanctionedApos,
        rejected_apos: rejectedApos,
        total_sanctioned_amount: totalSanctioned,
        total_expenditure: totalExpenditure,
        utilization_pct: totalSanctioned > 0 ? Math.round((totalExpenditure / totalSanctioned) * 100) : 0,
        budget_chart: chartData,
      }))
    }

    // Route not found
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
