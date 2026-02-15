import React, { useEffect, useState } from "react";
import { ArrowLeft, Home, BookOpen, TrendingUp, User } from "lucide-react";
import StudentNavigation from "../components/StudentNavigation";
import { fetchMySubjects } from "../../api/students";
import { useTranslation } from "react-i18next";

export default function StudentSubjects() {
  const { t, i18n } = useTranslation();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

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
          
          let status = "on_track";
          let statusColor = "bg-emerald-100 text-emerald-700";
          let barColor = "bg-emerald-500";
          let message = "safe_rule";
          let typeColor = "bg-blue-600"; // default

          // Color coded by type loosely
          if (sub.type === "Lab") typeColor = "bg-purple-600";
          if (sub.type === "Elective") typeColor = "bg-indigo-500";

          // Calculate status based on 75% rule
          if (att < 75) {
             status = "at_risk";
             statusColor = "bg-rose-100 text-rose-700";
             barColor = "bg-rose-500";
             
             // How many more classes to attend to reach 75%?
             const needed = Math.ceil(3 * total - 4 * attended);
             message = needed > 0 
               ? { key: "need_more", params: { needed } } 
               : "critical";

          } else if (att < 85) {
             status = "near_threshold";
             statusColor = "bg-amber-100 text-amber-700";
             barColor = "bg-amber-500";
             message = "stay_regular";
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
        setError("load_failed");
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
      <main className="md:ml-64 p-6 md:p-8 pb-24 md:pb-8 animate-in fade-in duration-500 relative">
        {/* Language Switcher */}
        <div className="absolute top-6 right-6 z-10">
            <div className="flex gap-2 items-center bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <button 
                onClick={() => changeLanguage('en')} 
                className={`text-xs ${i18n.language === 'en' ? 'font-bold text-blue-900 border-b-2 border-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                English
              </button>
              <span className="text-gray-300 text-xs">|</span>
              <button 
                onClick={() => changeLanguage('hi')} 
                className={`text-xs ${i18n.language === 'hi' ? 'font-bold text-blue-900 border-b-2 border-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                हिंदी
              </button>
            </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{t('subjects.title')}</h2>
              <p className="text-slate-500 text-sm">{t('subjects.subtitle')}</p>
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-lg">
               {t(`subjects.errors.${error}`)}
            </div>
          )}

          {/* Subjects List */}
          <div className="space-y-6">
            {subjects.length === 0 ? (
               <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-gray-100">
                  {t('subjects.no_subjects')}
               </div>
            ) : (
                subjects.map((sub) => (
              <div key={sub.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">{sub.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${sub.typeColor}`}>
                    {t(`subjects.types.${sub.type}`) || sub.type}
                  </span>
                </div>

                {/* Percentage Row */}
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm text-slate-400 font-medium">{t('subjects.attendance_label')}</span>
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
                      {t('subjects.attended_stats', { attended: sub.attended, total: sub.total, percentage: sub.attendance })}
                    </p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${sub.statusColor}`}>
                      {t(`subjects.status.${sub.status}`)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mt-auto">
                    {typeof sub.message === 'string' ? t(`subjects.status.${sub.message}`) : t(`subjects.status.${sub.message.key}`, sub.message.params)}
                  </span>
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
