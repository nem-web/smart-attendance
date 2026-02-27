import React from 'react';
import { Download, FileText } from 'lucide-react';

const ReportSection = ({ reports }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="mb-4">
        <h3 className="font-bold text-slate-900">Reports</h3>
        <p className="text-xs text-slate-500">Download official term summaries</p>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
         <div className="flex items-center gap-3 mb-1">
            <FileText className="text-indigo-500" size={16} />
            <p className="text-sm font-semibold text-slate-800">{reports[0].title}</p>
         </div>
         <p className="text-xs text-slate-500 mb-3 pl-7">
            Latest: {reports[0].date} • {reports[0].type}
            <br/>
            Includes subject-wise attendance, internal marks, and remarks.
         </p>
         
         <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-indigo-200">
            <Download size={18} />
            Download term report (PDF)
         </button>
      </div>
      
      <p className="text-[10px] text-slate-400 text-center">
        Tip: You can also access previous reports from the <span className="text-indigo-600 font-medium cursor-pointer">Reports</span> section.
      </p>
    </div>
  );
};

export default ReportSection;
