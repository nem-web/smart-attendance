import React from "react";
import { 
  Download, 
  FileText, 
  ArrowUpRight, 
  AlertTriangle, 
  Clock, 
  Calendar,
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
  Cell,
  Legend
} from "recharts";

// --- Mock Data ---

const TREND_DATA = [
  { name: 'Week 1', present: 85, late: 10, absent: 5 },
  { name: 'Week 2', present: 88, late: 8, absent: 4 },
  { name: 'Week 3', present: 92, late: 5, absent: 3 },
  { name: 'Week 4', present: 89, late: 7, absent: 4 },
  { name: 'Week 5', present: 94, late: 4, absent: 2 },
];

const DISTRIBUTION_DATA = [
  { name: 'Present', value: 72, color: '#10B981' }, // emerald-500
  { name: 'Late', value: 9, color: '#F59E0B' },    // amber-500
  { name: 'Absent', value: 19, color: '#EF4444' },  // red-500
];

const CLASS_PERFORMANCE = [
  { name: 'Grade 9A', score: 91 },
  { name: 'Grade 10A', score: 88 },
  { name: 'Grade 8C', score: 86 },
];

const CLASS_RISK = [
  { name: 'Grade 11C', score: 71 },
  { name: 'Grade 12B', score: 68 },
  { name: 'Grade 7D', score: 73 },
];

const CLASS_BREAKDOWN = [
  { class: 'Grade 10A', students: 32, present: 88, late: 7, absent: 5, color: 'emerald' },
  { class: 'Grade 10B', students: 30, present: 82, late: 9, absent: 9, color: 'amber' },
  { class: 'Grade 9A', students: 28, present: 91, late: 5, absent: 4, color: 'emerald' },
  { class: 'Grade 11C', students: 29, present: 71, late: 11, absent: 18, color: 'red' },
];

export default function Analytics() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)]">Analytics</h2>
          <p className="text-[var(--text-body)]">Track attendance trends over time and compare classes</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
            <Download size={18} />
            Export analytics
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 shadow-sm transition cursor-pointer">
            <FileText size={18} />
            Generate report
          </button>
        </div>
      </div>

      {/* --- TOP STATS ROW --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Stat 1 */}
        <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-[var(--text-body)] mb-2">Overall attendance this month</p>
          <div className="flex items-end gap-3 mb-1">
            <h3 className="text-4xl font-bold text-[var(--text-main)]">89 <span className="text-lg font-normal text-gray-500">%</span></h3>
          </div>
          <div className="flex items-center text-xs font-semibold text-emerald-600">
            <ArrowUpRight size={14} className="mr-1" />
            +3% vs last month
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-[var(--text-body)] mb-2">Average late arrivals</p>
          <div className="flex items-end gap-3 mb-1">
            <h3 className="text-4xl font-bold text-[var(--text-main)]">7</h3>
            <span className="text-sm text-gray-500 mb-2">per week</span>
          </div>
          <div className="flex items-center text-xs font-medium text-gray-400">
            <Clock size={14} className="mr-1" />
            Average time: 09:15 AM
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-[var(--text-body)] mb-2">Classes at risk (&lt; 75%)</p>
          <div className="flex items-end gap-3 mb-1">
            <h3 className="text-4xl font-bold text-[var(--text-main)]">3</h3>
            <span className="text-sm text-gray-500 mb-2">sections</span>
          </div>
          <div className="flex items-center text-xs font-semibold text-emerald-600">
             <span className="text-gray-500 mr-1">1 more than last month</span>
          </div>
        </div>
      </div>

      {/* --- MIDDLE SECTION: CHARTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Trend Chart (Left - 2 Cols) */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-lg text-[var(--text-main)]">Attendance trend</h3>
              <p className="text-sm text-[var(--text-body)]">Weekly attendance for the selected range</p>
            </div>
            <div className="flex gap-2">
               <button className="text-sm text-gray-500 flex items-center gap-1 hover:bg-gray-50 px-2 py-1 rounded">
                 This month <ChevronDown size={14}/>
               </button>
               <button className="text-sm text-[var(--primary)] font-medium hover:underline">Reset</button>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND_DATA}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                />
                <Area type="monotone" dataKey="present" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Panel (Right - 1 Col) */}
        <div className="space-y-6">
          
          {/* Donut Chart */}
          <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-[var(--text-main)] mb-1">Present / Late / Absent</h3>
            <p className="text-xs text-[var(--text-body)] mb-4">Distribution for the selected period</p>
            
            <div className="flex items-center justify-between">
              <div className="h-32 w-32 relative">
                {/* Centered Text for Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-[var(--text-main)]">89%</span>
                  <span className="text-[10px] text-gray-500">avg</span>
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

              {/* Custom Legend */}
              <div className="space-y-2">
                {DISTRIBUTION_DATA.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs w-28">
                     <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></span>
                       <span className="text-gray-600">{item.name}</span>
                     </div>
                     <span className="font-bold text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Best Performing List */}
          <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-sm text-[var(--text-main)] mb-3">Best performing classes</h3>
            <div className="space-y-3">
              {CLASS_PERFORMANCE.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-3">
                     <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">{i+1}</div>
                     <span className="text-gray-700">{c.name}</span>
                   </div>
                   <span className="font-bold text-gray-900">{c.score}%</span>
                </div>
              ))}
            </div>
          </div>
          
           {/* Needs Support List */}
           <div className="bg-[var(--bg-card)] p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-sm text-[var(--text-main)] mb-3">Classes needing support</h3>
            <div className="space-y-3">
              {CLASS_RISK.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-3">
                     <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">{i+1}</div>
                     <span className="text-gray-700">{c.name}</span>
                   </div>
                   <span className="font-bold text-gray-900">{c.score}%</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* --- BOTTOM SECTION: CLASS BREAKDOWN --- */}
      <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-lg text-[var(--text-main)] mb-1">Class-wise breakdown</h3>
        <p className="text-sm text-[var(--text-body)] mb-6">Percentage of present, late, and absent students per class</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CLASS_BREAKDOWN.map((cls, idx) => (
            <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-[var(--text-main)]">{cls.class}</h4>
                <span className="text-xs text-gray-500">{cls.students} students</span>
              </div>
              
              {/* Progress Bar Container */}
              <div className="h-4 w-full bg-white rounded-full flex overflow-hidden shadow-inner mb-2">
                {/* Present */}
                <div 
                  className={`h-full ${cls.color === 'red' ? 'bg-rose-500' : cls.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                  style={{width: `${cls.present}%`}}
                ></div>
                {/* Late */}
                <div className="h-full bg-amber-300" style={{width: `${cls.late}%`}}></div>
                {/* Absent */}
                <div className="h-full bg-rose-300" style={{width: `${cls.absent}%`}}></div>
              </div>

              <div className="flex justify-between items-center text-xs">
                 <span className={`px-2 py-0.5 rounded text-white font-bold ${cls.color === 'red' ? 'bg-rose-500' : cls.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                   {cls.present}% present
                 </span>
                 <span className="text-gray-500">
                   {cls.late}% late · {cls.absent}% absent
                 </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}