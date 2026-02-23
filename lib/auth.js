/**
 * Authentication Module
 * Handles user authentication and session management
 */
import { connectToMongo } from './db'
import { logError } from './logger'

/**
 * Get authenticated user from request
 * @param {Request} request - Next.js request object
 * @returns {object|null} User object or null if not authenticated
 */
export async function getUser(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    const token = authHeader.split(' ')[1]
    const db = await connectToMongo()
    
    const session = await db.collection('sessions').findOne({ token })
    if (!session) {
      return null
    }
    
    const user = await db.collection('users').findOne({ id: session.user_id })
    return user
  } catch (error) {
    logError(error, { context: 'getUser' })
    return null
  }
}

/**
 * Check if user has required role
 * @param {object} user - User object
 * @param {string|array} roles - Required role(s)
 * @returns {boolean} True if user has required role
 */
export function hasRole(user, roles) {
  if (!user) return false
  const roleArray = Array.isArray(roles) ? roles : [roles]
  return roleArray.includes(user.role)
}

/**
 * Check if user has access to a specific range
 * @param {object} user - User object
 * @param {string} rangeId - Range ID to check
 * @returns {boolean} True if user has access
 */
export function hasRangeAccess(user, rangeId) {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  if (user.role === 'DM') return true // DM has access to all ranges in their division
  return user.range_id === rangeId
}

/**
 * Check if user has access to a specific division
 * @param {object} user - User object
 * @param {string} divisionId - Division ID to check
 * @returns {boolean} True if user has access
 */
export function hasDivisionAccess(user, divisionId) {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  return user.division_id === divisionId
}

export default {
  getUser,
  hasRole,
  hasRangeAccess,
  hasDivisionAccess
}
