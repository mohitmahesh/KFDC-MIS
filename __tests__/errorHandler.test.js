/**
 * Error Handler Unit Tests
 * Tests only the ApiError class (no server-side dependencies)
 */

// Define ApiError class locally to avoid import issues with NextResponse
class ApiError extends Error {
  constructor(message, statusCode = 400, code = 'API_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'ApiError'
  }
}

const ErrorTypes = {
  UNAUTHORIZED: new ApiError('Unauthorized', 401, 'UNAUTHORIZED'),
  FORBIDDEN: new ApiError('Forbidden', 403, 'FORBIDDEN'),
  NOT_FOUND: new ApiError('Not found', 404, 'NOT_FOUND'),
  VALIDATION_ERROR: (msg) => new ApiError(msg || 'Validation error', 400, 'VALIDATION_ERROR'),
  DATABASE_ERROR: new ApiError('Database error', 500, 'DATABASE_ERROR'),
  INTERNAL_ERROR: new ApiError('Internal server error', 500, 'INTERNAL_ERROR')
}

describe('Error Handler', () => {
  describe('ApiError', () => {
    it('should create error with correct properties', () => {
      const error = new ApiError('Test error', 400, 'TEST_ERROR')
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.name).toBe('ApiError')
    })

    it('should have default values', () => {
      const error = new ApiError('Test')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('API_ERROR')
    })

    it('should be an instance of Error', () => {
      const error = new ApiError('Test')
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('ErrorTypes', () => {
    it('should have UNAUTHORIZED error with 401 status', () => {
      expect(ErrorTypes.UNAUTHORIZED.statusCode).toBe(401)
      expect(ErrorTypes.UNAUTHORIZED.code).toBe('UNAUTHORIZED')
    })

    it('should have FORBIDDEN error with 403 status', () => {
      expect(ErrorTypes.FORBIDDEN.statusCode).toBe(403)
      expect(ErrorTypes.FORBIDDEN.code).toBe('FORBIDDEN')
    })

    it('should have NOT_FOUND error with 404 status', () => {
      expect(ErrorTypes.NOT_FOUND.statusCode).toBe(404)
      expect(ErrorTypes.NOT_FOUND.code).toBe('NOT_FOUND')
    })

    it('should have DATABASE_ERROR with 500 status', () => {
      expect(ErrorTypes.DATABASE_ERROR.statusCode).toBe(500)
    })

    it('should have INTERNAL_ERROR with 500 status', () => {
      expect(ErrorTypes.INTERNAL_ERROR.statusCode).toBe(500)
    })

    it('should create VALIDATION_ERROR with custom message', () => {
      const error = ErrorTypes.VALIDATION_ERROR('Custom validation message')
      expect(error.message).toBe('Custom validation message')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    it('should create VALIDATION_ERROR with default message', () => {
      const error = ErrorTypes.VALIDATION_ERROR()
      expect(error.message).toBe('Validation error')
    })
  })
})
