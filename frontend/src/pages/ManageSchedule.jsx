import React, { useState, useEffect } from "react";
import {
  Plus,
  Copy,
  Sun,
  Calendar as CalendarIcon,
  RefreshCw,
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
} from "lucide-react";
import { getSettings, updateSettings } from "../api/schedule";
import Spinner from "../components/Spinner";

export default function ManageSchedule() {
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeDay, setActiveDay] = useState("Mon");
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState([]);
  const [scheduleEnvelope, setScheduleEnvelope] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState(null);
  const [saveTemplateNotification, setSaveTemplateNotification] =
    useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const day = i - 2;
    return day > 0 && day <= 30 ? day : "";
  });
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setIsLoading(true);

        const data = await getSettings();

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
        alert("Error loading schedule");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedule();
  }, []);
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
          subject_name: cls.title,
          room: cls.room,
          teacher: cls.teacher,
          tracked: true,
        },
      });
    });
    return {
      timetable: Object.keys(grouped).map((day) => ({
        day,
        periods: grouped[day],
      })),
      recurring: scheduleEnvelope.recurring ?? null,
      holidays: scheduleEnvelope.holidays ?? [],
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

      alert("Schedule saved successfully");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };
  const filteredClasses = scheduleData.filter((item) => item.day === activeDay);
  const handleAddClass = () => {
    const newClass = {
      id: Date.now(),
      title: "New Subject",
      startTime: "12:00",
      endTime: "13:00",
      room: "TBD",
      teacher: "Assign Teacher",
      day: activeDay,
      status: "Pending",
    };
    setScheduleData([...scheduleData, newClass]);
  };
  const handleDeleteClass = (id) => {
    if (window.confirm("Are you sure you want to delete this class?")) {
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
      name: `Template ${templates.length + 1}`,
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
      alert("Template has no data");
      return;
    }

    if (
      !window.confirm(
        `Apply "${template.name}"? This will replace classes for all days included in the template.`,
      )
    ) {
      return;
    }

    const templateDays = Object.keys(template.data);
    const filteredSchedule = scheduleData.filter(
      (cls) => !templateDays.includes(cls.day),
    );

    const newClasses = [];
    Object.entries(template.data).forEach(([_day, classes]) => {
      classes.forEach((cls) => {
        newClasses.push({
          ...cls,
          id: Date.now() + Math.random(),
        });
      });
    });

    setScheduleData([...filteredSchedule, ...newClasses]);
    setShowTemplates(false);
    alert("Template applied! Don't forget to click 'Save schedule' to persist changes.");
  };


  const deleteTemplate = (templateId) => {
    if (!window.confirm("Delete this template?")) return;

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
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <CheckCircle size={20} />
          <span>Saved as {saveTemplateNotification}!</span>
        </div>
      )}
      {isEditModalOpen && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-3">
              <h3 className="text-xl font-bold">Edit Class</h3>
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
                  Subject Name
                </label>
                <input
                  type="text"
                  value={currentClass.title}
                  onChange={(e) =>
                    setCurrentClass({ ...currentClass, title: e.target.value })
                  }
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 outline-none focus:ring-2 ring-[var(--primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Start Time
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
                    End Time
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
                  <label className="block text-sm font-medium mb-1">Room</label>
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
                    Teacher
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
                Cancel
              </button>
              <button
                onClick={saveEditedClass}
                className="px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white rounded-lg shadow-sm hover:opacity-90 transition flex items-center gap-2"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {previewTemplate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
                Close
              </button>
              <button
                onClick={() => {
                  applyTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition"
              >
                Apply Template
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Manage schedule</h1>
            <p className="text-[var(--text-body)] mt-1">
              Editing schedule for {activeDay}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold shadow-sm transition active:scale-95"
            >
              Save schedule
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
                        ? "bg-[var(--primary)] text-white"
                        : "text-[var(--text-body)]"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddClass}
                className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Plus size={16} /> Add class
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
                        title="Edit Class"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        className="p-1.5 text-[var(--text-body)] hover:text-red-500 hover:bg-red-50/10 rounded-md transition"
                        title="Delete Class"
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
                      Room{" "}
                      <span className="text-[var(--text-main)] font-semibold">
                        {cls.room}
                      </span>{" "}
                      · {cls.teacher}
                    </p>
                    <span
                      className={`text-white text-[10px] font-bold px-2 py-0.5 rounded ${cls.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`}
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
                    No classes scheduled for {activeDay}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION: CALENDAR OVERVIEW (Span 4) */}
          <div className="xl:col-span-4 space-y-6">
            {/* Calendar Container */}
            <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-[var(--text-main)]">
                  Calendar overview
                </h3>
                <p className="text-sm text-[var(--text-body)]">
                  Drag to adjust special days and exceptions
                </p>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-2 mb-4 cursor-pointer hover:bg-[var(--bg-secondary)] w-fit px-2 py-1 rounded transition">
                <span className="font-semibold text-[var(--text-main)]">
                  September 2025
                </span>
                <ChevronDown size={16} className="text-[var(--text-body)]" />
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center text-sm mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <span
                    key={d}
                    className="text-xs font-medium text-[var(--text-body)]"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 text-sm">
                {calendarDays.map((day, idx) => {
                  let cellClass =
                    "h-8 w-8 flex items-center justify-center rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-secondary)] cursor-pointer transition";

                  if (day === 1)
                    cellClass =
                      "h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--primary)] text-white font-bold shadow-md";
                  // Selected
                  else if ([4, 10, 11, 17, 22, 26].includes(day))
                    cellClass =
                      "h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-500 text-white font-medium shadow-sm";
                  // Active/Green
                  else if (day === 12 || day === 25)
                    cellClass =
                      "h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--primary)] text-white font-medium opacity-60"; // Blueish

                  return (
                    <div key={idx} className="flex justify-center">
                      <span className={cellClass}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Helper Cards */}
            <div className="space-y-4">
              {/* Recurring Timetable */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-secondary)] transition">
                <div>
                  <h4 className="font-bold text-[var(--text-main)] text-sm">
                    Recurring timetable
                  </h4>
                  <p className="text-xs text-[var(--text-body)] mt-0.5">
                    Mon-Fri use default weekly pattern
                  </p>
                </div>
                <RefreshCw size={18} className="text-[var(--text-body)]" />
              </div>

              {/* Exam Days */}
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-secondary)] transition">
                <div>
                  <h4 className="font-bold text-[var(--text-main)] text-sm">
                    Exam days
                  </h4>
                  <p className="text-xs text-[var(--text-body)] mt-0.5">
                    Override schedule for exams
                  </p>
                </div>
                <CalendarIcon size={18} className="text-[var(--text-body)]" />
              </div>

              {/* Custom Templates */}
              <div
                onClick={() => setShowTemplates(true)}
                className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-secondary)] transition"
              >
                <div>
                  <h4 className="font-bold text-[var(--text-main)] text-sm">
                    Custom templates
                  </h4>
                  <p className="text-xs text-[var(--text-body)] mt-0.5">
                    Save and reuse schedule presets
                  </p>
                </div>
                <Folder size={18} className="text-[var(--text-body)]" />
              </div>
            </div>
          </div>
        </div>
        {showTemplates && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-[var(--bg-card)] w-full max-w-2xl p-6 rounded-2xl border border-[var(--border-color)] shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Custom Templates</h3>
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
                    No templates saved yet. Create your schedule for the week,
                    then save it as a template to reuse later.
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
                              {t.totalClasses} classes
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
                            title="Preview template"
                          >
                            <Eye size={14} />
                            Preview
                          </button>
                          <button
                            className="text-xs bg-[var(--primary)] text-white px-3 py-1.5 rounded hover:opacity-90 transition"
                            onClick={() => applyTemplate(t)}
                          >
                            Apply
                          </button>
                          <button
                            className="text-xs text-red-500 hover:bg-red-50/10 px-2 py-1.5 rounded transition"
                            onClick={() => deleteTemplate(t.id)}
                            title="Delete template"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="w-full bg-[var(--primary)] text-white py-3 rounded-lg font-medium hover:opacity-90 transition shadow-md flex items-center justify-center gap-2"
                  onClick={saveTemplate}
                >
                  <Save size={18} />
                  Save current week as template
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
