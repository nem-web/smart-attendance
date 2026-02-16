import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Analytics from '../Analytics';
import { fetchSubjectAnalytics } from '../../api/analytics';
import { fetchMySubjects } from '../../api/teacher';

// Mock API modules
vi.mock('../../api/analytics', () => ({
  fetchSubjectAnalytics: vi.fn(),
}));

vi.mock('../../api/teacher', () => ({
  fetchMySubjects: vi.fn(),
}));

// Mock Recharts to avoid rendering complexities
vi.mock('recharts', () => {
  const Original = vi.importActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
    AreaChart: () => <div data-testid="area-chart">AreaChart</div>,
    Area: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    PieChart: () => <div data-testid="pie-chart">PieChart</div>,
    Pie: () => <div />,
    Cell: () => <div />,
  };
});

describe('Analytics Page', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        fetchMySubjects.mockResolvedValue([
            { _id: '1', name: 'Math' },
            { _id: '2', name: 'Science' }
        ]);
        fetchSubjectAnalytics.mockResolvedValue({
            attendance: 90,
            avgLate: 5,
            riskCount: 2,
            lateTime: '09:00 AM',
            bestPerforming: [
                { name: 'Rahul Kumar', score: 95 },
                { name: 'Anjali Singh', score: 92 }
            ],
            needsSupport: []
        });
    });

    it('renders global leaderboard (classes) by default', () => {
        render(<Analytics />);
        
        const bestList = screen.getByTestId('best-performing-list');
        const supportList = screen.getByTestId('needing-support-list');

        // Check for Class Names used in Global Leaderboard
        expect(within(bestList).getByText('Grade 9A')).toBeInTheDocument();
        expect(within(bestList).getByText('Grade 10A')).toBeInTheDocument();
        
        // Check Needs Support list
        expect(within(supportList).getByText('Grade 11C')).toBeInTheDocument();

        // Ensure student names are NOT present in the lists
        expect(within(bestList).queryByText('Rahul Kumar')).not.toBeInTheDocument();
    });

    it('renders student leaderboard when a subject is selected', async () => {
        render(<Analytics />);

        // Wait for subjects to load
        await waitFor(() => expect(fetchMySubjects).toHaveBeenCalled());

        // Find the select dropdown
        const select = screen.getByRole('combobox');
        
        // Change selection to a subject (e.g., Math with id '1')
        fireEvent.change(select, { target: { value: '1' } });
        
        const bestList = await screen.findByTestId('best-performing-list');

        // Check for Student Names used in Student Leaderboard
        expect(within(bestList).getByText('Rahul Kumar')).toBeInTheDocument();
        expect(within(bestList).getByText('Anjali Singh')).toBeInTheDocument();

        // Ensure class names are NOT present in the Best List
        expect(within(bestList).queryByText('Grade 9A')).not.toBeInTheDocument();
    });
});
