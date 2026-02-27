import React from 'react';
import { BadgeCheck } from 'lucide-react';

const StudentHeaderCard = ({ student }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center md:items-start gap-6">
      <div className="w-24 h-24 md:w-20 md:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
        <img 
          src={student.photo || "https://ui-avatars.com/api/?name=Nemchand&background=random&size=128"} 
          alt={student.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1 text-center md:text-left">
        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
          <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
          <span className="hidden md:inline text-slate-300">•</span>
          <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block">
            {student.course} {student.year}
          </span>
        </div>
        
        <p className="text-slate-500 text-sm mb-3">{student.institute}</p>
        
        <div className="flex flex-wrap justify-center md:justify-start gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
            <BadgeCheck size={14} />
            Reg. No: {student.rollNo}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100">
            Section: {student.section}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100">
            Current term: {student.term}
          </span>
        </div>
      </div>
      
      <div className="hidden md:block text-right">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ID: {student.id}</span>
      </div>
    </div>
  );
};

export default StudentHeaderCard;
