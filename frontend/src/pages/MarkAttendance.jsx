import React, { useRef, useState, useCallback } from "react";
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

export default function MarkAttendance() {
  const webcamRef = useRef(null);
  const [snap, setSnap] = useState(null);
  const [status, setStatus] = useState("Idle");
  const [activeTab, setActiveTab] = useState("Present");
  const [isSessionActive, setIsSessionActive] = useState(true);

  // --- Existing Functionalities ---
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setSnap(imageSrc);
    // Auto-submit on capture for this demo flow
    submitImage(imageSrc);
  }, [webcamRef]);

  const submitImage = async (imageSrc) => {
    setStatus("Processing...");
    try {
      // Mocking the backend call logic from your previous code
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSrc })
      });
      const json = await res.json();
      setStatus("Done: " + (json.detected?.length || 0) + " detected");
    } catch (err) {
      // For demo purposes, we settle to 'Idle' or 'Error'
      setStatus("Idle"); 
      console.log("Mock submission (backend likely not running)");
    }
  };
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
            <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white transition">
              <Settings size={16} />
              <span>Session settings</span>
            </button>
          </div>
        </div>

        {/* --- FILTERS ROW --- */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <label className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wide">Class</label>
            <select className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-[var(--text-main)] focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
              <option>CSE 3A • Data Structures</option>
              <option>CSE 3B • Algorithms</option>
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
                className="w-full h-full object-cover opacity-90"
              />

              {/* Mock Overlay UI (Bounding Boxes) */}
              <div className="absolute inset-0 p-6 pointer-events-none">
                 {/* Green Box (Identified) */}
                 <div className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-green-400 rounded-lg bg-green-400/10">
                    <span className="absolute -top-6 left-0 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded">Rahul S. (98%)</span>
                 </div>
                 {/* Yellow Box (Uncertain) */}
                 <div className="absolute top-1/3 right-1/4 w-32 h-32 border-2 border-amber-400 rounded-lg bg-amber-400/10">
                    <span className="absolute -top-6 left-0 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded">Check ID</span>
                 </div>
                 
                 {/* Overlay Stats Pills */}
                 <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    <div className="bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                      3 identified
                    </div>
                    <div className="bg-red-500/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                      1 needs review
                    </div>
                 </div>

                 {/* Instructions */}
                 <div className="absolute top-4 left-4 bg-black/30 backdrop-blur text-white/80 px-3 py-1.5 rounded-lg text-xs border border-white/10">
                   Ensure good lighting and all faces visible
                 </div>
              </div>

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
                   <button 
                     onClick={capture}
                     className="p-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-lg hover:scale-105 transition active:scale-95"
                   >
                     <Play size={24} fill="currentColor" />
                   </button>
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
              {/* Card 1: Present */}
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">RS</div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">Rahul Sharma</h4>
                    <p className="text-xs text-indigo-500">CSE3A-021</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold uppercase rounded-full">Present</span>
                  <button className="text-[10px] text-indigo-400 hover:text-indigo-600 font-medium">Set absent</button>
                </div>
              </div>

              {/* Card 2: Present */}
              <div className="p-3 rounded-xl bg-white border border-gray-100 hover:border-indigo-100 flex items-center justify-between group shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">PN</div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-main)]">Priya Nair</h4>
                    <p className="text-xs text-[var(--text-body)]">CSE3A-034</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold uppercase rounded-full">Present</span>
                  <button className="text-[10px] text-gray-400 hover:text-[var(--primary)] font-medium">Set absent</button>
                </div>
              </div>

              {/* Card 3: Late */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">AV</div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">Arjun Verma</h4>
                    <p className="text-xs text-blue-500">CSE3A-018</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold uppercase rounded-full">Late</span>
                  <button className="text-[10px] text-blue-400 hover:text-blue-600 font-medium">Set present</button>
                </div>
              </div>

              {/* Card 4: Unknown (Needs Review) */}
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                    <User size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">Unknown face</h4>
                    <p className="text-xs text-red-500">No match found</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold uppercase rounded-full">Unidentified</span>
                  <button className="text-[10px] text-red-500 hover:text-red-700 font-medium underline">Assign student</button>
                </div>
              </div>

            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="flex justify-between items-center text-xs text-[var(--text-body)] mb-3">
                 <span>32 present</span>
                 <span>• 3 late</span>
                 <span>• 10 absent</span>
              </div>
              <button className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl font-semibold shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                Confirm attendance
                <Check size={18} />
              </button>
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
}