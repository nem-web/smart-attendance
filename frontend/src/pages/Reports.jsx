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

  // const [selectedFilter, setSelectedFilter] = useState("All");

  // Simulating the fetch call you had
  useEffect(() => {
    fetchMySubjects().then(setSubjects);
  }, []);

  useEffect(() => {
    if(!selectedSubject) return;
    fetchSubjectStudents(selectedSubject).then(setStudents);
  }, [selectedSubject])

  const verifiedStudents = students.filter(
    (s) => s.verified === true
  );

  const getStatusColor = (color) => {
    switch (color) {
      case "green": return { backgroundColor: "color-mix(in srgb, var(--emerald-500) 18%, transparent)", color: "var(--emerald-500)" };
      case "amber": return { backgroundColor: "color-mix(in srgb, var(--amber-500) 18%, transparent)", color: "var(--amber-500)" };
      case "red": return { backgroundColor: "color-mix(in srgb, var(--rose-500) 18%, transparent)", color: "var(--rose-500)" };
      default: return { backgroundColor: "color-mix(in srgb, var(--text-body) 12%, transparent)", color: "var(--text-body)" };
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
          <button className="px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg hover:opacity-80 font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
            <FileText size={18} />
            Export CSV
          </button>
          <button className="px-4 py-2 bg-[var(--primary-light)] text-[var(--text-main)] rounded-lg hover:opacity-80 font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {/* --- FILTERS CARD --- */}
      <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-[var(--text-main)]">Report filters</h3>
            <p className="text-sm text-[var(--text-body)]">Choose a date range, classes, and minimum attendance threshold</p>
          </div>
          <button className="px-6 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-full font-medium shadow-sm hover:opacity-90 transition flex items-center gap-2 cursor-pointer">
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
            <label className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wide">Classes</label>
            <div className="relative">
              <select
                value={selectedSubject || ""}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm appearance-none focus:ring-2 focus:ring-[var(--primary)] outline-none cursor-pointer"
              >
                <option disabled value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Threshold Slider */}
          <div className="md:col-span-4 space-y-2 flex flex-col justify-end h-full pb-1">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wide">Threshold (minimum %)</label>
              <span className="text-sm font-bold text-[var(--primary)]">{threshold}%</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative h-2 bg-[var(--border-color)] rounded-full">
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
              <button onClick={()=> setThreshold(75)} className="text-sm text-[var(--text-body)] opacity-70 hover:text-[var(--primary)] flex items-center gap-1 transition cursor-pointer">
                <RotateCcw size={14} />
                Reset
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-body)] opacity-70 mt-1">Show students below {threshold}% attendance</p>
          </div>

        </div>
      </div>

      {/* --- REPORT PREVIEW TABLE --- */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[var(--text-main)]">Report preview</h3>
            <p className="text-sm text-[var(--text-body)]">Summary of student attendance for the selected filters</p>
          </div>
          <button className="text-sm font-medium text-[var(--text-body)] hover:text-[var(--primary)] cursor-pointer">View full report</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-[var(--bg-card)]">
              <tr className="text-left text-xs font-medium text-[var(--text-body)] opacity-70 uppercase tracking-wider border-b border-[var(--border-color)]">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Total classes</th>
                <th className="px-6 py-4">Attended</th>
                <th className="px-6 py-4">Attendance %</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {enhancedStudents.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-[var(--text-main)]">{row.name}</div>
                      <div className="text-xs text-[var(--text-body)] opacity-70">ID: {row.roll} • {row.branch.toUpperCase()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-body)]">{row.attendance.present + row.attendance.absent}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-body)]">{row.attendance.present}</td>
                  <td className="px-6 py-4 text-sm font-bold text-[var(--text-main)]">{row.percentage}%</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={getStatusColor(row.color)}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-[var(--bg-secondary)] p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[var(--text-body)]">
          <span>Showing top 5 of 132 students • Sorted by lowest attendance</span>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--emerald-500)" }} ></span>
              <span>≥ 85%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--amber-500)" }} ></span>
              <span>75-84%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--rose-500)" }} ></span>
              <span>{"< 75%"}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}