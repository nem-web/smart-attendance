
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import Dashboard from './Dashboard'
import { renderWithProviders } from '../utils/test-utils'

// Mock useCurrentUser if needed
vi.mock('../hooks/useCurrentUser', () => ({
  default: () => ({
    user: { id: '123', role: 'teacher', name: 'Test Teacher' },
    isLoading: false,
    isAuthenticated: true
  })
}))

describe('Dashboard Component', () => {
  it('renders dashboard sections', async () => {
    renderWithProviders(<Dashboard />)
    
    // Check for dashboard title or loading state
    // Depending on what Dashboard renders initially
    
    // Check for "Overview" or similar text from translations
    // Mocked translations in setupTests return specific strings
    expect(await screen.findByText(/Welcome back/i)).toBeInTheDocument()
    
    // Check if stats are loaded
    // Depending on mocked API calls via MSW
  })
})
