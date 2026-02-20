import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import RotatingQR from "./RotatingQR";
import { 
  X, 
  Minimize2, 
  Info,
  ShieldCheck,
  StopCircle,
  Users
} from "lucide-react";
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';

// Helper for distance calculation (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
};

const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
};

export default function LiveAttendanceModal({ sessionId, subjectId, onClose, subjectName = "Attendance Session" }) {
  const socketRef = React.useRef(null);
  const [scannedStudents, setScannedStudents] = useState([]);
  const [teacherLocation, setTeacherLocation] = useState(null);
  const [activeTab, setActiveTab] = useState("Present");
  const isMounted = React.useRef(true);

  // Timer state for QR refresh
  const [timeLeft, setTimeLeft] = useState(5);
  const [qrToken, setQrToken] = useState("");

  // Get teacher's location on mount
  useEffect(() => {
    isMounted.current = true;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (isMounted.current) {
            setTeacherLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          }
        },
        (error) => {
            console.error("Error getting location:", error);
            // toast.error("Could not get your location for proxy detection.");
        }
      );
    }
    return () => { isMounted.current = false; };
  }, []);

  // Generate QR Token
  useEffect(() => {
    const generateToken = () => {
      const data = {
        subjectId,
        sessionId,
        date: new Date().toISOString(),
        token: `${sessionId}-${Date.now()}` // Unique token
      };
      setQrToken(JSON.stringify(data));
    };

    generateToken(); // Initial token

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateToken();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId, subjectId]);


  // Socket connection
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"], // explicit transports
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      newSocket.emit("join_session", { sessionId });
    });

    newSocket.on("student_scanned", (data) => {
      // data: { student: { name, roll, avatar }, timestamp, location: { lat, lon } }
      setScannedStudents((prev) => {
        // Deduplicate using roll number or ID if available
        if (prev.some(s => s.student.roll === data.student.roll)) return prev;
        return [data, ...prev]; 
      });
    });
    
    // Safety warning on refresh/close
    const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId]);

  const handleStopAndSave = async () => {
    // In a real implementation: API call to finalize session
    // For MVP: we just close and assume backend auto-saved or we trigger a save event
    if (socketRef.current) {
        socketRef.current.emit("end_session", { sessionId });
    }
    
    // Simulate API call delay
    const toastId = toast.loading("Saving attendance data...");
    
    setTimeout(() => {
        if (isMounted.current) {
            toast.success("Session saved successfully!", { id: toastId });
            // Generate summary data to pass back if needed, or just close
            onClose();
        }
    }, 1000);
  };
  
  const handleMinimize = () => {
    // TODO: Implement true minimize (keep socket alive in background)
    // For now, we will just toast and close, but in full app this should dock.
    toast("Minimizing session...", { icon: 'ℹ️' });
    onClose(); 
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-[var(--bg-card)] rounded-2xl w-full max-w-[1100px] h-[80vh] flex flex-col shadow-2xl overflow-hidden relative border border-[var(--border-color)]">
        
        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-start bg-[var(--bg-card)]">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
              Live Attendance Session
            </h2>
            <p className="text-sm font-medium text-[var(--text-body)]">{subjectName} • {new Date().toLocaleDateString()}</p>
            <div className="flex items-center gap-3 mt-3">
                <span className="text-xs font-medium text-[var(--text-body)]">Session ID: {sessionId.slice(0, 8)}...</span>
                <div className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)] flex items-center gap-1.5 ">
                    <ShieldCheck size={14} fill="currentColor" className="text-[var(--primary)]/20" strokeWidth={2} />
                    Secure QR mode
                </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-full text-[var(--text-body)]/60 hover:text-[var(--text-body)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content - Split Screen */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden px-6 pb-4 gap-6">
          
          {/* Left Panel: QR & Controls */}
          <div className="w-full md:w-5/12 flex flex-col h-full bg-[var(--primary)]/5 rounded-3xl p-6 relative overflow-hidden border border-[var(--primary)]/10">
             
            <div className="flex justify-between items-center mb-4 relative z-10 w-full">
                <h3 className="font-semibold text-[var(--text-body)] text-sm">Teacher command center</h3>
                <div className="px-2.5 py-1 bg-[var(--success)]/10 text-[var(--success)] text-[10px] font-bold rounded-full flex items-center gap-1.5 shadow-sm border border-[var(--success)]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse"></span>
                    Live • {scannedStudents.length} checked in
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10 mb-8">
                <div className="relative">
                    {/* Rotating Time Indicator (SVG Ring) */}
                    <div className="absolute -inset-4 flex items-center justify-center pointer-events-none">
                         <svg className="w-[300px] h-[300px] -rotate-90">
                            {/* Background Track */}
                            <circle 
                                cx="150" cy="150" r="144" 
                                className="stroke-[var(--primary)]/20 fill-none" 
                                strokeWidth="4"
                            />
                            {/* Animated Progress */}
                            <circle 
                                cx="150" cy="150" r="144" 
                                className="stroke-[var(--primary)] fill-none transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                                strokeWidth="4"
                                strokeDasharray="904.78" // 2 * PI * 144
                                strokeDashoffset={904.78 - (904.78 * timeLeft) / 5}
                                strokeLinecap="round"
                            />
                         </svg>
                    </div>
                    
                    {/* White Card Container */}
                    <div className="relative p-6 bg-[var(--bg-card)] rounded-2xl shadow-xl shadow-[var(--primary)]/20 border border-[var(--bg-card)] z-10">
                        <RotatingQR 
                           token={qrToken} 
                           onClose={() => {}} 
                           compact={true} 
                        />
                    </div>
                </div>
                {/* Timer Text */}
                <p className="text-[var(--warning)] font-bold text-xs mt-6 relative z-10">Code refreshes in: {timeLeft.toString().padStart(2, '0')}s</p>
            </div>

            <div className="mt-auto flex items-end justify-between text-xs text-[var(--text-body)] relative z-10 w-full mb-1">
                <div className="flex items-start gap-1.5 max-w-[160px]">
                    <div className="mt-0.5 text-[var(--primary)]">
                        <Info size={14} />
                    </div>
                    <p className="leading-tight text-[var(--text-body)] font-medium">Ask students to scan from the Student app</p>
                </div>
                <span className="opacity-40 font-bold text-[10px]">Auto-rotate every 5s</span>
            </div>
            
            {/* Decorative background blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--primary)]/20 rounded-full blur-3xl pointer-events-none"></div>
          </div>

          {/* Right Panel: Live Feed */}
          <div className="w-full md:w-7/12 flex flex-col h-full border border-[var(--border-color)] rounded-3xl bg-[var(--bg-card)] shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-2">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-bold text-[var(--text-main)] text-base">Live check-in feed</h3>
                        <p className="text-xs text-[var(--text-body)] mt-1 font-medium">Newest scans appear at the top</p>
                    </div>
                    <div className="flex bg-[var(--bg-card)] gap-2">
                        <button 
                            onClick={() => setActiveTab('Present')}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition border ${activeTab === 'Present' ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' : 'text-[var(--text-body)] border-[var(--border-color)] hover:text-[var(--text-main)]'}`}
                        >
                            Present • {scannedStudents.length}
                        </button>
                        <button 
                            onClick={() => setActiveTab('All')}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition border ${activeTab === 'All' ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' : 'text-[var(--text-body)] border-[var(--border-color)] hover:text-[var(--text-main)]'}`}
                        >
                            All students
                        </button>
                    </div>
                </div>
                
                <div className="flex justify-between text-[10px] font-bold text-[var(--text-body)] uppercase tracking-widest mb-2 border-b border-[var(--border-color)] pb-2">
                    <span className="pl-2">Student</span>
                    <span className="pr-2">Status</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
                {activeTab === 'All' ? (
                     <div className="h-full flex flex-col items-center justify-center text-[var(--text-body)] gap-3 opacity-60">
                        <Users size={32} strokeWidth={1.5} />
                        <p className="text-sm font-medium">Full student list not available in live view</p>
                     </div>
                ) : (
                    scannedStudents.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-body)] gap-3">
                            <div className="w-12 h-12 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center">
                                <Users size={20} className="opacity-30" />
                            </div>
                            <p className="text-xs font-medium opacity-50">Waiting for scans...</p>
                        </div>
                    ) : (
                        scannedStudents.map((scan) => {
                            let isProxy = false;
                            
                            // Check for location data (supports {lat, lon} or {lat, lng} or {latitude, longitude})
                            const lat = scan.location?.lat || scan.location?.latitude;
                            const lon = scan.location?.lon || scan.location?.lng || scan.location?.longitude;

                            if (teacherLocation && lat && lon) {
                                const distance = calculateDistance(
                                    teacherLocation.latitude, 
                                    teacherLocation.longitude,
                                    lat,
                                    lon
                                );
                                if (distance > 50) isProxy = true; 
                            }
    
                            return (
                                <div 
                                    key={scan.student.roll || scan.student.id || scan.timestamp} 
                                    className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 animate-in slide-in-from-top-2 border ${
                                        isProxy ? 'bg-[var(--danger)]/10 border-[var(--danger)]/10' : 'bg-[var(--success)]/10 border-[var(--success)]/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-9 h-9 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--bg-card)] shadow-sm">
                                                {/* Avatar: Ideally fetch from DB/URL */}
                                                 <img 
                                                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${scan.student.name}`} 
                                                    alt="avatar"
                                                    className="w-full h-full object-cover"
                                                 />
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <h4 className="font-bold text-[var(--text-main)] text-sm leading-tight">{scan.student.name}</h4>
                                            <p className="text-[10px] text-[var(--text-body)] font-medium flex items-center gap-1">
                                                Roll {scan.student.roll} • <span className="text-[var(--text-body)]/40">•</span> <span className="text-[var(--text-body)]/60">{formatTimeAgo(scan.timestamp)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="">
                                        {isProxy ? (
                                            <span className="px-3 py-1 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg text-xs font-bold">
                                                Pending
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-[var(--success)]/20 text-[var(--success)] rounded-lg text-xs font-bold">
                                                Present
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )
                )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex justify-between items-center z-20">
            <div>
                 <p className="font-bold text-[var(--text-main)] text-sm">Stop & save to lock this session.</p>
                 <p className="text-xs text-[var(--text-body)] font-medium">Students who haven&apos;t scanned will remain marked absent until updated manually.</p>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={handleMinimize}
                    className="px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-body)] font-bold hover:opacity-80 transition flex items-center gap-2 text-sm"
                >
                    <Minimize2 size={16} /> Minimize
                </button>
                <button 
                    onClick={handleStopAndSave}
                    className="px-5 py-2 rounded-lg bg-[var(--danger)] text-white font-bold hover:opacity-90 transition shadow-lg shadow-[var(--danger)]/20 flex items-center gap-2 text-sm"
                >
                    <StopCircle size={16} /> Stop & save
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

LiveAttendanceModal.propTypes = {
  sessionId: PropTypes.string.isRequired,
  subjectId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  subjectName: PropTypes.string,
};
