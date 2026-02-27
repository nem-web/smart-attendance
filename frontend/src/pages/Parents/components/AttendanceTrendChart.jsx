import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts';

const AttendanceTrendChart = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-full">
      <div className="mb-6">
        <h3 className="font-bold text-slate-900">Attendance trend</h3>
        <p className="text-xs text-slate-500">Last 6 months</p>
      </div>

      <div className="h-64 md:h-80 w-full pl-0 md:-ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#6B7280' }} 
              dy={10}
            />
            {/* Hide YAxis on mobile if needed, or customize */}
            <YAxis 
               hide={true} 
               domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            
            {/* Required 75% Line */}
            <ReferenceLine y={75} stroke="#F59E0B" strokeDasharray="3 3" label={{ position: 'right', value: '', fill: '#F59E0B', fontSize: 10 }} />

            <Area 
              type="monotone" 
              dataKey="attendance" 
              stroke="#6366f1" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPv)" 
              activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex justify-between items-center text-xs mt-4 px-2">
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
            <span className="text-slate-600">Overall attendance</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-slate-600">Required 75%</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTrendChart;
