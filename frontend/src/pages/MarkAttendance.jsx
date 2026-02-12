import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { 
  Settings, 
  Clock, 
  Search, 
  Grid, 
  Play, 
  Check, 
  X, 
  MoreVertical,
  AlertCircle,
  User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchMySubjects, fetchSubjectStudents } from "../api/teacher";
import { captureAndSend } from "../api/attendance";
import FaceOverlay from "../components/FaceOverlay";
import api from "../api/axiosClient";

export default function MarkAttendance() {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const [snap, setSnap] = useState(null);
  const [activeTab, setActiveTab] = useState("Present");
  const [isSessionActive, setIsSessionActive] = useState(true);

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [detections, setDetections] = useState([]);

  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceSubmitted, setAttendanceSubmitted] = useState(false);



  // Simulating the fetch call you had
  useEffect(() => {
    fetchMySubjects().then(setSubjects);
  }, []);

  useEffect(() => {
    if(!selectedSubject) return;
    fetchSubjectStudents(selectedSubject).then(setStudents);
  }, [selectedSubject])

  useEffect(() => {
    if (!students.length) return;

    const initial = {};
    students.forEach((s) => {
      initial[s.student_id] = {
        name: s.name,
        roll: s.roll,
        count: 0,
        status: "absent",
      };
    });

    setAttendanceMap(initial);
  }, [students]);


  const verifiedStudents = students.filter(
    (s) => s.verified === true
  );

  // --- Existing Functionalities ---
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setSnap(imageSrc);
    // Auto-submit on capture for this demo flow
    submitImage(imageSrc);
  }, [webcamRef]);

  useEffect(() => {
    if (!selectedSubject || !webcamRef.current) return;

    const interval = setInterval(() => {
      captureAndSend(webcamRef, selectedSubject, setDetections);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedSubject]);

  const presentStudents = Object.entries(attendanceMap)
    .filter(([, s]) => s.status === "present")
    .map(([id, s]) => ({
      studentId: id,
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
    } catch (err) {
      console.error(err);
      alert("Failed to save attendance");
    }
  };

  useEffect(() => {
    if (!detections.length) return;

    // eslint-disable-next-line
    setAttendanceMap((prev) => {
      const updated = { ...prev };

      detections.forEach((f) => {
        if (f.status !== "present" || !f.student) return;

        const id = f.student.id;

        if (!updated[id]) return;

        // increment detection count
        updated[id].count += 1;

        // mark present after 3 confirmations
        if (updated[id].count >= 3) {
          updated[id].status = "present";
        }
      });

      return updated;
    });
    console.log("Detections:", detections);
  }, [detections]);






  // -------------------------------

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
            <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white transition cursor-pointer">
              <Settings size={16} />
              <span className="session-settings" onClick={()=>navigate("/settings")}>Session settings</span>
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
                className="flex items-center gap-1 text-sm font-medium text-gray-600 px-3 py-1.5 hover:bg-gray-100 rounded-lg whitespace-nowrap cursor-pointer"
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
            <input type="date" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-[var(--text-main)] outline-none" defaultValue="2025-03-12" />
          </div>
        </div>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: CAMERA FEED (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-semibold text-[var(--text-main)]">Camera feed</h3>
              <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span>
                Live • Active
              </span>
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
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex justify-between items-end">
                <div className="text-white/70 text-xs">
                  <p>Recognition running • Auto-marking present</p>
                  <p className="opacity-70">Tip: Ask students to face the camera directly.</p>
                </div>
                <div className="flex items-center gap-3">
                   <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition backdrop-blur-md">
                     <Grid size={20} />
                   </button>
                   {/* <button 
                     onClick={capture}
                     className="p-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-lg hover:scale-105 transition active:scale-95"
                   >
                     <Play size={24} fill="currentColor" />
                   </button> */}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: DETECTED STUDENTS LIST (4 cols) */}
          <div className="lg:col-span-4 flex flex-col h-full min-h-[500px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            
            {/* List Header */}
            <div className="p-4 border-b border-gray-100 space-y-4">
              <div>
                <h3 className="font-semibold text-[var(--text-main)]">Detected students</h3>
                <p className="text-xs text-[var(--text-body)]">Auto-marking based on face recognition</p>
              </div>

              {/* Tabs */}
              <div className="flex p-1 bg-gray-50 rounded-lg">
                <button 
                  onClick={() => setActiveTab("Present")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${activeTab === "Present" ? "bg-[var(--primary)] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Present (32)
                </button>
                <button 
                  onClick={() => setActiveTab("All")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${activeTab === "All" ? "bg-[var(--primary)] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  All students (45)
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search by name or roll no." 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeTab === "Present" &&
                presentStudents.map((s) => (
                  <div
                    key={s.studentId}
                    className="p-3 rounded-xl bg-green-50 border border-green-200 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold">{s.name}</h4>
                      <p className="text-xs text-green-600">{s.roll}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] rounded-full font-bold">
                      Present
                    </span>
                  </div>
                ))}

              {activeTab === "All" &&
                Object.entries(attendanceMap).map(([id, s]) => (
                  <div
                    key={id}
                    className="p-3 rounded-xl bg-white border border-gray-100 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-semibold">{s.name}</h4>
                      <p className="text-xs text-gray-500">{s.roll}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-white text-[10px] rounded-full font-bold ${
                        s.status === "present"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                ))}
            </div>


            {/* Sticky Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="flex justify-between items-center text-xs mb-3">
                <span>{presentStudents.length} present</span>
                <span>• {absentStudents.length} absent</span>
              </div>

              <button disabled={attendanceSubmitted} onClick={handleConfirmAttendance} className={`w-full py-3 rounded-xl font-semibold shadow-md transition flex items-center justify-center gap-2
                ${
                  attendanceSubmitted
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white"
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