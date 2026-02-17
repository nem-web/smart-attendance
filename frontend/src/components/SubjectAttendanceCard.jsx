import React from 'react';
import PropTypes from 'prop-types';
import { Trash2 } from 'lucide-react';

const SubjectAttendanceCard = ({ subject, onDelete }) => {
  const { name, code, attended, total, id, _id } = subject;
  // Handle both id formats just in case
  const subjectId = id || _id;

  // Calculate percentage safely
  const percentage = total > 0 ? (attended / total) * 100 : 0;
  const isSafe = percentage >= 75;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-5 relative shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[var(--text-main)] font-bold text-lg leading-tight">{name}</h3>
          <p className="text-[var(--text-body)] text-xs font-medium uppercase tracking-wide mt-1">{code}</p>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(subjectId)}
            className="text-[var(--danger)]/70 hover:text-[var(--danger)] p-1.5 rounded-lg hover:bg-[var(--danger)]/10 transition-colors cursor-pointer"
            title="Remove subject"
            aria-label={`Remove ${name}`}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
           <span className="text-[var(--text-body)] text-sm font-medium">{attended} / {total} Classes</span>
           <span className={`text-lg font-bold ${isSafe ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
             {percentage.toFixed(1)}%
           </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isSafe ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          ></div>
        </div>

        {/* Status Badge */}
        <div className="pt-1">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                isSafe
                ? 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/20'
                : 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/20'
            }`}>
            {isSafe ? 'On Track' : 'Low Attendance'}
            </span>
        </div>
      </div>
    </div>
  );
};

SubjectAttendanceCard.propTypes = {
  subject: PropTypes.shape({
    name: PropTypes.string,
    code: PropTypes.string,
    attended: PropTypes.number,
    total: PropTypes.number,
    id: PropTypes.string,
    _id: PropTypes.string,
  }).isRequired,
  onDelete: PropTypes.func,
};

export default SubjectAttendanceCard;
