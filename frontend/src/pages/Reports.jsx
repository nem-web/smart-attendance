import React, { useState, useEffect } from "react";
import { 
  Download, 
  FileText, 
  Calendar, 
  ChevronDown, 
  RotateCcw, 
  Search,
  Filter
} from "lucide-react";
import { fetchMySubjects, fetchSubjectStudents } from "../api/teacher";
import DateRange from '../components/DateRange.jsx';
import 'react-datepicker/dist/react-datepicker.css';


export default function Reports() {
  const [threshold, setThreshold] = useState(75);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [startDate, setStartDate] = useState(new Date());

  // const [selectedFilter, setSelectedFilter] = useState("All");

  // Simulating the fetch call you had
  useEffect(() => {
    fetchMySubjects().then(setSubjects);
  }, []);

  useEffect(() => {
    if(!selectedSubject) return;
    // console.log("Filtering by date:", startDate); // Silence unused warning
    fetchSubjectStudents(selectedSubject).then(setStudents);
  }, [selectedSubject, startDate])

  const verifiedStudents = students.filter(
    (s) => s.verified === true
  );

  const getStatusColor = (color) => {
    switch (color) {
      case "green": return "bg-emerald-100 text-emerald-700";
      case "amber": return "bg-amber-100 text-amber-700";
      case "red": return "bg-rose-100 text-rose-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const enhancedStudents = verifiedStudents.map(s => {
    const present = s.attendance?.present || 0;
    const absent = s.attendance?.absent || 0;

    const total = present + absent;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

    const status = percentage >= threshold ? "OK" : "At Risk";
    const color = percentage >= threshold 
        ? "green"
        : percentage >= threshold - 10
        ? "amber"
        : "red";

    return {
      ...s,
      total,
      percentage,
      status,
      color
    };
  });


  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)]">Reports</h2>
          <p className="text-[var(--text-body)]">Generate and export attendance reports for your classes</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
            <FileText size={18} />
            Export CSV
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {/* --- FILTERS CARD --- */}
      <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-[var(--text-main)]">Report filters</h3>
            <p className="text-sm text-[var(--text-body)]">Choose a date range, classes, and minimum attendance threshold</p>
          </div>
          <button className="px-6 py-2 bg-[var(--primary)] text-white rounded-full font-medium shadow-sm hover:opacity-90 transition flex items-center gap-2 cursor-pointer">
            <Filter size={16} />
            Generate report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">

          <DateRange
            onChange={(date) => setStartDate(date)}
          />

          {/* Classes Selector */}
          <div className="md:col-span-4 space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Classes</label>
            <div className="relative">
              <select
                value={selectedSubject || ""}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option disabled value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Threshold Slider */}
          <div className="md:col-span-4 space-y-2 flex flex-col justify-end h-full pb-1">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Threshold (minimum %)</label>
              <span className="text-sm font-bold text-[var(--primary)]">{threshold}%</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative h-2 bg-gray-200 rounded-full">
                <div
                  className="absolute top-0 left-0 h-full bg-[var(--primary)] rounded-full"
                  style={{ width: `${threshold}%` }}
                ></div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <button onClick={()=> setThreshold(75)} className="text-sm text-gray-400 hover:text-[var(--primary)] flex items-center gap-1 transition cursor-pointer">
                <RotateCcw size={14} />
                Reset
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Show students below {threshold}% attendance</p>
          </div>

        </div>
      </div>

      {/* --- REPORT PREVIEW TABLE --- */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[var(--text-main)]">Report preview</h3>
            <p className="text-sm text-[var(--text-body)]">Summary of student attendance for the selected filters</p>
          </div>
          <button className="text-sm font-medium text-gray-500 hover:text-[var(--primary)] cursor-pointer">View full report</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-white">
              <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Total classes</th>
                <th className="px-6 py-4">Attended</th>
                <th className="px-6 py-4">Attendance %</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {enhancedStudents.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-[var(--text-main)]">{row.name}</div>
                      <div className="text-xs text-gray-400">ID: {row.roll} • {row.branch.toUpperCase()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-body)]">{row.attendance.present + row.attendance.absent}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-body)]">{row.attendance.present}</td>
                  <td className="px-6 py-4 text-sm font-bold text-[var(--text-main)]">{row.percentage}%</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(row.color)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <span>Showing top 5 of 132 students • Sorted by lowest attendance</span>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>≥ 85%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>75-84%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>{"< 75%"}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}