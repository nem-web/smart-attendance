import React, { useState, useEffect } from "react";
import {
  Plus,
  Copy,
  Sun,
  Calendar as CalendarIcon,
  RefreshCw,
  Folder,
  ChevronDown,
  MoreHorizontal, // this icon can be used for "more options" on class cards
  Loader2,
} from "lucide-react";
import { getSettings, updateSettings } from "../api/schedule";
import Spinner from "../components/Spinner";


export default function ManageSchedule() {
  const [activeDay, setActiveDay] = useState("Mon");
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState([]);
  const [scheduleEnvelope, setScheduleEnvelope] = useState({});
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
  const loadSchedule = (schedule) => {
    const timetable = schedule?.timetable || [];
    const flatData = timetable.flatMap(({ day, periods }) =>
      periods.map((period) => ({
        id: `${day}-${period.slot}`,
        title: period.metadata?.subject_name || "Untitled",
        time: `${period.start} - ${period.end}`,
        room: period.metadata?.room || "TBD",
        teacher: "Self",
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
    scheduleData.forEach((cls, index) => {
      const fullDay = fullDayMap[cls.day] || cls.day || "Unknown";
      if (!grouped[fullDay]) grouped[fullDay] = [];
      const timeParts = cls.time.split(/\s*-\s*/);
      const [start = "", end = ""] = timeParts;
      grouped[fullDay].push({
        slot: grouped[fullDay].length + 1,
        start,
        end,
        metadata: {
          subject_name: cls.title,
          room: cls.room,
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
      time: "12:00 - 13:00",
      room: "TBD",
      teacher: "Assign Teacher",
      day: activeDay,
      status: "Pending",
    };
    setScheduleData([...scheduleData, newClass]);
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] font-sans text-[var(--text-main)] transition-colors duration-200">
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
                    <span className="text-xs text-[var(--text-body)]">
                      {cls.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-[var(--text-body)]">
                      Room {cls.room} · {cls.teacher}
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
              <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-secondary)] transition">
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
      </main>
    </div>
  );
}
