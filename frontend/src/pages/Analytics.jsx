import React, { useState, useRef, useEffect } from "react";
import { 
  Download, 
  FileText, 
  ArrowUpRight, 
  Clock, 
  ChevronDown
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useTranslation } from "react-i18next";

// --- Mock Data ---

const TREND_DATA = [
  { name: 'Week 1', present: 85, late: 10, absent: 5 },
  { name: 'Week 2', present: 88, late: 8, absent: 4 },
  { name: 'Week 3', present: 92, late: 5, absent: 3 },
  { name: 'Week 4', present: 89, late: 7, absent: 4 },
  { name: 'Week 5', present: 94, late: 4, absent: 2 },
];

const DISTRIBUTION_DATA = [
  { name: 'Present', value: 72, color: "var(--success)" }, 
  { name: 'Late', value: 9, color: "var(--warning)" },    
  { name: 'Absent', value: 19, color: "var(--danger)" },  
];

const GLOBAL_STATS = {
  attendance: 89,
  avgLate: 7,
  riskCount: 3,
  lateTime: '09:15 AM'
};

const SUBJECT_STATS_MAP = {
  '1': { attendance: 92, avgLate: 4, riskCount: 5, lateTime: '09:05 AM' }, // Math
  '2': { attendance: 85, avgLate: 8, riskCount: 12, lateTime: '09:10 AM' }, // Physics
  '3': { attendance: 78, avgLate: 12, riskCount: 15, lateTime: '09:20 AM' }, // Chemistry
  '4': { attendance: 95, avgLate: 2, riskCount: 2, lateTime: '09:02 AM' }, // CS
  '5': { attendance: 82, avgLate: 6, riskCount: 9, lateTime: '09:08 AM' }, // English
};

const GLOBAL_LEADERBOARD_BEST = [
  { name: 'Grade 9A', score: 91 },
  { name: 'Grade 10A', score: 88 },
  { name: 'Grade 8C', score: 86 },
];

const GLOBAL_LEADERBOARD_RISK = [
  { name: 'Grade 11C', score: 71 },
  { name: 'Grade 12B', score: 68 },
  { name: 'Grade 7D', score: 73 },
];

const STUDENT_LEADERBOARD_BEST = [
  { name: 'Rahul Kumar', score: 98 },
  { name: 'Anjali Singh', score: 96 },
  { name: 'Vikram Patel', score: 95 },
];

const STUDENT_LEADERBOARD_RISK = [
  { name: 'Rohan Gupta', score: 65 },
  { name: 'Priya Sharma', score: 68 },
  { name: 'Amit Verma', score: 70 },
];

const CLASS_BREAKDOWN = [
  { class: 'Grade 10A', students: 32, present: 88, late: 7, absent: 5, color: 'emerald' },
  { class: 'Grade 10B', students: 30, present: 82, late: 9, absent: 9, color: 'amber' },
  { class: 'Grade 9A', students: 28, present: 91, late: 5, absent: 4, color: 'emerald' },
  { class: 'Grade 11C', students: 29, present: 71, late: 11, absent: 18, color: 'red' },
];

// Mock subjects data
const MOCK_SUBJECTS = [
  { id: '1', name: 'Mathematics', code: 'MATH101' },
  { id: '2', name: 'Physics', code: 'PHY201' },
  { id: '3', name: 'Chemistry', code: 'CHEM201' },
  { id: '4', name: 'Computer Science', code: 'CS301' },
  { id: '5', name: 'English Literature', code: 'ENG101' },
];

export default function Analytics() {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState("Month");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("all");
  const dropdownRef = useRef(null);

  const periodOptions = ["Week", "Month", "Semester"];
  const periodLabels = {
    "Week": t('analytics.chart.week'),
    "Month": t('analytics.chart.month'),
    "Semester": t('analytics.chart.semester')
  };

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setIsDropdownOpen(false);
    // TODO: Trigger data fetch when backend is ready
  };
  
  // Logic for dynamic stats based on selection
  const isGlobal = selectedSubject === 'all';
  const stats = isGlobal ? GLOBAL_STATS : (SUBJECT_STATS_MAP[selectedSubject] || GLOBAL_STATS);

  const bestPerforming = isGlobal ? GLOBAL_LEADERBOARD_BEST : STUDENT_LEADERBOARD_BEST;
  const needingSupport = isGlobal ? GLOBAL_LEADERBOARD_RISK : STUDENT_LEADERBOARD_RISK;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">{t('analytics.title')}</h2>
            <p className="text-[var(--text-body)]">{t('analytics.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Subject Selector Dropdown */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-4 py-2 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] font-medium shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              {MOCK_SUBJECTS.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>

            <button className="px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg hover:bg-[var(--primary-hover)] font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
              <Download size={18} />
              {t('analytics.export')}
            </button>
            <button className="px-4 py-2 bg-[var(--action-info-bg)] text-[var(--text-on-primary)] rounded-lg hover:bg-[var(--action-info-hover)] font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
              <FileText size={18} />
              {t('analytics.generate_report')}
            </button>
          </div>
        </div>

        {/* --- TOP STATS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stat 1 */}
          <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
            <p className="text-sm font-medium text-[var(--text-body)] mb-2">
              {isGlobal ? t('analytics.stats.overall') : t('analytics.stats.class_attendance')}
            </p>
            <div className="flex items-end gap-3 mb-1">
              <h3 className="text-4xl font-bold text-[var(--text-main)]">{stats.attendance} <span className="text-lg font-normal text-[var(--text-body)]">%</span></h3>
            </div>
            <div className="flex items-center text-xs font-semibold text-[var(--success)]">
              <ArrowUpRight size={14} className="mr-1" />
              {t('analytics.stats.increase')}
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
            <p className="text-sm font-medium text-[var(--text-body)] mb-2">{t('analytics.stats.avg_late')}</p>
            <div className="flex items-end gap-3 mb-1">
              <h3 className="text-4xl font-bold text-[var(--text-main)]">{stats.avgLate}</h3>
              <span className="text-sm text-[var(--text-body)] mb-2">{t('analytics.stats.per_week')}</span>
            </div>
            <div className="flex items-center text-xs font-medium text-[var(--text-body)] opacity-70">
              <Clock size={14} className="mr-1" />
              {t('analytics.stats.avg_time', {time: stats.lateTime})}
            </div>
          </div>

          {/* Stat 3 */}
          <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
            <p className="text-sm font-medium text-[var(--text-body)] mb-2">
              {isGlobal ? t('analytics.stats.at_risk') : t('analytics.stats.students_at_risk')}
            </p>
            <div className="flex items-end gap-3 mb-1">
              <h3 className="text-4xl font-bold text-[var(--text-main)]">{stats.riskCount}</h3>
              <span className="text-sm text-[var(--text-body)] mb-2">
                {isGlobal ? t('analytics.stats.sections') : t('analytics.stats.students_count')}
              </span>
            </div>
            <div className="flex items-center text-xs font-semibold text-[var(--success)]">
               <span className="text-[var(--text-body)] mr-1">{t('analytics.stats.more_than_last_month')}</span>
            </div>
          </div>
        </div>

        {/* --- MIDDLE SECTION: CHARTS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Trend Chart (Left - 2 Cols) */}
          <div className="lg:col-span-2 bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg text-[var(--text-main)]">{t('analytics.chart.trend_title')}</h3>
                <p className="text-sm text-[var(--text-body)]">{t('analytics.chart.trend_desc')}</p>
              </div>
              {/* --- DROPDOWN SECTION (Fixed) --- */}
              <div className="flex gap-2 items-center">
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="text-sm text-[var(--text-body)] flex items-center gap-1 hover:bg-[var(--bg-secondary)] px-3 py-1.5 rounded border border-[var(--border-color)] transition"
                  >
                    {periodLabels[selectedPeriod]} <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}/>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg z-10 w-32 overflow-hidden">
                      {periodOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => handlePeriodChange(option)}
                          className={`w-full text-left px-4 py-2 text-sm transition ${
                            selectedPeriod === option
                              ? 'bg-[var(--primary)] text-[var(--text-on-primary)] font-medium'
                              : 'text-[var(--text-main)] hover:bg-[var(--bg-secondary)]'
                          }`}
                        >
                          {periodLabels[option]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedPeriod("Month")} 
                  className="text-sm text-[var(--primary)] font-medium hover:underline"
                >
                  {t('analytics.chart.reset')}
                </button>
              </div>
              {/* --- END DROPDOWN SECTION --- */}
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TREND_DATA}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-body)', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-body)', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: "var(--bg-card)", color: "var(--text-main)",}}
                  />
                  <Area type="monotone" dataKey="present" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Side Panel (Right - 1 Col) */}
          <div className="space-y-6">
            {/* Donut Chart */}
            <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
              <h3 className="font-bold text-[var(--text-main)] mb-1">{t('analytics.donut.title')}</h3>
              <p className="text-xs text-[var(--text-body)] mb-4">{t('analytics.donut.subtitle')}</p>
              <div className="flex items-center justify-between">
                <div className="h-32 w-32 relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-[var(--text-main)]">89%</span>
                    <span className="text-[10px] text-[var(--text-body)] opacity-80">{t('analytics.donut.avg')}</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={DISTRIBUTION_DATA}
                        innerRadius={45}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {DISTRIBUTION_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {DISTRIBUTION_DATA.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs w-28">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></span>
                          <span className="text-[var(--text-body)] opacity-80">{t(`trends.${item.name.toLowerCase()}`, item.name)}</span>
                        </div>
                        <span className="font-bold text-[var(--text-main)]">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Best Performing List */}
            <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm" data-testid="best-performing-list">
              <h3 className="font-semibold text-sm text-[var(--text-main)] mb-3">{t('analytics.lists.best')}</h3>
              <div className="space-y-3">
                {bestPerforming.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold">{i+1}</div>
                        <span className="text-[var(--text-body)]">{c.name}</span>
                      </div>
                      <span className="font-bold text-[var(--text-main)]">{c.score}%</span>
                  </div>
                ))}
              </div>
            </div>
             {/* Needs Support List */}
             <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm" data-testid="needing-support-list">
              <h3 className="font-semibold text-sm text-[var(--text-main)] mb-3">{t('analytics.lists.needs_support')}</h3>
              <div className="space-y-3">
                {needingSupport.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold">{i+1}</div>
                        <span className="text-[var(--text-body)]">{c.name}</span>
                      </div>
                      <span className="font-bold text-[var(--text-main)]">{c.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* --- BOTTOM SECTION: CLASS BREAKDOWN --- */}
        <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
          <h3 className="font-bold text-lg text-[var(--text-main)] mb-1">{t('analytics.breakdown.title')}</h3>
          <p className="text-sm text-[var(--text-body)] mb-6">{t('analytics.breakdown.subtitle')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CLASS_BREAKDOWN.map((cls, idx) => (
              <div key={idx} className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-[var(--text-main)]">{cls.class}</h4>
                  <span className="text-xs text-[var(--text-body)] opacity-80">{t('analytics.breakdown.students', {count: cls.students})}</span>
                </div>
                {/* Progress Bar Container */}
                <div className="h-4 w-full bg-[var(--bg-card)] rounded-full flex overflow-hidden shadow-inner mb-2">
                  <div 
                    className={`h-full ${cls.color === 'red' ? 'bg-[var(--danger)]' : cls.color === 'amber' ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'}`} 
                    style={{width: `${cls.present}%`}}
                  ></div>
                  <div className="h-full bg-[var(--warning)]/40" style={{width: `${cls.late}%`}}></div>
                  <div className="h-full bg-[var(--danger)]/40" style={{width: `${cls.absent}%`}}></div>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className={`px-2 py-0.5 rounded text-[var(--text-on-primary)] font-bold ${cls.color === 'red' ? 'bg-[var(--danger)]' : cls.color === 'amber' ? 'bg-[var(--warning)]' : 'bg-[var(--success)]'}`}>
                      {t('analytics.breakdown.present_val', {val: cls.present})}
                    </span>
                    <span className="text-[var(--text-body)] opacity-80">
                      {t('analytics.breakdown.late_absent', {late: cls.late, absent: cls.absent})}
                    </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
