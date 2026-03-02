import React, { useState, useRef, useEffect } from "react";
import { 
  Download, 
  FileText, 
  ArrowUpRight, 
  Clock, 
  ChevronDown,
  Loader2
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
import { fetchSubjectAnalytics, fetchGlobalStats, fetchTopPerformers, fetchClassRisk, fetchAttendanceTrend } from "../api/analytics";
import { fetchMySubjects } from "../api/teacher";
import Spinner from "../components/Spinner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";

const GLOBAL_STATS = {
  attendance: 0,
  avgLate: 0,
  riskCount: 0,
  lateTime: 'N/A'
};

const COLORS = {
  present: "var(--success)",
  late: "var(--warning)",
  absent: "var(--danger)"
};

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

  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState(GLOBAL_STATS);
  const [bestPerforming, setBestPerforming] = useState([]);
  const [needingSupport, setNeedingSupport] = useState([]);
  
  // Chart Data State
  const [trendData, setTrendData] = useState([]); 
  const [distributionData, setDistributionData] = useState([]);
  const [classBreakdown, setClassBreakdown] = useState([]);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const analyticsRef = useRef(null);

  const isSubjectSelected = selectedSubject !== "all";

  const PERFORMANCE_THRESHOLD = 75;

  const filteredBestPerforming = bestPerforming
    .filter(item => Number(item.score) >= PERFORMANCE_THRESHOLD)
    .slice(0, 4);

  const filteredNeedingSupport = needingSupport
    .filter(item => Number(item.score) < PERFORMANCE_THRESHOLD)
    .slice(0, 4);

  const bestTitle = isSubjectSelected
    ? t('analytics.lists.best_students', { defaultValue: t('analytics.lists.best') })
    : t('analytics.lists.best');
  const supportTitle = isSubjectSelected
    ? t('analytics.lists.needs_support_students', { defaultValue: t('analytics.lists.needs_support') })
    : t('analytics.lists.needs_support');

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

  // Fetch subjects on mount
  useEffect(() => {
    fetchMySubjects()
      .then(data => {
        // Map _id to id to match expectation if needed, or just use _id
        const mapped = data.map(s => ({ ...s, id: s._id }));
        setSubjects(mapped);
      })
      .catch(console.error);
  }, []);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setIsDropdownOpen(false);
    // TODO: Trigger data fetch when backend is ready
  };
  
  // Logic for dynamic stats based on selection
  const isGlobal = selectedSubject === 'all';

  useEffect(() => {
    let isMounted = true;

    const getPeriodDates = () => {
        const end = new Date();
        const start = new Date();
        if (selectedPeriod === 'Week') start.setDate(end.getDate() - 7);
        else if (selectedPeriod === 'Month') start.setMonth(end.getMonth() - 1);
        else if (selectedPeriod === 'Semester') start.setMonth(end.getMonth() - 6);
        return { 
            start: start.toISOString().split('T')[0], 
            end: end.toISOString().split('T')[0] 
        };
    };

    const loadAnalytics = async () => {
      setLoading(true);
      const { start, end } = getPeriodDates();

      try {
        // 1. Fetch Trend Data
        const trendParams = {
            dateFrom: start,
            dateTo: end,
            classId: isGlobal ? undefined : selectedSubject
        };
        const trendRes = await fetchAttendanceTrend(trendParams).catch(() => ({ data: [] }));
        
        if (isMounted) {
             setTrendData((trendRes.data || []).map(item => ({
                 name: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                 present: item.present,
                 absent: item.absent,
                 late: item.late
             })));
        }

        // 2. Fetch Stats & Dist
        if (isGlobal) {
            // Fetch Global Stats
            const [globalStats, topPerformersRes, riskRes] = await Promise.all([
                fetchGlobalStats(),
                fetchTopPerformers(),
                fetchClassRisk()
            ]);

            if (isMounted) {
                setStats({
                    attendance: globalStats.attendance || 0,
                    avgLate: globalStats.avgLate || 0, 
                    riskCount: globalStats.riskCount || 0,
                    lateTime: globalStats.lateTime || "N/A"
                });

                setDistributionData([
                    { name: 'Present', value: globalStats.totalPresent || 0, color: COLORS.present }, 
                    { name: 'Late', value: globalStats.totalLate || 0, color: COLORS.late },    
                    { name: 'Absent', value: globalStats.totalAbsent || 0, color: COLORS.absent },  
                ]);

                setBestPerforming(topPerformersRes.data || []);
                
                const riskList = (riskRes.data || []).map(item => ({
                    name: item.className,
                    score: item.attendancePercentage
                }));
                // Limit to top 5 risks
                setNeedingSupport(riskList.slice(0, 5)); 

                // Process Class Breakdown (Global only)
                const breakdown = (globalStats.topSubjects || []).map(s => {
                    const total = (s.totalPresent || 0) + (s.totalAbsent || 0) + (s.totalLate || 0);
                    const present = total > 0 ? Math.round((s.totalPresent / total) * 100) : 0;
                    const late = total > 0 ? Math.round((s.totalLate / total) * 100) : 0;
                    const absent = total > 0 ? Math.round((s.totalAbsent / total) * 100) : 0;
                    
                    let color = "var(--success)";
                    if (present < 75) color = "var(--danger)";
                    else if (present < 85) color = "var(--warning)";

                    return {
                        class: s.subjectName,
                        students: total, // Using total records as proxy for activity, or just total
                        present,
                        late,
                        absent,
                        color
                    };
                });
                setClassBreakdown(breakdown.slice(0, 4)); // Show top 4
            }
        } else {
            const data = await fetchSubjectAnalytics(selectedSubject);
            if (isMounted) {
              setStats({
                attendance: data.attendance || 0,
                avgLate: data.avgLate || 0,
                riskCount: data.riskCount || 0,
                lateTime: data.lateTime || "N/A"
              });
              
              setDistributionData([
                  { name: 'Present', value: data.totalPresent || 0, color: COLORS.present }, 
                  { name: 'Late', value: data.totalLate || 0, color: COLORS.late },    
                  { name: 'Absent', value: data.totalAbsent || 0, color: COLORS.absent },  
              ]);

              setBestPerforming(data.bestPerforming || []);
              setNeedingSupport(data.needsSupport || []);
              setClassBreakdown([]); // Hide or clear for subject view
            }
        }
      } catch (err) {
          if (isMounted) {
               console.error("Failed to fetch analytics:", err);
          }
      } finally {
          if(isMounted) setLoading(false);
      }
    };

    loadAnalytics();

    return () => { isMounted = false; };
  }, [selectedSubject, isGlobal, selectedPeriod]);

  const handleExportAnalytics = () => {
    setExporting(true);
    const toastId = toast.loading(t('common.exporting', 'Exporting PDF...'));

    try {
      const doc = new jsPDF();
      const subjectName = subjects.find(s => s.id === selectedSubject)?.name || 'All Subjects';
      
      // -- Title Section --
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text(t('analytics.report_title', 'Attendance Report'), 14, 22);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`${subjectName} - ${selectedPeriod}`, 14, 32);
      doc.text(`${t('common.generated', 'Generated')}: ${new Date().toLocaleString()}`, 14, 40);

      let finalY = 50;

      // -- Key Stats --
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(t('analytics.stats.overview', 'Overview'), 14, finalY);
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [[t('analytics.metric', 'Metric'), t('analytics.value', 'Value')]],
        body: [
          [t('analytics.stats.attendance', 'Attendance Rate'), `${stats.attendance}%`],
          [t('analytics.stats.avg_late', 'Average Late Count'), stats.avgLate],
          [t('analytics.stats.risk_count', 'At Risk Count'), stats.riskCount],
          [t('analytics.stats.avg_late_time', 'Avg Late Time'), stats.lateTime]
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });
      
      finalY = doc.lastAutoTable.finalY + 15;

      // -- Best Performing --
      if (bestPerforming.length > 0) {
        doc.text(t('analytics.lists.best', 'Best Performing'), 14, finalY);
        autoTable(doc, {
          startY: finalY + 5,
          head: [[t('common.rank', 'Rank'), t('common.name', 'Name'), t('common.score', 'Score')]],
          body: bestPerforming.map((item, i) => [i + 1, item.name, `${item.score || 0}%`]),
          theme: 'striped',
          headStyles: { fillColor: [46, 204, 113] }
        });
        finalY = doc.lastAutoTable.finalY + 15;
      }

      // -- Needing Support --
      if (needingSupport.length > 0) {
        // Check if we need a new page
        if (finalY > 250) {
          doc.addPage();
          finalY = 20;
        }
        
        doc.text(t('analytics.lists.needs_support', 'Needing Support'), 14, finalY);
        autoTable(doc, {
          startY: finalY + 5,
          head: [[t('common.rank', 'Rank'), t('common.name', 'Name'), t('common.score', 'Score')]],
          body: needingSupport.map((item, i) => [i + 1, item.name, `${item.score || 0}%`]),
          theme: 'striped',
          headStyles: { fillColor: [231, 76, 60] }
        });
        finalY = doc.lastAutoTable.finalY + 15;
      }

      // -- Class Breakdown (Global Only) --
      if (isGlobal && classBreakdown.length > 0) {
         if (finalY > 250) {
          doc.addPage();
          finalY = 20;
        }

        doc.text(t('analytics.breakdown.title', 'Class Breakdown'), 14, finalY);
        autoTable(doc, {
          startY: finalY + 5,
          head: [[t('common.class', 'Class'), t('common.students', 'Total Students'), t('common.present', 'Present %'), t('common.late', 'Late %'), t('common.absent', 'Absent %')]],
          body: classBreakdown.map(item => [
            item.class, 
            item.students, 
            `${item.present}%`, 
            `${item.late}%`, 
            `${item.absent}%`
          ]),
          theme: 'grid',
          headStyles: { fillColor: [52, 73, 94] }
        });
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const safeSubjectName = subjectName.replace(/[^a-z0-9]/gi, '_');
      doc.save(`analytics_${safeSubjectName}_${dateStr}.pdf`);
      
      toast.success(t('common.export_success', 'Export successful!'), { id: toastId });
    } catch (error) {
       console.error("Export failed:", error);
      toast.error(t('common.export_failed', 'Export failed'), { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 md:p-8">
      <div 
        ref={analyticsRef} 
        className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 will-change-transform"
      >
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" data-html2canvas-ignore="true">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-main)]">{t('analytics.title')}</h2>
            <p className="text-[var(--text-body)]">{t('analytics.subtitle')}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Subject Selector Dropdown */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] font-medium shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>

            <div className="flex gap-2 sm:gap-3" data-html2canvas-ignore="true">
              <button 
                onClick={handleExportAnalytics}
                disabled={exporting}
                className="flex-1 sm:flex-none px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg hover:bg-[var(--primary-hover)] font-medium flex items-center justify-center gap-2 shadow-sm transition cursor-pointer text-sm sm:text-base disabled:opacity-50 disabled:cursor-wait"
              >
                {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                <span className="hidden xs:inline">{exporting ? t('common.exporting', 'Exporting...') : t('analytics.export')}</span>
              </button>
              <button className="flex-1 sm:flex-none px-4 py-2 bg-[var(--action-info-bg)] text-[var(--text-on-primary)] rounded-lg hover:bg-[var(--action-info-hover)] font-medium flex items-center justify-center gap-2 shadow-sm transition cursor-pointer text-sm sm:text-base">
                <FileText size={18} />
                <span className="hidden xs:inline">{t('analytics.generate_report')}</span>
              </button>
            </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Trend Chart (Left - 2 Cols) */}
          <div className="lg:col-span-2 bg-[var(--bg-card)] p-4 sm:p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
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
            <div className="h-[250px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
          <div className="space-y-4 sm:space-y-6">
            {/* Donut Chart */}
            <div className="bg-[var(--bg-card)] p-4 sm:p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
              <h3 className="font-bold text-[var(--text-main)] mb-1">{t('analytics.donut.title')}</h3>
              <p className="text-xs text-[var(--text-body)] mb-4">{t('analytics.donut.subtitle')}</p>
              <div className="flex flex-col xs:flex-row items-center justify-between gap-4">
                <div className="h-32 w-32 relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-[var(--text-main)]">{stats.attendance}%</span>
                    <span className="text-[10px] text-[var(--text-body)] opacity-80">{t('analytics.donut.avg')}</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        innerRadius={45}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {distributionData.map((item, i) => {
                    const total = distributionData.reduce((a, b) => a + b.value, 0);
                    const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                    <div key={i} className="flex items-center justify-between text-xs w-28">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></span>
                          <span className="text-[var(--text-body)] opacity-80">{t(`trends.${item.name.toLowerCase()}`, item.name)}</span>
                        </div>
                        <span className="font-bold text-[var(--text-main)]">{percent}%</span>
                    </div>
                  )})}
                </div>
              </div>
            </div>
            {/* Best Performing List */}
            <div className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-xl border border-[var(--border-color)] shadow-sm" data-testid="best-performing-list">
              <h3 className="font-semibold text-sm text-[var(--text-main)] mb-3">{bestTitle}</h3>
              <div className="space-y-3">
                {filteredBestPerforming.length > 0 ? (
                  filteredBestPerforming.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold">{i+1}</div>
                          <span className="text-[var(--text-body)]">{c.name}</span>
                        </div>
                        <span className="font-bold text-[var(--text-main)]">{c.score}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-body)] opacity-60">{t('analytics.lists.no_top_performers')}</p>
                )}
              </div>
            </div>
             {/* Needs Support List */}
             <div className="bg-[var(--bg-card)] p-4 sm:p-5 rounded-xl border border-[var(--border-color)] shadow-sm" data-testid="needing-support-list">
              <h3 className="font-semibold text-sm text-[var(--text-main)] mb-3">{supportTitle}</h3>
              <div className="space-y-3">
                {filteredNeedingSupport.length > 0 ? (
                  filteredNeedingSupport.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold">{i+1}</div>
                          <span className="text-[var(--text-body)]">{c.name}</span>
                        </div>
                        <span className="font-bold text-[var(--text-main)]">{c.score}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-body)] opacity-60">
                    {t(selectedSubject === "all" ? "analytics.lists.no_classes_at_risk" : "analytics.lists.no_students_at_risk")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- BOTTOM SECTION: CLASS BREAKDOWN --- */}
        {classBreakdown.length > 0 && (
        <div className="bg-[var(--bg-card)] p-4 sm:p-6 rounded-xl border border-[var(--border-color)] shadow-sm overflow-hidden">
          <h3 className="font-bold text-lg text-[var(--text-main)] mb-1">{t('analytics.breakdown.title')}</h3>
          <p className="text-sm text-[var(--text-body)] mb-6">{t('analytics.breakdown.subtitle')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {classBreakdown.map((cls, idx) => (
              <div key={idx} className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-[var(--text-main)]">{cls.class}</h4>
                  <span className="text-xs text-[var(--text-body)] opacity-80">{t('analytics.breakdown.students', {count: cls.students})}</span>
                </div>
                {/* Progress Bar Container */}
                <div className="h-4 w-full bg-[var(--bg-card)] rounded-full flex overflow-hidden shadow-inner mb-2">
                  <div 
                    className="h-full" 
                    style={{width: `${cls.present}%`, backgroundColor: cls.color}}
                  ></div>
                  <div className="h-full bg-[var(--warning)]/40" style={{width: `${cls.late}%`}}></div>
                  <div className="h-full bg-[var(--danger)]/40" style={{width: `${cls.absent}%`}}></div>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="px-2 py-0.5 rounded text-[var(--text-on-primary)] font-bold" style={{ backgroundColor: cls.color }}>
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
        )}
      </div>
    </div>
  );
}
