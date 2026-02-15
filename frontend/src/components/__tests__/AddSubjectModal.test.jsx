import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AddSubjectModal from '../AddSubjectModal';

describe('AddSubjectModal Component', () => {
    it('does not render when open is false', () => {
        render(<AddSubjectModal open={false} />);
        expect(screen.queryByText(/add subject/i)).not.toBeInTheDocument();
    });

    it('renders and calls onSave with form data', () => {
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(<AddSubjectModal open={true} onSave={onSave} onClose={onClose} />);

        // Check modal content is visible
        expect(screen.getByRole('heading', { name: /add subject/i })).toBeInTheDocument();

        // Fill inputs
        const nameInput = screen.getByPlaceholderText(/subject name/i);
        const codeInput = screen.getByPlaceholderText(/subject code/i);

        fireEvent.change(nameInput, { target: { value: 'Mathematics' } });
        fireEvent.change(codeInput, { target: { value: 'MTH101' } });

        // Submit
        const addButton = screen.getByRole('button', { name: /add subject/i });
        fireEvent.click(addButton);

        // Verify onSave called with correct data
        expect(onSave).toHaveBeenCalledWith({ name: 'Mathematics', code: 'MTH101' });
    });

    it('calls onClose when Cancel is clicked', () => {
        const onClose = vi.fn();
        render(<AddSubjectModal open={true} onClose={onClose} />);

        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        expect(onClose).toHaveBeenCalled();
    });
});
