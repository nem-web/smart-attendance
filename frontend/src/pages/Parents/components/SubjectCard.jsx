import React from 'react';
import { Mail } from 'lucide-react';

const SubjectCard = ({ subject }) => {
  const percentage = Math.round((subject.attended / subject.totalClasses) * 100);
  
  // Status check
  const isSafe = percentage >= 75;
  const isCritical = percentage < 60;
  
  const getProgressBarColor = () => {
    if (isCritical) return 'bg-red-500';
    if (!isSafe) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusText = () => {
      if (isCritical) return 'Critical';
      if (!isSafe) return 'Monitor closely';
      return 'Safe';
  };
   const getStatusTextColor = () => {
      if (isCritical) return 'text-red-500';
      if (!isSafe) return 'text-amber-500';
      return 'text-emerald-500';
  };


  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div>
        <div className="flex justify-between items-start mb-4">
            <div>
                <h4 className="font-bold text-slate-900 mb-1">{subject.name}</h4>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                   {subject.schedule}
                </p>
            </div>
            {/* Professor Profile */}
            <div className="flex items-center gap-2 bg-slate-50 pl-1 pr-3 py-1 rounded-full border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-indigo-100 overflow-hidden">
                    <img src={subject.professor.photo || `https://ui-avatars.com/api/?name=${subject.professor.name}&background=random`} alt={subject.professor.name} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-700 leading-tight">{subject.professor.name}</span>
                    <a href={`mailto:${subject.professor.email}`} className="text-[9px] text-indigo-500 hover:underline leading-none">
                        {subject.professor.email}
                    </a>
                </div>
            </div>
        </div>

        <div className="mb-2">
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-slate-500">Attendance</span>
                <span className="text-2xl font-bold text-slate-900">{percentage}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs mt-2 pt-3 border-t border-slate-50">
          <span className="text-slate-500 font-medium">
             Attended {subject.attended} of {subject.totalClasses} classes
          </span>
          <span className={`font-bold ${getStatusTextColor()}`}>
              {getStatusText()}
          </span>
      </div>
    </div>
  );
};

export default SubjectCard;
