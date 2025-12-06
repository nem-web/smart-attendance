import React from "react";
import { Link } from "react-router-dom";
import { 
  Bell, 
  Download, 
  Play, 
  Users, 
  Calendar, 
  CheckCircle,
  Clock,
  ChevronRight 
} from "lucide-react"; // Assuming you use lucide-react, or replace with your icons

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- SECTION 1: PAGE HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-main)]">Teacher dashboard</h1>
            <p className="text-[var(--text-body)] mt-1">Overview of today's attendance and upcoming classes</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white border border-[var(--border-color)] text-[var(--text-main)] rounded-lg hover:bg-blue-600 font-medium transition-colors flex items-center gap-2">
              <Download size={18} />
              Download report
            </button>
            <Link to="/start-attendance" className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium shadow-sm flex items-center gap-2 transition-colors">
              <Play size={18} fill="currentColor" />
              Start attendance
            </Link>
          </div>
        </div>

        {/* --- SECTION 2: MAIN GRID LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN (Wider - 8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 2.1 Welcome / Active Session Card */}
            <div className="bg-[var(--bg-card)] rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-main)]">Good morning, Alex</h2>
                  <p className="text-[var(--text-body)] text-sm">Monday, September 23 • 08:45</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Next class: Grade 10A • 09:00</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Room 203</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                <span className="text-xs font-medium text-[var(--primary)] bg-indigo-50 px-2 py-1 rounded">Face recognition is ready</span>
                <Link to="/attendance-session" className="w-full md:w-auto px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-semibold hover:bg-[var(--primary-hover)] transition shadow-md text-center">
                  Start attendance session
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <CheckCircle size={14} />
                  Camera and permissions checked
                </div>
              </div>
            </div>

            {/* 2.2 Stats Row (Blue Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stat 1 */}
              <div className="bg-blue-600 text-white rounded-2xl p-5 relative overflow-hidden">
                <p className="text-blue-100 text-sm font-medium mb-1">Today's attendance rate</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold">94%</h3>
                  <span className="text-xs bg-blue-500/50 px-2 py-1 rounded text-blue-50">+3% vs last week</span>
                </div>
              </div>
              
              {/* Stat 2 */}
              <div className="bg-blue-600 text-white rounded-2xl p-5">
                <p className="text-blue-100 text-sm font-medium mb-1">Absent</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold">7</h3>
                  <span className="text-xs text-blue-100">Across all classes</span>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-blue-600 text-white rounded-2xl p-5">
                <p className="text-blue-100 text-sm font-medium mb-1">Late arrivals</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-bold">3</h3>
                  <span className="text-xs text-blue-100">First period</span>
                </div>
              </div>
            </div>

            {/* 2.3 Quick Actions Row (Light Gray Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl cursor-pointer hover:bg-gray-200 transition">
                <div className="font-semibold text-[var(--text-main)] mb-1">View student list</div>
                <div className="text-xs text-[var(--text-body)]">Search, filter and manage profiles</div>
              </div>
              <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl cursor-pointer hover:bg-gray-200 transition">
                <div className="font-semibold text-[var(--text-main)] mb-1">Go to attendance</div>
                <div className="text-xs text-[var(--text-body)]">Open live marking screen</div>
              </div>
              <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl cursor-pointer hover:bg-gray-200 transition">
                <div className="font-semibold text-[var(--text-main)] mb-1">Manage schedule</div>
                <div className="text-xs text-[var(--text-body)]">Edit classes and timetables</div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (Narrower - 4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 3.1 Trends Chart Placeholder */}
            <div className="bg-[var(--bg-card)] p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-[var(--text-main)]">Attendance trends</h3>
                <span className="text-xs text-[var(--text-body)] bg-gray-100 px-2 py-1 rounded">This week</span>
              </div>
              
              {/* Chart Placeholder Box */}
              <div className="h-40 bg-gray-50 rounded-xl w-full flex items-center justify-center text-gray-300 mb-4 border border-dashed border-gray-200">
                Chart Area
              </div>

              <div className="flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--primary)]"></span> Present</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Absent</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-300"></span> Late</div>
              </div>
            </div>

            {/* 3.2 Upcoming Classes List */}
            <div className="space-y-3">
              {/* Card 1 */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[var(--text-main)]">Grade 10A Mathematics</h4>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide rounded-full">Completed</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-xs text-[var(--text-body)] flex flex-col gap-1">
                    <span className="flex items-center gap-1"><Clock size={12}/> 08:00 - 09:00</span>
                    <span>Room 203</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--text-body)]">96% attendance</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[var(--text-main)]">Grade 9B Physics</h4>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide rounded-full">Upcoming</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-xs text-[var(--text-body)] flex flex-col gap-1">
                    <span className="flex items-center gap-1"><Clock size={12}/> 09:15 - 10:15</span>
                    <span>Lab 2</span>
                  </div>
                  <span className="text-xs font-medium text-blue-600">Starts in 30 min</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-orange-400">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-[var(--text-main)]">Grade 11C Chemistry</h4>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wide rounded-full">Pending</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-xs text-[var(--text-body)] flex flex-col gap-1">
                    <span className="flex items-center gap-1"><Clock size={12}/> 11:00 - 12:00</span>
                    <span>Lab 1</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--text-body)]">Attendance not started</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}