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

// --- Mock Data to match your design image ---
const MOCK_STUDENTS = [
  {
    id: "202301",
    name: "Aarav Patel",
    class: "Grade 10A",
    attendance: 96,
    status: "Excellent",
    trend: 4,
    color: "green"
  },
  {
    id: "202302",
    name: "Sophia Lee",
    class: "Grade 10A",
    attendance: 92,
    status: "Very good",
    trend: 2,
    color: "green"
  },
  {
    id: "202303",
    name: "Mohammed Ali",
    class: "Grade 9B",
    attendance: 84,
    status: "Needs attention",
    trend: 0, // flat
    color: "amber"
  },
  {
    id: "202304",
    name: "Emma Wilson",
    class: "Grade 9B",
    attendance: 79,
    status: "Moderate",
    trend: -5,
    color: "amber"
  },
  {
    id: "202305",
    name: "Liam Garcia",
    class: "Grade 11C",
    attendance: 64,
    status: "At risk",
    trend: 0,
    color: "red"
  },
  {
    id: "202306",
    name: "Noah Smith",
    class: "Grade 11C",
    attendance: 58,
    status: "Critical",
    trend: -10,
    color: "red"
  },
];

export default function StudentList() {
  const [students, setStudents] = useState(MOCK_STUDENTS);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const navigate = useNavigate();

  // Simulating the fetch call you had
  useEffect(() => {
    // In a real app, you would fetch here:
    // async function load() {
    //   const res = await fetch("/api/students");
    //   const data = await res.json();
    //   setStudents(data);
    // }
    // load();
  }, []);

  // Helper to get color classes
  const getColorClasses = (color) => {
    switch (color) {
      case "green": return "bg-emerald-500 text-white";
      case "amber": return "bg-amber-500 text-white";
      case "red": return "bg-rose-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getBarColor = (color) => {
    switch (color) {
      case "green": return "bg-emerald-500";
      case "amber": return "bg-amber-500";
      case "red": return "bg-rose-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)]">Students</h2>
          <p className="text-[var(--text-body)]">Browse all students and compare attendance performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 text-[var(--text-main)] rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 transition cursor-pointer">
            <Download size={18} />
            Export list
          </button>
          <button
           onClick={() => navigate('/add-students')}
           className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
            <Plus size={18} />
            Add student
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* --- MAIN LIST (Left Side - 3 cols) --- */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            
            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or ID" 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
              <button className="flex items-center gap-1 text-sm font-medium text-gray-600 px-3 py-1.5 hover:bg-gray-100 rounded-lg whitespace-nowrap cursor-pointer">
                All classes <ChevronDown size={14} />
              </button>
              <button className="flex items-center gap-1 text-sm font-medium text-gray-600 px-3 py-1.5 hover:bg-gray-100 rounded-lg whitespace-nowrap cursor-pointer">
                Sort by attendance <ChevronDown size={14} />
              </button>
              
              <div className="h-6 w-px bg-gray-200 mx-1"></div>

              {["All", "High (> 90%)", "Medium (75-90%)", "Low (< 75%)"].map((filter) => (
                <button 
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    selectedFilter === filter 
                      ? "bg-indigo-100 text-indigo-700" 
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Visual grade</th>
                    <th className="px-6 py-4">Trend</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                      
                      {/* Name Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--text-main)]">{student.name}</div>
                            <div className="text-xs text-gray-400">ID {student.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Class Column */}
                      <td className="px-6 py-4 text-sm text-[var(--text-body)] font-medium">
                        {student.class}
                      </td>

                      {/* Visual Grade Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 w-48">
                          {/* The Pill */}
                          <div className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-sm ${getColorClasses(student.color)}`}>
                            {student.attendance}% {student.status}
                          </div>
                          {/* The Bar */}
                          <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${getBarColor(student.color)}`} 
                              style={{ width: `${student.attendance}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Trend Column */}
                      <td className="px-6 py-4">
                        {student.trend > 0 ? (
                          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                             <ArrowUpRight size={14} />
                             +{student.trend}% vs last month
                          </div>
                        ) : student.trend < 0 ? (
                          <div className="flex items-center gap-1 text-xs font-semibold text-rose-500">
                             <ArrowDownRight size={14} />
                             {student.trend}% vs last month
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-gray-400">No change</div>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition">
                          <MoreHorizontal size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Footer (Mock) */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Showing 1-6 of 45 students</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded hover:bg-gray-50 cursor-pointer">Previous</button>
                <button className="px-3 py-1 border rounded hover:bg-gray-50 cursor-pointer">Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT SIDEBAR (Stats) (1 col) --- */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Card 1: Attendance Bands */}
          <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-[var(--text-main)] mb-1">Attendance bands</h3>
            <p className="text-xs text-[var(--text-body)] mb-4">Color grading from best to worst</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">High attendance</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">{"> 90%"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Medium attendance</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">75-90%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Low attendance</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-bold">{"< 75%"}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Top Performers */}
          <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-[var(--text-main)] mb-1">Top performers</h3>
            <p className="text-xs text-[var(--text-body)] mb-4">Students with best attendance this term</p>
            
            <div className="space-y-4">
              {[
                { name: "Aarav Patel", val: "96%" }, 
                { name: "Sophia Lee", val: "92%" }, 
                { name: "Emma Wilson", val: "89%" }
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{i+1}</div>
                    <span className="text-sm font-medium text-gray-700">{s.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Needs Support */}
          <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-[var(--text-main)] mb-1">Needs support</h3>
            <p className="text-xs text-[var(--text-body)] mb-4">Students with the lowest attendance</p>
            
            <div className="space-y-4">
              {[
                { name: "Noah Smith", val: "58%" }, 
                { name: "Liam Garcia", val: "64%" }, 
                { name: "Mohammed Ali", val: "72%" }
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">{i+1}</div>
                    <span className="text-sm font-medium text-gray-700">{s.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{s.val}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}