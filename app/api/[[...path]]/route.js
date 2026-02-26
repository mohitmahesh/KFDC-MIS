/**
 * KFDC iFMS API Routes
 * Main API handler for all backend endpoints
 * 
 * Architecture: Modular design with shared libraries
 * - /lib/db.js - Database connection
 * - /lib/logger.js - Application logging
 * - /lib/helpers.js - Utility functions
 * - /lib/auth.js - Authentication
 * - /lib/cors.js - CORS handling
 * - /lib/errorHandler.js - Error handling
 */

import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Import shared modules
import { connectToMongo } from '@/lib/db'
import { generateId, getCurrentFinancialYear, getWorkType, sanitizeMongoDoc } from '@/lib/helpers'
import { handleCORS, jsonResponse, errorResponse, createOptionsResponse } from '@/lib/cors'
import logger, { logRequest, logResponse, logError, logDbOperation } from '@/lib/logger'
import { handleApiError, ApiError, ErrorTypes } from '@/lib/errorHandler'

// Re-export for backward compatibility
const uuidv4 = generateId

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return createOptionsResponse()
}

// Auth middleware helper - inline version for backward compatibility
async function getUser(request, db) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]
  const session = await db.collection('sessions').findOne({ token })
  if (!session) return null
  const user = await db.collection('users').findOne({ id: session.user_id })
  return user
}

// ===================== SEED DATA (Real KFDC Data from Excel Masters) =====================
const SEED_DATA = {
  divisions: [
    { id: 'div-bangalore', name: 'Bangalore', code: 'BLR' },
    { id: 'div-dharwad', name: 'Dharwad', code: 'DWD' },
    { id: 'div-shimoga', name: 'Shivamogga', code: 'SHM' },
    { id: 'div-chikmagalur', name: 'Chikkamagaluru', code: 'CKM' },
  ],
  ranges: [
    // Bangalore Division
    { id: 'rng-svpura', division_id: 'div-bangalore', name: 'S.V. Pura' },
    { id: 'rng-mulbagilu', division_id: 'div-bangalore', name: 'Mulabagilu' },
    { id: 'rng-dvhalli', division_id: 'div-bangalore', name: 'D.V. Halli' },
    { id: 'rng-malur', division_id: 'div-bangalore', name: 'Malur' },
    { id: 'rng-bangarpet', division_id: 'div-bangalore', name: 'Bangarpet' },
    { id: 'rng-bidadi', division_id: 'div-bangalore', name: 'Bidadi' },
    // Dharwad Division
    { id: 'rng-dharwad', division_id: 'div-dharwad', name: 'Dharwad' },
    { id: 'rng-alloli', division_id: 'div-dharwad', name: 'Alloli-Kanasolli' },
    { id: 'rng-akrali', division_id: 'div-dharwad', name: 'Akrali' },
    { id: 'rng-gunji', division_id: 'div-dharwad', name: 'Gunji' },
    { id: 'rng-dhundashi', division_id: 'div-dharwad', name: 'Dhundashi' },
    { id: 'rng-khanapur', division_id: 'div-dharwad', name: 'Khanapur' },
    // Shivamogga Division
    { id: 'rng-sagara', division_id: 'div-shimoga', name: 'Sagara' },
    { id: 'rng-soraba', division_id: 'div-shimoga', name: 'Soraba' },
    { id: 'rng-siddapur', division_id: 'div-shimoga', name: 'Siddapur' },
    { id: 'rng-hosanagar', division_id: 'div-shimoga', name: 'Hosanagar' },
    // Chikkamagaluru Division
    { id: 'rng-koppa', division_id: 'div-chikmagalur', name: 'Koppa' },
    { id: 'rng-narasimharajapura', division_id: 'div-chikmagalur', name: 'Narasimharajapura' },
    { id: 'rng-sringeri', division_id: 'div-chikmagalur', name: 'Sringeri' },
  ],
  users: [
    // Range Officers (RO) - Data Entry Only (Plantations, Buildings, Nurseries)
    { id: 'usr-ro1', email: 'ro.dharwad@kfdc.in', password: 'pass123', name: 'Ramesh Kumar', role: 'RO', division_id: 'div-dharwad', range_id: 'rng-dharwad' },
    { id: 'usr-ro2', email: 'ro.svpura@kfdc.in', password: 'pass123', name: 'Suresh Gowda', role: 'RO', division_id: 'div-bangalore', range_id: 'rng-svpura' },
    { id: 'usr-ro3', email: 'ro.sagara@kfdc.in', password: 'pass123', name: 'Manjunath Hegde', role: 'RO', division_id: 'div-shimoga', range_id: 'rng-sagara' },
    { id: 'usr-ro4', email: 'ro.alloli@kfdc.in', password: 'pass123', name: 'Basavaraj Patil', role: 'RO', division_id: 'div-dharwad', range_id: 'rng-alloli' },
    // Division Officers (DO) - APO Creation & Compilation - NEW ROLE
    { id: 'usr-do1', email: 'do.dharwad@kfdc.in', password: 'pass123', name: 'Anjali Sharma', role: 'DO', division_id: 'div-dharwad', range_id: null },
    { id: 'usr-do2', email: 'do.bangalore@kfdc.in', password: 'pass123', name: 'Priya Hegde', role: 'DO', division_id: 'div-bangalore', range_id: null },
    { id: 'usr-do3', email: 'do.shimoga@kfdc.in', password: 'pass123', name: 'Nagaraj Rao', role: 'DO', division_id: 'div-shimoga', range_id: null },
    // Legacy DM users (keep for backward compatibility, mapped to DO)
    { id: 'usr-dm1', email: 'dm.dharwad@kfdc.in', password: 'pass123', name: 'Anjali Sharma DM', role: 'DO', division_id: 'div-dharwad', range_id: null },
    { id: 'usr-dm2', email: 'dm.bangalore@kfdc.in', password: 'pass123', name: 'Priya Hegde DM', role: 'DO', division_id: 'div-bangalore', range_id: null },
    { id: 'usr-dm3', email: 'dm.shimoga@kfdc.in', password: 'pass123', name: 'Nagaraj Rao DM', role: 'DO', division_id: 'div-shimoga', range_id: null },
    // Executive Director (ED) - First Level APO Approval
    { id: 'usr-ed1', email: 'ed@kfdc.in', password: 'pass123', name: 'Rajesh Naik ED', role: 'ED', division_id: null, range_id: null },
    // Managing Director (MD) - Final APO Approval  
    { id: 'usr-md1', email: 'md@kfdc.in', password: 'pass123', name: 'Dr. Shivakumar MD', role: 'MD', division_id: null, range_id: null },
    // Admin
    { id: 'usr-admin1', email: 'admin@kfdc.in', password: 'pass123', name: 'Dr. Venkatesh Rao', role: 'ADMIN', division_id: null, range_id: null },
    // Fund Indent Hierarchy: RFO → DCF → ED → MD
    { id: 'usr-rfo1', email: 'rfo.dharwad@kfdc.in', password: 'pass123', name: 'Anil Kumar RFO', role: 'RFO', division_id: 'div-dharwad', range_id: 'rng-dharwad' },
    { id: 'usr-dcf1', email: 'dcf.dharwad@kfdc.in', password: 'pass123', name: 'Suresh Patil DCF', role: 'DCF', division_id: 'div-dharwad', range_id: null },
  ],
  // Districts and Taluks from KFDC Document
  districts_taluks: [
    { district: 'Shivamogga', taluks: ['Shivamogga', 'Bhadravathi', 'Nidige', 'Shikaripura', 'Sagara', 'Soraba', 'Thirthahalli', 'Hosanagara', 'Honnali'] },
    { district: 'Chikkamagalore', taluks: ['Chikkamagalore', 'Kadur', 'N.R.Pura'] },
    { district: 'Hassan', taluks: ['Hassan', 'Sakaleshapura', 'Arasikere', 'Holenarasipura', 'Chennarayapattana'] },
    { district: 'Dharwad', taluks: ['Dharwad', 'Kalagatagi'] },
    { district: 'Belagavi', taluks: ['Khanapura', 'Kittur'] },
    { district: 'Haveri', taluks: ['Shiggaon', 'Hanagal'] },
    { district: 'Uttara Kannada', taluks: ['Sirsi', 'Siddapura', 'Mundgod', 'Joida', 'Yellapur', 'Khanapur'] },
    { district: 'Kolar', taluks: ['Kolar', 'Malur', 'Mulabagilu', 'Srinivasapura', 'S.V. Pura', 'Bangarpet'] },
    { district: 'Ramanagara', taluks: ['Ramanagara', 'Bangalore rural', 'Nelamangala', 'Devanahalli', 'Magadi', 'Kanakapura'] },
    { district: 'Chikkaballapura', taluks: ['Chikkaballapura', 'Shidlaghatta'] },
    { district: 'Doddaballapura', taluks: ['Doddaballapura', 'D.V. Halli'] },
  ],
  // Real KFDC Activities with SSR Numbers from Masters Excel
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
  // Real Norms/Rates from KFDC Masters Excel for FY 2026-27
  norms: [
    // === ADVANCE WORKS (Year 0 / Pre-planting) ===
    { id: 'norm-a1', activity_id: 'act-survey', applicable_age: 0, species_id: null, standard_rate: 1534.16, financial_year: '2026-27' },
    { id: 'norm-a2', activity_id: 'act-dozing', applicable_age: 0, species_id: null, standard_rate: 12600, financial_year: '2026-27' },
    { id: 'norm-a3', activity_id: 'act-jungle', applicable_age: 0, species_id: null, standard_rate: 12600, financial_year: '2026-27' },
    { id: 'norm-a4', activity_id: 'act-debris', applicable_age: 0, species_id: null, standard_rate: 2854.48, financial_year: '2026-27' },
    // === PLANTING WORKS (Year 1) ===
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
    // === 2ND YEAR MAINTENANCE ===
    { id: 'norm-m2a', activity_id: 'act-weeding1', applicable_age: 2, species_id: null, standard_rate: 3586.11, financial_year: '2026-27' },
    { id: 'norm-m2b', activity_id: 'act-weeding2', applicable_age: 2, species_id: null, standard_rate: 3211.18, financial_year: '2026-27' },
    { id: 'norm-m2c', activity_id: 'act-fertilizer', applicable_age: 2, species_id: null, standard_rate: 1555, financial_year: '2026-27' },
    { id: 'norm-m2d', activity_id: 'act-fertcost', applicable_age: 2, species_id: null, standard_rate: 570.86, financial_year: '2026-27' },
    { id: 'norm-m2e', activity_id: 'act-fireline', applicable_age: 2, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m2f', activity_id: 'act-firewatch', applicable_age: 2, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m2g', activity_id: 'act-watchward', applicable_age: 2, species_id: null, standard_rate: 4994, financial_year: '2026-27' },
    // === 3RD YEAR MAINTENANCE ===
    { id: 'norm-m3a', activity_id: 'act-weeding1', applicable_age: 3, species_id: null, standard_rate: 3586.11, financial_year: '2026-27' },
    { id: 'norm-m3b', activity_id: 'act-fertilizer', applicable_age: 3, species_id: null, standard_rate: 1555, financial_year: '2026-27' },
    { id: 'norm-m3c', activity_id: 'act-fertcost', applicable_age: 3, species_id: null, standard_rate: 570.86, financial_year: '2026-27' },
    { id: 'norm-m3d', activity_id: 'act-interplough', applicable_age: 3, species_id: null, standard_rate: 12600, financial_year: '2026-27' },
    { id: 'norm-m3e', activity_id: 'act-fireline', applicable_age: 3, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m3f', activity_id: 'act-firewatch', applicable_age: 3, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    // === 4TH YEAR MAINTENANCE ===
    { id: 'norm-m4a', activity_id: 'act-fireline', applicable_age: 4, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m4b', activity_id: 'act-firewatch', applicable_age: 4, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    // === 5TH YEAR MAINTENANCE ===
    { id: 'norm-m5a', activity_id: 'act-fireline', applicable_age: 5, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m5b', activity_id: 'act-firewatch', applicable_age: 5, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    // === 6TH-8TH YEAR (Fire maintenance only) ===
    { id: 'norm-m6a', activity_id: 'act-fireline', applicable_age: 6, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m6b', activity_id: 'act-firewatch', applicable_age: 6, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m7a', activity_id: 'act-fireline', applicable_age: 7, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m7b', activity_id: 'act-firewatch', applicable_age: 7, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    // === 8TH YEAR (Fire maintenance) ===
    { id: 'norm-m8a', activity_id: 'act-fireline', applicable_age: 8, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m8b', activity_id: 'act-firewatch', applicable_age: 8, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    // === 9TH YEAR (After 1st Cut Eucalyptus) ===
    { id: 'norm-m9a', activity_id: 'act-fireline', applicable_age: 9, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m9b', activity_id: 'act-firewatch', applicable_age: 9, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    // === 10TH-15TH YEAR ===
    { id: 'norm-m10a', activity_id: 'act-firewatch', applicable_age: 10, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m10b', activity_id: 'act-fireline', applicable_age: 10, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    // === 11TH YEAR ===
    { id: 'norm-m11a', activity_id: 'act-fireline', applicable_age: 11, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m11b', activity_id: 'act-firewatch', applicable_age: 11, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m12a', activity_id: 'act-fireline', applicable_age: 12, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m12b', activity_id: 'act-firewatch', applicable_age: 12, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    // === 13TH-15TH YEAR ===
    { id: 'norm-m13a', activity_id: 'act-fireline', applicable_age: 13, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m13b', activity_id: 'act-firewatch', applicable_age: 13, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m14a', activity_id: 'act-fireline', applicable_age: 14, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m14b', activity_id: 'act-firewatch', applicable_age: 14, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m15a', activity_id: 'act-fireline', applicable_age: 15, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m15b', activity_id: 'act-firewatch', applicable_age: 15, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    // === 16TH YEAR (After 2nd Cut Eucalyptus) ===
    { id: 'norm-m16a', activity_id: 'act-fireline', applicable_age: 16, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m16b', activity_id: 'act-firewatch', applicable_age: 16, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    // === 17TH-21ST YEAR (Continued maintenance for older plantations) ===
    { id: 'norm-m17a', activity_id: 'act-fireline', applicable_age: 17, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m17b', activity_id: 'act-firewatch', applicable_age: 17, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m18a', activity_id: 'act-fireline', applicable_age: 18, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m18b', activity_id: 'act-firewatch', applicable_age: 18, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m19a', activity_id: 'act-fireline', applicable_age: 19, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m19b', activity_id: 'act-firewatch', applicable_age: 19, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m20a', activity_id: 'act-fireline', applicable_age: 20, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m20b', activity_id: 'act-firewatch', applicable_age: 20, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m21a', activity_id: 'act-fireline', applicable_age: 21, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m21b', activity_id: 'act-firewatch', applicable_age: 21, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m22a', activity_id: 'act-fireline', applicable_age: 22, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m22b', activity_id: 'act-firewatch', applicable_age: 22, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m25a', activity_id: 'act-fireline', applicable_age: 25, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m25b', activity_id: 'act-firewatch', applicable_age: 25, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m27a', activity_id: 'act-fireline', applicable_age: 27, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m27b', activity_id: 'act-firewatch', applicable_age: 27, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m28a', activity_id: 'act-fireline', applicable_age: 28, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m28b', activity_id: 'act-firewatch', applicable_age: 28, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m30a', activity_id: 'act-fireline', applicable_age: 30, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m30b', activity_id: 'act-firewatch', applicable_age: 30, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m31a', activity_id: 'act-fireline', applicable_age: 31, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m31b', activity_id: 'act-firewatch', applicable_age: 31, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m32a', activity_id: 'act-fireline', applicable_age: 32, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m32b', activity_id: 'act-firewatch', applicable_age: 32, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    { id: 'norm-m40a', activity_id: 'act-fireline', applicable_age: 40, species_id: null, standard_rate: 5455.86, financial_year: '2026-27' },
    { id: 'norm-m40b', activity_id: 'act-firewatch', applicable_age: 40, species_id: null, standard_rate: 1784.01, financial_year: '2026-27' },
    // === NURSERY ===
    { id: 'norm-n1', activity_id: 'act-nursery', applicable_age: 0, species_id: null, standard_rate: 47762, financial_year: '2026-27' },
    // === FIRE WATCHERS (all ages) ===
    { id: 'norm-fw1', activity_id: 'act-firewatch', applicable_age: 0, species_id: null, standard_rate: 18117, financial_year: '2026-27' },
  ],
  // Real Plantations from KFDC Dharwad & Bangalore Division Excel Data
  plantations: [
    // Dharwad Division - Dharwad Range
    { id: 'plt-d01', range_id: 'rng-dharwad', name: 'Varavanagalavi', species: 'Acacia Auriculiformis', year_of_planting: 2014, total_area_ha: 25, village: 'Varavanagalavi', taluk: 'Dharwad', district: 'Dharwad', work_type: 'M', vidhana_sabha: 'Dharwad', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d02', range_id: 'rng-dharwad', name: 'Varavanagalavi (Casuarina)', species: 'Casurina junguniana', year_of_planting: 2017, total_area_ha: 10, village: 'Varavanagalavi', taluk: 'Dharwad', district: 'Dharwad', work_type: 'M', vidhana_sabha: 'Dharwad', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d03', range_id: 'rng-dharwad', name: 'Varavanagalavi (2011)', species: 'Acacia auriculiformis', year_of_planting: 2011, total_area_ha: 22, village: 'Varavanagalavi', taluk: 'Dharwad', district: 'Dharwad', work_type: 'M', vidhana_sabha: 'Dharwad', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d04', range_id: 'rng-dharwad', name: 'Ninganakoppa-Kanvihalkatti', species: 'Acacia auriculiformis', year_of_planting: 2004, total_area_ha: 15.5, village: 'Ninganakoppa', taluk: 'Dharwad', district: 'Dharwad', work_type: 'M', vidhana_sabha: 'Dharwad', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d05', range_id: 'rng-dharwad', name: 'Degaon', species: 'Acacia auriculiformis', year_of_planting: 2018, total_area_ha: 14.6, village: 'Degaon', taluk: 'Dharwad', district: 'Dharwad', work_type: 'M', vidhana_sabha: 'Dharwad', lok_sabha: 'Dharwad', division: 'Dharwad' },
    // Dharwad Division - Alloli-Kanasolli Range
    { id: 'plt-d06', range_id: 'rng-alloli', name: 'Alloli-Kanasolli XXV 11,13', species: 'Eucalyptus pellita', year_of_planting: 2004, total_area_ha: 15.5, village: 'Alloli-Kanasolli', taluk: 'Khanapur', district: 'Belagavi', work_type: 'M', vidhana_sabha: 'Khanapur', lok_sabha: 'Belagavi', division: 'Dharwad' },
    { id: 'plt-d07', range_id: 'rng-alloli', name: 'Alloli-Kanasolli XXV 15,16', species: 'Eucalyptus pellita', year_of_planting: 1999, total_area_ha: 10, village: 'Alloli-Kanasolli', taluk: 'Khanapur', district: 'Belagavi', work_type: 'M', vidhana_sabha: 'Khanapur', lok_sabha: 'Belagavi', division: 'Dharwad' },
    { id: 'plt-d08', range_id: 'rng-alloli', name: 'Katagali-XXV-28,29p', species: 'Eucalyptus pellita', year_of_planting: 2005, total_area_ha: 13.1, village: 'Kategali', taluk: 'Khanapur', district: 'Belagavi', work_type: 'M', vidhana_sabha: 'Khanapur', lok_sabha: 'Belagavi', division: 'Dharwad' },
    { id: 'plt-d09', range_id: 'rng-alloli', name: 'Mohishet Nursery', species: 'Eucalyptus pellita', year_of_planting: 2014, total_area_ha: 1.65, village: 'Mohishet', taluk: 'Khanapur', district: 'Belagavi', work_type: 'M', vidhana_sabha: 'Khanapur', lok_sabha: 'Belagavi', division: 'Dharwad' },
    { id: 'plt-d10', range_id: 'rng-alloli', name: 'Akrali-VII 13p', species: 'Eucalyptus pellita', year_of_planting: 2006, total_area_ha: 81.1, village: 'Akrali', taluk: 'Khanapur', district: 'Belagavi', work_type: 'M', vidhana_sabha: 'Khanapur', lok_sabha: 'Belagavi', division: 'Dharwad' },
    // Dharwad Division - Akrali Range
    { id: 'plt-d11', range_id: 'rng-akrali', name: 'Bacholli XXV-7', species: 'Acacia auriculiformis', year_of_planting: 1998, total_area_ha: 16.14, village: 'Bacholli', taluk: 'Khanapur', district: 'Uttara Kannada', work_type: 'M', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d12', range_id: 'rng-akrali', name: 'Balekoppa', species: 'Acacia auriculiformis', year_of_planting: 2014, total_area_ha: 60, village: 'Balekoppa', taluk: 'Khanapur', district: 'Uttara Kannada', work_type: 'M', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d13', range_id: 'rng-akrali', name: 'Santalli-Hebbatti-Kiravatti', species: 'Acacia auriculiformis', year_of_planting: 2015, total_area_ha: 39, village: 'Santalli', taluk: 'Khanapur', district: 'Uttara Kannada', work_type: 'M', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d14', range_id: 'rng-akrali', name: 'Nidgod', species: 'Acacia auriculiformis', year_of_planting: 2015, total_area_ha: 28.4, village: 'Nidgod', taluk: 'Khanapur', district: 'Uttara Kannada', work_type: 'M', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d15', range_id: 'rng-akrali', name: 'Hattarwada-Mendegali XVII-10p', species: 'Eucalyptus pellita', year_of_planting: 2016, total_area_ha: 12.4, village: 'Hattarwada', taluk: 'Khanapur', district: 'Uttara Kannada', work_type: 'M', lok_sabha: 'Dharwad', division: 'Dharwad' },
    // Dharwad Division - Gunji Range
    { id: 'plt-d16', range_id: 'rng-gunji', name: 'Salakinakoppa', species: 'Acacia auriculiformis', year_of_planting: 2004, total_area_ha: 29.63, village: 'Salakinakoppa', taluk: 'Khanapur', district: 'Uttara Kannada', work_type: 'M', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d17', range_id: 'rng-gunji', name: 'Hattargunji-Ganebail', species: 'Acacia auriculiformis', year_of_planting: 2001, total_area_ha: 20, village: 'Hattargunji', taluk: 'Mundgod', district: 'Uttara Kannada', work_type: 'M', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d18', range_id: 'rng-gunji', name: 'Karkikoppa VII-11p', species: 'Acacia auriculiformis', year_of_planting: 2007, total_area_ha: 26.5, village: 'Karkikoppa', taluk: 'Yellapur', district: 'Uttara Kannada', work_type: 'M', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d19', range_id: 'rng-gunji', name: 'Unchalli-Bidralli', species: 'Acacia auriculiformis', year_of_planting: 2023, total_area_ha: 15, village: 'Unchalli', taluk: 'Yellapur', district: 'Uttara Kannada', work_type: 'M', lok_sabha: 'Dharwad', division: 'Dharwad' },
    // Dharwad Division - Dhundashi Range
    { id: 'plt-d20', range_id: 'rng-dhundashi', name: 'Watra VII 12,14', species: 'Acacia auriculiformis', year_of_planting: 2001, total_area_ha: 15, village: 'Watra', taluk: 'Yellapur', district: 'Uttara Kannada', work_type: 'M', lok_sabha: 'Dharwad', division: 'Dharwad' },
    { id: 'plt-d21', range_id: 'rng-dhundashi', name: 'Kamataga', species: 'Acacia auriculiformis', year_of_planting: 2019, total_area_ha: 31.2, village: 'Kamataga', taluk: 'Yellapur', district: 'Uttara Kannada', work_type: 'M', lok_sabha: 'Dharwad', division: 'Dharwad' },
    // Dharwad Division - Khanapur Range - Fresh Works (2025)
    { id: 'plt-d22', range_id: 'rng-khanapur', name: 'Kinaye R.F 166', species: 'Acacia auriculiformis', year_of_planting: 2025, total_area_ha: 41.5, village: 'Kinaye', taluk: 'Khanapur', district: 'Belagavi', work_type: 'FW', vidhana_sabha: 'Khanapur', lok_sabha: 'Belagavi', division: 'Dharwad' },
    { id: 'plt-d23', range_id: 'rng-khanapur', name: 'Watra RF 83,86', species: 'Acacia auriculiformis', year_of_planting: 2025, total_area_ha: 30, village: 'Watra', taluk: 'Khanapur', district: 'Belagavi', work_type: 'FW', vidhana_sabha: 'Khanapur', lok_sabha: 'Belagavi', division: 'Dharwad' },
    // Bangalore Division - S.V. Pura Range
    { id: 'plt-b01', range_id: 'rng-svpura', name: 'Agara', species: 'Eucalyptus', year_of_planting: 2001, total_area_ha: 65, village: 'Vadigepalli', taluk: 'S.V. Pura', district: 'Kolar', work_type: 'M', vidhana_sabha: 'Srinivasapura', lok_sabha: 'Kolar', division: 'Bengaluru' },
    { id: 'plt-b02', range_id: 'rng-svpura', name: 'Ganganatta', species: 'Eucalyptus', year_of_planting: 2004, total_area_ha: 20, village: 'Ganganatta', taluk: 'S.V. Pura', district: 'Kolar', work_type: 'M', vidhana_sabha: 'Srinivasapura', lok_sabha: 'Kolar', division: 'Bengaluru' },
    { id: 'plt-b03', range_id: 'rng-svpura', name: 'Karangi', species: 'Acacia auriculiformis', year_of_planting: 2021, total_area_ha: 5, village: 'Karangi', taluk: 'S.V. Pura', district: 'Kolar', work_type: 'M', vidhana_sabha: 'Srinivasapura', lok_sabha: 'Kolar', division: 'Bengaluru' },
    { id: 'plt-b04', range_id: 'rng-svpura', name: 'A.M. Palli', species: 'Eucalyptus', year_of_planting: 2011, total_area_ha: 37.24, village: 'Erathimmanapalli', taluk: 'S.V. Pura', district: 'Kolar', work_type: 'M', vidhana_sabha: 'Srinivasapura', lok_sabha: 'Kolar', division: 'Bengaluru' },
    { id: 'plt-b05', range_id: 'rng-svpura', name: 'Yamanuru', species: 'Eucalyptus', year_of_planting: 2011, total_area_ha: 36.02, village: 'Yamanuru', taluk: 'S.V. Pura', district: 'Kolar', work_type: 'M', vidhana_sabha: 'Srinivasapura', lok_sabha: 'Kolar', division: 'Bengaluru' },
    { id: 'plt-b06', range_id: 'rng-svpura', name: 'Narayanapura', species: 'Eucalyptus', year_of_planting: 2011, total_area_ha: 48, village: 'Narayanapura', taluk: 'S.V. Pura', district: 'Kolar', work_type: 'M', vidhana_sabha: 'Srinivasapura', lok_sabha: 'Kolar', division: 'Bengaluru' },
    // Bangalore Division - D.V. Halli Range
    { id: 'plt-b07', range_id: 'rng-dvhalli', name: 'Koramangala', species: 'Eucalyptus', year_of_planting: 1995, total_area_ha: 50, village: 'Chikkatatnangara', taluk: 'D.V. Halli', district: 'Doddaballapura', work_type: 'M', vidhana_sabha: 'Devanahalli', lok_sabha: 'Bengaluru Rural', division: 'Bengaluru' },
    { id: 'plt-b08', range_id: 'rng-dvhalli', name: 'Guduvamahalli', species: 'Eucalyptus', year_of_planting: 2004, total_area_ha: 77.5, village: 'Koramangala', taluk: 'D.V. Halli', district: 'Doddaballapura', work_type: 'M', vidhana_sabha: 'Devanahalli', lok_sabha: 'Bengaluru Rural', division: 'Bengaluru' },
    { id: 'plt-b09', range_id: 'rng-dvhalli', name: 'Kamashettihalli', species: 'Eucalyptus', year_of_planting: 1986, total_area_ha: 85.7, village: 'Adavi Gollavari Halli', taluk: 'Chikkaballapura', district: 'Chikkaballapura', work_type: 'M', vidhana_sabha: 'Shidlagatta', lok_sabha: 'Chikkaballapura', division: 'Bengaluru' },
    { id: 'plt-b10', range_id: 'rng-dvhalli', name: 'Doddaharadi', species: 'Eucalyptus', year_of_planting: 2003, total_area_ha: 5, village: 'Doddaharadi', taluk: 'Shidlaghatta', district: 'Chikkaballapura', work_type: 'M', vidhana_sabha: 'Shidlagatta', lok_sabha: 'Chikkaballapura', division: 'Bengaluru' },
    // Bangalore Division - Bidadi Range - Fresh Works (2025)
    { id: 'plt-b11', range_id: 'rng-bidadi', name: 'Hejjala', species: 'Corymbia', year_of_planting: 2025, total_area_ha: 81.91, village: 'Hejjala', taluk: 'Kanakapura', district: 'Ramanagara', work_type: 'FW', vidhana_sabha: 'Kanakapura', lok_sabha: 'Bengaluru Rural', division: 'Bengaluru' },
    { id: 'plt-b12', range_id: 'rng-bidadi', name: 'Nelamangala', species: 'Corymbia', year_of_planting: 2025, total_area_ha: 14, village: 'Harlakunte', taluk: 'Magadi', district: 'Ramanagara', work_type: 'FW', vidhana_sabha: 'Magadi', lok_sabha: 'Bengaluru Rural', division: 'Bengaluru' },
    // Bangalore Division - Malur Range
    { id: 'plt-b13', range_id: 'rng-malur', name: 'Hale Kurandahalli', species: 'Corymbia', year_of_planting: 1995, total_area_ha: 60.6, village: 'Hale Kurandahalli', taluk: 'Malur', district: 'Kolar', work_type: 'M', vidhana_sabha: 'Malur', lok_sabha: 'Kolar', division: 'Bengaluru' },
    { id: 'plt-b14', range_id: 'rng-malur', name: 'Mallapanahalli', species: 'Corymbia', year_of_planting: 1999, total_area_ha: 160, village: 'Mallapanahalli', taluk: 'Malur', district: 'Kolar', work_type: 'M', vidhana_sabha: 'Malur', lok_sabha: 'Kolar', division: 'Bengaluru' },
    // Bangalore Division - Bangarpet Range
    { id: 'plt-b15', range_id: 'rng-bangarpet', name: 'Bangarpet Block', species: 'Eucalyptus', year_of_planting: 2001, total_area_ha: 74.91, village: 'Bangarpet', taluk: 'Bangarpet', district: 'Kolar', work_type: 'M', vidhana_sabha: 'Mulabagilu', lok_sabha: 'Kolar', division: 'Bengaluru' },
    // Shivamogga Division
    { id: 'plt-s01', range_id: 'rng-sagara', name: 'Sagara Acacia Block', species: 'Acacia auriculiformis', year_of_planting: 2020, total_area_ha: 45, village: 'Sagara', taluk: 'Sagara', district: 'Shivamogga', work_type: 'M', vidhana_sabha: 'Sagara', lok_sabha: 'Shivamogga', division: 'Shivamogga' },
    { id: 'plt-s02', range_id: 'rng-sagara', name: 'Sagara Eucalyptus Block', species: 'Eucalyptus pellita', year_of_planting: 2023, total_area_ha: 27, village: 'Sagara', taluk: 'Sagara', district: 'Shivamogga', work_type: 'M', vidhana_sabha: 'Sagara', lok_sabha: 'Shivamogga', division: 'Shivamogga' },
    { id: 'plt-s03', range_id: 'rng-soraba', name: 'Soraba Plantation', species: 'Acacia auriculiformis', year_of_planting: 2019, total_area_ha: 52.1, village: 'Soraba', taluk: 'Soraba', district: 'Shivamogga', work_type: 'M', vidhana_sabha: 'Soraba', lok_sabha: 'Shivamogga', division: 'Shivamogga' },
    { id: 'plt-s04', range_id: 'rng-siddapur', name: 'Siddapur Block', species: 'Eucalyptus pellita', year_of_planting: 2017, total_area_ha: 33.7, village: 'Siddapur', taluk: 'Siddapur', district: 'Uttara Kannada', work_type: 'M', vidhana_sabha: 'Siddapur', lok_sabha: 'Haveri', division: 'Shivamogga' },
    // Chikkamagaluru Division
    { id: 'plt-c01', range_id: 'rng-koppa', name: 'Koppa Plantation', species: 'Acacia auriculiformis', year_of_planting: 2018, total_area_ha: 29, village: 'Koppa', taluk: 'Koppa', district: 'Chikkamagaluru', work_type: 'M', vidhana_sabha: 'Koppa', lok_sabha: 'Udupi-Chikkamagalore', division: 'Chikkamagalore', plantation_category: 'Non-Rubber', advance_work_year: 2017, planted_year: 2018 },
    { id: 'plt-c02', range_id: 'rng-narasimharajapura', name: 'NR Pura Block', species: 'Eucalyptus pellita', year_of_planting: 2022, total_area_ha: 18.6, village: 'NR Pura', taluk: 'NR Pura', district: 'Chikkamagaluru', work_type: 'M', vidhana_sabha: 'Sringeri', lok_sabha: 'Udupi-Chikkamagalore', division: 'Chikkamagalore', plantation_category: 'Non-Rubber', advance_work_year: 2021, planted_year: 2022 },
  ],

  // ===================== BUILDINGS MODULE =====================
  buildings: [
    // Dharwad Division Buildings
    { id: 'bld-d01', range_id: 'rng-dharwad', name: 'Dharwad Range Office', division: 'Dharwad', district: 'Dharwad', taluk: 'Dharwad', year_of_creation: 2010, latitude: 15.4589, longitude: 75.0078, survey_number: 'SY-101/A', building_phase: 'Maintenance', status: 'Active' },
    { id: 'bld-d02', range_id: 'rng-dharwad', name: 'Varavanagalavi Rest House', division: 'Dharwad', district: 'Dharwad', taluk: 'Dharwad', year_of_creation: 2015, latitude: 15.4721, longitude: 75.0234, survey_number: 'SY-205/B', building_phase: 'Maintenance', status: 'Active' },
    { id: 'bld-d03', range_id: 'rng-alloli', name: 'Alloli Nursery Shed', division: 'Dharwad', district: 'Belagavi', taluk: 'Khanapur', year_of_creation: 2020, latitude: 15.6234, longitude: 74.5123, survey_number: 'SY-89/C', building_phase: 'Maintenance', status: 'Active' },
    { id: 'bld-d04', range_id: 'rng-khanapur', name: 'Khanapur Check Post', division: 'Dharwad', district: 'Belagavi', taluk: 'Khanapur', year_of_creation: 2025, latitude: 15.6512, longitude: 74.5456, survey_number: 'SY-112/D', building_phase: 'Creation', status: 'Under Construction' },
    // Bangalore Division Buildings
    { id: 'bld-b01', range_id: 'rng-svpura', name: 'S.V. Pura Division Office', division: 'Bengaluru', district: 'Kolar', taluk: 'S.V. Pura', year_of_creation: 2008, latitude: 13.2456, longitude: 78.1234, survey_number: 'SY-45/A', building_phase: 'Maintenance', status: 'Active' },
    { id: 'bld-b02', range_id: 'rng-dvhalli', name: 'D.V. Halli Guard House', division: 'Bengaluru', district: 'Doddaballapura', taluk: 'D.V. Halli', year_of_creation: 2018, latitude: 13.5678, longitude: 77.5432, survey_number: 'SY-78/B', building_phase: 'Maintenance', status: 'Active' },
    { id: 'bld-b03', range_id: 'rng-bidadi', name: 'Bidadi New Office Building', division: 'Bengaluru', district: 'Ramanagara', taluk: 'Kanakapura', year_of_creation: 2026, latitude: 12.7890, longitude: 77.3210, survey_number: 'SY-156/C', building_phase: 'Creation', status: 'Under Construction' },
    // Shivamogga Division Buildings
    { id: 'bld-s01', range_id: 'rng-sagara', name: 'Sagara Range Office', division: 'Shivamogga', district: 'Shivamogga', taluk: 'Sagara', year_of_creation: 2012, latitude: 14.1678, longitude: 75.0234, survey_number: 'SY-201/A', building_phase: 'Maintenance', status: 'Active' },
    { id: 'bld-s02', range_id: 'rng-soraba', name: 'Soraba Plantation Store', division: 'Shivamogga', district: 'Shivamogga', taluk: 'Soraba', year_of_creation: 2019, latitude: 14.3456, longitude: 75.1234, survey_number: 'SY-89/B', building_phase: 'Maintenance', status: 'Active' },
  ],

  // Buildings Activities (Rate Card)
  building_activities: [
    // Creation Phase Activities (CapEx)
    { id: 'bact-01', name: 'Site Survey & Layout', category: 'Creation', unit: 'Per Building', ssr_no: 'BLD-01' },
    { id: 'bact-02', name: 'Foundation Work', category: 'Creation', unit: 'Per Sq.Ft', ssr_no: 'BLD-02' },
    { id: 'bact-03', name: 'Structural Construction', category: 'Creation', unit: 'Per Sq.Ft', ssr_no: 'BLD-03' },
    { id: 'bact-04', name: 'Roofing Work', category: 'Creation', unit: 'Per Sq.Ft', ssr_no: 'BLD-04' },
    { id: 'bact-05', name: 'Electrical Installation', category: 'Creation', unit: 'Per Building', ssr_no: 'BLD-05' },
    { id: 'bact-06', name: 'Plumbing & Sanitation', category: 'Creation', unit: 'Per Building', ssr_no: 'BLD-06' },
    { id: 'bact-07', name: 'Painting & Finishing', category: 'Creation', unit: 'Per Sq.Ft', ssr_no: 'BLD-07' },
    // Maintenance Phase Activities (RevEx)
    { id: 'bact-08', name: 'Annual Building Maintenance', category: 'Maintenance', unit: 'Per Building', ssr_no: 'BLD-08' },
    { id: 'bact-09', name: 'Roof Repair & Waterproofing', category: 'Maintenance', unit: 'Per Sq.Ft', ssr_no: 'BLD-09' },
    { id: 'bact-10', name: 'Electrical Maintenance', category: 'Maintenance', unit: 'Per Building', ssr_no: 'BLD-10' },
    { id: 'bact-11', name: 'Plumbing Repairs', category: 'Maintenance', unit: 'Per Building', ssr_no: 'BLD-11' },
    { id: 'bact-12', name: 'Repainting & Touch-up', category: 'Maintenance', unit: 'Per Sq.Ft', ssr_no: 'BLD-12' },
    { id: 'bact-13', name: 'Security & Watchman Services', category: 'Maintenance', unit: 'Per Month', ssr_no: 'BLD-13' },
  ],

  // Building Norms (Rate Card with Rates)
  building_norms: [
    // Creation Phase Norms (CapEx)
    { id: 'bnorm-01', activity_id: 'bact-01', building_phase: 'Creation', standard_rate: 25000, financial_year: '2026-27' },
    { id: 'bnorm-02', activity_id: 'bact-02', building_phase: 'Creation', standard_rate: 350, financial_year: '2026-27' },
    { id: 'bnorm-03', activity_id: 'bact-03', building_phase: 'Creation', standard_rate: 1200, financial_year: '2026-27' },
    { id: 'bnorm-04', activity_id: 'bact-04', building_phase: 'Creation', standard_rate: 450, financial_year: '2026-27' },
    { id: 'bnorm-05', activity_id: 'bact-05', building_phase: 'Creation', standard_rate: 75000, financial_year: '2026-27' },
    { id: 'bnorm-06', activity_id: 'bact-06', building_phase: 'Creation', standard_rate: 45000, financial_year: '2026-27' },
    { id: 'bnorm-07', activity_id: 'bact-07', building_phase: 'Creation', standard_rate: 85, financial_year: '2026-27' },
    // Maintenance Phase Norms (RevEx)
    { id: 'bnorm-08', activity_id: 'bact-08', building_phase: 'Maintenance', standard_rate: 50000, financial_year: '2026-27' },
    { id: 'bnorm-09', activity_id: 'bact-09', building_phase: 'Maintenance', standard_rate: 120, financial_year: '2026-27' },
    { id: 'bnorm-10', activity_id: 'bact-10', building_phase: 'Maintenance', standard_rate: 15000, financial_year: '2026-27' },
    { id: 'bnorm-11', activity_id: 'bact-11', building_phase: 'Maintenance', standard_rate: 12000, financial_year: '2026-27' },
    { id: 'bnorm-12', activity_id: 'bact-12', building_phase: 'Maintenance', standard_rate: 45, financial_year: '2026-27' },
    { id: 'bnorm-13', activity_id: 'bact-13', building_phase: 'Maintenance', standard_rate: 18000, financial_year: '2026-27' },
  ],

  // ===================== NURSERIES MODULE =====================
  nurseries: [
    // Dharwad Division Nurseries
    { id: 'nur-d01', range_id: 'rng-dharwad', name: 'Dharwad Central Nursery', nursery_type: 'Raising', latitude: 15.4567, longitude: 75.0123, status: 'Active', capacity_seedlings: 50000 },
    { id: 'nur-d02', range_id: 'rng-alloli', name: 'Alloli Clonal Nursery', nursery_type: 'New', latitude: 15.6345, longitude: 74.5234, status: 'Under Development', capacity_seedlings: 75000 },
    { id: 'nur-d03', range_id: 'rng-khanapur', name: 'Khanapur Seedling Nursery', nursery_type: 'Raising', latitude: 15.6678, longitude: 74.5567, status: 'Active', capacity_seedlings: 40000 },
    // Bangalore Division Nurseries
    { id: 'nur-b01', range_id: 'rng-svpura', name: 'S.V. Pura Main Nursery', nursery_type: 'Raising', latitude: 13.2567, longitude: 78.1345, status: 'Active', capacity_seedlings: 100000 },
    { id: 'nur-b02', range_id: 'rng-dvhalli', name: 'D.V. Halli Tissue Culture', nursery_type: 'New', latitude: 13.5789, longitude: 77.5543, status: 'Active', capacity_seedlings: 30000 },
    { id: 'nur-b03', range_id: 'rng-bidadi', name: 'Bidadi New Nursery', nursery_type: 'New', latitude: 12.7901, longitude: 77.3321, status: 'Under Development', capacity_seedlings: 60000 },
    // Shivamogga Division Nurseries
    { id: 'nur-s01', range_id: 'rng-sagara', name: 'Sagara Forest Nursery', nursery_type: 'Raising', latitude: 14.1789, longitude: 75.0345, status: 'Active', capacity_seedlings: 80000 },
    { id: 'nur-s02', range_id: 'rng-soraba', name: 'Soraba Eucalyptus Nursery', nursery_type: 'Raising', latitude: 14.3567, longitude: 75.1345, status: 'Active', capacity_seedlings: 45000 },
  ],

  // Nursery Activities (Rate Card) - All CapEx, No RevEx
  nursery_activities: [
    // New Nursery Phase (CapEx)
    { id: 'nact-01', name: 'Nursery Site Preparation', category: 'New Nursery', unit: 'Per Hectare', ssr_no: 'NUR-01' },
    { id: 'nact-02', name: 'Irrigation System Setup', category: 'New Nursery', unit: 'Per Nursery', ssr_no: 'NUR-02' },
    { id: 'nact-03', name: 'Shade Net Installation', category: 'New Nursery', unit: 'Per Sq.Meter', ssr_no: 'NUR-03' },
    { id: 'nact-04', name: 'Nursery Bed Construction', category: 'New Nursery', unit: 'Per Bed', ssr_no: 'NUR-04' },
    { id: 'nact-05', name: 'Potting Mix Preparation', category: 'New Nursery', unit: 'Per Cubic Meter', ssr_no: 'NUR-05' },
    { id: 'nact-06', name: 'Mother Plant Establishment', category: 'New Nursery', unit: 'Per Plant', ssr_no: 'NUR-06' },
    // Raising Nursery Phase (CapEx)
    { id: 'nact-07', name: 'Seed Collection & Processing', category: 'Raising Nursery', unit: 'Per Kg', ssr_no: 'NUR-07' },
    { id: 'nact-08', name: 'Seed Sowing & Germination', category: 'Raising Nursery', unit: 'Per 1000 Seeds', ssr_no: 'NUR-08' },
    { id: 'nact-09', name: 'Pricking & Transplanting', category: 'Raising Nursery', unit: 'Per 1000 Seedlings', ssr_no: 'NUR-09' },
    { id: 'nact-10', name: 'Seedling Maintenance', category: 'Raising Nursery', unit: 'Per 1000 Seedlings', ssr_no: 'NUR-10' },
    { id: 'nact-11', name: 'Fertilizer Application', category: 'Raising Nursery', unit: 'Per 1000 Seedlings', ssr_no: 'NUR-11' },
    { id: 'nact-12', name: 'Pest & Disease Control', category: 'Raising Nursery', unit: 'Per 1000 Seedlings', ssr_no: 'NUR-12' },
    { id: 'nact-13', name: 'Hardening of Seedlings', category: 'Raising Nursery', unit: 'Per 1000 Seedlings', ssr_no: 'NUR-13' },
    { id: 'nact-14', name: 'Polybag Filling & Arrangement', category: 'Raising Nursery', unit: 'Per 1000 Bags', ssr_no: 'NUR-14' },
  ],

  // Nursery Norms (Rate Card with Rates) - All CapEx
  nursery_norms: [
    // New Nursery Phase (CapEx)
    { id: 'nnorm-01', activity_id: 'nact-01', nursery_type: 'New', standard_rate: 85000, financial_year: '2026-27' },
    { id: 'nnorm-02', activity_id: 'nact-02', nursery_type: 'New', standard_rate: 150000, financial_year: '2026-27' },
    { id: 'nnorm-03', activity_id: 'nact-03', nursery_type: 'New', standard_rate: 250, financial_year: '2026-27' },
    { id: 'nnorm-04', activity_id: 'nact-04', nursery_type: 'New', standard_rate: 5000, financial_year: '2026-27' },
    { id: 'nnorm-05', activity_id: 'nact-05', nursery_type: 'New', standard_rate: 2500, financial_year: '2026-27' },
    { id: 'nnorm-06', activity_id: 'nact-06', nursery_type: 'New', standard_rate: 150, financial_year: '2026-27' },
    // Raising Nursery Phase (CapEx)
    { id: 'nnorm-07', activity_id: 'nact-07', nursery_type: 'Raising', standard_rate: 500, financial_year: '2026-27' },
    { id: 'nnorm-08', activity_id: 'nact-08', nursery_type: 'Raising', standard_rate: 1200, financial_year: '2026-27' },
    { id: 'nnorm-09', activity_id: 'nact-09', nursery_type: 'Raising', standard_rate: 2500, financial_year: '2026-27' },
    { id: 'nnorm-10', activity_id: 'nact-10', nursery_type: 'Raising', standard_rate: 1800, financial_year: '2026-27' },
    { id: 'nnorm-11', activity_id: 'nact-11', nursery_type: 'Raising', standard_rate: 800, financial_year: '2026-27' },
    { id: 'nnorm-12', activity_id: 'nact-12', nursery_type: 'Raising', standard_rate: 600, financial_year: '2026-27' },
    { id: 'nnorm-13', activity_id: 'nact-13', nursery_type: 'Raising', standard_rate: 400, financial_year: '2026-27' },
    { id: 'nnorm-14', activity_id: 'nact-14', nursery_type: 'Raising', standard_rate: 3500, financial_year: '2026-27' },
  ],
}

// ===================== ROUTE HANDLER =====================
async function handleRoute(request, { params }) {
  const startTime = Date.now()
  const { path: pathSegments = [] } = params
  const route = `/${pathSegments.join('/')}`
  const method = request.method

  // Log incoming request
  logRequest(method, route)

  try {
    const db = await connectToMongo()
    logDbOperation('connect', 'database')

    // =================== ROOT ===================
    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'KFDC iFMS API v1.0', status: 'running' }))
    }

    // =================== SEED ===================
    if (route === '/seed' && method === 'POST') {
      // Drop existing collections
      const collections = ['users', 'divisions', 'ranges', 'activity_master', 'norms_config', 'plantations', 'buildings', 'nurseries', 'building_activities', 'building_norms', 'nursery_activities', 'nursery_norms', 'apo_headers', 'apo_items', 'work_logs', 'sessions']
      for (const col of collections) {
        try { await db.collection(col).drop() } catch (e) { /* ignore if not exists */ }
      }

      await db.collection('divisions').insertMany(SEED_DATA.divisions)
      await db.collection('ranges').insertMany(SEED_DATA.ranges)
      await db.collection('users').insertMany(SEED_DATA.users)
      await db.collection('activity_master').insertMany(SEED_DATA.activities)
      await db.collection('norms_config').insertMany(SEED_DATA.norms)
      await db.collection('plantations').insertMany(SEED_DATA.plantations.map(p => ({ ...p, created_at: new Date() })))
      
      // Seed Buildings Module
      await db.collection('buildings').insertMany(SEED_DATA.buildings.map(b => ({ ...b, created_at: new Date() })))
      await db.collection('building_activities').insertMany(SEED_DATA.building_activities)
      await db.collection('building_norms').insertMany(SEED_DATA.building_norms)
      
      // Seed Nurseries Module
      await db.collection('nurseries').insertMany(SEED_DATA.nurseries.map(n => ({ ...n, created_at: new Date() })))
      await db.collection('nursery_activities').insertMany(SEED_DATA.nursery_activities)
      await db.collection('nursery_norms').insertMany(SEED_DATA.nursery_norms)

      // Create sample APOs with real plantation refs
      const sampleApos = [
        {
          id: 'apo-001',
          plantation_id: 'plt-d01',
          financial_year: '2026-27',
          status: 'SANCTIONED',
          total_sanctioned_amount: 327450,
          created_by: 'usr-ro1',
          approved_by: 'usr-dm1',
          created_at: new Date('2026-04-01'),
          updated_at: new Date('2026-04-05'),
        },
        {
          id: 'apo-002',
          plantation_id: 'plt-d06',
          financial_year: '2026-27',
          status: 'PENDING_APPROVAL',
          total_sanctioned_amount: 112050,
          created_by: 'usr-ro4',
          approved_by: null,
          created_at: new Date('2026-05-10'),
          updated_at: new Date('2026-05-10'),
        },
        {
          id: 'apo-003',
          plantation_id: 'plt-b01',
          financial_year: '2026-27',
          status: 'SANCTIONED',
          total_sanctioned_amount: 436800,
          created_by: 'usr-ro2',
          approved_by: 'usr-dm2',
          created_at: new Date('2026-04-15'),
          updated_at: new Date('2026-04-18'),
        },
        {
          id: 'apo-004',
          plantation_id: 'plt-s01',
          financial_year: '2026-27',
          status: 'DRAFT',
          total_sanctioned_amount: 325800,
          created_by: 'usr-ro3',
          approved_by: null,
          created_at: new Date('2026-05-20'),
          updated_at: new Date('2026-05-20'),
        },
      ]
      await db.collection('apo_headers').insertMany(sampleApos)

      const sampleApoItems = [
        // APO-001: Varavanagalavi (12 yr old) - Dharwad
        { id: 'apoi-001', apo_id: 'apo-001', activity_id: 'act-fireline', activity_name: 'Clearing 5m Wide Fire Lines', sanctioned_qty: 25, sanctioned_rate: 5455.86, total_cost: 136396.5, unit: 'Per Hectare' },
        { id: 'apoi-002', apo_id: 'apo-001', activity_id: 'act-firewatch', activity_name: 'Engaging Fire Watchers', sanctioned_qty: 25, sanctioned_rate: 1784.01, total_cost: 44600.25, unit: 'Per Month' },
        { id: 'apoi-003', apo_id: 'apo-001', activity_id: 'act-misc', activity_name: 'Miscellaneous (Implements, Spray pump etc)', sanctioned_qty: 1, sanctioned_rate: 5000, total_cost: 5000, unit: 'Lump Sum' },
        // APO-002: Alloli-Kanasolli (22 yr old Eucalyptus)
        { id: 'apoi-004', apo_id: 'apo-002', activity_id: 'act-fireline', activity_name: 'Clearing 5m Wide Fire Lines', sanctioned_qty: 15.5, sanctioned_rate: 5455.86, total_cost: 84565.83, unit: 'Per Hectare' },
        { id: 'apoi-005', apo_id: 'apo-002', activity_id: 'act-firewatch', activity_name: 'Engaging Fire Watchers', sanctioned_qty: 15.5, sanctioned_rate: 1784.01, total_cost: 27652.16, unit: 'Per Month' },
        // APO-003: Agara, Bangalore (25 yr old Eucalyptus)
        { id: 'apoi-006', apo_id: 'apo-003', activity_id: 'act-fireline', activity_name: 'Clearing 5m Wide Fire Lines', sanctioned_qty: 65, sanctioned_rate: 5455.86, total_cost: 354630.9, unit: 'Per Hectare' },
        { id: 'apoi-007', apo_id: 'apo-003', activity_id: 'act-firewatch', activity_name: 'Engaging Fire Watchers', sanctioned_qty: 65, sanctioned_rate: 1784.01, total_cost: 115960.65, unit: 'Per Month' },
        // APO-004: Sagara (6 yr old Acacia)
        { id: 'apoi-008', apo_id: 'apo-004', activity_id: 'act-fireline', activity_name: 'Clearing 5m Wide Fire Lines', sanctioned_qty: 45, sanctioned_rate: 5455.86, total_cost: 245513.7, unit: 'Per Hectare' },
        { id: 'apoi-009', apo_id: 'apo-004', activity_id: 'act-firewatch', activity_name: 'Engaging Fire Watchers', sanctioned_qty: 45, sanctioned_rate: 1784.01, total_cost: 80280.45, unit: 'Per Month' },
      ]
      await db.collection('apo_items').insertMany(sampleApoItems)

      // Sample work logs
      const sampleWorkLogs = [
        { id: 'wl-001', apo_item_id: 'apoi-001', work_date: new Date('2026-05-15'), actual_qty: 10, expenditure: 54558.6, logged_by: 'usr-ro1', created_at: new Date('2026-05-15') },
        { id: 'wl-002', apo_item_id: 'apoi-006', work_date: new Date('2026-05-20'), actual_qty: 20, expenditure: 109117.2, logged_by: 'usr-ro2', created_at: new Date('2026-05-20') },
        { id: 'wl-003', apo_item_id: 'apoi-007', work_date: new Date('2026-05-22'), actual_qty: 20, expenditure: 35680.2, logged_by: 'usr-ro2', created_at: new Date('2026-05-22') },
      ]
      await db.collection('work_logs').insertMany(sampleWorkLogs)

      return handleCORS(NextResponse.json({ message: 'Database seeded with real KFDC data', counts: { divisions: 4, ranges: 19, users: 8, activities: 25, norms: SEED_DATA.norms.length, plantations: SEED_DATA.plantations.length, apos: 4 } }))
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

    // =================== DISTRICTS & TALUKS ===================
    // GET /districts - Returns all districts with their taluks
    if (route === '/districts' && method === 'GET') {
      // Return from seed data (static list)
      return handleCORS(NextResponse.json(SEED_DATA.districts_taluks))
    }

    // GET /taluks?district=Dharwad - Returns taluks for a specific district
    if (route === '/taluks' && method === 'GET') {
      const url = new URL(request.url)
      const districtName = url.searchParams.get('district')
      if (!districtName) {
        // Return all taluks flat list
        const allTaluks = SEED_DATA.districts_taluks.flatMap(d => d.taluks)
        return handleCORS(NextResponse.json(allTaluks))
      }
      const district = SEED_DATA.districts_taluks.find(d => d.district.toLowerCase() === districtName.toLowerCase())
      if (!district) {
        return handleCORS(NextResponse.json({ error: 'District not found' }, { status: 404 }))
      }
      return handleCORS(NextResponse.json(district.taluks))
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
        ssr_no: actMap[n.activity_id]?.ssr_no || '-',
      }))
      return handleCORS(NextResponse.json(enriched))
    }

    if (route === '/norms' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user || user.role !== 'ADMIN') {
        return handleCORS(NextResponse.json({ error: 'Only Admin can manage the Rate Card' }, { status: 403 }))
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
        // Dynamically calculate work_type based on financial year
        const dynamicWorkType = getWorkType(p.year_of_planting)
        return { ...p, range_name: range?.name, division_name: division?.name, age, work_type: dynamicWorkType }
      })
      return handleCORS(NextResponse.json(enriched))
    }

    if (route === '/plantations' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user || user.role !== 'RO') {
        return handleCORS(NextResponse.json({ error: 'Only Range Officers can create plantations' }, { status: 403 }))
      }
      const body = await request.json()
      
      // Determine work type dynamically based on financial year
      const plantingYear = parseInt(body.year_of_planting)
      const workType = getWorkType(plantingYear)
      
      const plantation = {
        id: uuidv4(),
        range_id: user.range_id,
        name: body.name,
        species: body.species,
        year_of_planting: plantingYear,
        total_area_ha: parseFloat(body.total_area_ha),
        village: body.village || null,
        taluk: body.taluk || null,
        district: body.district || null,
        vidhana_sabha: body.vidhana_sabha || null,
        lok_sabha: body.lok_sabha || null,
        division: body.division || null,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        work_type: workType,
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
      const dynamicWorkType = getWorkType(p.year_of_planting)
      const range = await db.collection('ranges').findOne({ id: p.range_id })
      const division = range ? await db.collection('divisions').findOne({ id: range.division_id }) : null
      return handleCORS(NextResponse.json({ ...p, age, work_type: dynamicWorkType, range_name: range?.name, division_name: division?.name }))
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
      
      // Get norms for this age - first try exact match, then fallback to nearest lower age
      let norms = await db.collection('norms_config').find({
        applicable_age: age,
        financial_year: financial_year,
        $or: [{ species_id: null }, { species_id: plantation.species }]
      }).toArray()

      // If no exact match, find the highest applicable_age <= plantation age
      if (norms.length === 0 && age > 0) {
        const allNorms = await db.collection('norms_config').find({
          financial_year: financial_year,
          applicable_age: { $lte: age, $gt: 0 },
          $or: [{ species_id: null }, { species_id: plantation.species }]
        }).sort({ applicable_age: -1 }).toArray()
        
        if (allNorms.length > 0) {
          const nearestAge = allNorms[0].applicable_age
          norms = allNorms.filter(n => n.applicable_age === nearestAge)
        }
      }

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
      const { plantation_id, financial_year, items, status, title } = body

      const apoId = uuidv4()
      const apoItems = (items || []).map(item => ({
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
        title: title || 'APO',
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

    // =================== WORKS ENDPOINTS ===================

    // POST /works/suggest-activities - Get suggested activities based on plantation age
    if (route === '/works/suggest-activities' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      const body = await request.json()
      const { plantation_id, financial_year } = body

      const plantation = await db.collection('plantations').findOne({ id: plantation_id })
      if (!plantation) return handleCORS(NextResponse.json({ error: 'Plantation not found' }, { status: 404 }))

      const plantationAge = new Date().getFullYear() - plantation.year_of_planting

      // Get norms applicable for this age
      const norms = await db.collection('norms_config').find({
        applicable_age: plantationAge,
        financial_year: financial_year || '2026-27'
      }).toArray()

      // Enrich with activity details
      const activities = await db.collection('activity_master').find({}).toArray()
      const actMap = {}
      activities.forEach(a => { actMap[a.id] = a })

      const suggestions = norms.map(n => ({
        activity_id: n.activity_id,
        activity_name: actMap[n.activity_id]?.name || 'Unknown',
        ssr_no: actMap[n.activity_id]?.ssr_no,
        unit: actMap[n.activity_id]?.unit,
        category: actMap[n.activity_id]?.category,
        sanctioned_rate: n.standard_rate,
        applicable_age: n.applicable_age,
      }))

      return handleCORS(NextResponse.json({
        plantation,
        plantation_age: plantationAge,
        suggested_activities: suggestions,
      }))
    }

    // POST /works - Create a new work (add activities to APO)
    if (route === '/works' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      if (user.role !== 'RO') return handleCORS(NextResponse.json({ error: 'Only RO can add works' }, { status: 403 }))

      const body = await request.json()
      const { apo_id, plantation_id, name, items } = body

      if (!apo_id || !items || items.length === 0) {
        return handleCORS(NextResponse.json({ error: 'APO ID and items are required' }, { status: 400 }))
      }

      const apo = await db.collection('apo_headers').findOne({ id: apo_id })
      if (!apo) return handleCORS(NextResponse.json({ error: 'APO not found' }, { status: 404 }))
      if (apo.status !== 'DRAFT') return handleCORS(NextResponse.json({ error: 'Can only add works to DRAFT APOs' }, { status: 400 }))

      // Create APO items from work items
      let totalAdded = 0
      for (const item of items) {
        const itemId = uuidv4()
        const totalCost = (item.sanctioned_qty || 0) * (item.sanctioned_rate || 0)
        await db.collection('apo_items').insertOne({
          id: itemId,
          apo_id,
          activity_id: item.activity_id,
          activity_name: item.activity_name,
          ssr_no: item.ssr_no,
          unit: item.unit,
          sanctioned_rate: item.sanctioned_rate,
          sanctioned_qty: item.sanctioned_qty,
          total_cost: totalCost,
          estimate_status: 'DRAFT',
          created_at: new Date(),
        })
        totalAdded += totalCost
      }

      // Update APO total
      const newTotal = (apo.total_sanctioned_amount || 0) + totalAdded
      await db.collection('apo_headers').updateOne(
        { id: apo_id },
        { $set: { total_sanctioned_amount: newTotal, plantation_id: plantation_id || apo.plantation_id, updated_at: new Date() } }
      )

      return handleCORS(NextResponse.json({ message: 'Work added successfully', items_added: items.length, total_added: totalAdded }, { status: 201 }))
    }

    // DELETE /works/:id - Delete a work/item from draft APO
    const workDeleteMatch = route.match(/^\/works\/([^/]+)$/)
    if (workDeleteMatch && method === 'DELETE') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      const itemId = workDeleteMatch[1]
      const item = await db.collection('apo_items').findOne({ id: itemId })
      if (!item) return handleCORS(NextResponse.json({ error: 'Work item not found' }, { status: 404 }))

      const apo = await db.collection('apo_headers').findOne({ id: item.apo_id })
      if (!apo) return handleCORS(NextResponse.json({ error: 'APO not found' }, { status: 404 }))
      if (apo.status !== 'DRAFT') return handleCORS(NextResponse.json({ error: 'Can only delete works from DRAFT APOs' }, { status: 400 }))

      await db.collection('apo_items').deleteOne({ id: itemId })

      // Update APO total
      const newTotal = Math.max(0, (apo.total_sanctioned_amount || 0) - (item.total_cost || 0))
      await db.collection('apo_headers').updateOne(
        { id: item.apo_id },
        { $set: { total_sanctioned_amount: newTotal, updated_at: new Date() } }
      )

      return handleCORS(NextResponse.json({ message: 'Work deleted successfully' }))
    }

    // =================== FUND INDENT ENDPOINTS ===================
    // Fund Indent Hierarchy: RFO → DCF → ED → MD
    // Phase 1: RFO generates Fund Indent (GFI)
    // Phase 2: DCF, ED, MD approve Fund Indent (AFI)

    // GET /fund-indent/works - RFO: Get works available for Fund Indent generation
    if (route === '/fund-indent/works' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      if (!['RFO', 'ADMIN'].includes(user.role)) {
        return handleCORS(NextResponse.json({ error: 'Access denied. Only RFO can access this.' }, { status: 403 }))
      }

      const url = new URL(request.url)
      const year = url.searchParams.get('year') || '2026-27'

      // Get plantations in RFO's jurisdiction
      let plantationFilter = {}
      if (user.role === 'RFO' && user.range_id) {
        plantationFilter = { range_id: user.range_id }
      }

      const plantations = await db.collection('plantations').find(plantationFilter).toArray()
      const plantationIds = plantations.map(p => p.id)
      const pltMap = {}
      plantations.forEach(p => { pltMap[p.id] = p })

      // Find SANCTIONED APOs
      const apos = await db.collection('apo_headers').find({
        plantation_id: { $in: plantationIds },
        status: 'SANCTIONED',
        financial_year: year
      }).toArray()

      const apoIds = apos.map(a => a.id)
      const apoMap = {}
      apos.forEach(a => { apoMap[a.id] = a })

      // Get work items that don't have a fund indent yet
      const items = await db.collection('apo_items').find({
        apo_id: { $in: apoIds },
        fund_indent_id: { $exists: false }
      }).toArray()

      // Group by APO for display
      const worksByApo = items.reduce((acc, item) => {
        if (!acc[item.apo_id]) {
          const apo = apoMap[item.apo_id]
          const plt = pltMap[apo?.plantation_id]
          acc[item.apo_id] = {
            apo_id: item.apo_id,
            plantation_name: plt?.name || 'Unknown',
            financial_year: apo?.financial_year,
            work_count: 0,
            total_amount: 0,
          }
        }
        acc[item.apo_id].work_count++
        acc[item.apo_id].total_amount += item.total_cost || 0
        return acc
      }, {})

      return handleCORS(NextResponse.json({
        works: Object.values(worksByApo),
        years: ['2024-25', '2025-26', '2026-27'],
        selected_year: year,
      }))
    }

    // GET /fund-indent/work-items/:apoId - RFO: Get line items for Fund Indent
    const workItemsMatch = route.match(/^\/fund-indent\/work-items\/([^/]+)$/)
    if (workItemsMatch && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      if (!['RFO', 'ADMIN'].includes(user.role)) {
        return handleCORS(NextResponse.json({ error: 'Access denied' }, { status: 403 }))
      }

      const apoId = workItemsMatch[1]
      const apo = await db.collection('apo_headers').findOne({ id: apoId })
      if (!apo) return handleCORS(NextResponse.json({ error: 'APO not found' }, { status: 404 }))

      const items = await db.collection('apo_items').find({
        apo_id: apoId,
        fund_indent_id: { $exists: false }
      }).toArray()

      const plantation = await db.collection('plantations').findOne({ id: apo.plantation_id })

      return handleCORS(NextResponse.json({
        apo_id: apoId,
        plantation_name: plantation?.name,
        financial_year: apo.financial_year,
        items: items.map(({ _id, ...item }) => ({
          ...item,
          period_from: item.period_from || null,
          period_to: item.period_to || null,
          cm_date: item.cm_date || null,
          cm_by: item.cm_by || null,
          fnb_book_no: item.fnb_book_no || null,
          fnb_page_no: item.fnb_page_no || null,
          fnb_pdf_url: item.fnb_pdf_url || null,
        }))
      }))
    }

    // POST /fund-indent/upload-fnb - RFO: Upload FNB PDF file
    if (route === '/fund-indent/upload-fnb' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      if (user.role !== 'RFO') {
        return handleCORS(NextResponse.json({ error: 'Only RFO can upload FNB documents' }, { status: 403 }))
      }

      try {
        const formData = await request.formData()
        const file = formData.get('file')
        const itemId = formData.get('item_id')
        
        if (!file) {
          return handleCORS(NextResponse.json({ error: 'No file uploaded' }, { status: 400 }))
        }

        if (!file.name.toLowerCase().endsWith('.pdf')) {
          return handleCORS(NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 }))
        }

        // Ensure uploads directory exists
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'fnb')
        await mkdir(uploadsDir, { recursive: true })

        // Create unique filename
        const timestamp = Date.now()
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `fnb_${timestamp}_${sanitizedName}`
        const filePath = path.join(uploadsDir, fileName)

        // Write file
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        // Return the URL path
        const fileUrl = `/uploads/fnb/${fileName}`

        return handleCORS(NextResponse.json({
          message: 'FNB PDF uploaded successfully',
          file_url: fileUrl,
          file_name: fileName,
          item_id: itemId
        }))
      } catch (error) {
        console.error('File upload error:', error)
        return handleCORS(NextResponse.json({ error: 'File upload failed: ' + error.message }, { status: 500 }))
      }
    }

    // POST /fund-indent/generate - RFO: Generate Fund Indent (GFI)
    if (route === '/fund-indent/generate' && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      if (user.role !== 'RFO') {
        return handleCORS(NextResponse.json({ error: 'Only RFO can generate Fund Indent' }, { status: 403 }))
      }

      const body = await request.json()
      const { apo_id, items } = body

      if (!apo_id || !items || items.length === 0) {
        return handleCORS(NextResponse.json({ error: 'APO ID and items are required' }, { status: 400 }))
      }

      const estId = `EST-${Date.now().toString(36).toUpperCase()}`

      const fundIndent = {
        id: estId,
        apo_id,
        created_by: user.id,
        created_at: new Date(),
        status: 'PENDING_DCF',
        approval_chain: [{
          role: 'RFO',
          user_id: user.id,
          user_name: user.name,
          action: 'GENERATED',
          timestamp: new Date()
        }],
        total_amount: 0,
        item_ids: [],
      }

      let totalAmount = 0
      for (const item of items) {
        const updateData = {
          fund_indent_id: estId,
          fund_indent_status: 'PENDING_DCF',
          period_from: item.period_from,
          period_to: item.period_to,
          cm_date: item.cm_date,
          cm_by: item.cm_by,
          fnb_book_no: item.fnb_book_no,
          fnb_page_no: item.fnb_page_no,
          fnb_pdf_url: item.fnb_pdf_url,
        }

        await db.collection('apo_items').updateOne({ id: item.id }, { $set: updateData })
        const itemData = await db.collection('apo_items').findOne({ id: item.id })
        totalAmount += itemData?.total_cost || 0
        fundIndent.item_ids.push(item.id)
      }

      fundIndent.total_amount = totalAmount
      await db.collection('fund_indents').insertOne(fundIndent)

      return handleCORS(NextResponse.json({
        message: 'Fund Indent generated successfully',
        est_id: estId,
        total_amount: totalAmount,
        item_count: items.length,
        next_approver: 'DCF'
      }, { status: 201 }))
    }

    // GET /fund-indent/pending - DCF/ED/MD: Get pending Fund Indents
    if (route === '/fund-indent/pending' && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      const roleStatusMap = {
        'RFO': null, // RFO sees their generated ones
        'DCF': 'PENDING_DCF',
        'ED': 'PENDING_ED',
        'MD': 'PENDING_MD',
        'ADMIN': null
      }

      if (!roleStatusMap.hasOwnProperty(user.role)) {
        return handleCORS(NextResponse.json({ error: 'Access denied' }, { status: 403 }))
      }

      let filter = {}
      if (user.role === 'RFO') {
        filter.created_by = user.id
      } else if (user.role !== 'ADMIN' && roleStatusMap[user.role]) {
        filter.status = roleStatusMap[user.role]
      }

      const indents = await db.collection('fund_indents').find(filter).toArray()

      const enrichedIndents = []
      for (const indent of indents) {
        const items = await db.collection('apo_items').find({ fund_indent_id: indent.id }).toArray()
        const apo = await db.collection('apo_headers').findOne({ id: indent.apo_id })
        const plantation = apo ? await db.collection('plantations').findOne({ id: apo.plantation_id }) : null
        const creator = await db.collection('users').findOne({ id: indent.created_by })

        enrichedIndents.push({
          ...indent,
          _id: undefined,
          plantation_name: plantation?.name || 'Unknown',
          financial_year: apo?.financial_year,
          created_by_name: creator?.name,
          items: items.map(({ _id, ...item }) => item),
          item_count: items.length,
        })
      }

      return handleCORS(NextResponse.json({
        indents: enrichedIndents,
        pending_count: enrichedIndents.length,
        role: user.role,
      }))
    }

    // GET /fund-indent/:id - Get Fund Indent details
    const fundIndentDetailMatch = route.match(/^\/fund-indent\/([^/]+)$/)
    if (fundIndentDetailMatch && method === 'GET') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      const estId = fundIndentDetailMatch[1]
      const indent = await db.collection('fund_indents').findOne({ id: estId })
      if (!indent) return handleCORS(NextResponse.json({ error: 'Fund Indent not found' }, { status: 404 }))

      const items = await db.collection('apo_items').find({ fund_indent_id: estId }).toArray()
      const apo = await db.collection('apo_headers').findOne({ id: indent.apo_id })
      const plantation = apo ? await db.collection('plantations').findOne({ id: apo.plantation_id }) : null

      const { _id, ...indentData } = indent
      return handleCORS(NextResponse.json({
        ...indentData,
        plantation_name: plantation?.name,
        financial_year: apo?.financial_year,
        items: items.map(({ _id, ...item }) => item),
      }))
    }

    // POST /fund-indent/:id/approve - DCF/ED/MD: Approve Fund Indent (AFI)
    const fundIndentApproveMatch = route.match(/^\/fund-indent\/([^/]+)\/approve$/)
    if (fundIndentApproveMatch && method === 'POST') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      const estId = fundIndentApproveMatch[1]
      const body = await request.json()
      const { approved_items, rejected_items, comment } = body

      const indent = await db.collection('fund_indents').findOne({ id: estId })
      if (!indent) return handleCORS(NextResponse.json({ error: 'Fund Indent not found' }, { status: 404 }))

      const expectedRoleForStatus = {
        'PENDING_DCF': 'DCF',
        'PENDING_ED': 'ED',
        'PENDING_MD': 'MD'
      }

      if (expectedRoleForStatus[indent.status] !== user.role && user.role !== 'ADMIN') {
        return handleCORS(NextResponse.json({ 
          error: `This indent requires ${expectedRoleForStatus[indent.status]} approval` 
        }, { status: 403 }))
      }

      const nextStatusMap = {
        'PENDING_DCF': 'PENDING_ED',
        'PENDING_ED': 'PENDING_MD',
        'PENDING_MD': 'APPROVED'
      }
      const nextStatus = nextStatusMap[indent.status]

      if (approved_items && approved_items.length > 0) {
        await db.collection('apo_items').updateMany(
          { id: { $in: approved_items } },
          { $set: { fund_indent_status: nextStatus } }
        )
      }

      if (rejected_items && rejected_items.length > 0) {
        await db.collection('apo_items').updateMany(
          { id: { $in: rejected_items } },
          { $set: { fund_indent_status: 'REJECTED', fund_indent_rejection_comment: comment } }
        )
      }

      const approvalEntry = {
        role: user.role,
        user_id: user.id,
        user_name: user.name,
        action: 'APPROVED',
        approved_count: approved_items?.length || 0,
        rejected_count: rejected_items?.length || 0,
        comment,
        timestamp: new Date()
      }

      const remainingItems = await db.collection('apo_items').countDocuments({
        fund_indent_id: estId,
        fund_indent_status: { $ne: 'REJECTED' }
      })

      const finalStatus = remainingItems > 0 ? nextStatus : 'FULLY_REJECTED'

      await db.collection('fund_indents').updateOne(
        { id: estId },
        {
          $set: { status: finalStatus, updated_at: new Date() },
          $push: { approval_chain: approvalEntry }
        }
      )

      const statusMessages = {
        'PENDING_ED': 'Fund Indent approved and forwarded to ED',
        'PENDING_MD': 'Fund Indent approved and forwarded to MD',
        'APPROVED': 'Fund Indent fully approved by MD',
        'FULLY_REJECTED': 'All items rejected'
      }

      return handleCORS(NextResponse.json({
        message: statusMessages[finalStatus] || `Status updated`,
        est_id: estId,
        new_status: finalStatus,
        approved_by: user.name,
      }))
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

    // APO Status Update - 3-tier hierarchy: RO → DM → HO (Admin)
    const apoStatusMatch = route.match(/^\/apo\/([^/]+)\/status$/)
    if (apoStatusMatch && method === 'PATCH') {
      const user = await getUser(request, db)
      if (!user) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

      const apoId = apoStatusMatch[1]
      const body = await request.json()
      const { status, comment } = body

      const apo = await db.collection('apo_headers').findOne({ id: apoId })
      if (!apo) return handleCORS(NextResponse.json({ error: 'APO not found' }, { status: 404 }))

      // APO Approval Hierarchy:
      // DRAFT → PENDING_DM_APPROVAL (RO submits to DM)
      // PENDING_DM_APPROVAL → PENDING_HO_APPROVAL (DM approves, forwards to HO)
      // PENDING_DM_APPROVAL → REJECTED (DM rejects, back to RO)
      // PENDING_HO_APPROVAL → SANCTIONED (HO/Admin final approval)
      // PENDING_HO_APPROVAL → REJECTED (HO rejects)
      // REJECTED → DRAFT (RO can revise and resubmit)

      const validTransitions = {
        'DRAFT': ['PENDING_DM_APPROVAL'],
        'PENDING_DM_APPROVAL': ['PENDING_HO_APPROVAL', 'REJECTED'],
        'PENDING_HO_APPROVAL': ['SANCTIONED', 'REJECTED'],
        'REJECTED': ['DRAFT'],
        // Legacy support for old status
        'PENDING_APPROVAL': ['PENDING_HO_APPROVAL', 'SANCTIONED', 'REJECTED'],
      }

      if (!validTransitions[apo.status]?.includes(status)) {
        return handleCORS(NextResponse.json({ 
          error: `Invalid transition from ${apo.status} to ${status}`,
          hint: `Valid transitions from ${apo.status}: ${validTransitions[apo.status]?.join(', ') || 'none'}`
        }, { status: 400 }))
      }

      // Role-based permissions for status changes
      // RO can: DRAFT → PENDING_DM_APPROVAL, REJECTED → DRAFT
      // DM can: PENDING_DM_APPROVAL → PENDING_HO_APPROVAL, PENDING_DM_APPROVAL → REJECTED
      // ADMIN/HO can: PENDING_HO_APPROVAL → SANCTIONED, PENDING_HO_APPROVAL → REJECTED

      if (status === 'PENDING_DM_APPROVAL') {
        if (user.role !== 'RO') {
          return handleCORS(NextResponse.json({ error: 'Only Range Officer can submit APO for DM approval' }, { status: 403 }))
        }
      }

      if (status === 'PENDING_HO_APPROVAL') {
        if (user.role !== 'DM') {
          return handleCORS(NextResponse.json({ error: 'Only Division Manager can forward APO to Head Office' }, { status: 403 }))
        }
      }

      if (status === 'SANCTIONED') {
        if (user.role !== 'ADMIN') {
          return handleCORS(NextResponse.json({ error: 'Only Head Office (Admin) can give final sanction to APO' }, { status: 403 }))
        }
      }

      if (status === 'REJECTED') {
        // DM can reject from PENDING_DM_APPROVAL, ADMIN can reject from PENDING_HO_APPROVAL
        if (apo.status === 'PENDING_DM_APPROVAL' && user.role !== 'DM') {
          return handleCORS(NextResponse.json({ error: 'Only Division Manager can reject at DM approval stage' }, { status: 403 }))
        }
        if (apo.status === 'PENDING_HO_APPROVAL' && user.role !== 'ADMIN') {
          return handleCORS(NextResponse.json({ error: 'Only Head Office (Admin) can reject at HO approval stage' }, { status: 403 }))
        }
      }

      const updateData = {
        status,
        updated_at: new Date(),
        rejection_comment: status === 'REJECTED' ? (comment || null) : undefined,
      }
      
      // Track who approved/rejected at each stage
      if (status === 'PENDING_HO_APPROVAL') {
        updateData.dm_approved_by = user.id
        updateData.dm_approved_at = new Date()
      }
      if (status === 'SANCTIONED') {
        updateData.ho_approved_by = user.id
        updateData.ho_approved_at = new Date()
        updateData.approved_by = user.id // Legacy field
      }
      if (status === 'REJECTED') {
        updateData.rejected_by = user.id
        updateData.rejected_at = new Date()
      }

      // Clean undefined fields
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key])

      await db.collection('apo_headers').updateOne({ id: apoId }, { $set: updateData })

      const statusMessages = {
        'PENDING_DM_APPROVAL': 'APO submitted to Division Manager for approval',
        'PENDING_HO_APPROVAL': 'APO forwarded to Head Office for final sanction',
        'SANCTIONED': 'APO sanctioned by Head Office',
        'REJECTED': 'APO rejected',
        'DRAFT': 'APO returned to draft for revision',
      }

      return handleCORS(NextResponse.json({ 
        message: statusMessages[status] || `APO status changed to ${status}`, 
        apo_id: apoId, 
        new_status: status,
        approved_by: user.name,
        approved_by_role: user.role
      }))
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
      const pendingApos = allApos.filter(a => a.status.includes('PENDING')).length
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
        name: name.length > 12 ? name.substring(0, 12) + '...' : name,
        fullName: name,
        sanctioned: data.sanctioned,
        spent: data.spent,
      }))

      // Recent APOs with plantation names
      const recentApos = allApos
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 5)
        .map(apo => {
          const plantation = plantations.find(p => p.id === apo.plantation_id)
          return {
            id: apo.id,
            plantation_name: plantation?.name || 'Unknown Plantation',
            financial_year: apo.financial_year,
            status: apo.status,
            total_amount: apo.total_sanctioned_amount || apo.total_amount || 0,
            created_at: apo.created_at,
          }
        })

      // APO Timeline (recent activity)
      const apoTimeline = allApos
        .filter(a => a.status !== 'DRAFT')
        .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
        .slice(0, 4)
        .map(apo => {
          const plantation = plantations.find(p => p.id === apo.plantation_id)
          return {
            id: apo.id,
            plantation_name: plantation?.name || 'APO Timeline',
            status: apo.status,
            financial_year: apo.financial_year,
            date: apo.updated_at || apo.created_at,
          }
        })

      // Calculate percentages for analytics
      const utilizationPct = totalSanctioned > 0 ? Math.round((totalExpenditure / totalSanctioned) * 100) : 0
      const sanctionedPct = totalApos > 0 ? Math.round((sanctionedApos / totalApos) * 100) : 0
      const reportedPct = totalApos > 0 ? Math.round(((sanctionedApos + pendingApos) / totalApos) * 100) : 0

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
        utilization_pct: utilizationPct,
        sanctioned_pct: sanctionedPct,
        reported_pct: reportedPct,
        budget_chart: chartData,
        recent_apos: recentApos,
        apo_timeline: apoTimeline,
      }))
    }

    // PATCH /apo/items/:id/estimate - Update revised_qty
    const estimateUpdateMatch = route.match(/^\/apo\/items\/([^/]+)\/estimate$/)
    if (estimateUpdateMatch && method === 'PATCH') {
      const itemId = estimateUpdateMatch[1]
      const body = await request.json()
      const { revised_qty, user_role } = body

      const item = await db.collection('apo_items').findOne({ id: itemId })
      if (!item) {
        return handleCORS(NextResponse.json({ error: 'Item not found' }, { status: 404 }))
      }

      // Get the APO for budget validation
      const apo = await db.collection('apo_headers').findOne({ id: item.apo_id })
      if (!apo) {
        return handleCORS(NextResponse.json({ error: 'APO not found' }, { status: 404 }))
      }

      // RBAC: Only CASE_WORKER_ESTIMATES can update, and only if DRAFT or REJECTED
      if (user_role === 'PLANTATION_SUPERVISOR') {
        return handleCORS(NextResponse.json({ error: 'Supervisors cannot edit quantities. Only approval allowed.' }, { status: 403 }))
      }

      const currentStatus = item.estimate_status || 'DRAFT'
      if (user_role === 'CASE_WORKER_ESTIMATES' && !['DRAFT', 'REJECTED'].includes(currentStatus)) {
        return handleCORS(NextResponse.json({ error: 'Cannot edit items that are already submitted or approved.' }, { status: 403 }))
      }

      const newCost = parseFloat(revised_qty) * item.sanctioned_rate

      // Calculate total cost of all items in this APO, using revised_qty if available
      const allItems = await db.collection('apo_items').find({ apo_id: apo.id }).toArray()
      
      let totalRevisedCost = 0
      for (const i of allItems) {
        if (i.id === item.id) {
          totalRevisedCost += newCost
        } else {
          const qty = i.revised_qty !== null && i.revised_qty !== undefined ? i.revised_qty : i.sanctioned_qty
          totalRevisedCost += qty * i.sanctioned_rate
        }
      }

      if (totalRevisedCost > apo.total_sanctioned_amount) {
        return handleCORS(NextResponse.json({ 
          error: `Total cost ₹${Math.round(totalRevisedCost)} exceeds sanctioned amount ₹${apo.total_sanctioned_amount}` 
        }, { status: 400 }))
      }

      await db.collection('apo_items').updateOne(
        { id: itemId }, 
        { $set: { revised_qty: parseFloat(revised_qty), updated_at: new Date() } }
      )

      const updatedItem = await db.collection('apo_items').findOne({ id: itemId })
      const { _id, ...result } = updatedItem
      return handleCORS(NextResponse.json(result))
    }

    // PATCH /apo/items/:id/status - Update estimate_status
    const itemStatusMatch = route.match(/^\/apo\/items\/([^/]+)\/status$/)
    if (itemStatusMatch && method === 'PATCH') {
      const itemId = itemStatusMatch[1]
      const body = await request.json()
      const { status, user_role } = body

      const item = await db.collection('apo_items').findOne({ id: itemId })
      if (!item) {
        return handleCORS(NextResponse.json({ error: 'Item not found' }, { status: 404 }))
      }

      const currentStatus = item.estimate_status || 'DRAFT'

      if (user_role === 'CASE_WORKER_ESTIMATES') {
        if (status !== 'SUBMITTED') {
          return handleCORS(NextResponse.json({ error: 'Case workers can only Submit items.' }, { status: 403 }))
        }
        if (!['DRAFT', 'REJECTED'].includes(currentStatus)) {
          return handleCORS(NextResponse.json({ error: 'Can only submit Draft or Rejected items.' }, { status: 403 }))
        }
      } else if (user_role === 'PLANTATION_SUPERVISOR') {
        if (!['APPROVED', 'REJECTED'].includes(status)) {
          return handleCORS(NextResponse.json({ error: 'Supervisors can only Approve or Reject.' }, { status: 403 }))
        }
        if (currentStatus !== 'SUBMITTED') {
          return handleCORS(NextResponse.json({ error: 'Can only review Submitted items.' }, { status: 403 }))
        }
      }

      await db.collection('apo_items').updateOne(
        { id: itemId }, 
        { $set: { estimate_status: status, updated_at: new Date() } }
      )

      const updatedItem = await db.collection('apo_items').findOne({ id: itemId })
      const { _id, ...result } = updatedItem
      return handleCORS(NextResponse.json(result))
    }

    // Route not found
    logResponse(method, route, 404, Date.now() - startTime)
    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))

  } catch (error) {
    // Log error with context
    logError(error, { route, method })
    logResponse(method, route, 500, Date.now() - startTime)
    return handleCORS(NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
