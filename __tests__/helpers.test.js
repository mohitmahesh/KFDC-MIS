/**
 * Helper Functions Unit Tests
 */
import {
  generateId,
  getCurrentFinancialYear,
  getWorkType,
  formatCurrency,
  calculatePlantationAge,
  isValidEmail,
  sanitizeMongoDoc,
  sanitizeMongoDocs
} from '@/lib/helpers'

describe('Helper Functions', () => {
  describe('generateId', () => {
    it('should generate a valid UUID', () => {
      const id = generateId()
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('getCurrentFinancialYear', () => {
    it('should return financial year in correct format', () => {
      const fy = getCurrentFinancialYear()
      expect(fy).toMatch(/^\d{4}-\d{2}$/)
    })
  })

  describe('getWorkType', () => {
    it('should return FW for current year plantations', () => {
      const currentYear = new Date().getFullYear()
      expect(getWorkType(currentYear)).toBe('FW')
    })

    it('should return M for old plantations', () => {
      expect(getWorkType(2010)).toBe('M')
      expect(getWorkType(2015)).toBe('M')
      expect(getWorkType(2020)).toBe('M')
    })
  })

  describe('formatCurrency', () => {
    it('should format currency in INR', () => {
      const formatted = formatCurrency(1000)
      expect(formatted).toContain('1,000')
      expect(formatted).toContain('₹')
    })

    it('should handle zero', () => {
      const formatted = formatCurrency(0)
      expect(formatted).toContain('0')
    })
  })

  describe('calculatePlantationAge', () => {
    it('should calculate correct age', () => {
      const currentYear = new Date().getFullYear()
      expect(calculatePlantationAge(currentYear - 5)).toBe(5)
      expect(calculatePlantationAge(currentYear)).toBe(0)
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.in')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('missing@')).toBe(false)
      expect(isValidEmail('@nodomain.com')).toBe(false)
    })
  })

  describe('sanitizeMongoDoc', () => {
    it('should remove _id field', () => {
      const doc = { _id: 'mongo_id', id: 'uuid', name: 'Test' }
      const sanitized = sanitizeMongoDoc(doc)
      expect(sanitized._id).toBeUndefined()
      expect(sanitized.id).toBe('uuid')
      expect(sanitized.name).toBe('Test')
    })

    it('should handle null input', () => {
      expect(sanitizeMongoDoc(null)).toBeNull()
    })
  })

  describe('sanitizeMongoDocs', () => {
    it('should sanitize array of documents', () => {
      const docs = [
        { _id: '1', name: 'First' },
        { _id: '2', name: 'Second' }
      ]
      const sanitized = sanitizeMongoDocs(docs)
      expect(sanitized[0]._id).toBeUndefined()
      expect(sanitized[1]._id).toBeUndefined()
      expect(sanitized[0].name).toBe('First')
      expect(sanitized[1].name).toBe('Second')
    })
  })
})
