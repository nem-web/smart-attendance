
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { register, login, logout, getMe } from '../auth.js'
// We rely on MSW setup in setupTests.js globally or define specific handlers here
// Since setupTests.js sets up the server, we assume it's running.

// However, handlers in setupTests are generic. We might want specific responses.
import { server } from '../../mocks/server'
import { http, HttpResponse } from 'msw'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

describe('Auth API', () => {
    
  it('login success', async () => {
    // Override handler for this test if needed, or rely on default
    // Default handler returns success
    const response = await login({ email: 'teacher@example.com', password: 'password' })
    expect(response.access_token).toBe('mock-jwt-token')
    expect(response.user.email).toBe('teacher@example.com')
  })

  it('login failure', async () => {
    server.use(
      http.post(`${API_URL}/api/auth/login`, () => {
        return new HttpResponse(null, { status: 401 })
      })
    )

    await expect(login({ email: 'wrong', password: 'wrong' })).rejects.toThrow()
  })
})
