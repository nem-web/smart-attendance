// src/api/__tests__/auth.test.js
import { describe, it, expect } from 'vitest';
import { fetchCurrentUser } from '../auth'; 
// We rely on MSW to mock the network requests.
// Assuming axiosClient is used by fetchCurrentUser which in turn uses axios

describe('Auth API Wrapper', () => {
    it('fetchCurrentUser returns user profile', async () => {
        // MSW handler for GET /auth/me returns { email: 'test@example.com' }
        const user = await fetchCurrentUser();
        // Since fetchCurrentUser wraps errors and tries student profile, we ensure simple success first
        if (user) {
             expect(user.email).toBe('test@example.com');
        } else {
             // If MSW fails or returns null structure not matching expectation
             // This assertion helps debugging by failing explicitly
             expect(user).not.toBeNull();
        }
    });
});
