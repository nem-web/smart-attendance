import React, { useState } from "react";
import { 
  Plus, 
  Copy, 
  Sun, 
  Calendar as CalendarIcon, 
  RefreshCw, 
  Folder, 
  ChevronDown, 
  MoreHorizontal
} from "lucide-react";

export default function ManageSchedule() {
  const [activeDay, setActiveDay] = useState("Mon");

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Mock Calendar Grid Generation
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const day = i - 2; // Offset to start month correctly
    return day > 0 && day <= 30 ? day : "";
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] font-sans text-[var(--text-main)] transition-colors duration-200">

      <main className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
        
        {/* --- PAGE HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-main)]">Manage schedule</h1>
            <p className="text-[var(--text-body)] mt-1">Edit classes, recurring timetables, and special days</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2.5 text-[var(--text-body)] hover:text-[var(--text-main)] font-medium transition">
              Discard changes
            </button>
            <button className="px-6 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-on-primary)] rounded-xl font-semibold shadow-sm transition active:scale-95">
              Save schedule
            </button>
          </div>
        </div>

        {/* --- MAIN GRID CONTENT --- */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT SECTION: CLASS TIMETABLE (Span 8) */}
          <div className="xl:col-span-8 space-y-6">
            
            {/* Timetable Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-main)]">Class timetable</h3>
                <p className="text-sm text-[var(--text-body)]">Configure daily timetable and recurring sessions</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 text-[var(--text-body)] text-sm font-medium hover:bg-[var(--bg-card)] px-3 py-1.5 rounded-lg transition border border-transparent hover:border-[var(--border-color)]">
                  <Copy size={16} /> Duplicate day
                </button>
                <button className="flex items-center gap-2 bg-[var(--primary)] text-[var(--text-on-primary)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] transition shadow-sm">
                  <Plus size={16} /> Add class
                </button>
              </div>
            </div>

            {/* Day Selector Pill */}
            <div className="inline-flex bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-full overflow-x-auto max-w-full">
              <button className="px-5 py-1.5 rounded-full text-sm font-medium text-[var(--text-body)] hover:text-[var(--text-main)] whitespace-nowrap">Week</button>
              {days.map(day => (
                <button 
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeDay === day 
                      ? "bg-[var(--primary)] text-[var(--text-on-primary)] shadow-sm" 
                      : "text-[var(--text-body)] hover:text-[var(--text-main)]"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Classes Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Class Card 1 */}
              <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] transition group cursor-pointer relative shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-[var(--text-main)]">Mathematics 10A</h4>
                  <span className="text-xs font-medium text-[var(--text-body)]">08:00 - 09:00</span>
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-sm text-[var(--text-body)]">Room 203 · Teacher: Alex Johnson</p>
                  <span className="bg-emerald-500 text-[var(--text-on-primary)] text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Active</span>
                </div>
              </div>

              {/* Action Card: New Class Slot */}
              <div className="bg-[var(--bg-secondary)] p-5 rounded-xl border border-dashed border-[var(--border-color)] flex flex-col justify-center cursor-pointer hover:bg-[var(--bg-card)] transition h-full min-h-[100px]">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-[var(--text-main)]">New class slot</h4>
                  <Plus size={20} className="text-[var(--text-body)]" />
                </div>
                <p className="text-sm text-[var(--text-body)] mt-1">Tap to configure subject and time</p>
              </div>

              {/* Class Card 2 */}
              <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] transition group cursor-pointer relative shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-[var(--text-main)]">Physics 9B</h4>
                  <span className="text-xs font-medium text-[var(--text-body)]">09:15 - 10:15</span>
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-sm text-[var(--text-body)]">Lab 2 · Teacher: Alex Johnson</p>
                  <span className="bg-emerald-500 text-[var(--text-on-primary)] text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Active</span>
                </div>
              </div>

              {/* Action Card: Mark as Holiday */}
              <div className="bg-[var(--bg-secondary)] p-5 rounded-xl border border-dashed border-[var(--border-color)] flex flex-col justify-center cursor-pointer hover:bg-[var(--bg-card)] transition h-full min-h-[100px]">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-[var(--text-main)]">Mark as holiday</h4>
                  <Sun size={20} className="text-[var(--text-body)]" />
                </div>
                <p className="text-sm text-[var(--text-body)] mt-1">Disable attendance for this date</p>
              </div>

              {/* Class Card 3 */}
              <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] transition group cursor-pointer relative shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-[var(--text-main)]">Chemistry 11C</h4>
                  <span className="text-xs font-medium text-[var(--text-body)]">11:00 - 12:00</span>
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-sm text-[var(--text-body)]">Lab 1 · Teacher: Alex Johnson</p>
                  <span className="bg-amber-500 text-[var(--text-on-primary)] text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Pending</span>
                </div>
              </div>

              {/* Spacer for grid */}
              <div className="hidden md:block"></div>

              {/* Class Card 4 (Free hours) */}
              <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] transition group cursor-pointer relative shadow-sm opacity-70">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-[var(--text-main)]">Free / Office hours</h4>
                  <span className="text-xs font-medium text-[var(--text-body)]">12:30 - 13:00</span>
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-sm text-[var(--text-body)]">No face recognition · Optional</p>
                  <span className="text-[var(--text-body)] text-[10px] font-bold uppercase">Not tracked</span>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT SECTION: CALENDAR OVERVIEW (Span 4) */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Calendar Container */}
            <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-[var(--text-main)]">Calendar overview</h3>
                <p className="text-sm text-[var(--text-body)]">Drag to adjust special days and exceptions</p>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-2 mb-4 cursor-pointer hover:bg-[var(--bg-secondary)] w-fit px-2 py-1 rounded transition">
                <span className="font-semibold text-[var(--text-main)]">September 2025</span>
                <ChevronDown size={16} className="text-[var(--text-body)]" />
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center text-sm mb-2">
                {["M", "T", "W", "T", "F", "S", "S"].map(d => (
                  <span key={d} className="text-xs font-medium text-[var(--text-body)]">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 text-sm">
                {calendarDays.map((day, idx) => {
                  let cellClass = "h-8 w-8 flex items-center justify-center rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-secondary)] cursor-pointer transition";
                  
                  if (day === 1) cellClass = "h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--text-on-primary)] font-bold shadow-md"; // Selected
                  else if ([4, 10, 11, 17, 22, 26].includes(day)) cellClass = "h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-500 text-[var(--text-on-primary)] font-medium shadow-sm"; // Active/Green
                  else if (day === 12 || day === 25) cellClass = "h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--text-on-primary)] font-medium opacity-60"; // Blueish

                  return (
                    <div key={idx} className="flex justify-center">
                      <span className={cellClass}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Helper Cards */}
            <div className="space-y-4">
              
              {/* Recurring Timetable */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-secondary)] transition">
                <div>
                  <h4 className="font-bold text-[var(--text-main)] text-sm">Recurring timetable</h4>
                  <p className="text-xs text-[var(--text-body)] mt-0.5">Mon-Fri use default weekly pattern</p>
                </div>
                <RefreshCw size={18} className="text-[var(--text-body)]" />
              </div>

              {/* Exam Days */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-secondary)] transition">
                <div>
                  <h4 className="font-bold text-[var(--text-main)] text-sm">Exam days</h4>
                  <p className="text-xs text-[var(--text-body)] mt-0.5">Override schedule for exams</p>
                </div>
                <CalendarIcon size={18} className="text-[var(--text-body)]" />
              </div>

              {/* Custom Templates */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-secondary)] transition">
                <div>
                  <h4 className="font-bold text-[var(--text-main)] text-sm">Custom templates</h4>
                  <p className="text-xs text-[var(--text-body)] mt-0.5">Save and reuse schedule presets</p>
                </div>
                <Folder size={18} className="text-[var(--text-body)]" />
              </div>

            </div>

          </div>

        </div>
      </main>
    </div>
  );
}