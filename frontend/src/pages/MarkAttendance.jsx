import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { 
  Settings, 
  Clock, 
  Search, 
  Settings as SettingsIcon, 
  Grid, 
  Play, 
  Check, 
  X, 
  MoreVertical,
  AlertCircle,
  User,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchMySubjects, fetchSubjectStudents } from "../api/teacher";
import { captureAndSend } from "../api/attendance";
import FaceOverlay from "../components/FaceOverlay";
import api from "../api/axiosClient";

export default function MarkAttendance() {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState("Present");
  const [mlStatus, setMlStatus] = useState("checking");

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [detections, setDetections] = useState([]);

  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceSubmitted, setAttendanceSubmitted] = useState(false);

  useEffect(() => {
    const checkMlService = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        setMlStatus("waking-up");
      }, 10000); 

      try {
        const response = await axios.get(import.meta.env.VITE_ML_SERVICE_URL, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 200) {
          setMlStatus("ready");
        }
      } catch {
        clearTimeout(timeoutId);
        setMlStatus("waking-up");
      }
    };

    checkMlService();
    const interval = setInterval(checkMlService, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = () => {
    switch (mlStatus) {
      case "ready":
        return (
          <span className="px-2.5 py-0.5 bg-[var(--success)]/10 text-[var(--success)] text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[var(--success)] rounded-full animate-pulse"></span>
            Live • Active
          </span>
        );
      case "waking-up":
        return (
          <span className="px-2.5 py-0.5 bg-[var(--warning)]/10 text-[var(--warning)] text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
            <AlertTriangle size={10} />
            Waking up...
          </span>
        );
      case "checking":
      default:
        return (
           <span className="px-2.5 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-body)] text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
             <Loader2 size={10} className="animate-spin" />
             Connecting...
           </span>
        );
    }
  };

  useEffect(() => {
    fetchMySubjects().then(setSubjects);
  }, []);

  useEffect(() => {
    if(!selectedSubject) return;
    fetchSubjectStudents(selectedSubject).then((data) => {
      setStudents(data);
      // Initialize attendance map directly here to avoid cascading render
      const initial = {};
      data.forEach((s) => {
        initial[s.student_id] = {
          name: s.name,
          roll: s.roll,
          count: 0,
          status: "absent",
        };
      });
      setAttendanceMap(initial);
    });
  }, [selectedSubject])

  useEffect(() => {
    if (!selectedSubject || !webcamRef.current) return;

    const interval = setInterval(() => {
      captureAndSend(webcamRef, selectedSubject, setDetections);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedSubject]);

  const presentStudents = Object.values(attendanceMap)
    .filter((s) => s.status === "present")
    .map((s) => ({
      studentId: Object.keys(attendanceMap).find(key => attendanceMap[key] === s),
      name: s.name,
      roll: s.roll,
    }));
    
  const absentStudents = Object.entries(attendanceMap)
    .filter(([, s]) => s.status === "absent")
    .map(([id, s]) => ({
      studentId: id,
      name: s.name,
      roll: s.roll,
    }));

  const handleConfirmAttendance = async () => {
    if (attendanceSubmitted) {
      alert("Attendance already marked for this session");
      return;
    }

    try {
      await api.post("/api/attendance/confirm", {
        subject_id: selectedSubject,
        present_students: presentStudents.map((s) => s.studentId),
        absent_students: absentStudents.map((s) => s.studentId),
      });

      setAttendanceSubmitted(true);
      alert("Attendance saved successfully");
    } catch {
      alert("Failed to save attendance");
    }
  };

  useEffect(() => {
    if (!detections.length) return;
    
    // Wrap in setTimeout to avoid synchronous state update warning (Cascading update)
    const timeoutId = setTimeout(() => {
      setAttendanceMap((prev) => {
        const updated = { ...prev };
        let hasChanges = false;

        detections.forEach((f) => {
          if (f.status !== "present" || !f.student) return;

          const id = f.student.id;

          if (!updated[id]) return;

          // increment detection count
          updated[id].count += 1;
          
          hasChanges = true;

          // mark present after 3 confirmations
          if (updated[id].count >= 3) {
            updated[id].status = "present";
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [detections]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">Start attendance session</h1>
            <p className="text-[var(--text-body)] mt-1">Use face recognition to mark students present in real-time</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--text-body)]">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>09:00 - 10:00</span>
            </div>
            <button
               onClick={() => navigate("/settings")}
               className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] bg-[var(--bg-card)] transition cursor-pointer text-[var(--text-body)]">
               <Settings size={16} /><span>Session settings</span>
            </button>
          </div>
        </div>

        {/* --- FILTERS ROW --- */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <label className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wide">Class</label>
            <select
                value={selectedSubject || ""}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option disabled value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-48">
            <label className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wide">Date</label>
            <input type="date" className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]" defaultValue="2025-03-12" />
          </div>
        </div>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: CAMERA FEED (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-semibold text-[var(--text-main)]">Camera feed</h3>
              {getStatusBadge()}
            </div>

            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-sm group">
              {/* Webcam Component */}
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                mirrored={true}
                className="w-full h-full object-cover"
              />

              {/* REAL FACE OVERLAY */}
              <FaceOverlay faces={detections} videoRef={webcamRef} />

              {/* Bottom Camera Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/60 to-transparent flex justify-between items-end">
                <div className="text-white/70 text-xs">
                  <p>Recognition running • Auto-marking present</p>
                  <p className="opacity-70">Tip: Ask students to face the camera directly.</p>
                </div>
                <div className="flex items-center gap-3">
                   <button className="p-2 bg-white/10 hover:bg-white/20 text-[var(--text-on-primary)] rounded-lg transition backdrop-blur-md">
                     <Grid size={20} />
                   </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: DETECTED STUDENTS LIST (4 cols) */}
          <div className="lg:col-span-4 flex flex-col h-full min-h-[500px] bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden">
            
            {/* List Header */}
            <div className="p-4 border-b border-[var(--border-color)] space-y-4">
              <div>
                <h3 className="font-semibold text-[var(--text-main)]">Detected students</h3>
                <p className="text-xs text-[var(--text-body)]">Auto-marking based on face recognition</p>
              </div>

              {/* Tabs */}
              <div className="flex p-1 bg-[var(--bg-secondary)] rounded-lg">
                <button 
                  onClick={() => setActiveTab("Present")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${activeTab === "Present" ? "bg-[var(--primary)] text-[var(--text-on-primary)] shadow-sm" : "text-[var(--text-body)] opacity-80 hover:opacity-100"}`}
                >
                  Present ({presentStudents.length})
                </button>
                <button 
                  onClick={() => setActiveTab("All")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${activeTab === "All" ? "bg-[var(--primary)] text-[var(--text-on-primary)] shadow-sm" : "text-[var(--text-body)] opacity-80 hover:opacity-100"}`}
                >
                  All students ({students.length})
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70" />
                <input 
                  type="text" 
                  placeholder="Search by name or roll no." 
                  className="w-full pl-9 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeTab === "Present" &&
                presentStudents.map((s) => (
                  <div
                    key={s.studentId}
                    className="p-3 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/25 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-main)]">{s.name}</h4>
                      <p className="text-xs text-[var(--success)]">{s.roll}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-[var(--success)] text-[var(--text-on-primary)] text-[10px] rounded-full font-bold">
                      Present
                    </span>
                  </div>
                ))}

              {activeTab === "All" &&
                Object.entries(attendanceMap).map(([id, s]) => (
                  <div
                    key={id}
                    className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text-main)]">{s.name}</h4>
                      <p className="text-xs text-[var(--text-body)]">{s.roll}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[var(--text-on-primary)] text-[10px] rounded-full font-bold ${
                        s.status === "present"
                          ? "bg-[var(--success)]"
                          : "bg-[var(--text-body)]/40"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                ))}
            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
              <div className="flex justify-between items-center text-xs mb-3 text-[var(--text-body)]">
                <span>{presentStudents.length} present</span>
                <span>• {absentStudents.length} absent</span>
              </div>

              <button disabled={attendanceSubmitted} onClick={handleConfirmAttendance} className={`w-full py-3 rounded-xl font-semibold shadow-md transition flex items-center justify-center gap-2
                ${
                  attendanceSubmitted
                    ? "bg-[var(--bg-secondary)] cursor-not-allowed text-[var(--text-body)]"
                    : "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-on-primary)]"
                }
              `}>
                {attendanceSubmitted ? "Attendance Submitted" : "Confirm Attendance"}
                <Check size={18} />
              </button>
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
}