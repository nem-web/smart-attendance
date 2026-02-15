import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Spinner from '../Spinner';

describe('Spinner Component', () => {
    it('renders default loading message', () => {
        render(<Spinner />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('renders custom message when provided', () => {
        render(<Spinner message="Loading schedule details..." />);
        expect(screen.getByText(/loading schedule details/i)).toBeInTheDocument();
    });
});
