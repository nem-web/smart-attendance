import React, { useEffect, useState } from "react";
import { 
  Info, 
  Sliders, 
  Camera, 
  Moon, 
  Sun, 
  Monitor, 
  Bell, 
  Volume2, 
  Check, 
  Plus, 
  X,
  Upload,
  RefreshCw,
  Shield,
  Trash2,
  Share2,
  Sparkles,
  Code,
  Palette,
  Aperture,
  TreePine
} from "lucide-react";
import SettingsSidebar from "../components/SettingsSidebar";
import { useTheme } from "../theme/ThemeContext";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("Thresholds");
  
  // State for Thresholds
  const [warningVal, setWarningVal] = useState(75);
  const [safeVal, setSafeVal] = useState(85);

  // State for General
  const {theme, setTheme} = useTheme();

  const [notifications, setNotifications] = useState({ push: true, inApp: true, sound: false });

  // State for Face Settings
  const [liveness, setLiveness] = useState(true);
  const [sensitivity, setSensitivity] = useState(80);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
        
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Settings for Alex Johnson</h2>
          <p className="text-slate-500 mt-1">Configure attendance thresholds, profile and face recognition preferences</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full min-h-[600px]">
            
            {/* ================= GENERAL TAB ================= */}
            {activeTab === "General" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">General preferences</h3>
                  <p className="text-sm text-slate-500 mt-1">Customize how the app looks and how you receive alerts.</p>
                </div>

                {/* Theme Selection */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-800">Theme</label>
                  <div className="flex gap-4">
                    {['Light', 'Dark', 'Forest', 'Cyber'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTheme(mode)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl border font-medium transition-all ${
                          theme === mode 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                            : "border-gray-200 hover:bg-gray-50 text-slate-600"
                        }`}
                      >
                        {mode === 'Light' && <Sun size={18} />}
                        {mode === 'Dark' && <Moon size={18} />}
                        {mode === 'Forest' && <TreePine size={18} />}
                        {mode === 'Cyber' && <Monitor size={18} />}
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Notification Permissions */}
                <div className="space-y-6">
                  <label className="text-sm font-semibold text-slate-800">Notification permissions</label>
                  
                  {/* Toggle Item */}
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div className="flex gap-4">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg h-fit"><Bell size={20} /></div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">Push notifications</h4>
                        <p className="text-xs text-slate-500 mt-1">Allow browser notifications for critical events.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setNotifications({...notifications, push: !notifications.push})}
                      className={`w-12 h-6 rounded-full transition-colors relative ${notifications.push ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${notifications.push ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>

                  {/* Toggle Item */}
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div className="flex gap-4">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg h-fit"><Volume2 size={20} /></div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">Sound effects</h4>
                        <p className="text-xs text-slate-500 mt-1">Play a sound when a student is marked present.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setNotifications({...notifications, sound: !notifications.sound})}
                      className={`w-12 h-6 rounded-full transition-colors relative ${notifications.sound ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${notifications.sound ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>

                {/* Email Permissions */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-800">Email preferences</label>
                  <div className="space-y-3">
                    {['Daily attendance summary', 'Critical attendance alerts', 'Product updates'].map((item, idx) => (
                      <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                        <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center text-white group-hover:border-indigo-500 bg-white group-hover:shadow-sm transition-all has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600">
                          <input type="checkbox" defaultChecked={idx < 2} className="hidden" />
                          <Check size={14} />
                        </div>
                        <span className="text-sm text-slate-600 group-hover:text-slate-900">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                  <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200">Cancel</button>
                  <button className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#4338ca] shadow-md">Save changes</button>
                </div>
              </div>
            )}

            {/* ================= THRESHOLDS TAB ================= */}
            {activeTab === "Thresholds" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Attendance thresholds</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Define when a student is considered at risk or critical based on attendance percentage.
                  </p>
                </div>

                <div className="p-8 border border-gray-100 rounded-xl bg-white space-y-8 shadow-sm">
                  <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                     <label className="text-base font-semibold text-slate-800">Warning and critical ranges</label>
                     <div className="text-xs font-medium text-gray-400">
                       Warning: <span className="text-amber-600">{warningVal}% – {safeVal}%</span> · Critical: <span className="text-rose-600">&lt; {warningVal}%</span>
                     </div>
                  </div>

                  <div className="relative py-8 select-none px-2">
                    <div className="h-4 w-full rounded-full bg-gray-100 relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-rose-400" style={{ width: `${warningVal}%` }}></div>
                      <div className="absolute top-0 h-full bg-amber-400" style={{ left: `${warningVal}%`, width: `${safeVal - warningVal}%` }}></div>
                      <div className="absolute top-0 h-full bg-emerald-400" style={{ left: `${safeVal}%`, right: 0 }}></div>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-[3px] border-indigo-600 rounded-full shadow-md cursor-ew-resize z-20" style={{ left: `calc(${warningVal}% - 12px)` }}></div>
                    <div className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-[3px] border-indigo-600 rounded-full shadow-md cursor-ew-resize z-20" style={{ left: `calc(${safeVal}% - 12px)` }}></div>
                    
                    <div className="absolute top-14 w-full flex text-[11px] font-bold pointer-events-none mt-2">
                       <div className="flex items-center gap-1.5 absolute" style={{left: '2%'}}><span className="w-2 h-2 rounded-full bg-rose-500"></span><span className="text-slate-600">Critical zone</span></div>
                       <div className="flex items-center gap-1.5 absolute" style={{left: '52%'}}><span className="w-2 h-2 rounded-full bg-amber-500"></span><span className="text-slate-600">Warning zone</span></div>
                       <div className="flex items-center gap-1.5 absolute" style={{left: '87%'}}><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-slate-600">Safe zone</span></div>
                    </div>
                  </div>

                  <div className="bg-blue-600 rounded-xl p-5 flex items-start gap-4 shadow-sm text-white">
                     <Info className="flex-shrink-0 mt-0.5 opacity-90" size={20} />
                     <p className="text-sm leading-relaxed text-blue-50 font-medium">
                       Adjusting these values will update visual alerts across dashboards, student profiles and reports.
                     </p>
                  </div>

                  <div className="pt-8 flex justify-end gap-3 border-t border-gray-100">
                    <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 cursor-pointer">Cancel</button>
                    <button className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#4338ca] shadow-md cursor-pointer">Save changes</button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= PROFILE TAB ================= */}
            {activeTab === "Profile" && (
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Profile details</h3>
                    <p className="text-sm text-slate-500 mt-1">Keep your basic information and contact details up to date.</p>
                  </div>
                  <button className="text-indigo-600 text-sm font-medium hover:underline cursor-pointer">View public profile</button>
                </div>

                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-xl border border-gray-100">
                  <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-2xl font-bold text-slate-500 border-4 border-white shadow-sm">
                    AJ
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-slate-800">Alex Johnson</h4>
                    <p className="text-sm text-slate-500">Department of Computer Science</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-gray-50 transition shadow-sm cursor-pointer">
                    <Upload size={16} />
                    Change photo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Full Name</label>
                    <input type="text" defaultValue="Alex Johnson" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Role</label>
                    <input type="text" defaultValue="Assistant Professor" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                    <input type="email" defaultValue="alex.johnson@university.edu" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                    <input type="tel" defaultValue="+91 98765 43210" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700" />
                  </div>
                </div>

                <div className="space-y-3">
                   <label className="text-sm font-semibold text-slate-700">Subjects Taught</label>
                   <div className="flex flex-wrap gap-2">
                      {['Data Structures (CS201)', 'Operating Systems (CS204)', 'Algorithms (CS305)'].map(sub => (
                        <div key={sub} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-sm font-medium flex items-center gap-2">
                          {sub}
                          <button className="hover:text-indigo-900"><X size={14}/></button>
                        </div>
                      ))}
                      <button className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-full text-sm font-medium hover:border-indigo-400 hover:text-indigo-600 flex items-center gap-1 transition cursor-pointer">
                        <Plus size={14} /> Add subject
                      </button>
                   </div>
                </div>

                <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                  <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 cursor-pointer">Cancel</button>
                  <button className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#4338ca] shadow-md cursor-pointer">Save changes</button>
                </div>
              </div>
            )}

            {/* ================= FACE SETTINGS TAB ================= */}
            {activeTab === "Face settings" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Face recognition configuration</h3>
                  <p className="text-sm text-slate-500 mt-1">Manage enrolment data and tune the recognition engine parameters.</p>
                </div>

                {/* 1. Enrolment Status */}
                <div className="p-6 border border-gray-100 rounded-xl bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                        <Camera size={28} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Face data enrolled</h4>
                        <p className="text-sm text-slate-500">Last updated: 3 days ago via Mobile App</p>
                      </div>
                   </div>
                   <button className="px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm flex items-center gap-2 cursor-pointer">
                     <RefreshCw size={16} /> Re-calibrate
                   </button>
                </div>

                {/* 2. Recognition Sensitivity Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <label className="text-sm font-semibold text-slate-800">Recognition confidence threshold</label>
                     <span className="text-sm font-bold text-indigo-600">{sensitivity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="50" 
                    max="99" 
                    value={sensitivity} 
                    onChange={(e) => setSensitivity(e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-xs text-slate-500">
                    Higher values reduce false positives but might require better lighting conditions. Recommended: 80%.
                  </p>
                </div>

                {/* 3. Security Toggles */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-800">Security measures</h4>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div className="flex gap-4">
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg h-fit"><Shield size={20} /></div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">Liveness detection (Anti-spoofing)</h4>
                        <p className="text-xs text-slate-500 mt-1">Requires subjects to blink or move slightly to prevent photo attacks.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLiveness(!liveness)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${liveness ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${liveness ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>

                {/* 4. Danger Zone */}
                <div className="pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-rose-600 mb-4">Danger Zone</h4>
                  <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-xl">
                    <div>
                      <h5 className="text-sm font-semibold text-rose-900">Reset recognition model</h5>
                      <p className="text-xs text-rose-600 mt-1">This will clear all learned face patterns for this profile.</p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-100 transition shadow-sm flex items-center gap-2 cursor-pointer">
                      <Trash2 size={16} /> Reset data
                    </button>
                  </div>
                </div>

                 {/* Footer Buttons */}
                 <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                  <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 cursor-pointer">Discard</button>
                  <button className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#4338ca] shadow-md cursor-pointer">Apply settings</button>
                </div>

              </div>
            )}

            {/* ================= CREDITS TAB (NEW) ================= */}
            {activeTab === "Credits" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                       <h3 className="text-xl font-bold text-slate-800">Shoutout to our developers</h3>
                       <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Built with care</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      A small thank you page to celebrate the team behind the Smart Face Recognition Attendance System.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 shadow-sm transition cursor-pointer">
                      <Share2 size={16} /> Share appreciation
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition cursor-pointer">
                      <Sparkles size={16} /> Send thanks
                    </button>
                  </div>
                </div>

                {/* Highlight Card */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm">
                   <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md">
                      <Sparkles size={32} />
                   </div>
                   <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-800 mb-1">To the developers who made smart attendance possible</h4>
                      <p className="text-sm text-slate-600 leading-relaxed mb-3">
                        From camera calibration to face-matching accuracy, every detail in this system exists because of your patience, late nights, and clean commits.
                      </p>
                      <div className="flex flex-wrap gap-2">
                         <span className="px-3 py-1 bg-white text-blue-700 rounded-full text-xs font-semibold shadow-sm">Reliable sessions</span>
                         <span className="px-3 py-1 bg-white text-blue-700 rounded-full text-xs font-semibold shadow-sm">Secure data</span>
                         <span className="px-3 py-1 bg-white text-blue-700 rounded-full text-xs font-semibold shadow-sm">Smoother classes</span>
                      </div>
                   </div>
                </div>

                {/* Team Grid */}
                <div>
                   <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1">Core development team</h4>
                   <p className="text-sm text-slate-500 mb-4">The humans behind the code, models, and UI that keep attendance running smoothly.</p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Card 1 */}
                      <div className="p-5 border border-gray-100 rounded-xl hover:shadow-md transition-all bg-white group">
                         <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">PV</div>
                            <div>
                               <div className="font-bold text-slate-800">Priya Verma</div>
                               <div className="text-xs text-indigo-600 font-medium">Backend & APIs</div>
                            </div>
                         </div>
                         <div className="flex gap-2 mb-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium flex items-center gap-1"><Code size={10}/> Session engine</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">Scalability</span>
                         </div>
                         <p className="text-xs text-slate-500 italic border-l-2 border-indigo-100 pl-2">
                           "If attendance is instant and reliable, the backend is quietly doing its job."
                         </p>
                      </div>

                      {/* Card 2 */}
                      <div className="p-5 border border-gray-100 rounded-xl hover:shadow-md transition-all bg-white group">
                         <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">AM</div>
                            <div>
                               <div className="font-bold text-slate-800">Arjun Mehta</div>
                               <div className="text-xs text-emerald-600 font-medium">Face recognition</div>
                            </div>
                         </div>
                         <div className="flex gap-2 mb-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium flex items-center gap-1"><Aperture size={10}/> ML models</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">Camera tuning</span>
                         </div>
                         <p className="text-xs text-slate-500 italic border-l-2 border-emerald-100 pl-2">
                           "Your best attendance photo is the one our models never fail to recognise."
                         </p>
                      </div>

                      {/* Card 3 */}
                      <div className="p-5 border border-gray-100 rounded-xl hover:shadow-md transition-all bg-white group">
                         <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">SK</div>
                            <div>
                               <div className="font-bold text-slate-800">Sara Khan</div>
                               <div className="text-xs text-rose-500 font-medium">UI & UX</div>
                            </div>
                         </div>
                         <div className="flex gap-2 mb-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium flex items-center gap-1"><Palette size={10}/> Teacher portal</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">Student app</span>
                         </div>
                         <p className="text-xs text-slate-500 italic border-l-2 border-rose-100 pl-2">
                           "Simple layouts, clear states, and fewer taps for already-busy teachers."
                         </p>
                      </div>

                   </div>
                </div>

                <div className="text-center text-xs text-gray-400 mt-8 pt-8 border-t border-gray-50">
                   Thank you to every developer, designer, and tester who helped turn the Smart Face Recognition Attendance System from an idea into something teachers and students can use every day.
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}