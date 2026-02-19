import React, { useEffect, useState } from "react";
import { ArrowLeft, Home, BookOpen, TrendingUp, User, Plus, X, Search } from "lucide-react";
import StudentNavigation from "../components/StudentNavigation";
import { fetchMySubjects, fetchAvailableSubjects, addSubjectToStudent } from "../../api/students";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

export default function StudentSubjects() {
  const { t, i18n } = useTranslation();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const loadData = async () => {
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
        let statusColor = "bg-[var(--success)]/15 text-[var(--success)]";
        let barColor = "bg-[var(--success)]";
        let message = "safe_rule";
        let typeColor = "bg-[var(--action-info-bg)]"; // default

        // Color coded by type loosely
        if (sub.type === "Lab") typeColor = "bg-[var(--primary-hover)]";
        if (sub.type === "Elective") typeColor = "bg-[var(--primary)]";

        // Calculate status based on 75% rule
        if (att < 75) {
           status = "at_risk";
           statusColor = "bg-[var(--danger)]/15 text-[var(--danger)]";
           barColor = "bg-[var(--danger)]";
           
           // How many more classes to attend to reach 75%?
           const needed = Math.ceil(3 * total - 4 * attended);
           message = needed > 0 
             ? { key: "need_more", params: { needed } } 
             : "critical";

        } else if (att < 85) {
           status = "near_threshold";
           statusColor = "bg-[var(--warning)]/15 text-[var(--warning)]";
           barColor = "bg-[var(--warning)]";
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEnroll = async () => {
    setShowEnrollModal(true);
    setLoadingAvailable(true);
    try {
      const data = await fetchAvailableSubjects();
      setAvailableSubjects(data);
    } catch {
      toast.error(t("subjects.enroll_fetch_error"));
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleEnroll = async (subjectId) => {
    try {
      await addSubjectToStudent(subjectId);
      toast.success(t("subjects.enroll_success"));
      setShowEnrollModal(false);
      loadData(); // Refresh list
    } catch {
      toast.error(t("subjects.enroll_error"));
    }
  };

  const filteredAvailable = availableSubjects.filter(sub => 
    sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.code.toLowerCase().includes(searchQuery.toLowerCase())
  );


  if (loading) {
     return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* 2. Sidebar (Desktop) */}
      <StudentNavigation activePage="subjects" />

      {/* 3. Main Content */}
      <main className="md:ml-64 p-6 md:p-8 pb-24 md:pb-8 animate-in fade-in duration-500 relative">
        {/* Language Switcher */}
        <div className="absolute top-6 right-6 z-10">
            <div className="flex gap-2 items-center bg-[var(--bg-card)] px-3 py-1.5 rounded-full border border-[var(--border-color)] shadow-sm">
              <button 
                onClick={() => changeLanguage('en')} 
                className={`text-xs ${i18n.language === 'en' ? 'font-bold text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-body)]/70 hover:text-[var(--text-body)]'}`}
              >
                English
              </button>
              <span className="text-[var(--text-body)]/60 text-xs">|</span>
              <button 
                onClick={() => changeLanguage('hi')} 
                className={`text-xs ${i18n.language === 'hi' ? 'font-bold text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-body)]/70 hover:text-[var(--text-body)]'}`}
              >
                हिंदी
              </button>
            </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-colors text-[var(--text-body)]/80">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-main)]">{t('subjects.title')}</h2>
                <p className="text-[var(--text-body)]/80 text-sm">{t('subjects.subtitle')}</p>
              </div>
            </div>
            <button 
              onClick={handleOpenEnroll}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
            >
              <Plus size={18} />
              <span>Enroll Subject</span>
            </button>
          </div>
          
          {error && (
            <div className="p-4 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg">
               {t(`subjects.errors.${error}`)}
            </div>
          )}

          {/* Subjects List */}
          <div className="space-y-6">
            {subjects.length === 0 ? (
               <div className="p-8 text-center text-[var(--text-body)]/80 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
                  {t('subjects.no_subjects')}
               </div>
            ) : (
                subjects.map((sub) => (
              <div key={sub.id} className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow">
                
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-[var(--text-main)]">{sub.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-[var(--text-on-primary)] ${sub.typeColor}`}>
                    {t(`subjects.types.${sub.type}`) || sub.type}
                  </span>
                </div>

                {/* Percentage Row */}
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm text-[var(--text-body)]/80 font-medium">{t('subjects.attendance_label')}</span>
                  <span className="text-lg font-bold text-[var(--text-main)]">{sub.attendance}%</span>
                </div>

                {/* Progress Bar */}
                <div className="h-3 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${sub.barColor}`} 
                    style={{ width: `${sub.attendance}%` }}
                  ></div>
                </div>

                {/* Stats Row */}
                <div className="flex justify-between items-start mt-4">
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-[var(--text-body)]/80">
                      {t('subjects.attended_stats', { attended: sub.attended, total: sub.total, percentage: sub.attendance })}
                    </p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${sub.statusColor}`}>
                      {t(`subjects.status.${sub.status}`)}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-body)]/80 mt-auto">
                    {typeof sub.message === 'string' ? t(`subjects.status.${sub.message}`) : t(`subjects.status.${sub.message.key}`, sub.message.params)}
                  </span>
                </div>

              </div>
            ))
            )}
          </div>

        </div>
      </main>

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-2xl shadow-xl border border-[var(--border-color)] overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-bold text-[var(--text-main)]">Enroll in Subjects</h3>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="p-2 hover:bg-[var(--bg-secondary)] text-[var(--text-body)] rounded-full transition-colors"
                disabled={loadingAvailable}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-[var(--border-color)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)]/50" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--text-main)]"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {loadingAvailable ? (
                <div className="text-center py-8 text-[var(--text-body)]/60">Loading...</div>
              ) : filteredAvailable.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-body)]/60">No subjects found to enroll in</div>
              ) : (
                filteredAvailable.map((sub) => (
                  <div key={sub._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-secondary)] border border-transparent hover:border-[var(--border-color)] transition-colors group">
                    <div>
                      <h4 className="font-semibold text-[var(--text-main)]">{sub.name}</h4>
                      <p className="text-xs text-[var(--text-body)]/70">{sub.code}</p>
                    </div>
                    <button
                      onClick={() => handleEnroll(sub._id)}
                      className="px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Enroll
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
