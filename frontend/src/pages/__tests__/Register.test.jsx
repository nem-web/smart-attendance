import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import Register from '../Register';

// Mock useNavigate
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

describe('Register Page', () => {
    const navigateMock = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        useNavigate.mockReturnValue(navigateMock);
        global.fetch = vi.fn();
    });

    it('renders registration form', () => {
        render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        );
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
        // The form fields appear only after role selection
    });

    it('shows form after role selection', () => {
        render(
            <BrowserRouter>
                <Register />
            </BrowserRouter>
        );

        // Select Student Role
        fireEvent.click(screen.getByText(/i am a student/i));

        // Check for student specific fields
        expect(screen.getByPlaceholderText(/john doe/i)).toBeInTheDocument();
        expect(screen.getByText(/roll number/i)).toBeInTheDocument();
    });

    // Note: Testing the full registration flow involves multi-step form interaction (Teacher/Student selection).
    // Just smoke testing rendering is a good start.
});
