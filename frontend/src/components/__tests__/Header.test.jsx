import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Header from '../Header';

// Mock useTheme
vi.mock('../../theme/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'Light',
        toggle: vi.fn(),
    }),
}));

describe('Header Component', () => {

    it('renders the header with title and navigation links', () => {
        render(
            <MemoryRouter>
                <Header />
            </MemoryRouter>
        );

        // Check if title is present
        expect(screen.getByText('Smart Attendance')).toBeInTheDocument();

        // Check if navigation links are present.
        // SetupTests mock returns the key if not found.
        // So we look for text "nav.overview", "nav.attendance", etc.
        expect(screen.getByText('nav.overview')).toBeInTheDocument();
        expect(screen.getByText('nav.attendance')).toBeInTheDocument();
        expect(screen.getByText('nav.students')).toBeInTheDocument();
    });

    it('toggles mobile menu when button is clicked', () => {
        render(
            <MemoryRouter>
                <Header />
            </MemoryRouter>
        );
        
        // Find the hamburger menu button
        const menuButton = screen.getByLabelText(/open menu/i);
        expect(menuButton).toBeInTheDocument();
        
        // Click to open
        fireEvent.click(menuButton);
        
        // Expect the button to change (now shows X)
        expect(screen.getByLabelText(/close menu/i)).toBeInTheDocument();
        
        // Click to close
        fireEvent.click(screen.getByLabelText(/close menu/i));
        
        // Expect it to revert
        expect(screen.getByLabelText(/open menu/i)).toBeInTheDocument();
    });
});
