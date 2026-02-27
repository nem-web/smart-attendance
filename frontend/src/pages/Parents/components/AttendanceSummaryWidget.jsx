import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const AttendanceSummaryWidget = ({ attendance }) => {
  const data = [
    { name: 'Attended', value: attendance.percentage },
    { name: 'Missed', value: 100 - attendance.percentage },
  ];

  const COLORS = ['#10B981', '#E5E7EB']; // Green and Slate-200

  // Status badge config
  const getStatusConfig = (percentage) => {
    if (percentage >= 75) return { label: 'On track', color: 'bg-emerald-100 text-emerald-700' };
    if (percentage >= 60) return { label: 'Warning', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Critical', color: 'bg-red-100 text-red-700' };
  };

  const status = getStatusConfig(attendance.percentage);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-slate-900">Overall attendance</h3>
          <p className="text-xs text-slate-500">Updated as of today</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-1">Overall percentage</p>
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-4xl font-bold ${attendance.percentage >= 75 ? 'text-emerald-500' : 'text-slate-900'}`}>
              {attendance.percentage}%
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Requirement: minimum 75% to be exam eligible.
          </p>
        </div>

        <div className="w-24 h-24 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={42}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <span className="text-sm font-bold text-slate-900">{attendance.percentage}%</span>
             <span className="text-[9px] text-slate-400 -mt-1 leading-none">Term total</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummaryWidget;
