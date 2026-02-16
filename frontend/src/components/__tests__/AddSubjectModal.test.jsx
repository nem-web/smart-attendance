import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AddSubjectModal from '../AddSubjectModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock currentUser query
vi.mock('../api/auth', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue({ _id: 'teacher123', name: 'John Doe' }),
}));

const queryClient = new QueryClient();

const Wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('AddSubjectModal Component', () => {
    it('does not render when open is false', () => {
        render(
            <Wrapper>
                <AddSubjectModal open={false} onClose={vi.fn()} onSave={vi.fn()} />
            </Wrapper>
        );
        expect(screen.queryByText(/create new subject/i)).not.toBeInTheDocument();
    });

    it('renders and calls onSave with form data', async () => {
        const onSave = vi.fn();
        const onClose = vi.fn();

        render(
            <Wrapper>
                <AddSubjectModal open={true} onSave={onSave} onClose={onClose} />
            </Wrapper>
        );

        // Check modal content is visible
        expect(screen.getByRole('heading', { name: /add subject/i })).toBeInTheDocument();

        // Fill inputs
        const nameInput = screen.getByPlaceholderText(/enter subject name/i);
        const codeInput = screen.getByPlaceholderText(/enter subject code/i);

        fireEvent.change(nameInput, { target: { value: 'Mathematics' } });
        fireEvent.change(codeInput, { target: { value: 'MTH101' } });

        // Submit
        const addButton = screen.getByRole('button', { name: /add subject/i });
        fireEvent.click(addButton);

        // Verify onSave called with correct data (excluding teacher_id for now as it depends on async query)
        // We can just check name and code are present
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mathematics', code: 'MTH101' }));
    });

    it('calls onClose when Cancel is clicked', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        render(
            <Wrapper>
                <AddSubjectModal open={true} onClose={onClose} onSave={onSave} />
            </Wrapper>
        );

        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        expect(onClose).toHaveBeenCalled();
    });
});
