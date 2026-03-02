// src/mocks/handlers.js
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock login
  http.post('http://localhost:8000/api/auth/login', () => {
    return HttpResponse.json({
      access_token: 'mock-jwt-token',
      user: {
        id: '123',
        name: 'Test Teacher',
        role: 'teacher',
        email: 'teacher@example.com'
      }
    })
  }),

  // Mock get classes
  http.get('http://localhost:8000/api/classes', () => {
    return HttpResponse.json([
      { _id: 'sub1', name: 'Math 101', code: 'MATH101' },
      { _id: 'sub2', name: 'Physics 101', code: 'PHYS101' }
    ])
  }),

  // Mock mark attendance
  http.post('http://localhost:8000/api/attendance/mark', () => {
    return HttpResponse.json({
      success: true,
      detected: [
        { student_id: 's1', name: 'Student 1', status: 'present', confidence: 0.95 }
      ],
      not_detected: [],
      count: 1
    })
  }),
]
