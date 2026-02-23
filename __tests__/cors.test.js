/**
 * CORS Handler Unit Tests
 */
import { handleCORS, jsonResponse, errorResponse } from '@/lib/cors'
import { NextResponse } from 'next/server'

describe('CORS Handler', () => {
  describe('handleCORS', () => {
    it('should add CORS headers to response', () => {
      const response = new NextResponse(null, { status: 200 })
      const corsResponse = handleCORS(response)
      
      expect(corsResponse.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(corsResponse.headers.get('Access-Control-Allow-Methods')).toContain('GET')
      expect(corsResponse.headers.get('Access-Control-Allow-Methods')).toContain('POST')
      expect(corsResponse.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
    })
  })

  describe('jsonResponse', () => {
    it('should create JSON response with CORS headers', async () => {
      const data = { message: 'Hello' }
      const response = jsonResponse(data)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      
      const body = await response.json()
      expect(body.message).toBe('Hello')
    })

    it('should accept custom status code', () => {
      const response = jsonResponse({ created: true }, 201)
      expect(response.status).toBe(201)
    })
  })

  describe('errorResponse', () => {
    it('should create error response with CORS headers', async () => {
      const response = errorResponse('Not found', 404)
      
      expect(response.status).toBe(404)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      
      const body = await response.json()
      expect(body.error).toBe('Not found')
    })

    it('should default to 400 status', () => {
      const response = errorResponse('Bad request')
      expect(response.status).toBe(400)
    })
  })
})
