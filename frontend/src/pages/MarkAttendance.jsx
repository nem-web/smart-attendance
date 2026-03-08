import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { useTranslation } from "react-i18next";
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
  AlertTriangle,
  QrCode,
  Wifi,
  WifiOff,
  Radio
} from "lucide-react";
import { saveOfflineAttendance, getOfflineAttendanceCount } from "../utils/offlineStorage";
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import { fetchMySubjects, fetchSubjectStudents } from "../api/teacher";
import FaceOverlay from "../components/FaceOverlay";
import api from "../api/axiosClient";
import StartAttendanceModal from "../components/attendance/StartAttendanceModal";

export default function MarkAttendance() {
  const { t } = useTranslation();
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
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  


  // const [_currentCoords, setCurrentCoords] = useState(null);

  const [showQRModal, setShowQRModal] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user"
  };
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const checkCount = async () => {
      try {
        const count = await getOfflineAttendanceCount();
        setPendingSyncCount(count);
      } catch (e) {
        console.error("Error getting offline count:", e);
      }
    };
    
    checkCount();
    
    const handleOnline = () => {
      setIsOffline(false);
      toast.success(t('mark_attendance.alerts.online_restored'));
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SYNC_NOW' });
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      toast(t('mark_attendance.alerts.offline_mode'), { icon: '⚠️' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const messageHandler = (event) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        toast.success(t('mark_attendance.alerts.synced_success'));
        checkCount();
      }
    };

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', messageHandler);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      }
    };
  }, [t]);
  
  const [locationError, setLocationError] = useState(
    !navigator.geolocation ? "Geolocation is not supported by your browser" : null
  );
  const currentCoordsRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        currentCoordsRef.current = coords;
        setLocationError(null);
      },
      (err) => {
        console.error("Location error:", err);
        setLocationError("Location access denied. Please enable location services.");
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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
    if (isOffline) {
      return (
        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold uppercase rounded-full flex items-center gap-1.5 border border-gray-200">
          <WifiOff size={10} />
          {t('mark_attendance.status.offline')}
        </span>
      );
    }

    switch (mlStatus) {
      case "ready":
        return (
          <span className="px-2.5 py-0.5 bg-[var(--success)]/10 text-[var(--success)] text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[var(--success)] rounded-full animate-pulse"></span>
            {t('mark_attendance.status.live')}
          </span>
        );
      case "waking-up":
        return (
          <span className="px-2.5 py-0.5 bg-[var(--warning)]/10 text-[var(--warning)] text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
            <AlertTriangle size={10} />
            {t('mark_attendance.status.waking_up')}
          </span>
        );
      case "processing":
        return (
           <span className="px-2.5 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-body)] text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
             <Loader2 size={10} className="animate-spin" />
             {t('mark_attendance.status.processing') || "Processing"}
           </span>
        );
      case "checking":
      default:
        return (
           <span className="px-2.5 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-body)] text-xs font-bold uppercase rounded-full flex items-center gap-1.5">
             <Loader2 size={10} className="animate-spin" />
             {t('mark_attendance.status.connecting')}
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

  const wsRef = useRef(null);
  const frameInFlightRef = useRef(false);
  const disconnectRef = useRef(false);

  useEffect(() => {
    if (!selectedSubject || attendanceSubmitted) return;

    disconnectRef.current = false;
    let reconnectTimeout;

    const connectWebSocket = async () => {
      if (disconnectRef.current) return;

      // Determine WebSocket URL
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const wsBase = apiBase.replace(/^http/, "ws");
      const sessionId = `mk-${Date.now()}`;
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.warn("WS Connect: No token found in localStorage");
        setMlStatus("checking");
        // Trigger a check to potentially redirect
        api.get('/auth/me').catch(e => console.error("Auth check failed", e));
        return;
      }

      const wsUrl = `${wsBase}/attendance/ws/${sessionId}?token=${token}`;

      console.log("Connecting WS:", `${wsBase}/attendance/ws/${sessionId}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket Connected");
        setMlStatus("ready");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "processing_started") {
            frameInFlightRef.current = true;
            setMlStatus("processing");
            setDetections([]); // Clear previous frame results
          } else if (data.type === "match_update") {
            const match = data.match;
            setDetections((prev) => [...prev, match]);

            if (match.status === "present" && match.student) {
              setAttendanceMap((prev) => {
                const id = match.student.id;
                if (!prev[id]) return prev;
                const updated = { ...prev };
                const s = { ...updated[id] };
                s.count = (s.count || 0) + 1;
                if (s.count >= 3) s.status = "present";
                updated[id] = s;
                return updated;
              });
            }
          } else if (data.type === "complete") {
            frameInFlightRef.current = false;
            setMlStatus(data.status === "failed" ? "checking" : "ready");
          } else if (data.type === "error") {
            frameInFlightRef.current = false;
            setMlStatus("checking");
            console.error("WS Error:", data.message);
          }
        } catch (err) {
          console.error("WS Message Parse Error:", err);
        }
      };

      ws.onclose = async (event) => {
        if (disconnectRef.current) return;

        frameInFlightRef.current = false;
        setMlStatus("checking");
        console.log("WebSocket Disconnected", event.code);

        // 1008: Policy Violation (Auth failed), 1006: Abnormal Closure
        if (event.code === 1008 || event.code === 1006) {
          console.log("WS Auth/Connection issue. Attempting refresh...");
          try {
             // Use api client to trigger refresh flow if 401
             await api.get('/auth/me').catch(() => {});
             // If we are still here (not redirected by interceptor), try reconnecting
             reconnectTimeout = setTimeout(connectWebSocket, 2000);
          } catch (e) {
             console.error("WS Reconnect failed", e);
          }
        }
      };
    };

    connectWebSocket();

    // Send frame periodically via WebSocket
    const interval = setInterval(() => {
      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN &&
        webcamRef.current &&
        !frameInFlightRef.current
      ) {
        const image = webcamRef.current.getScreenshot();
        if (image) {
          frameInFlightRef.current = true;
          wsRef.current.send(JSON.stringify({
            command: "process_frame",
            image,
            subject_id: selectedSubject
          }));
        }
      }
    }, 1000); // 1 second interval

    return () => {
      disconnectRef.current = true;
      clearInterval(interval);
      clearTimeout(reconnectTimeout);
      frameInFlightRef.current = false;
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedSubject, attendanceSubmitted]);

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
      toast.error(t('mark_attendance.alerts.already_marked'));
      return;
    }

    const payload = {
      subject_id: selectedSubject,
      present_students: presentStudents.map((s) => s.studentId),
      absent_students: absentStudents.map((s) => s.studentId),
    };

    if (!navigator.onLine) {
      try {
        await saveOfflineAttendance(payload);
        setAttendanceSubmitted(true);
        const count = await getOfflineAttendanceCount();
        setPendingSyncCount(count);
        
        // Register sync if possible (modern Chrome)
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
           const setupSync = async () => {
             const reg = await navigator.serviceWorker.ready;
             return reg.sync.register('sync-attendance');
           };
           setupSync().catch(console.error);
        }

        toast.success(t('mark_attendance.alerts.saved_offline'));
      } catch (err) {
        console.error(err);
        toast.error(t('mark_attendance.alerts.offline_save_failed'));
      }
      return;
    }

    try {
      await api.post("/api/attendance/confirm", {
        subject_id: selectedSubject,
        date: selectedDate,
        present_students: presentStudents.map((s) => s.studentId),
        absent_students: absentStudents.map((s) => s.studentId),
      });

      setAttendanceSubmitted(true);
      toast.success(t('mark_attendance.alerts.success'));
    } catch {
      toast.error(t('mark_attendance.alerts.failed'));
    }
  };



  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">{t('mark_attendance.title')}</h1>
            <p className="text-[var(--text-body)] mt-1">{t('mark_attendance.subtitle')}</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--text-body)]">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>09:00 - 10:00</span>
            </div>
            <button
              onClick={() => {
                if (!selectedSubject) {
                  alert(t('mark_attendance.alerts.select_subject_first'));
                  return;
                }
                setSessionId(`${selectedSubject}-${Date.now()}`);
                setShowQRModal(true);
              }}
              disabled={!selectedSubject}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                selectedSubject
                  ? 'bg-[var(--primary)] text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)] cursor-pointer'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-body)]/80 cursor-not-allowed'
              }`}
            >
              <QrCode size={16} />
              <span>{t('mark_attendance.start_qr_session')}</span>
            </button>
            <button
               onClick={() => navigate("/settings")}
               className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] bg-[var(--bg-card)] transition cursor-pointer text-[var(--text-body)]">
               <Settings size={16} /><span>{t('mark_attendance.session_settings')}</span>
            </button>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQRModal && selectedSubject && (
          <StartAttendanceModal 
            sessionId={sessionId}
            subjectId={selectedSubject}
            onClose={() => setShowQRModal(false)} 
          />
        )}

        {/* --- FILTERS ROW --- */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <label className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wide">{t('mark_attendance.class_label')}</label>
            <select
                value={selectedSubject || ""}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setAttendanceSubmitted(false);
                  setDetections([]);
                }}
                className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option disabled value="">{t('mark_attendance.select_subject')}</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-48">
            <label className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wide">{t('mark_attendance.date_label')}</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]" 
            />
          </div>
        </div>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {locationError && (
            <div className="lg:col-span-12 flex items-center gap-3 p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/25 text-[var(--danger)]">
               <AlertCircle className="w-5 h-5 flex-shrink-0" />
               <div>
                 <h4 className="font-semibold text-sm">{t('mark_attendance.alerts.location_issue_title')}</h4>
                 <p className="text-xs">{locationError}</p>
               </div>
            </div>
          )}
          
          {/* LEFT: CAMERA FEED (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-semibold text-[var(--text-main)]">{t('mark_attendance.camera_feed')}</h3>
              {getStatusBadge()}
            </div>

            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-sm group">
              {/* Webcam Component */}
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                width={1280}
                height={720}
                mirrored={true}
                className="w-full h-full object-contain"
              />

              {/* REAL FACE OVERLAY */}
              <FaceOverlay faces={detections} videoRef={webcamRef} mirrored={false} />

              {/* Overlay for "Select Subject" */}
              {!selectedSubject && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-20 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-[var(--bg-card)]/80 p-6 rounded-2xl flex flex-col items-center gap-2 border border-[var(--border-color)]">
                     <AlertCircle size={32} className="text-[var(--text-body)]" />
                     <p className="font-bold text-[var(--text-main)]">Select a subject first</p>
                     <p className="text-xs text-[var(--text-body)]">Face recognition will start automatically</p>
                  </div>
                </div>
              )}

              {/* Bottom Camera Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex justify-between items-end">
                <div className="text-white/80 text-xs font-medium">
                  {selectedSubject ? (
                      <>
                        <p className="flex items-center gap-1.5"><Radio size={12} className="text-green-400 animate-pulse" /> Recognition Active</p>
                        <p className="opacity-70 mt-0.5">Liveness Check Enabled</p>
                      </>
                  ) : (
                      <p className="opacity-50">Waiting for subject selection...</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                   <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition backdrop-blur-md">
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
                <h3 className="font-semibold text-[var(--text-main)]">{t('mark_attendance.detected_students.title')}</h3>
                <p className="text-xs text-[var(--text-body)]">{t('mark_attendance.detected_students.subtitle')}</p>
              </div>

              {/* Tabs */}
              <div className="flex p-1 bg-[var(--bg-secondary)] rounded-lg">
                <button 
                  onClick={() => setActiveTab("Present")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${activeTab === "Present" ? "bg-[var(--primary)] text-[var(--text-on-primary)] shadow-sm" : "text-[var(--text-body)] opacity-80 hover:opacity-100"}`}
                >
                  {t('mark_attendance.tabs.present')} ({presentStudents.length})
                </button>
                <button 
                  onClick={() => setActiveTab("All")}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${activeTab === "All" ? "bg-[var(--primary)] text-[var(--text-on-primary)] shadow-sm" : "text-[var(--text-body)] opacity-80 hover:opacity-100"}`}
                >
                  {t('mark_attendance.tabs.all')} ({students.length})
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70" />
                <input 
                  type="text" 
                  placeholder={t('mark_attendance.search_placeholder')}
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
                      {t('mark_attendance.summary.present')}
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
                      {t(`mark_attendance.summary.${s.status}`)}
                    </span>
                  </div>
                ))}
            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
              {pendingSyncCount > 0 && (
                <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-center gap-2 animate-pulse">
                   <WifiOff size={14} />
                   <span className="font-semibold">{pendingSyncCount} {t('mark_attendance.alerts.pending_sync_records')}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs mb-3 text-[var(--text-body)]">
                <span>{presentStudents.length} {t('mark_attendance.summary.present')}</span>
                <span>• {absentStudents.length} {t('mark_attendance.summary.absent')}</span>
              </div>

              <button disabled={attendanceSubmitted} onClick={handleConfirmAttendance} className={`w-full py-3 rounded-xl font-semibold shadow-md transition flex items-center justify-center gap-2
                ${
                  attendanceSubmitted
                    ? "bg-[var(--bg-secondary)] cursor-not-allowed text-[var(--text-body)]"
                    : "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-on-primary)]"
                }
              `}>
                {attendanceSubmitted ? t('mark_attendance.submitted_button') : t('mark_attendance.confirm_button')}
                <Check size={18} />
              </button>
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
}