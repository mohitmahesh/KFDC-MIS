/**
 * Helper Functions Module
 * Shared utility functions used across the application
 */
import { v4 as uuidv4 } from 'uuid'

/**
 * Generate a new UUID
 * @returns {string} UUID string
 */
export function generateId() {
  return uuidv4()
}

/**
 * Get current financial year (April-March cycle)
 * @returns {string} Financial year in format "2025-26"
 */
export function getCurrentFinancialYear() {
  const now = new Date()
  const month = now.getMonth() // 0-11
  const year = now.getFullYear()
  // Financial year starts in April (month 3)
  // If we're in Jan-Mar, we're still in the previous FY
  if (month < 3) {
    return `${year - 1}-${String(year).slice(-2)}`
  }
  return `${year}-${String(year + 1).slice(-2)}`
}

/**
 * Determine work type based on planting year
 * FW (Fresh Work) = plantation created in current financial year
 * M (Maintenance) = plantation from any previous financial year
 * @param {number} yearOfPlanting - Year the plantation was created
 * @returns {string} 'FW' or 'M'
 */
export function getWorkType(yearOfPlanting) {
  const currentFY = getCurrentFinancialYear()
  const currentFYStartYear = parseInt(currentFY.split('-')[0])
  return yearOfPlanting >= currentFYStartYear ? 'FW' : 'M'
}

/**
 * Format currency in Indian Rupees
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount)
}

/**
 * Calculate plantation age
 * @param {number} yearOfPlanting - Year the plantation was created
 * @returns {number} Age in years
 */
export function calculatePlantationAge(yearOfPlanting) {
  return new Date().getFullYear() - yearOfPlanting
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize object by removing MongoDB _id field
 * @param {object} obj - Object to sanitize
 * @returns {object} Object without _id
 */
export function sanitizeMongoDoc(obj) {
  if (!obj) return obj
  const { _id, ...rest } = obj
  return rest
}

/**
 * Sanitize array of objects by removing MongoDB _id fields
 * @param {array} arr - Array of objects
 * @returns {array} Array without _id fields
 */
export function sanitizeMongoDocs(arr) {
  return arr.map(sanitizeMongoDoc)
}

export default {
  generateId,
  getCurrentFinancialYear,
  getWorkType,
  formatCurrency,
  calculatePlantationAge,
  isValidEmail,
  sanitizeMongoDoc,
  sanitizeMongoDocs
}
