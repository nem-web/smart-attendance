import React, { useState, useEffect, useMemo } from "react";
import { 
  Download, 
  FileText, 
  ChevronDown, 
  RotateCcw, 
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // Fetch Subjects on Mount
  useEffect(() => {
    fetchMySubjects().then(setSubjects);
  }, []);

  // Fetch Students when Subject/Date changes
  useEffect(() => {
    if(!selectedSubject) return;
    fetchSubjectStudents(selectedSubject).then(setStudents);
  }, [selectedSubject, startDate]);

  // Filter Verified Students
  const verifiedStudents = students.filter(
    (s) => s.verified === true
  );

  const getStatusColor = (color) => {
    switch (color) {
      case "green": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "amber": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "red": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  // Enhance Student Data with Stats
  const enhancedStudents = verifiedStudents.map(s => {
    const present = s.attendance?.present || 0;
    const absent = s.attendance?.absent || 0;

    const total = present + absent;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

    let status = "Unknown";
    let color = "gray";

    if (percentage >= threshold) {
        status = "Good";
        color = "green";
    } else if (percentage >= threshold - 10) {
        status = "Warning";
        color = "amber";
    } else {
        status = "At Risk";
        color = "red";
    }

    return {
      ...s,
      present,
      absent,
      total,
      percentage,
      status,
      color
    };
  });

  // Handle Sort Click
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort Logic
  const sortedStudents = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return enhancedStudents;
    }

    return [...enhancedStudents].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'attended':
          aValue = a.present;
          bValue = b.present;
          break;
        case 'percentage':
          aValue = a.percentage;
          bValue = b.percentage;
          break;
        default:
          return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }, [enhancedStudents, sortConfig]);

  // Get Sort Icon Helper
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="text-[var(--text-body)] opacity-50" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} className="text-[var(--primary)]" />;
    }
    return <ArrowDown size={14} className="text-[var(--primary)]" />;
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)]">Reports</h2>
          <p className="text-[var(--text-body)]">Generate and export attendance reports for your classes</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-main)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
            <FileText size={18} />
            Export CSV
          </button>
          <button className="px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg hover:opacity-90 font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
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
                className="w-full pl-3 pr-10 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] outline-none cursor-pointer text-[var(--text-main)]"
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
              <div className="flex-1 relative h-2 bg-[var(--bg-secondary)] rounded-full">
                <div
                  className="absolute top-0 left-0 h-full bg-[var(--primary)] rounded-full"
                  style={{ width: `${threshold}%` }}
                ></div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
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
          <button className="text-sm font-medium text-[var(--primary)] hover:underline cursor-pointer">View full report</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-[var(--bg-secondary)]">
              <tr className="text-left text-xs font-semibold text-[var(--text-body)] uppercase tracking-wider border-b border-[var(--border-color)]">
                <th className="px-6 py-4">Student</th>
                
                {/* Sortable Header: Total Classes */}
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-[var(--bg-card)] transition-colors select-none"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center gap-2">
                    <span>Total classes</span>
                    {getSortIcon('total')}
                  </div>
                </th>

                {/* Sortable Header: Attended */}
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-[var(--bg-card)] transition-colors select-none"
                  onClick={() => handleSort('attended')}
                >
                  <div className="flex items-center gap-2">
                    <span>Attended</span>
                    {getSortIcon('attended')}
                  </div>
                </th>

                {/* Sortable Header: Percentage */}
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-[var(--bg-card)] transition-colors select-none"
                  onClick={() => handleSort('percentage')}
                >
                  <div className="flex items-center gap-2">
                    <span>Attendance %</span>
                    {getSortIcon('percentage')}
                  </div>
                </th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {sortedStudents.length > 0 ? (
                sortedStudents.map((row) => (
                  <tr key={row._id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-[var(--text-main)]">{row.name}</div>
                        <div className="text-xs text-[var(--text-body)] opacity-70">ID: {row.roll_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-body)]">{row.total}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-body)]">{row.present}</td>
                    <td className="px-6 py-4 text-sm font-bold text-[var(--text-main)]">{row.percentage}%</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(row.color)}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-[var(--text-body)] opacity-70">
                        {selectedSubject ? "No verified students found for this subject." : "Please select a subject to view reports."}
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {sortedStudents.length > 0 && (
            <div className="bg-[var(--bg-secondary)] p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[var(--text-body)] border-t border-[var(--border-color)]">
            <span>
                Showing {sortedStudents.length} students
                {sortConfig.key && (
                <> • Sorted by {
                    sortConfig.key === 'total' ? 'Total Classes' :
                    sortConfig.key === 'attended' ? 'Attended' :
                    'Attendance %'
                } ({sortConfig.direction === 'asc' ? 'Low to High' : 'High to Low'})</>
                )}
            </span>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Good (≥ {threshold}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Warning</span>
                </div>
                <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>At Risk</span>
                </div>
            </div>
            </div>
        )}
      </div>

    </div>
  );
}
