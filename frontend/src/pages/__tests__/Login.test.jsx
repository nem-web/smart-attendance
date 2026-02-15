import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import Login from '../Login';

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
                <Login />
            </BrowserRouter>
        );

        expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
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
                <Login />
            </BrowserRouter>
        );

        // Fill form
        fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'teacher@test.com' } });
        fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'password123' } });

        // Submit
        const submitBtn = screen.getByRole('button', { name: /sign in/i });
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
                <Login />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/enter your email/i), { target: { value: 'wrong@test.com' } });
        fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'wrongpass' } });

        const submitBtn = screen.getByRole('button', { name: /sign in/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });

        expect(navigateMock).not.toHaveBeenCalled();
    });
});
