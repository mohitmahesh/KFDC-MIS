/**
 * API Helper Module
 * Centralized API communication with authentication
 */

const api = {
  token: null,
  
  setToken(t) {
    this.token = t
    if (t) {
      localStorage.setItem('kfdc_token', t)
    } else {
      localStorage.removeItem('kfdc_token')
    }
  },
  
  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('kfdc_token')
    }
    return this.token
  },
  
  async fetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers }
    const token = this.getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    
    // Use /api prefix for Next.js API routes
    const res = await fetch(`/api${url}`, { ...options, headers })
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Request failed')
    }
    return data
  },
  
  get(url) {
    return this.fetch(url)
  },
  
  post(url, body) {
    return this.fetch(url, { method: 'POST', body: JSON.stringify(body) })
  },
  
  put(url, body) {
    return this.fetch(url, { method: 'PUT', body: JSON.stringify(body) })
  },
  
  patch(url, body) {
    return this.fetch(url, { method: 'PATCH', body: JSON.stringify(body) })
  },
  
  delete(url) {
    return this.fetch(url, { method: 'DELETE' })
  },
  
  // Special method for file uploads (no Content-Type header - browser sets it automatically)
  async uploadFile(url, formData) {
    const token = this.getToken()
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    
    const res = await fetch(`/api${url}`, { method: 'POST', headers, body: formData })
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Upload failed')
    }
    return data
  },
}

export default api
