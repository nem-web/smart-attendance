import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import Login from '../Login';
import { ThemeProvider } from '../../theme/ThemeContext';

// Mock useNavigate
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

describe('Login Page', () => {
    const navigateMock = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        // Setup useNavigate mock
        useNavigate.mockReturnValue(navigateMock);

        // Mock global fetch
        global.fetch = vi.fn();

        // Mock localStorage
        // Using Object.defineProperty to ensure we can overwrite it in JSDOM
        Object.defineProperty(window, 'localStorage', {
            value: {
                setItem: vi.fn(),
                getItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn(),
            },
            writable: true
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form', () => {
        render(
            <BrowserRouter>
                <ThemeProvider>
                    <Login />
                </ThemeProvider>
            </BrowserRouter>
        );

        expect(screen.getByRole('heading', { name: /auth.signInTitle/i })).toBeInTheDocument();
        // Use specific input elements with their IDs which are accessible
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
        // Password input is accessible via its ID
        const passwordInput = document.getElementById('password-input');
        expect(passwordInput).toBeInTheDocument();
        expect(passwordInput?.getAttribute('type')).toMatch(/password|text/);
    });

    it('handles successful teacher login', async () => {
        // Setup fetch mock response
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                token: 'fake-jwt-token',
                role: 'teacher',
                user_id: '123',
                name: 'Test Teacher'
            }),
        });

        render(
            <BrowserRouter>
                <ThemeProvider>
                    <Login />
                </ThemeProvider>
            </BrowserRouter>
        );

        // Fill form using more specific queries
        const emailInput = screen.getByRole('textbox', { name: /email/i });
        const passwordInput = document.getElementById('password-input');
        
        fireEvent.change(emailInput, { target: { value: 'teacher@test.com' } });
        if (passwordInput) {
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
        }

        // Submit
        const submitBtn = screen.getByRole('button', { name: /submit login form/i });
        fireEvent.click(submitBtn);

        // Verify API call
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/auth/login'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ email: 'teacher@test.com', password: 'password123' })
                })
            );
        });

        // Verify navigation
        await waitFor(() => {
            expect(navigateMock).toHaveBeenCalledWith('/dashboard');
        });

        // Verify token storage
        expect(localStorage.setItem).toHaveBeenCalledWith('token', 'fake-jwt-token');
    });

    it('handles login failure', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ detail: 'Invalid credentials' }),
        });

        render(
            <BrowserRouter>
                <ThemeProvider>
                    <Login />
                </ThemeProvider>
            </BrowserRouter>
        );

        const emailInput = screen.getByRole('textbox', { name: /email/i });
        const passwordInput = document.getElementById('password-input');
        
        fireEvent.change(emailInput, { target: { value: 'wrong@test.com' } });
        if (passwordInput) {
            fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
        }

        const submitBtn = screen.getByRole('button', { name: /submit login form/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });

        expect(navigateMock).not.toHaveBeenCalled();
    });
});
