/**
 * Error Handler Unit Tests
 */
import { ApiError, ErrorTypes, handleApiError } from '@/lib/errorHandler'

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
  })

  describe('ErrorTypes', () => {
    it('should have UNAUTHORIZED error', () => {
      expect(ErrorTypes.UNAUTHORIZED.statusCode).toBe(401)
    })

    it('should have FORBIDDEN error', () => {
      expect(ErrorTypes.FORBIDDEN.statusCode).toBe(403)
    })

    it('should have NOT_FOUND error', () => {
      expect(ErrorTypes.NOT_FOUND.statusCode).toBe(404)
    })

    it('should create VALIDATION_ERROR with custom message', () => {
      const error = ErrorTypes.VALIDATION_ERROR('Custom message')
      expect(error.message).toBe('Custom message')
      expect(error.statusCode).toBe(400)
    })
  })

  describe('handleApiError', () => {
    it('should handle ApiError correctly', () => {
      const error = new ApiError('Bad request', 400)
      const response = handleApiError(error)
      expect(response.status).toBe(400)
    })

    it('should handle generic errors as 500', () => {
      const error = new Error('Something went wrong')
      const response = handleApiError(error)
      expect(response.status).toBe(500)
    })
  })
})
