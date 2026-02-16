import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentUser } from '../useCurrentUser';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import * as authApi from '../../api/auth';

// Mock API
vi.mock('../../api/auth', () => ({
    fetchCurrentUser: vi.fn(),
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    const Wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
};

describe('useCurrentUser hook', () => {
    it('returns user data on success', async () => {
        authApi.fetchCurrentUser.mockResolvedValue({ id: 123, name: 'Test User' });

        const { result } = renderHook(() => useCurrentUser(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({ id: 123, name: 'Test User' });
    });

    it('returns error state on failure', async () => {
        const error = new Error('Unauthorized');
        authApi.fetchCurrentUser.mockRejectedValue(error);

        const { result } = renderHook(() => useCurrentUser(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toEqual(error);
    });
});
