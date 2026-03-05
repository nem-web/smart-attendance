import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MarkAttendance from '../MarkAttendance';

vi.mock('../../api/teacher', () => ({
    fetchMySubjects: vi.fn().mockResolvedValue([]),
    fetchSubjectStudents: vi.fn().mockResolvedValue([])
}));

vi.mock('../../api/attendance', () => ({
    captureAndSend: vi.fn()
}));

describe('MarkAttendance Component', () => {
    it('renders correctly', () => {
        // This test assumes MarkAttendance renders something identifiable
        // We'll wrap in error boundary or just see if it mounts without crashing
        
        const { container } = render(
            <MemoryRouter>
                <MarkAttendance />
            </MemoryRouter>
        );
        
        expect(container).toBeInTheDocument();
    });
});
