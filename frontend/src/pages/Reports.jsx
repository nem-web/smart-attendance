
import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  FileText,
  ChevronDown,
  RotateCcw,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { fetchMySubjects, fetchSubjectStudents } from "../api/teacher";
import DateRange from '../components/DateRange.jsx';
import 'react-datepicker/dist/react-datepicker.css';
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
//import { fetchStudentById } from "../api/teacher";

export default function Reports() {
  const { t } = useTranslation();

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [threshold, setThreshold] = useState(75);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [loadingFormat, setLoadingFormat] = useState(null);

  //Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(25);

  // Fetch Subjects on Mount
  useEffect(() => {
    fetchMySubjects().then(setSubjects);
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    //fetchSubjectStudents(selectedSubject).then(setStudents);
    fetchSubjectStudents(selectedSubject).then(data => {
   console.log("Students API response:", data);
    setStudents(data);
  });
 }, [selectedSubject, startDate, endDate]);

  const verifiedStudents = students.filter((s) => s.verified === true);
  
const getStatusColor = (color) => {
  switch (color) {
    case "green":
      return "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/25";
    case "amber":
      return "bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/25";
    case "red":
      return "bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/25";
    default:
      return "bg-[var(--bg-secondary)] text-[var(--text-body)] border border-[var(--border-color)]";
  }
};
  const enhancedStudents = verifiedStudents.map(s => {
    const present = s.attendance?.present || 0;
    const absent = s.attendance?.absent || 0;
    const total = present + absent;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

    let statusKey = "unknown";
    let color = "gray";

    if (percentage >= threshold) {
      statusKey = "good";
      color = "green";
    } else if (percentage >= threshold - 10) {
      statusKey = "warning";
      color = "amber";
    } else {
      statusKey = "at_risk";
      color = "red";
    }

    return {
      ...s,
      present,
      absent,
      total,
      percentage,
      statusKey,
      color
    };
  });

  const filteredStudents = enhancedStudents;

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStudents = useMemo(() => {
    if (!sortConfig.key) return filteredStudents;

    return [...filteredStudents].sort((a, b) => {
      return sortConfig.direction === 'asc'
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
    });
  }, [enhancedStudents, sortConfig]);

  // Reset page when subject changes or rowsPerPage changes
useEffect(() => {
  setCurrentPage(1);
}, [selectedSubject, rowsPerPage]);

const totalStudents = sortedStudents.length;
const totalPages = Math.max(1, Math.ceil(totalStudents / rowsPerPage));

const startIndex = (currentPage - 1) * rowsPerPage;
const endIndex = startIndex + rowsPerPage;

const paginatedStudents = sortedStudents.slice(startIndex, endIndex);

const showingFrom = totalStudents === 0 ? 0 : startIndex + 1;
const showingTo = Math.min(endIndex, totalStudents);

const goToPage = (page) => {
  const safePage = Math.min(Math.max(page, 1), totalPages || 1);
  setCurrentPage(safePage);
};

  // Get Sort Icon Helper
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="text-[var(--text-body)] opacity-50" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} className="text-[var(--primary)]" />;
    }
    return <ArrowDown size={14} className="text-[var(--primary)]" />;
  };

  const handleExport = async (format) => {
    if (!selectedSubject) {
     toast.error(t('reports.select_subject_first'));
      return;
    }

    setLoadingFormat(format);

    try {
      const token = localStorage.getItem("token");

      const params = new URLSearchParams({
        subject_id: selectedSubject,
        ...(startDate && { start_date: startDate.toISOString().split('T')[0] }),
        ...(endDate && { end_date: endDate.toISOString().split('T')[0] }),
      });

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reports/export/${format}?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // ✅ check response
      if (!res.ok) {
       throw new Error(t('reports.download_failed'));
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      // ✅ proper anchor handling
      const a = document.createElement("a");
      a.href = url;
      a.download = `report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // ✅ cleanup memory
      window.URL.revokeObjectURL(url);
toast.success(t('reports.download_success', { format: format.toUpperCase() }));
    
    } catch  {
toast.error(t('reports.export_failed'));
    } finally {
      setLoadingFormat(null);
    }
  };

  const handleExportPDF = () => handleExport("pdf");
  const handleExportCSV = () => handleExport("csv");

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header Section with Export Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)]">{t('reports.title')}</h2>
          <p className="text-sm text-[var(--text-body)] opacity-90 mt-1">
            {t('reports.subtitle')}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            disabled={loadingFormat === "csv"}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-secondary)] hover:border-[var(--primary)] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loadingFormat === "csv" ? (
              <RotateCcw className="animate-spin text-[var(--primary)]" size={18} />
            ) : (
              <FileText size={18} className="text-[var(--primary)] group-hover:scale-110 transition-transform" />
            )}
            <span className="font-medium">
              {loadingFormat === "csv" ? "Generating..." : "Export CSV"}
            </span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={loadingFormat === "pdf"}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg hover:bg-[var(--primary-hover)] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loadingFormat === "pdf" ? (
              <RotateCcw className="animate-spin text-white" size={18} />
            ) : (
              <Download size={18} className="group-hover:translate-y-1 transition-transform" />
            )}
            <span className="font-medium">
              {loadingFormat === "pdf" ? "Generating..." : "Export PDF"}
            </span>
          </button>
        </div>
      </div>

      {/* --- FILTERS CARD --- */}
      <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-[var(--text-main)]">{t('reports.filters.title')}</h3>
              <p className="text-sm text-[var(--text-body)]">{t('reports.filters.subtitle')}</p>
            </div>
            {/* Generate button removed as per #429 */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">

          <DateRange
  onChange={({ start, end }) => {
    setStartDate(start);
    setEndDate(end);
  }}
/>

            {/* Classes Selector */}
            <div className="md:col-span-4 space-y-2">
              <label className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wide">{t('reports.filters.classes')}</label>
              <div className="relative">
                <select
                  value={selectedSubject || ""}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] outline-none cursor-pointer text-[var(--text-main)]"
                >
                  <option disabled value="">{t('reports.filters.select_subject')}</option>
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Threshold Slider */}
            <div className="md:col-span-4 space-y-2 flex flex-col justify-end h-full pb-1">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wide">{t('reports.filters.threshold')}</label>
                <span className="text-sm font-bold text-[var(--primary)]">{threshold}%</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative h-2 bg-[var(--bg-secondary)] rounded-full">
                  <div
                    className="absolute top-0 left-0 h-full bg-[var(--primary)] rounded-full"
                    style={{ width: `${threshold}%` }}
                  ></div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <button onClick={() => setThreshold(75)} className="text-sm text-[var(--text-body)] opacity-70 hover:text-[var(--primary)] flex items-center gap-1 transition cursor-pointer">
                  <RotateCcw size={14} />
                  {t('reports.filters.reset')}
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-body)] opacity-70 mt-1">{t('reports.filters.threshold_desc', { threshold })}</p>
            </div>

          </div>
        </div>

        {/* --- REPORT PREVIEW TABLE --- */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
            <div>
              <h3 className="font-bold text-[var(--text-main)]">{t('reports.preview.title')}</h3>
              <p className="text-sm text-[var(--text-body)]">{t('reports.preview.subtitle')}</p>
            </div>
            <button className="text-sm font-medium text-[var(--primary)] hover:underline cursor-pointer">{t('reports.preview.view_full')}</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-[var(--bg-secondary)]">
                <tr className="text-left text-xs font-semibold text-[var(--text-body)] uppercase tracking-wider border-b border-[var(--border-color)]">
                  <th className="px-6 py-4">{t('reports.table.student')}</th>

                  {/* Sortable Header: Total Classes */}
                  <th
                    className="px-6 py-4 cursor-pointer hover:bg-[var(--bg-card)] transition-colors select-none"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t('reports.table.total_classes')}</span>
                      {getSortIcon('total')}
                    </div>
                  </th>

                  {/* Sortable Header: Attended */}
                  <th
                    className="px-6 py-4 cursor-pointer hover:bg-[var(--bg-card)] transition-colors select-none"
                    onClick={() => handleSort('attended')}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t('reports.table.attended')}</span>
                      {getSortIcon('attended')}
                    </div>
                  </th>

                  {/* Sortable Header: Percentage */}
                  <th
                    className="px-6 py-4 cursor-pointer hover:bg-[var(--bg-card)] transition-colors select-none"
                    onClick={() => handleSort('percentage')}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t('reports.table.percentage')}</span>
                      {getSortIcon('percentage')}
                    </div>
                  </th>
                  <th className="px-6 py-4">{t('reports.table.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedStudents.length > 0 ? (
                  paginatedStudents.map((row) => (
                    <tr key={row.student_id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-[var(--text-main)]">{row.name}</div>
                          <div className="text-xs text-[var(--text-body)] opacity-70">{t('reports.table.student_id')}: {row.roll}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-body)]">{row.total}</td>
                      <td className="px-6 py-4 text-sm text-[var(--text-body)]">{row.present}</td>
                      <td className="px-6 py-4 text-sm font-bold text-[var(--text-main)]">{row.percentage}%</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(row.color)}`}>
                          {t(`reports.status_labels.${row.statusKey}`)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-[var(--text-body)] opacity-70">
                      {selectedSubject ? t('reports.table.no_students') : t('reports.table.select_subject_prompt')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {sortedStudents.length > 0 && (
            <div className="bg-[var(--bg-secondary)] p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[var(--text-body)] border-t border-[var(--border-color)]">
    
            {/* Left text */}
            <span>
            {t('reports.pagination.showing', { showingFrom, showingTo, totalStudents })}
            {sortConfig.key && (
              <> • {t('reports.footer.sorted_by', {
                key: t(`reports.footer.sort_keys.${sortConfig.key}`),
                direction: t(`reports.footer.sort_dir.${sortConfig.direction}`)
                })}</>
            )}
          </span>

          {/* Middle legend */}
          <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--success)]"></span>
          <span>{t('reports.footer.good', { threshold })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--warning)]"></span>
            <span>{t('reports.footer.warning')}</span>
        </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[var(--danger)]"></span>
        <span>{t('reports.footer.at_risk')}</span>
      </div>
    </div>

    {/* Right pagination buttons */}
    <div className="flex items-center gap-2">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t('reports.pagination.previous')}
      </button>

      <span className="text-xs text-[var(--text-body)]">
        {t('reports.pagination.page_info', { current: currentPage, total: totalPages })}
      </span>

      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t('reports.pagination.next')}
      </button>
    </div>

  </div>
)}
        </div>
      </div>
 
  );
}
