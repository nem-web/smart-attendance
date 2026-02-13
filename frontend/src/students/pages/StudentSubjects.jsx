import React, { useEffect, useState } from "react";
import { ArrowLeft, Home, BookOpen, TrendingUp, User } from "lucide-react";
import StudentNavigation from "../components/StudentNavigation";
import { fetchMySubjects } from "../../api/students";

export default function StudentSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchMySubjects();
        
        // Transform data to match UI
        const transformed = data.map(sub => {
          // Standard Logic: 75% threshold
          const att = sub.attendance || 0;
          const total = sub.total || 0;
          const attended = sub.attended || 0;
          
          let status = "On track";
          let statusColor = "bg-emerald-100 text-emerald-700";
          let barColor = "bg-emerald-500";
          let message = "Safe above 75% rule";
          let typeColor = "bg-blue-600"; // default

          // Color coded by type loosely
          if (sub.type === "Lab") typeColor = "bg-purple-600";
          if (sub.type === "Elective") typeColor = "bg-indigo-500";

          // Calculate status based on 75% rule
          if (att < 75) {
             status = "At risk";
             statusColor = "bg-rose-100 text-rose-700";
             barColor = "bg-rose-500";
             
             // How many more classes to attend to reach 75%?
             // (attended + x) / (total + x) >= 0.75
             // attended + x >= 0.75*total + 0.75x
             // 0.25x >= 0.75*total - attended
             // x >= 3*total - 4*attended
             const needed = Math.ceil(3 * total - 4 * attended);
             message = needed > 0 
               ? `Need ${needed} more classes to reach 75%` 
               : "Attendance is critical";

          } else if (att < 85) {
             status = "Near threshold";
             statusColor = "bg-amber-100 text-amber-700";
             barColor = "bg-amber-500";
             message = "Stay regular to keep 75%+";
          }

          return {
            ...sub,
            status,
            statusColor,
            barColor,
            message,
            typeColor
          };
        });

        setSubjects(transformed);
      } catch (err) {
        console.error("Failed to load subjects", err);
        setError("Failed to load subjects");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
     return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* 2. Sidebar (Desktop) */}
      <StudentNavigation activePage="subjects" />

      {/* 3. Main Content */}
      <main className="md:ml-64 p-6 md:p-8 pb-24 md:pb-8 animate-in fade-in duration-500">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Subjects</h2>
              <p className="text-slate-500 text-sm">Attendance overview by subject</p>
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-lg">
               {error}
            </div>
          )}

          {/* Subjects List */}
          <div className="space-y-6">
            {subjects.length === 0 ? (
               <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-gray-100">
                  No subjects enrolled yet.
               </div>
            ) : (
                subjects.map((sub) => (
              <div key={sub.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">{sub.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${sub.typeColor}`}>
                    {sub.type}
                  </span>
                </div>

                {/* Percentage Row */}
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm text-slate-400 font-medium">Attendance</span>
                  <span className="text-lg font-bold text-slate-800">{sub.attendance}%</span>
                </div>

                {/* Progress Bar */}
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${sub.barColor}`} 
                    style={{ width: `${sub.attendance}%` }}
                  ></div>
                </div>

                {/* Stats Row */}
                <div className="flex justify-between items-start mt-4">
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-slate-400">
                      Attended: {sub.attended}/{sub.total} classes ({sub.attendance}%)
                    </p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${sub.statusColor}`}>
                      {sub.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mt-auto">{sub.message}</span>
                </div>

              </div>
            ))
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
