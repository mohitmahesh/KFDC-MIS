/**
 * Constants Unit Tests
 */
import {
  STATUS_COLORS,
  STATUS_LABELS,
  ROLES,
  formatCurrency,
  getWorkType
} from '@/components/common/constants'

describe('Frontend Constants', () => {
  describe('STATUS_COLORS', () => {
    it('should have colors for all statuses', () => {
      expect(STATUS_COLORS.DRAFT).toBeDefined()
      expect(STATUS_COLORS.PENDING_DM_APPROVAL).toBeDefined()
      expect(STATUS_COLORS.PENDING_HO_APPROVAL).toBeDefined()
      expect(STATUS_COLORS.SANCTIONED).toBeDefined()
      expect(STATUS_COLORS.REJECTED).toBeDefined()
    })
  })

  describe('STATUS_LABELS', () => {
    it('should have labels for all statuses', () => {
      expect(STATUS_LABELS.DRAFT).toBe('Draft')
      expect(STATUS_LABELS.SANCTIONED).toBe('Sanctioned')
      expect(STATUS_LABELS.REJECTED).toBe('Rejected')
    })
  })

  describe('ROLES', () => {
    it('should define all user roles', () => {
      expect(ROLES.RO).toBe('Range Officer')
      expect(ROLES.DM).toBe('Division Manager')
      expect(ROLES.ADMIN).toBe('Administrator')
    })
  })

  describe('formatCurrency', () => {
    it('should format positive numbers', () => {
      expect(formatCurrency(1000)).toBe('₹1,000')
      expect(formatCurrency(100000)).toBe('₹1,00,000')
    })

    it('should handle null/undefined', () => {
      expect(formatCurrency(null)).toBe('₹0')
      expect(formatCurrency(undefined)).toBe('₹0')
    })
  })

  describe('getWorkType', () => {
    it('should return FW for current financial year', () => {
      const currentYear = new Date().getFullYear()
      expect(getWorkType(currentYear)).toBe('FW')
    })

    it('should return M for previous years', () => {
      expect(getWorkType(2020)).toBe('M')
      expect(getWorkType(2015)).toBe('M')
    })
  })
})
