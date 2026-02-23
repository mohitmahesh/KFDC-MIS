/**
 * Application Constants
 * Centralized configuration and constants
 */

// APO Status Flow: DRAFT → PENDING_DM_APPROVAL → PENDING_HO_APPROVAL → SANCTIONED
export const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  PENDING_DM_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-300',
  PENDING_HO_APPROVAL: 'bg-blue-50 text-blue-700 border-blue-300',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-300', // Legacy
  SANCTIONED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  REJECTED: 'bg-red-50 text-red-700 border-red-300',
}

export const STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_DM_APPROVAL: 'Pending DM Approval',
  PENDING_HO_APPROVAL: 'Pending HO Approval',
  PENDING_APPROVAL: 'Pending Approval', // Legacy
  SANCTIONED: 'Sanctioned',
  REJECTED: 'Rejected',
}

export const CHART_COLORS = ['#166534', '#ca8a04', '#2563eb', '#dc2626', '#7c3aed']

// User roles
export const ROLES = {
  RO: 'Range Officer',
  DM: 'Division Manager',
  RFO: 'Range Forest Officer',
  DCF: 'Deputy Conservator of Forests',
  ED: 'Executive Director',
  MD: 'Managing Director',
  ADMIN: 'Administrator',
}

// Dropdown options for plantation form
export const VIDHANA_SABHA_OPTIONS = [
  "Chikkamagalore", "Kadur", "Sringeri", "Shivamogga", "Koppa", "Bhadravathi",
  "Sakaleshapura", "Arasikere", "Hassan", "Holenarasipura", "Chennarayapattana",
  "Malur", "Magadi", "Devanahalli", "Shidlagatta", "Srinivasapura", "Mulabagilu",
  "Kanakapura", "Shikaripura", "Sagara", "Soraba", "Thirthahalli", "Shimoga Rural", "Sirigere"
]

export const LOK_SABHA_OPTIONS = [
  "Udupi-Chikkamagalore", "Shivamogga", "Dharwad", "Haveri", "Belagavi",
  "Bengaluru Rural", "Chikkaballapura", "Kolar"
]

export const DIVISION_OPTIONS = [
  "Dharwad", "Belagavi", "Bengaluru", "Chikkaballapura", "Shivamogga", "Chikkamagalore"
]

export const SPECIES_OPTIONS = [
  "Eucalyptus pellita", "Eucalyptus", "Acacia springvale", "Acacia auriculiformis",
  "Acacia citriodora", "Corymbia", "Casurina junguniana", "Subabool",
  "Marihal Bamboo", "Dowga Bamboo", "Red sanders", "Teak"
]

/**
 * Format currency in Indian Rupees
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(n) {
  if (n == null) return '₹0'
  return '₹' + Math.round(Number(n)).toLocaleString('en-IN')
}

/**
 * Get work type based on financial year
 * @param {number} yearOfPlanting - Year the plantation was created
 * @returns {string} 'FW' or 'M'
 */
export function getWorkType(yearOfPlanting) {
  const now = new Date()
  const month = now.getMonth() // 0-11
  const year = now.getFullYear()
  // Financial year starts in April (month 3)
  const currentFYStartYear = month < 3 ? year - 1 : year
  const plantingYear = parseInt(yearOfPlanting)
  return plantingYear >= currentFYStartYear ? 'FW' : 'M'
}
