/**
 * Centralized Error Handler Module
 * Standardized error handling across the application
 */
import { logError } from './logger'
import { errorResponse } from './cors'

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, statusCode = 400, code = 'API_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'ApiError'
  }
}

/**
 * Common error types
 */
export const ErrorTypes = {
  UNAUTHORIZED: new ApiError('Unauthorized', 401, 'UNAUTHORIZED'),
  FORBIDDEN: new ApiError('Forbidden', 403, 'FORBIDDEN'),
  NOT_FOUND: new ApiError('Not found', 404, 'NOT_FOUND'),
  VALIDATION_ERROR: (msg) => new ApiError(msg || 'Validation error', 400, 'VALIDATION_ERROR'),
  DATABASE_ERROR: new ApiError('Database error', 500, 'DATABASE_ERROR'),
  INTERNAL_ERROR: new ApiError('Internal server error', 500, 'INTERNAL_ERROR')
}

/**
 * Handle API errors and return appropriate response
 * @param {Error} error - Error object
 * @param {object} context - Additional context for logging
 * @returns {NextResponse} Error response
 */
export function handleApiError(error, context = {}) {
  // Log the error
  logError(error, context)
  
  // If it's an ApiError, use its status code
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.statusCode)
  }
  
  // For unknown errors, return generic 500
  return errorResponse('Internal server error', 500)
}

/**
 * Wrap async route handler with error handling
 * @param {function} handler - Async route handler
 * @returns {function} Wrapped handler
 */
export function withErrorHandling(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleApiError(error, { path: request.url })
    }
  }
}

export default {
  ApiError,
  ErrorTypes,
  handleApiError,
  withErrorHandling
}
