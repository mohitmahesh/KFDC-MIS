/**
 * CORS Handler Module
 * Handles Cross-Origin Resource Sharing headers
 */
import { NextResponse } from 'next/server'

/**
 * Add CORS headers to response
 * @param {NextResponse} response - Next.js response object
 * @returns {NextResponse} Response with CORS headers
 */
export function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

/**
 * Create OPTIONS response for preflight requests
 * @returns {NextResponse} OPTIONS response with CORS headers
 */
export function createOptionsResponse() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

/**
 * Create JSON response with CORS headers
 * @param {object} data - Response data
 * @param {number} status - HTTP status code
 * @returns {NextResponse} JSON response with CORS headers
 */
export function jsonResponse(data, status = 200) {
  return handleCORS(NextResponse.json(data, { status }))
}

/**
 * Create error response with CORS headers
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {NextResponse} Error response with CORS headers
 */
export function errorResponse(message, status = 400) {
  return handleCORS(NextResponse.json({ error: message }, { status }))
}

export default {
  handleCORS,
  createOptionsResponse,
  jsonResponse,
  errorResponse
}
