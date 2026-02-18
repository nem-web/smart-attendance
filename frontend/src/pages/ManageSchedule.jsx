import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Calendar as CalendarIcon,
  CalendarDays,
  Folder,
  ChevronDown,
  MoreHorizontal,
  Loader2,
  Edit2,
  Trash2,
  X,
  Save,
  Eye,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getSettings, updateSettings } from "../api/schedule";
import { fetchMySubjects } from "../api/teacher";
import Spinner from "../components/Spinner";
import HolidaysModal from "../components/HolidaysModal";

export default function ManageSchedule() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeDay, setActiveDay] = useState("Mon");
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState([]);
  const [scheduleEnvelope, setScheduleEnvelope] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [saveTemplateNotification, setSaveTemplateNotification] =
    useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [holidaysModalOpen, setHolidaysModalOpen] = useState(false);
  const yearScrollRef = useRef(null);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const years = Array.from({ length: 201 }, (_, i) => 1900 + i);


  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const daysArray = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push(i);
    }
    return daysArray;
  };
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleMonthSelect = (monthIndex) => {
    const newDate = new Date(currentDate.getFullYear(), monthIndex, 1);
    setCurrentDate(newDate);
    setIsPickerOpen(false);
  };

  const handleYearSelect = (year) => {
    const newDate = new Date(year, currentDate.getMonth(), 1);
    setCurrentDate(newDate);
    setIsPickerOpen(false); 
  };
  const togglePicker = () => {
    setIsPickerOpen(!isPickerOpen);
    if (!isPickerOpen) {
      setTimeout(() => {
        if (yearScrollRef.current) {
          const selected = yearScrollRef.current.querySelector('[data-selected="true"]');
          if (selected) {
            selected.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
      }, 100);
    }
  };

  const formatMonthYear = (date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setIsLoading(true);

        const data = await getSettings();
        const subjectsData = await fetchMySubjects();
        setSubjects(subjectsData);

        const scheduleData = data.schedule || {
          timetable: [],
          recurring: null,
          holidays: [],
          exams: [],
          meta: {},
        };
        loadSchedule(scheduleData);
        setScheduleEnvelope(scheduleData);
      } catch (err) {
        console.error(err);
        alert(t('manage_schedule.error_loading', "Error loading schedule"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedule();
  }, [t]);
  useEffect(() => {
    const savedTemplates = localStorage.getItem("schedule_templates");

    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    }
  }, []);
  const loadSchedule = (schedule) => {
    const timetable = schedule?.timetable || [];
    const flatData = timetable.flatMap(({ day, periods }) =>
      periods.map((period) => ({
        id: `${day}-${period.slot}`,
        title: period.metadata?.subject_name || "Untitled",
        subject_id: period.metadata?.subject_id || "", 
        startTime: period.start || "00:00",
        endTime: period.end || "00:00",
        room: period.metadata?.room || "TBD",
        teacher: period.metadata?.teacher || "Self",
        day: day.slice(0, 3),
        status: "Active",
      })),
    );
    setScheduleData(flatData);
  };
  const preparePayload = () => {
    const fullDayMap = {
      Mon: "Monday",
      Tue: "Tuesday",
      Wed: "Wednesday",
      Thu: "Thursday",
      Fri: "Friday",
      Sat: "Saturday",
    };
    const grouped = {};
    scheduleData.forEach((cls) => {
      const fullDay = fullDayMap[cls.day] || cls.day || "Unknown";
      if (!grouped[fullDay]) grouped[fullDay] = [];
      grouped[fullDay].push({
        slot: grouped[fullDay].length + 1,
        start: cls.startTime,
        end: cls.endTime,
        metadata: {
          subject_id: cls.subject_id,
          subject_name: cls.title,
          room: cls.room,
          teacher: cls.teacher,
          tracked: true,
        },
      });
    });
    // Holidays are now in a dedicated collection (per issue #315),
    // so we no longer include them in the schedule payload.
    return {
      timetable: Object.keys(grouped).map((day) => ({
        day,
        periods: grouped[day],
      })),
      recurring: scheduleEnvelope.recurring ?? null,
      exams: scheduleEnvelope.exams ?? [],
      meta: scheduleEnvelope.meta ?? {},
    };
  };

  const handleSave = async () => {
    try {
      const schedulePayload = preparePayload();

      await updateSettings({
        schedule: schedulePayload,
      });

      alert(t('manage_schedule.save_success', "Schedule saved successfully"));
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };
  const filteredClasses = scheduleData.filter((item) => item.day === activeDay);
  const handleAddClass = () => {
    const newClass = {
      id: Date.now(),
      title: subjects.length > 0 ? subjects[0].name : t('manage_schedule.new_subject', "New Subject"),
      subject_id: subjects.length > 0 ? subjects[0]._id : "",
      startTime: "12:00",
      endTime: "13:00",
      room: "TBD",
      teacher: t('manage_schedule.assign_teacher', "Assign Teacher"),
      day: activeDay,
      status: "Pending",
    };
    setScheduleData([...scheduleData, newClass]);
  };
  const handleDeleteClass = (id) => {
    if (window.confirm(t('manage_schedule.confirm_delete_class', "Are you sure you want to delete this class?"))) {
      setScheduleData((prev) => prev.filter((item) => item.id !== id));
    }
  };
  const openEditModal = (cls) => {
    setCurrentClass({ ...cls });
    setIsEditModalOpen(true);
  };
  const saveEditedClass = () => {
    setScheduleData((prev) =>
      prev.map((item) => (item.id === currentClass.id ? currentClass : item)),
    );
    setIsEditModalOpen(false);
    setCurrentClass(null);
  };
  if (isLoading) return <Spinner />;
  const saveTemplate = () => {
    const templateData = {};
    days.forEach((day) => {
      const dayClasses = scheduleData.filter((cls) => cls.day === day);
      if (dayClasses.length > 0) {
        templateData[day] = dayClasses;
      }
    });

    const newTemplate = {
      id: Date.now(),
      name: `${t('manage_schedule.template', 'Template')} ${templates.length + 1}`,
      data: templateData,
      createdAt: new Date().toISOString(),
      totalClasses: scheduleData.length,
    };

    const updatedTemplates = [...templates, newTemplate];

    setTemplates(updatedTemplates);
    localStorage.setItem(
      "schedule_templates",
      JSON.stringify(updatedTemplates),
    );

    setSaveTemplateNotification(newTemplate.name);
    setTimeout(() => setSaveTemplateNotification(null), 3000);
  };

  const applyTemplate = (template) => {
    if (!template.data) {
      alert(t('manage_schedule.template_no_data', "Template has no data"));
      return;
    }

    if (
      !window.confirm(
        t('manage_schedule.confirm_apply_template', { name: template.name, defaultValue: `Apply "${template.name}"? This will replace classes for all days included in the template.` })
      )
    ) {
      return;
    }

    const templateDays = Object.keys(template.data);
    const filteredSchedule = scheduleData.filter(
      (cls) => !templateDays.includes(cls.day),
    );

    const newClasses = [];
    Object.entries(template.data).forEach(([, classes]) => {
      classes.forEach((cls) => {
        newClasses.push({
          ...cls,
          id: Date.now() + Math.random(),
        });
      });
    });

    setScheduleData([...filteredSchedule, ...newClasses]);
    setShowTemplates(false);
    alert(t('manage_schedule.template_applied', "Template applied! Don't forget to click 'Save schedule' to persist changes."));
  };


  const deleteTemplate = (templateId) => {
    if (!window.confirm(t('manage_schedule.confirm_delete_template', "Delete this template?"))) return;

    const updatedTemplates = templates.filter((t) => t.id !== templateId);
    setTemplates(updatedTemplates);
    localStorage.setItem(
      "schedule_templates",
      JSON.stringify(updatedTemplates),
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] font-sans text-[var(--text-main)] transition-colors duration-200">
      {saveTemplateNotification && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--success)] text-[var(--text-on-primary)] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <CheckCircle size={20} />
          <span>{t('manage_schedule.saved_as', { name: saveTemplateNotification, defaultValue: `Saved as ${saveTemplateNotification}!` })}</span>
        </div>
      )}
      {isEditModalOpen && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="text-xl font-bold">{t('manage_schedule.edit_class', 'Edit Class')}</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[var(--text-body)] hover:text-[var(--text-main)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('manage_schedule.subject_name', "Subject Name")}
                </label>
                <select
                  value={currentClass.subject_id || ""}
                  onChange={(e) => {
                    const selectedSubject = subjects.find(s => s._id === e.target.value);
                    setCurrentClass({ 
                      ...currentClass, 
                      subject_id: e.target.value,
                      title: selectedSubject ? selectedSubject.name : "" 
                    });
                  }}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--primary)]"
                >
                  <option value="" disabled>Select a subject</option>
                  {subjects.map((sub) => (
                    <option key={sub._id} value={sub._id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('manage_schedule.start_time', "Start Time")}
                  </label>
                  <input
                    type="time"
                    value={currentClass.startTime}
                    onChange={(e) =>
                      setCurrentClass({
                        ...currentClass,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('manage_schedule.end_time', "End Time")}
                  </label>
                  <input
                    type="time"
                    value={currentClass.endTime}
                    onChange={(e) =>
                      setCurrentClass({
                        ...currentClass,
                        endTime: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--primary)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('manage_schedule.room', "Room")}</label>
                  <input
                    type="text"
                    value={currentClass.room}
                    onChange={(e) =>
                      setCurrentClass({ ...currentClass, room: e.target.value })
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('manage_schedule.teacher', "Teacher")}
                  </label>
                  <input
                    type="text"
                    value={currentClass.teacher}
                    onChange={(e) =>
                      setCurrentClass({
                        ...currentClass,
                        teacher: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--primary)]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--bg-secondary)] rounded-lg transition"
              >
                {t('common.cancel', "Cancel")}
              </button>
              <button
                onClick={saveEditedClass}
                className="px-4 py-2 text-sm font-medium bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg shadow-sm hover:opacity-90 transition flex items-center gap-2"
              >
                <Save size={16} /> {t('common.save_changes', "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewTemplate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-2xl p-6 rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 mb-4">
              <h3 className="text-xl font-bold">{previewTemplate.name}</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-[var(--text-body)] hover:text-[var(--text-main)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(previewTemplate.data).map(([day, classes]) => (
                <div
                  key={day}
                  className="border border-[var(--border-color)] rounded-lg p-3"
                >
                  <h4 className="font-bold mb-2">{day}</h4>
                  <div className="space-y-2">
                    {classes.map((cls, idx) => (
                      <div
                        key={idx}
                        className="text-sm bg-[var(--bg-secondary)] p-2 rounded"
                      >
                        <div className="font-medium">{cls.title}</div>
                        <div className="text-[var(--text-body)] text-xs">
                          {cls.startTime} - {cls.endTime} · Room {cls.room} ·{" "}
                          {cls.teacher}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] transition"
              >
                {t('common.close', "Close")}
              </button>
              <button
                onClick={() => {
                  applyTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg hover:opacity-90 transition"
              >
                {t('manage_schedule.apply_template', "Apply Template")}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('manage_schedule.title', "Manage schedule")}</h1>
            <p className="text-[var(--text-body)] mt-1">
              {t('manage_schedule.editing_schedule_for', { day: activeDay, defaultValue: `Editing schedule for ${activeDay}` })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-xl font-semibold shadow-sm transition active:scale-95"
            >
              {t('manage_schedule.save_schedule', "Save schedule")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 space-y-6">
            {/* CONTROLS */}
            <div className="flex justify-between items-center">
              <div className="inline-flex bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-full">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
                      activeDay === day
                        ? "bg-[var(--primary)] text-[var(--text-on-primary)]"
                        : "text-[var(--text-body)]"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddClass}
                className="flex items-center gap-2 bg-[var(--primary)] text-[var(--text-on-primary)] px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Plus size={16} /> {t('manage_schedule.add_class', "Add class")}
              </button>
            </div>

            {/* --- DYNAMIC CLASSES GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] transition shadow-sm"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold">{cls.title}</h4>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(cls)}
                        className="p-1.5 text-[var(--text-body)] hover:text-[var(--primary)] hover:bg-[var(--bg-secondary)] rounded-md transition"
                        title={t('manage_schedule.edit_class', "Edit Class")}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        className="p-1.5 text-[var(--text-body)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-md transition"
                        title={t('manage_schedule.delete_class', "Delete Class")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-main)] mb-3">
                    {cls.startTime} - {cls.endTime}
                  </p>

                  <div className="flex justify-between items-end border-t border-[var(--border-color)] pt-3">
                    <p className="text-sm text-[var(--text-body)]">
                      {t('manage_schedule.subject_room', "Room")}{" "}
                      <span className="text-[var(--text-main)] font-semibold">
                        {cls.room}
                      </span>{" "}
                      · {cls.teacher}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${cls.status === "Active" ? "bg-[var(--success)] text-[var(--text-on-primary)]" : "bg-[var(--warning)] text-[var(--text-on-primary)]"}`}
                    >
                      {cls.status}
                    </span>
                  </div>
                </div>
              ))}

              {/* Empty State / Add Placeholder */}
              {filteredClasses.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl">
                  <p className="text-[var(--text-body)]">
                    {t('manage_schedule.no_classes', { day: activeDay, defaultValue: `No classes scheduled for ${activeDay}.` })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION: CALENDAR OVERVIEW */}
          <div className="xl:col-span-4 space-y-6">
            {/* Calendar Card */}
            <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-[var(--text-main)]">
                  {t('manage_schedule.calendar_overview', "Calendar overview")}
                </h3>
                <p className="text-sm text-[var(--text-body)]">{t('manage_schedule.manage_holidays', "Manage holidays and events")}</p>
              </div>
              <div className="flex items-center justify-between mb-4 bg-[var(--bg-secondary)] p-1 rounded-xl">
                 <button onClick={handlePrevMonth} className="p-2 hover:bg-[var(--bg-card)] hover:text-[var(--primary)] rounded-lg transition text-[var(--text-body)]">
                    <ChevronLeft size={18} />
                 </button>

                 <div className="relative">
                    <button 
                      onClick={togglePicker}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--bg-card)] transition font-bold text-[var(--text-main)]"
                    >
                      {formatMonthYear(currentDate)}
                      <ChevronDown size={14} className={`transition-transform duration-200 ${isPickerOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isPickerOpen && (
                      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 w-[340px] p-4 animate-in zoom-in-95 duration-100">
                        <div className="flex gap-4 h-[280px]">
                           {/* Left: Months */}
                           <div className="flex-1 overflow-y-auto">
                              <h4 className="text-xs font-bold text-[var(--text-body)] uppercase mb-2 sticky top-0 bg-[var(--bg-card)]">{t('manage_schedule.month', "Month")}</h4>
                              <div className="grid grid-cols-1 gap-1">
                                {months.map((m, idx) => (
                                  <button 
                                    key={m} 
                                    type="button"
                                    onClick={() =>
                                       handleMonthSelect(idx)}
                                    className={`text-sm px-3 py-1.5 rounded-lg text-left transition ${currentDate.getMonth() === idx ? "bg-[var(--primary)] text-[var(--text-on-primary)]" : "hover:bg-[var(--bg-secondary)]"}`}
                                  >
                                    {m}
                                  </button>
                                ))}
                              </div>
                           </div>

                           {/* Divider */}
                           <div className="w-[1px] bg-[var(--border-color)] h-full"></div>
                           <div className="w-24 overflow-y-auto custom-scrollbar" ref={yearScrollRef}>
                              <h4 className="text-xs font-bold text-[var(--text-body)] uppercase mb-2 sticky top-0 bg-[var(--bg-card)]">{t('manage_schedule.year', "Year")}</h4>
                              <div className="space-y-1">
                                {years.map((year) => (
                                  <button 
                                    key={year} 
                                    type="button"
                                    data-selected={currentDate.getFullYear() === year}
                                    onClick={() => handleYearSelect(year)}
                                    className={`block w-full text-sm px-2 py-1.5 rounded-lg text-center transition ${currentDate.getFullYear() === year ? "bg-[var(--primary)] text-[var(--text-on-primary)]" : "hover:bg-[var(--bg-secondary)]"}`}
                                  >
                                    {year}
                                  </button>
                                ))}
                              </div>
                           </div>
                        </div>
                        
                        {/* Footer Close */}
                        <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                           <button 
                             onClick={() => setIsPickerOpen(false)}
                             className="w-full py-1.5 text-xs font-bold text-[var(--primary)] hover:bg-[var(--bg-secondary)] rounded-lg"
                           >
                             {t('common.close', "Close")}
                           </button>
                        </div>
                      </div>
                    )}
                 </div>

                 <button onClick={handleNextMonth} className="p-2 hover:bg-[var(--bg-card)] hover:text-[var(--primary)] rounded-lg transition text-[var(--text-body)]">
                    <ChevronRight size={18} />
                 </button>
              </div>

              {/* CALENDAR GRID */}
              <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center text-sm mb-2">
                {[
                  t('days.short.sun', "Sun"), 
                  t('days.short.mon', "Mon"), 
                  t('days.short.tue', "Tue"), 
                  t('days.short.wed', "Wed"), 
                  t('days.short.thu', "Thu"), 
                  t('days.short.fri', "Fri"), 
                  t('days.short.sat', "Sat")
                ].map((d) => (
                  <span key={d} className="text-xs font-medium text-[var(--text-body)]">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 text-sm">
                {getCalendarDays().map((day, idx) => {
                  if(!day) return <div key={idx} className="h-8 w-8"/>;
                  const today = new Date();
                  const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                  return (
                    <div key={idx} className="flex justify-center">
                      <span className={`h-8 w-8 flex items-center justify-center rounded-lg transition cursor-pointer ${isToday ? "bg-[var(--primary)] text-[var(--text-on-primary)] font-bold shadow-md" : "text-[var(--text-main)] hover:bg-[var(--bg-secondary)]"}`}>
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Holidays Card — SIBLING of calendar, NOT nested */}
            <div
              onClick={() => setHolidaysModalOpen(true)}
              className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-secondary)] transition"
            >
              <div>
                <h4 className="font-bold text-[var(--text-main)] text-sm">
                  {t('manage_schedule.holidays_title', "Holidays")}
                </h4>
                <p className="text-xs text-[var(--text-body)] mt-0.5">
                  {t('manage_schedule.holidays_desc', "Manage non-instructional days")}
                </p>
              </div>
              <CalendarDays size={18} className="text-[var(--text-body)]" />
            </div>

            {/* Exam Days Card — SIBLING of holidays card */}
            <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-secondary)] transition">
              <div>
                <h4 className="font-bold text-[var(--text-main)] text-sm">
                  {t('manage_schedule.exam_days', "Exam days")}
                </h4>
                <p className="text-xs text-[var(--text-body)] mt-0.5">
                  {t('manage_schedule.exam_desc', "Override schedule for exams")}
                </p>
              </div>
              <CalendarIcon size={18} className="text-[var(--text-body)]" />
            </div>

            {/* Custom Templates Card — SIBLING */}
            <div
              onClick={() => setShowTemplates(true)}
              className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-secondary)] transition"
            >
              <div>
                <h4 className="font-bold text-[var(--text-main)] text-sm">
                  {t('manage_schedule.custom_templates', "Custom templates")}
                </h4>
                <p className="text-xs text-[var(--text-body)] mt-0.5">
                  {t('manage_schedule.templates_desc', "Save and reuse schedule presets")}
                </p>
              </div>
              <Folder size={18} className="text-[var(--text-body)]" />
            </div>
          </div>
        </div>

        {/* Holidays Modal — rendered at page root level, outside all cards */}
        <HolidaysModal
          isOpen={holidaysModalOpen}
          onClose={() => setHolidaysModalOpen(false)}
        />

        {/* Templates Modal */}
        {showTemplates && (
          <div className="fixed inset-0 bg-[var(--overlay)] z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-2xl p-6 shadow-xl border border-[var(--border-color)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-[var(--text-main)]">
                  {t('manage_schedule.custom_templates', "Custom Templates")}
                </h3>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-[var(--text-body)] hover:text-[var(--text-main)]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {templates.length === 0 ? (
                  <p className="text-sm text-[var(--text-body)] bg-[var(--bg-secondary)] p-4 rounded-lg">
                    {t('manage_schedule.no_templates_saved', "No templates saved yet. Create your schedule for the week, then save it as a template to reuse later.")}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {templates.map((t) => (
                      <div
                        key={t.id}
                        className="border border-[var(--border-color)] rounded-lg px-4 py-3 flex justify-between items-center hover:bg-[var(--bg-secondary)] transition"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{t.name}</span>
                            <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded">
                              {t.totalClasses} {t('manage_schedule.classes_lowercase', "classes")}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--text-body)] mt-1">
                            {Object.keys(t.data).join(", ")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs bg-[var(--bg-secondary)] text-[var(--text-main)] px-3 py-1.5 rounded hover:bg-[var(--primary)]/10 transition flex items-center gap-1"
                            onClick={() => setPreviewTemplate(t)}
                            title={t('manage_schedule.preview_template', "Preview template")}
                          >
                            <Eye size={14} />
                            {t('manage_schedule.preview', "Preview")}
                          </button>
                          <button
                            className="text-xs bg-[var(--primary)] text-[var(--text-on-primary)] px-3 py-1.5 rounded hover:opacity-90 transition"
                            onClick={() => applyTemplate(t)}
                          >
                            {t('manage_schedule.apply', "Apply")}
                          </button>
                          <button
                            className="text-xs text-[var(--danger)] hover:bg-[var(--danger)]/10 px-2 py-1.5 rounded transition"
                            onClick={() => deleteTemplate(t.id)}
                            title={t('manage_schedule.delete_template', "Delete template")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="w-full bg-[var(--primary)] text-[var(--text-on-primary)] py-3 rounded-lg font-medium hover:opacity-90 transition shadow-md flex items-center justify-center gap-2"
                  onClick={saveTemplate}
                >
                  <Save size={18} />
                  {t('manage_schedule.save_week_as_template', "Save current week as template")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}