import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Dashboard from '../Dashboard';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
// Note: Dashboard reads user from localStorage, not hook
vi.mock('../../api/analytics', () => ({
    fetchDashboardStats: vi.fn().mockResolvedValue({
        attendanceRate: 90,
        absent: 2,
        late: 1,
        timeframe: 'week',
        total_classes: 20,
        attended: 18,
        percentage: 90
    }),
    fetchAttendanceTrend: vi.fn().mockResolvedValue({ data: [] })
}));

vi.mock('../../api/schedule', () => ({
    getTodaySchedule: vi.fn().mockResolvedValue([])
}));

vi.mock('../../api/teacher', () => ({
    exportCombinedReport: vi.fn()
}));

describe('Dashboard Component', () => {
    beforeEach(() => {
        // Seed localStorage for user
        localStorage.setItem('user', JSON.stringify({
            name: 'Test User',
            role: 'student',
            id: '123'
        }));
    });

    afterEach(() => {
        localStorage.removeItem('user');
        vi.clearAllMocks();
    });

    it('renders dashboard content', async () => {
        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );
        
        // Wait for async content or loading state
        await waitFor(() => {
            expect(screen.getByText(/Test User/i)).toBeInTheDocument();
            // Assuming dashboard shows attendance summary
            // The text assert might vary based on I18n or layout, but 90% should be there
            const percentageElements = screen.getAllByText(/90/i);
            expect(percentageElements.length).toBeGreaterThan(0);
        });
    });
});
