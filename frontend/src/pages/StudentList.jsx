import React, { useEffect, useState } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreHorizontal, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchMySubjects, fetchSubjectStudents } from "../api/teacher";

export default function StudentList() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" or "desc"
  const navigate = useNavigate();

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

  // Helper function to calculate attendance percentage
  const calculateAttendancePercentage = (student) => {
    const present = student.attendance?.present ?? 0;
    const absent = student.attendance?.absent ?? 0;
    const total = present + absent;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  };

  // Filter students based on search term and attendance filter
  const filteredStudents = verifiedStudents.filter((student) => {
    // Search filter
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.roll.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Attendance filter
    if (selectedFilter === "All") return true;
    
    const percentage = calculateAttendancePercentage(student);
    
    switch (selectedFilter) {
      case "High (> 90%)":
        return percentage > 90;
      case "Medium (75-90%)":
        return percentage >= 75 && percentage <= 90;
      case "Low (< 75%)":
        return percentage < 75;
      default:
        return true;
    }
  });

  // Sort students by attendance percentage
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const percentageA = calculateAttendancePercentage(a);
    const percentageB = calculateAttendancePercentage(b);
    
    return sortOrder === "desc" ? percentageB - percentageA : percentageA - percentageB;
  });

  // Toggle sort order
  const handleSortToggle = () => {
    setSortOrder(prev => prev === "desc" ? "asc" : "desc");
  };


  // Helper to get color classes
  const getColorClasses = (color) => {
    switch (color) {
      case "green": return "bg-[var(--success)] text-[var(--text-on-primary)]";
      case "amber": return "bg-[var(--warning)] text-[var(--text-on-primary)]";
      case "red": return "bg-[var(--danger)] text-[var(--text-on-primary)]";
      default: return "bg-[var(--text-body)] text-[var(--text-on-primary)]";
    }
  };

  const getBarColor = (color) => {
    switch (color) {
      case "green": return "bg-[var(--success)]";
      case "amber": return "bg-[var(--warning)]";
      case "red": return "bg-[var(--danger)]";
      default: return "bg-[var(--text-body)]";
    }
  };

  // Derive Top Performers and Needs Support
  const studentsWithAttendance = verifiedStudents.map(student => ({
    ...student,
    attendancePercentage: calculateAttendancePercentage(student)
  }));
  
  const topPerformers = [...studentsWithAttendance]
    .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
    .slice(0, 3);

  const needsSupport = [...studentsWithAttendance]
    .sort((a, b) => a.attendancePercentage - b.attendancePercentage)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)]">Students</h2>
          <p className="text-[var(--text-body)]">Browse all students and compare attendance performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-secondary)] font-medium flex items-center gap-2 transition cursor-pointer">
            <Download size={18} />
            Export list
          </button>
          <button
           onClick={() => navigate('/add-students')}
           className="px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg hover:bg-[var(--primary-hover)] font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
            <Plus size={18} />
            Add student
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* --- MAIN LIST (Left Side - 3 cols) --- */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[color:var(--border-color)] shadow-sm">
            
            {/* Search */}
            <div className="relative w-full mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-body)]" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or ID" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[color:var(--bg-secondary)] border-none rounded-lg text-sm focus:ring-2 focus:ring-[color:var(--primary)] outline-none"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedSubject || ""}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="flex items-center gap-1 text-sm font-medium text-[color:var(--text-body)] px-3 py-1.5 hover:bg-[color:var(--bg-secondary)] rounded-lg cursor-pointer"
              >
                <option value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>

              <button 
                onClick={handleSortToggle}
                className="flex items-center gap-1 text-sm font-medium text-[color:var(--text-body)] px-3 py-1.5 hover:bg-[color:var(--bg-secondary)] rounded-lg cursor-pointer"
                title="Sort by attendance"
              >
                <span className="hidden sm:inline">Sort by attendance</span>
                <span className="sm:hidden">Sort</span>
                <ChevronDown 
                  size={14} 
                  className={`transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} 
                />
              </button>
              
              <div className="hidden sm:block h-6 w-px bg-[color:var(--border-color)] mx-1"></div>

              {["All", "High (> 90%)", "Medium (75-90%)", "Low (< 75%)"].map((filter) => {
                const shortLabels = {
                  "All": "All",
                  "High (> 90%)": "High",
                  "Medium (75-90%)": "Med",
                  "Low (< 75%)": "Low"
                };
                
                return (
                  <button 
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      selectedFilter === filter 
                        ? "bg-[color:var(--primary)] text-white" 
                        : "text-[color:var(--text-body)] hover:bg-[color:var(--bg-secondary)]"
                    }`}
                    title={filter}
                  >
                    <span className="hidden sm:inline">{filter}</span>
                    <span className="sm:hidden">{shortLabels[filter]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                  <tr className="text-left text-xs font-semibold text-[var(--text-body)] opacity-80 uppercase tracking-wider">
                    <th className="px-6 py-4">Roll Number</th>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Visual grade</th>
                    <th className="px-6 py-4">Trend</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {sortedStudents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="text-[var(--text-body)] opacity-80">
                          <p className="text-lg font-medium">No students found</p>
                          <p className="text-sm mt-1">
                            {searchTerm && selectedFilter !== "All" 
                              ? `No students match "${searchTerm}" with filter "${selectedFilter}"`
                              : searchTerm
                              ? `No students match "${searchTerm}"`
                              : `No students match the selected filter "${selectedFilter}"`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedStudents.map((student) => {
                      const percentage = calculateAttendancePercentage(student);

                    // derive UI-only values (NO design change)
                    let color = "amber";
                    let status = "Moderate";
                    let trend = 0;

                    if (percentage > 90) {
                      color = "green";
                      status = "Excellent";
                    } else if (percentage < 75) {
                      color = "red";
                      status = "At risk";
                    }

                    return (
                      <tr
                        key={student.student_id}
                        className="hover:bg-[var(--bg-hover)] transition-colors group"
                      >
                        {/* Roll Number column */}
                        <td className="px-6 py-4">
                          <p>{student.roll}</p>
                        </td>

                        {/* Name Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-body)] opacity-80 font-bold text-sm">
                              <img src={student.avatar} alt="students-avatar" className="rounded-full w-10 h-10" />
                            </div>
                            <div>
                              <div className="font-semibold text-[var(--text-main)]">
                                {student.name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Visual Grade Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 w-48">
                            {/* The Pill */}
                            <div
                              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-sm ${getColorClasses(
                                color
                              )}`}
                            >
                              {percentage}% {status}
                            </div>

                            {/* The Bar */}
                            <div className="h-2 flex-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getBarColor(color)}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Trend Column (placeholder, unchanged UI) */}
                        <td className="px-6 py-4">
                          {trend > 0 ? (
                            <div className="flex items-center gap-1 text-xs font-semibold text-[var(--success)]">
                              <ArrowUpRight size={14} />
                              +{trend}% vs last month
                            </div>
                          ) : trend < 0 ? (
                            <div className="flex items-center gap-1 text-xs font-semibold text-[var(--danger)]">
                              <ArrowDownRight size={14} />
                              {trend}% vs last month
                            </div>
                          ) : (
                            <div className="text-xs font-medium text-[var(--text-body)] opacity-70">
                              No change
                            </div>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4 text-right">
                          <button className="text-[var(--text-body)]/50 hover:text-[var(--text-body)] p-1 hover:bg-[var(--bg-hover)] rounded-full transition">
                            <MoreHorizontal size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>

              </table>
            </div>
            
            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-body)] opacity-80">
              <span>Showing {sortedStudents.length} of {verifiedStudents.length} students</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded hover:bg-[var(--bg-secondary)] cursor-pointer">Previous</button>
                <button className="px-3 py-1 border rounded hover:bg-[var(--bg-secondary)] cursor-pointer">Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT SIDEBAR (Stats) (1 col) --- */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Card 1: Attendance Bands */}
          <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm">
            <h3 className="font-semibold text-[var(--text-main)] mb-1">Attendance bands</h3>
            <p className="text-xs text-[var(--text-body)] mb-4">Color grading from best to worst</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--text-body)]">High attendance</span>
                <span className="px-2 py-0.5 bg-[var(--success)]/10 text-[var(--success)] rounded text-xs font-bold">{"> 90%"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--text-body)]">Medium attendance</span>
                <span className="px-2 py-0.5 bg-[var(--warning)]/10 text-[var(--warning)] rounded text-xs font-bold">75-90%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--text-body)]">Low attendance</span>
                <span className="px-2 py-0.5 bg-[var(--danger)]/10 text-[var(--danger)] rounded text-xs font-bold">{"< 75%"}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Top Performers */}
          {topPerformers.length > 0 && (
            <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-[var(--text-main)] mb-1">Top performers</h3>
              <p className="text-xs text-[var(--text-body)] mb-4">Students with best attendance this term</p>
              
              <div className="space-y-4">
                {topPerformers.map((s, i) => (
                  <div key={s._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{i+1}</div>
                      <span className="text-sm font-medium text-gray-700">{s.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{s.attendancePercentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 3: Needs Support */}
          {needsSupport.length > 0 && (
            <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-[var(--text-main)] mb-1">Needs support</h3>
              <p className="text-xs text-[var(--text-body)] mb-4">Students with the lowest attendance</p>
              
              <div className="space-y-4">
                {needsSupport.map((s, i) => (
                  <div key={s._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">{i+1}</div>
                      <span className="text-sm font-medium text-gray-700">{s.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{s.attendancePercentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}