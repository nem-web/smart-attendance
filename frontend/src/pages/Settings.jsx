import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  TreePine,
} from "lucide-react";
import SettingsSidebar from "../components/SettingsSidebar";
import { useTheme } from "../theme/ThemeContext";
import {
  getSettings,
  patchSettings,
  uploadAvatar,
  addSubject,
} from "../api/settings";
import AddSubjectModal from "../components/AddSubjectModal";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("Thresholds");

  const [showSubjectModal, setShowSubjectModal] = useState(false);

  // State for Thresholds
  const [warningVal, setWarningVal] = useState(75);
  const [safeVal, setSafeVal] = useState(85);
  const sliderRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'warning' | 'safe' | null

  useEffect(() => {
    const handleUp = () => setDragging(null);
    const handleMove = (e) => {
      if (!dragging || !sliderRef.current) return;
      
      const rect = sliderRef.current.getBoundingClientRect();
      const percent = Math.min(Math.max(0, ((e.clientX - rect.left) / rect.width) * 100), 100);
      
      if (dragging === 'warning') {
        const newVal = Math.round(percent);
        // Ensure warning doesn't cross safe
        if (newVal < safeVal - 1) { // keep at least 1% gap
          setWarningVal(newVal);
        }
      } else if (dragging === 'safe') {
        const newVal = Math.round(percent);
        // Ensure safe doesn't cross warning
        if (newVal > warningVal + 1) { // keep at least 1% gap
          setSafeVal(newVal);
        }
      }
    };
    
    if (dragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, warningVal, safeVal]);


  // State for Theme
  const { theme, setTheme } = useTheme();

  // Notifications
  const [notifications, setNotifications] = useState({
    push: true,
    inApp: true,
    sound: false,
  });

  // State for Face Settings
  const [liveness, setLiveness] = useState(true);
  const [sensitivity, setSensitivity] = useState(80);

  // State for email preff
  const [_emailPreferences, setEmailPreferences] = useState(false);

  // Contributors state
  const [contributors, setContributors] = useState([]);
  const [loadingContributors, setLoadingContributors] = useState(false);

  useEffect(() => {
    if (activeTab === "Credits") {
      setLoadingContributors(true);
      fetch("https://api.github.com/repos/udaykiran243/smart-attendance/contributors")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setContributors(data);
          }
        })
        .catch((err) => console.error("Failed to fetch contributors:", err))
        .finally(() => setLoadingContributors(false));
    }
  }, [activeTab]);

  // --- helper functions (inside your component) ---
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // compute initials for avatar fallback
  function getInitials(name) {
    if (!name) return "AJ";
    return name
      .split(" ")
      .map((s) => s[0]?.toUpperCase())
      .slice(0, 2)
      .join("");
  }
  const navigate = useNavigate();

  function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  navigate("/login");
  }


  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    branch: "",
    subjects: [],
    avatarUrl: null,
  });

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Extracted loader function for consistent data handling
  async function loadProfile(data) {
    setProfile({
      name: data?.name ?? "",
      email: data?.email ?? "",
      phone: data?.phone ?? "",
      role: data?.role ?? "",
      branch: data?.branch ?? "",
      subjects: data?.subjects ?? [],
      avatarUrl: data?.avatarUrl ?? null,
    });
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoadError(null);
        setLoaded(false);
        const data = await getSettings(); // your API helper

        console.log("GET /api/settings response:", data);

        if (!mounted) return;

        // Use consistent loader function
        await loadProfile(data);

        setTheme(data?.theme ?? data?.settings?.theme ?? "Light");

        setNotifications({
          push: data?.settings?.notifications?.push ?? true,
          inApp: data?.settings?.notifications?.inApp ?? true,
          sound: data?.settings?.notifications?.sound ?? false,
        });

        setEmailPreferences(data?.settings?.emailPreferences ?? []);

        setWarningVal(data?.settings?.thresholds?.warningVal ?? 75);
        setSafeVal(data?.settings?.thresholds?.safeVal ?? 85);

        setSensitivity(data?.settings?.faceSettings?.sensitivity ?? 80);
        setLiveness(data?.settings?.faceSettings?.liveness ?? true);
      } catch (err) {
        console.error("Settings load failed:", err);
        if (mounted) setLoadError(err.message || String(err));
      } finally {
        // always clear loading so UI can render either data or error
        if (mounted) setLoaded(true);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [setTheme]);

  useEffect(() => {
    if (loaded) console.log("Profile loaded:", profile);
  }, [loaded, profile]);

  // called when Save changes is pressed
  async function saveProfile() {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        profile: {
          name: profile.name,
          phone: profile.phone,
          role: profile.role,
          branch: profile.branch,
          subjects: profile.subjects,
          avatarUrl: profile.avatarUrl,
        },
        settings: {
          thresholds: {
            warningVal,
            safeVal,
          },
          notifications,
          faceSettings: {
            liveness,
            sensitivity,
          },
          theme,
        },
      };
      const updated = await patchSettings(payload); // your API helper
      // update local profile from server response (server returns serialized doc)
      const serverProfile =
        updated.profile ?? updated.settings?.profile ?? null;
      if (serverProfile) {
        await loadProfile(serverProfile);
      }
      // optional: show toast success
    } catch (err) {
      console.error("Save profile failed", err);
      setSaveError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  // subject handlers - FIXED: removed .profile nesting
  async function handleAddSubject(data) {
    try {
      // 1️⃣ Add subject (backend stores subject_id only)
      await addSubject(data);

      // 2️⃣ Re-fetch full settings (backend returns populated subjects)
      const fresh = await getSettings();

      // 3️⃣ Update profile from server using consistent loader (FIXED: removed .profile)
      await loadProfile(fresh);

      setShowSubjectModal(false);
    } catch (e) {
      console.error("Add subject failed:", e);
      setSaveError(e.response?.data?.detail || "Failed to add subject");
    }
  }



  // avatar upload handler
  async function onAvatarSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const objectUrl = URL.createObjectURL(file);
      setProfile((prev) => ({ ...prev, avatarUrl: objectUrl }));
      const res = await uploadAvatar(file);

      setProfile((prev) => ({
        ...prev,
        avatarUrl: res.avatarUrl ?? prev.avatarUrl,
      }));
    } catch {
      console.error("Avatar upload failed");
      setSaveError("Avatar Upload Failed");
    }
  }

  // UI: show a simple loading state until data is loaded
  if (!loaded) {
    return <div className="p-6">Loading settings…</div>;
  }

  if (loadError)
    return (
      <div className="p-6 text-rose-600">
        Failed to load settings: {loadError}
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Settings for {profile?.name || "Alex Johnson"}
          </h2>
          <p className="text-slate-500 mt-1">
            Configure attendance thresholds, profile and face recognition
            preferences
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab } onLogout={handleLogout}/>

          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full min-h-[600px]">
            {/* ================= GENERAL TAB ================= */}
            {activeTab === "General" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    General preferences
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Customize how the app looks and how you receive alerts.
                  </p>
                </div>

                {/* Theme Selection */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-800">
                    Theme
                  </label>
                  <div className="flex gap-4">
                    {["Light", "Dark", "Forest", "Cyber"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTheme(mode)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl border font-medium transition-all ${
                          theme === mode
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 hover:bg-gray-50 text-slate-600"
                        }`}
                      >
                        {mode === "Light" && <Sun size={18} />}
                        {mode === "Dark" && <Moon size={18} />}
                        {mode === "Forest" && <TreePine size={18} />}
                        {mode === "Cyber" && <Monitor size={18} />}
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Notification Permissions */}
                <div className="space-y-6">
                  <label className="text-sm font-semibold text-slate-800">
                    Notification permissions
                  </label>

                  {/* Toggle Item */}
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div className="flex gap-4">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg h-fit">
                        <Bell size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          Push notifications
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Allow browser notifications for critical events.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setNotifications({
                          ...notifications,
                          push: !notifications.push,
                        })
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative ${notifications.push ? "bg-indigo-600" : "bg-gray-300"}`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${notifications.push ? "left-7" : "left-1"}`}
                      ></div>
                    </button>
                  </div>

                  {/* Toggle Item */}
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div className="flex gap-4">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg h-fit">
                        <Volume2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          Sound effects
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Play a sound when a student is marked present.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setNotifications({
                          ...notifications,
                          sound: !notifications.sound,
                        })
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative ${notifications.sound ? "bg-indigo-600" : "bg-gray-300"}`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${notifications.sound ? "left-7" : "left-1"}`}
                      ></div>
                    </button>
                  </div>
                </div>

                {/* Email Permissions */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-800">
                    Email preferences
                  </label>
                  <div className="space-y-3">
                    {[
                      "Daily attendance summary",
                      "Critical attendance alerts",
                      "Product updates",
                    ].map((item, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center text-white group-hover:border-indigo-500 bg-white group-hover:shadow-sm transition-all has-[:checked]:bg-indigo-600 has-[:checked]:border-indigo-600">
                          <input
                            type="checkbox"
                            defaultChecked={idx < 2}
                            className="hidden"
                          />
                          <Check size={14} />
                        </div>
                        <span className="text-sm text-slate-600 group-hover:text-slate-900">
                          {item}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                  <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200">
                    Cancel
                  </button>
                  <button 
                    onClick={saveProfile}
                    disabled={saving}
                    className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#4338ca] shadow-md disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ================= THRESHOLDS TAB ================= */}
            {activeTab === "Thresholds" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Attendance thresholds
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Define when a student is considered at risk or critical
                    based on attendance percentage.
                  </p>
                </div>

                <div className="p-8 border border-gray-100 rounded-xl bg-white space-y-8 shadow-sm">
                  <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                    <label className="text-base font-semibold text-slate-800">
                      Warning and critical ranges
                    </label>
                    <div className="text-xs font-medium text-gray-400">
                      Warning:{" "}
                      <span className="text-amber-600">
                        {warningVal}% – {safeVal}%
                      </span>{" "}
                      · Critical:{" "}
                      <span className="text-rose-600">&lt; {warningVal}%</span>
                    </div>
                  </div>

                  <div 
                    className="relative py-8 select-none px-2"
                    ref={sliderRef}
                  >
                    <div className="h-4 w-full rounded-full bg-gray-100 relative overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-rose-400"
                        style={{ width: `${warningVal}%` }}
                      ></div>
                      <div
                        className="absolute top-0 h-full bg-amber-400"
                        style={{
                          left: `${warningVal}%`,
                          width: `${safeVal - warningVal}%`,
                        }}
                      ></div>
                      <div
                        className="absolute top-0 h-full bg-emerald-400"
                        style={{ left: `${safeVal}%`, right: 0 }}
                      ></div>
                    </div>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-[3px] border-indigo-600 rounded-full shadow-md cursor-ew-resize z-20 hover:scale-110 transition-transform"
                      style={{ left: `calc(${warningVal}% - 12px)` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragging('warning');
                      }}
                    ></div>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-[3px] border-indigo-600 rounded-full shadow-md cursor-ew-resize z-20 hover:scale-110 transition-transform"
                      style={{ left: `calc(${safeVal}% - 12px)` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragging('safe');
                      }}
                    ></div>

                    <div className="absolute top-14 w-full flex text-[11px] font-bold pointer-events-none mt-2">
                      <div
                        className="flex items-center gap-1.5 absolute"
                        style={{ left: "2%" }}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-slate-600">Critical zone</span>
                      </div>
                      <div
                        className="flex items-center gap-1.5 absolute"
                        style={{ left: "52%" }}
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-slate-600">Warning zone</span>
                      </div>
                      <div
                        className="flex items-center gap-1.5 absolute"
                        style={{ left: "87%" }}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-600">Safe zone</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-600 rounded-xl p-5 flex items-start gap-4 shadow-sm text-white">
                    <Info
                      className="flex-shrink-0 mt-0.5 opacity-90"
                      size={20}
                    />
                    <p className="text-sm leading-relaxed text-blue-50 font-medium">
                      Adjusting these values will update visual alerts across
                      dashboards, student profiles and reports.
                    </p>
                  </div>

                  <div className="pt-8 flex justify-end gap-3 border-t border-gray-100">
                    <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 cursor-pointer">
                      Cancel
                    </button>
                    <button 
                      onClick={saveProfile}
                      disabled={saving}
                      className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#4338ca] shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= PROFILE TAB ================= */}
            {activeTab === "Profile" && (
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      Profile details
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Keep your basic information and contact details up to
                      date.
                    </p>
                  </div>
                  <button className="text-indigo-600 text-sm font-medium hover:underline cursor-pointer">
                    View public profile
                  </button>
                </div>

                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-xl border border-gray-100">
                  <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-2xl font-bold text-slate-500 border-4 border-white shadow-sm overflow-hidden">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(profile.name)}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-slate-800">
                      {profile.name || "-"}
                    </h4>
                    <p className="text-sm text-slate-500">
                      {profile.branch?.toUpperCase() || "Department of Science"}
                    </p>{" "}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-gray-50 transition shadow-sm cursor-pointer">
                    <Upload size={16} />
                    <span>Change photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onAvatarSelected}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Role
                    </label>
                    <input
                      type="text"
                      value={
                        profile.role.charAt(0).toUpperCase() +
                        profile.role.slice(1)
                      }
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          role: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">
                    Subjects Taught
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profile.subjects && profile.subjects.length > 0 ? (
                      profile.subjects.map((sub) => (
                        <div
                          key={sub._id}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-sm font-medium flex items-center gap-2"
                        >
                          <span>
                            {sub.name} ({sub.code})
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">
                        No subjects added
                      </div>
                    )}
                    <button
                      onClick={() => setShowSubjectModal(true)}
                      className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded-full text-sm font-medium hover:border-indigo-400 hover:text-indigo-600 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus size={14} /> Add subject
                    </button>
                    <AddSubjectModal
                      open={showSubjectModal}
                      onClose={() => setShowSubjectModal(false)}
                      onSave={handleAddSubject}
                    />
                  </div>
                </div>
                {saveError && (
                  <div className="text-sm text-rose-600">{saveError}</div>
                )}

                <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      // reset to last loaded server profile if you saved it in state 'loadedProfile' or reload from server
                      // For now we simply reload by calling getSettings again:
                      (async () => {
                        try {
                          const fresh = await getSettings();
                          await loadProfile(fresh);
                        } catch (e) {
                          console.error("Reload failed", e);
                        }
                      })();
                    }}
                    className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving}
                    className={`px-8 py-2.5 rounded-xl text-sm font-semibold text-white ${saving ? "bg-gray-400" : "bg-[#4F46E5] hover:bg-[#4338ca]"} shadow-md cursor-pointer`}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            )}

            {/* ================= FACE SETTINGS TAB ================= */}
            {activeTab === "Face settings" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Face recognition configuration
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Manage enrolment data and tune the recognition engine
                    parameters.
                  </p>
                </div>

                {/* 1. Enrolment Status */}
                <div className="p-6 border border-gray-100 rounded-xl bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <Camera size={28} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">
                        Face data enrolled
                      </h4>
                      <p className="text-sm text-slate-500">
                        Last updated: 3 days ago via Mobile App
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm flex items-center gap-2 cursor-pointer">
                    <RefreshCw size={16} /> Re-calibrate
                  </button>
                </div>

                {/* 2. Recognition Sensitivity Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-800">
                      Recognition confidence threshold
                    </label>
                    <span className="text-sm font-bold text-indigo-600">
                      {sensitivity}%
                    </span>
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
                    Higher values reduce false positives but might require
                    better lighting conditions. Recommended: 80%.
                  </p>
                </div>

                {/* 3. Security Toggles */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Security measures
                  </h4>

                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div className="flex gap-4">
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg h-fit">
                        <Shield size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          Liveness detection (Anti-spoofing)
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Requires subjects to blink or move slightly to prevent
                          photo attacks.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setLiveness(!liveness)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${liveness ? "bg-indigo-600" : "bg-gray-300"}`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${liveness ? "left-7" : "left-1"}`}
                      ></div>
                    </button>
                  </div>
                </div>

                {/* 4. Danger Zone */}
                <div className="pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-rose-600 mb-4">
                    Danger Zone
                  </h4>
                  <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-xl">
                    <div>
                      <h5 className="text-sm font-semibold text-rose-900">
                        Reset recognition model
                      </h5>
                      <p className="text-xs text-rose-600 mt-1">
                        This will clear all learned face patterns for this
                        profile.
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-100 transition shadow-sm flex items-center gap-2 cursor-pointer">
                      <Trash2 size={16} /> Reset data
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                  <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 cursor-pointer">
                    Discard
                  </button>
                  <button 
                    onClick={saveProfile}
                    disabled={saving}
                    className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#4338ca] shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Apply settings"}
                  </button>
                </div>
              </div>
            )}

            {/* ================= CREDITS TAB (NEW) ================= */}
            {activeTab === "Credits" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-800">
                        Our Contributors
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                        Open Source
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      The amazing people who have contributed code to this
                      project.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition cursor-pointer">
                      <Sparkles size={16} /> Send thanks
                    </button>
                  </div>
                </div>

                {loadingContributors ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contributors.map((contributor) => (
                      <div
                        key={contributor.id}
                        className="p-5 border border-gray-100 rounded-xl hover:shadow-lg transition-all bg-white group flex items-center gap-4"
                      >
                        <img
                          src={contributor.avatar_url}
                          alt={contributor.login}
                          className="w-14 h-14 rounded-full border-2 border-gray-100 group-hover:border-indigo-100 transition-colors"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">
                            {contributor.login}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                              {contributor.contributions} commits
                            </span>
                          </div>
                        </div>
                        <a
                          href={contributor.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Share2 size={18} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {contributors.length === 0 && !loadingContributors && (
                  <div className="text-center text-gray-500 py-10">
                    No contributors found.
                  </div>
                )}

                <div className="text-center text-xs text-gray-400 mt-12 pt-8 border-t border-gray-50">
                  Thank you to every developer who helped build the Smart
                  Attendance System.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
