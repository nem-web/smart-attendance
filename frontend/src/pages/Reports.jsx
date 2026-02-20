import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  FileText,
  Calendar,
  ChevronDown,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2
} from "lucide-react";

import { fetchMySubjects, fetchSubjectStudents } from "../api/teacher";
import DateRange from '../components/DateRange.jsx';
import 'react-datepicker/dist/react-datepicker.css';
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

const REPORT_DATE_RANGE_DAYS = 30;

export default function Reports() {
const { t: _t } = useTranslation();

  const [threshold] = useState(75);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [loadingFormat, setLoadingFormat] = useState(null);

  useEffect(() => {
    fetchMySubjects().then(setSubjects);
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    fetchSubjectStudents(selectedSubject).then(setStudents);
  }, [selectedSubject]);

  const verifiedStudents = students.filter((s) => s.verified === true);

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

  const filteredStudents = enhancedStudents.filter((s) => {
    if (!startDate || !endDate) return true;

    const studentDate = new Date(s.createdAt || Date.now());

    return (
      studentDate >= new Date(startDate) &&
      studentDate <= new Date(endDate)
    );
  });

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
  }, [filteredStudents, sortConfig]);

  const handleExport = async (format) => {
    if (!selectedSubject) {
      toast.error("Select subject first");
      return;
    }

    setLoadingFormat(format);

    try {
      const token = localStorage.getItem("token");

      const params = new URLSearchParams({
        subject_id: selectedSubject,
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date(startDate.getTime() + REPORT_DATE_RANGE_DAYS * 86400000)
          .toISOString().split('T')[0],
      });

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reports/export/${format}?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `report.${format}`;
      a.click();

      toast.success(`${format.toUpperCase()} downloaded`);
    } catch (err) {
      toast.error("Export failed");
    } finally {
      setLoadingFormat(null);
    }
  };

  const handleExportPDF = () => handleExport("pdf");
  const handleExportCSV = () => handleExport("csv");

  return (
    <div className="min-h-screen p-6">
      <h2 className="text-xl font-bold mb-4">Reports</h2>

      <DateRange
        onChange={({ start, end }) => {
          setStartDate(start);
          setEndDate(end);
        }}
      />

      <div className="flex gap-3 my-4">
        <button onClick={handleExportCSV}>
          {loadingFormat === "csv" ? "Loading..." : "Export CSV"}
        </button>

        <button onClick={handleExportPDF}>
          {loadingFormat === "pdf" ? "Loading..." : "Export PDF"}
        </button>
      </div>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th onClick={() => handleSort("total")}>Total</th>
            <th onClick={() => handleSort("present")}>Present</th>
            <th onClick={() => handleSort("percentage")}>%</th>
          </tr>
        </thead>

        <tbody>
          {sortedStudents.map((s, i) => (
            <tr key={i}>
              <td>{s.total}</td>
              <td>{s.present}</td>
              <td>{s.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
