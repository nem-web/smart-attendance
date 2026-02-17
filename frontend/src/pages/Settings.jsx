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
  sendLowAttendanceNotice,
} from "../api/settings";
import AddSubjectModal from "../components/AddSubjectModal";
import { useTranslation } from "react-i18next";

export default function Settings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("general");

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
    if (activeTab === "credits") {
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

  // Handler to toggle email preferences
  const toggleEmailPref = (key) => {
    setEmailPreferences((prev) => {
      // If array doesn't exist, create it
      const currentPrefs = Array.isArray(prev) ? [...prev] : [];
      const existingIndex = currentPrefs.findIndex((p) => p.key === key);

      if (existingIndex >= 0) {
        // Toggle existing
        currentPrefs[existingIndex] = {
          ...currentPrefs[existingIndex],
          enabled: !currentPrefs[existingIndex].enabled
        };
      } else {
        // Add new (default to true if adding, but logic suggests we are enabling it)
        currentPrefs.push({ key, enabled: true });
      }
      return currentPrefs;
    });
  };

  // --- helper functions (inside your component) ---
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [sendingNotice, setSendingNotice] = useState(false);
  const [noticeResult, setNoticeResult] = useState(null);

  async function handleSendLowAttendanceNotice() {
    setSendingNotice(true);
    setNoticeResult(null);
    try {
      const res = await sendLowAttendanceNotice();
      setNoticeResult({
        success: true,
        message: res.message || "Notices sent successfully",
      });
    } catch (err) {
      const errorMsg =
        err?.response?.data?.detail ||
        err.message ||
        "Failed to send notices";
      setNoticeResult({ success: false, message: errorMsg });
    } finally {
      setSendingNotice(false);
    }
  }

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
          emailPreferences: _emailPreferences,
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
      setSaveError(err.message || t('settings.alerts.save_failed'));
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
      setSaveError(t('settings.alerts.avatar_failed'));
    }
  }

  // UI: show a simple loading state until data is loaded
  if (!loaded) {
    return <div className="p-6">Loading settings…</div>;
  }

  if (loadError)
    return (
      <div className="p-6 text-[var(--danger)]">
        {t('settings.alerts.load_failed', { error: loadError })}
      </div>
    );

  const emailPreferencesList = [
    { key: "settings.general.email_daily", label: "Daily attendance summary" },
    { key: "settings.general.email_critical", label: "Critical attendance alerts" },
    { key: "settings.general.email_updates", label: "Product updates" },
    { key: "settings.general.email_low_attendance_automated", label: "Automated Monthly Low Attendance Alerts" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)]">
            {t('settings.title', { name: profile?.name || "User" })}
          </h2>
          <p className="text-[var(--text-body)] opacity-90 mt-1">
            {t('settings.subtitle')}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

          <div className="flex-1 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm p-8 w-full min-h-[600px]">
            {/* ================= GENERAL TAB ================= */}
            {activeTab === "general" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-main)]">
                    {t('settings.general.title')}
                  </h3>
                  <p className="text-sm text-[var(--text-body)] opacity-90 mt-1">
                    {t('settings.general.subtitle')}
                  </p>
                </div>

                {/* Theme Selection */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-[var(--text-main)]">
                    {t('settings.general.theme')}
                  </label>
                  <div className="flex gap-4">
                    {["Light", "Dark", "Forest", "Cyber"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTheme(mode)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl border font-medium transition-all ${theme === mode
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-body)]"
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

                <hr className="border-[var(--border-color)]" />

                {/* Notification Permissions */}
                <div className="space-y-6">
                  <label className="text-sm font-semibold text-[var(--text-main)]">
                    {t('settings.general.notifications_title')}
                  </label>

                  {/* Toggle Item */}
                  <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-xl">
                    <div className="flex gap-4">
                      <div className="p-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg h-fit">
                        <Bell size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text-main)]">
                          {t('settings.general.push')}
                        </h4>
                        <p className="text-xs text-[var(--text-body)] opacity-90 mt-1">
                          {t('settings.general.push_desc')}
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
                      className={`w-12 h-6 rounded-full transition-colors relative ${notifications.push ? "bg-[var(--primary)]" : "bg-[var(--border-color)]"}`}
                    >
                      <div
                        className={`w-4 h-4 bg-[var(--bg-card)] rounded-full absolute top-1 transition-transform ${notifications.push ? "left-7" : "left-1"}`}
                      ></div>
                    </button>
                  </div>

                  {/* Toggle Item */}
                  <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-xl">
                    <div className="flex gap-4">
                      <div className="p-2 bg-[var(--warning)]/10 text-[var(--warning)] rounded-lg h-fit">
                        <Volume2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text-main)]">
                          {t('settings.general.sound')}
                        </h4>
                        <p className="text-xs text-[var(--text-body)] opacity-90 mt-1">
                          {t('settings.general.sound_desc')}
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
                      className={`w-12 h-6 rounded-full transition-colors relative ${notifications.sound ? "bg-[var(--primary)]" : "bg-[var(--border-color)]"}`}
                    >
                      <div
                        className={`w-4 h-4 bg-[var(--bg-card)] rounded-full absolute top-1 transition-transform ${notifications.sound ? "left-7" : "left-1"}`}
                      ></div>
                    </button>
                  </div>
                </div>

                {/* Email Permissions */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-[var(--text-main)]">
                    {t('settings.general.email_title')}
                  </label>
                  <div className="space-y-3">
                    {emailPreferencesList.map((item, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-5 h-5 rounded border border-[var(--border-color)] flex items-center justify-center text-[var(--text-on-primary)] group-hover:border-[var(--primary)] bg-[var(--bg-card)] group-hover:shadow-sm transition-all has-[:checked]:bg-[var(--primary)] has-[:checked]:border-[var(--primary)]">
                          <input
                            type="checkbox"
                            checked={
                              Array.isArray(_emailPreferences) &&
                              _emailPreferences.find((p) => p.key === item.key)?.enabled === true
                            }
                            onChange={() => toggleEmailPref(item.key)}
                            className="hidden"
                          />
                          <Check size={14} />
                        </div>
                        <span className="text-sm text-[var(--text-body)] group-hover:text-[var(--text-main)]">
                          {t(item.key)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Manual Low Attendance Notice */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-[var(--text-main)]">
                    Manual Actions
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleSendLowAttendanceNotice}
                      disabled={sendingNotice}
                      className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[var(--danger,#ef4444)] text-white hover:opacity-90 shadow-md disabled:opacity-50"
                    >
                      {sendingNotice ? "Sending…" : "Send Low Attendance Notice"}
                    </button>
                    {noticeResult && (
                      <span className={`text-sm ${noticeResult.success ? "text-green-600" : "text-[var(--danger,#ef4444)]"}`}>
                        {noticeResult.message}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-body)] opacity-90">
                    Manually send low attendance warning emails to students with less than 75% attendance in your subjects.
                  </p>
                </div>

                {/* Footer Buttons */}
                <div className="pt-6 flex justify-end gap-3 border-t border-[var(--border-color)]">
                  <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-[var(--text-body)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    {t('settings.general.cancel')}
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-[var(--primary)] text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)] shadow-md disabled:opacity-50"
                  >
                    {saving ? t('settings.general.saving') : t('settings.general.save')}
                  </button>
                </div>
              </div>
            )}

            {/* ================= THRESHOLDS TAB ================= */}
            {activeTab === "thresholds" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-main)]">
                    {t('settings.thresholds.title')}
                  </h3>
                  <p className="text-sm text-[var(--text-body)] opacity-90 mt-1">
                    {t('settings.thresholds.subtitle')}
                  </p>
                </div>

                <div className="p-8 border border-[var(--border-color)] rounded-xl bg-[var(--bg-card)] space-y-8 shadow-sm">
                  <div className="flex justify-between items-end border-b border-[var(--border-color)] pb-4">
                    <label className="text-base font-semibold text-[var(--text-main)]">
                      {t('settings.thresholds.ranges')}
                    </label>
                    <div className="text-xs font-medium text-[var(--text-body)] opacity-70">
                      {t('settings.thresholds.warning')}:{" "}
                      <span className="text-[var(--warning)]">
                        {warningVal}% – {safeVal}%
                      </span>{" "}
                      · {t('settings.thresholds.critical')}:{" "}
                      <span className="text-[var(--danger)]">&lt; {warningVal}%</span>
                    </div>
                  </div>

                  <div
                    className="relative py-8 select-none px-2"
                    ref={sliderRef}
                  >
                    <div className="h-4 w-full rounded-full bg-[var(--bg-secondary)] relative overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-[var(--danger)]"
                        style={{ width: `${warningVal}%` }}
                      ></div>
                      <div
                        className="absolute top-0 h-full bg-[var(--warning)]"
                        style={{
                          left: `${warningVal}%`,
                          width: `${safeVal - warningVal}%`,
                        }}
                      ></div>
                      <div
                        className="absolute top-0 h-full bg-[var(--success)]"
                        style={{ left: `${safeVal}%`, right: 0 }}
                      ></div>
                    </div>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--bg-card)] border-[3px] border-[var(--primary)] rounded-full shadow-md cursor-ew-resize z-20 hover:scale-110 transition-transform"
                      style={{ left: `calc(${warningVal}% - 12px)` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragging('warning');
                      }}
                    ></div>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--bg-card)] border-[3px] border-[var(--primary)] rounded-full shadow-md cursor-ew-resize z-20 hover:scale-110 transition-transform"
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
                        <span className="w-2 h-2 rounded-full bg-[var(--danger)]"></span>
                        <span className="text-[var(--text-body)]">{t('settings.thresholds.zone_critical')}</span>
                      </div>
                      <div
                        className="flex items-center gap-1.5 absolute"
                        style={{ left: "52%" }}
                      >
                        <span className="w-2 h-2 rounded-full bg-[var(--warning)]"></span>
                        <span className="text-[var(--text-body)]">{t('settings.thresholds.zone_warning')}</span>
                      </div>
                      <div
                        className="flex items-center gap-1.5 absolute"
                        style={{ left: "87%" }}
                      >
                        <span className="w-2 h-2 rounded-full bg-[var(--success)]"></span>
                        <span className="text-[var(--text-body)]">{t('settings.thresholds.zone_safe')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--action-info-bg)] rounded-xl p-5 flex items-start gap-4 shadow-sm text-[var(--text-on-primary)]">
                    <Info
                      className="flex-shrink-0 mt-0.5 opacity-90"
                      size={20}
                    />
                    <p className="text-sm leading-relaxed text-[var(--text-main)]/90 font-medium">
                      {t('settings.thresholds.info')}
                    </p>
                  </div>

                  <div className="pt-8 flex justify-end gap-3 border-t border-[var(--border-color)]">
                    <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-[var(--text-body)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] cursor-pointer">
                      {t('settings.general.cancel')}
                    </button>
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-[var(--primary)] text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)] shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {saving ? t('settings.general.saving') : t('settings.general.save')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= PROFILE TAB ================= */}
            {activeTab === "profile" && (
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-main)]">
                      {t('settings.profile.title')}
                    </h3>
                    <p className="text-sm text-[var(--text-body)] opacity-90 mt-1">
                      {t('settings.profile.subtitle')}
                    </p>
                  </div>
                  <button className="text-[var(--primary)] text-sm font-medium hover:underline cursor-pointer">
                    {t('settings.profile.view_public')}
                  </button>
                </div>

                <div className="flex items-center gap-6 p-6 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                  <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center text-2xl font-bold text-[var(--text-body)] opacity-90 border-4 border-[var(--border-color)] shadow-sm overflow-hidden">
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
                    <h4 className="text-lg font-bold text-[var(--text-main)]">
                      {profile.name || "-"}
                    </h4>
                    <p className="text-sm text-[var(--text-body)] opacity-90">
                      {profile.branch?.toUpperCase() || "Department of Science"}
                    </p>{" "}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm font-medium text-[var(--text-body)] hover:bg-[var(--bg-secondary)] transition shadow-sm cursor-pointer">
                    <Upload size={16} />
                    <span>{t('settings.profile.change_photo')}</span>
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
                    <label className="text-sm font-semibold text-[var(--text-main)]">
                      {t('settings.profile.full_name')}
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
                      className="w-full px-4 py-2.5 rounded-lg border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--primary)] outline-none text-[var(--text-main)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[var(--text-main)]">
                      {t('settings.profile.role')}
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
                      className="w-full px-4 py-2.5 rounded-lg border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--primary)] outline-none text-[var(--text-main)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[var(--text-main)]">
                      {t('settings.profile.email')}
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-body)] opacity-90 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[var(--text-main)]">
                      {t('settings.profile.phone')}
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
                      className="w-full px-4 py-2.5 rounded-lg border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--primary)] outline-none text-[var(--text-main)]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[var(--text-main)]">
                    {t('settings.profile.subjects')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profile.subjects && profile.subjects.length > 0 ? (
                      profile.subjects.map((sub) => (
                        <div
                          key={sub._id}
                          className="px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 rounded-full text-sm font-medium flex items-center gap-2"
                        >
                          <span>
                            {sub.name} ({sub.code})
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-[var(--text-body)] opacity-90">
                        {t('settings.profile.no_subjects')}
                      </div>
                    )}
                    <button
                      onClick={() => setShowSubjectModal(true)}
                      className="px-3 py-1.5 border border-dashed border-[var(--border-color)] text-[var(--text-body)] opacity-90 rounded-full text-sm font-medium hover:border-[var(--primary)] hover:text-[var(--primary)] flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus size={14} /> {t('settings.profile.add_subject')}
                    </button>
                    <AddSubjectModal
                      open={showSubjectModal}
                      onClose={() => setShowSubjectModal(false)}
                      onSave={handleAddSubject}
                    />
                  </div>
                </div>
                {saveError && (
                  <div className="text-sm text-[var(--danger)]">{saveError}</div>
                )}

                <div className="pt-6 flex justify-end gap-3 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => {
                      (async () => {
                        try {
                          const fresh = await getSettings();
                          await loadProfile(fresh);
                        } catch (e) {
                          console.error("Reload failed", e);
                        }
                      })();
                    }}
                    className="px-6 py-2.5 rounded-xl text-sm font-medium text-[var(--text-body)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] cursor-pointer"
                  >
                    {t('settings.general.cancel')}
                  </button>

                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving}
                    className={`px-8 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-on-primary)] ${saving ? "bg-[var(--border-color)]" : "bg-[var(--primary)] hover:bg-[var(--primary-hover)]"} shadow-md cursor-pointer`}
                  >
                    {saving ? t('settings.general.saving') : t('settings.general.save')}
                  </button>
                </div>
              </div>
            )}

            {/* ================= FACE SETTINGS TAB ================= */}
            {activeTab === "face_settings" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-main)]">
                    {t('settings.face_settings.title')}
                  </h3>
                  <p className="text-sm text-[var(--text-body)] opacity-90 mt-1">
                    {t('settings.face_settings.subtitle')}
                  </p>
                </div>

                {/* 1. Enrolment Status */}
                <div className="p-6 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[var(--success)]/10 text-[var(--success)] rounded-full flex items-center justify-center">
                      <Camera size={28} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--text-main)]">
                        {t('settings.face_settings.face_data')}
                      </h4>
                      <p className="text-sm text-[var(--text-body)] opacity-70">
                        {t('settings.face_settings.last_updated')}
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-body)] rounded-lg text-sm font-medium hover:bg-[var(--bg-secondary)] shadow-sm flex items-center gap-2 cursor-pointer">
                    <RefreshCw size={16} /> {t('settings.face_settings.recalibrate')}
                  </button>
                </div>

                {/* 2. Recognition Sensitivity Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-[var(--text-main)]">
                      {t('settings.face_settings.threshold')}
                    </label>
                    <span className="text-sm font-bold text-[var(--primary)]">
                      {sensitivity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(e.target.value)}
                    className="w-full h-2 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                  />
                  <p className="text-xs text-[var(--text-body)] opacity-90">
                    {t('settings.face_settings.threshold_desc')}
                  </p>
                </div>

                {/* 3. Security Toggles */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[var(--text-main)]">
                    {t('settings.face_settings.security')}
                  </h4>

                  <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-xl">
                    <div className="flex gap-4">
                      <div className="p-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg h-fit">
                        <Shield size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text-main)]">
                          {t('settings.face_settings.liveness')}
                        </h4>
                        <p className="text-xs text-[var(--text-body)] opacity-90 mt-1">
                          {t('settings.face_settings.liveness_desc')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setLiveness(!liveness)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${liveness ? "bg-[var(--primary)]" : "bg-[var(--border-color)]"}`}
                    >
                      <div
                        className={`w-4 h-4 bg-[var(--bg-card)] rounded-full absolute top-1 transition-transform ${liveness ? "left-7" : "left-1"}`}
                      ></div>
                    </button>
                  </div>
                </div>

                {/* 4. Danger Zone */}
                <div className="pt-6 border-t border-[var(--border-color)]">
                  <h4 className="text-sm font-bold text-[var(--danger)] mb-4">
                    {t('settings.face_settings.danger_zone')}
                  </h4>
                  <div className="flex items-center justify-between p-4 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-xl">
                    <div>
                      <h5 className="text-sm font-semibold text-[var(--danger)]">
                        {t('settings.face_settings.reset_model')}
                      </h5>
                      <p className="text-xs text-[var(--danger)] mt-1">
                        {t('settings.face_settings.reset_desc')}
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--danger)]/20 text-[var(--danger)] rounded-lg text-sm font-medium hover:bg-[var(--danger)]/20 transition shadow-sm flex items-center gap-2 cursor-pointer">
                      <Trash2 size={16} /> {t('settings.face_settings.reset_data')}
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-6 flex justify-end gap-3 border-t border-[var(--border-color)]">
                  <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-[var(--text-body)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] cursor-pointer">
                    {t('settings.face_settings.discard')}
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-[var(--primary)] text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)] shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {saving ? t('settings.general.saving') : t('settings.face_settings.apply')}
                  </button>
                </div>
              </div>
            )}

            {/* ================= CREDITS TAB (NEW) ================= */}
            {activeTab === "credits" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-[var(--text-main)]">
                        {t('settings.credits.title')}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold">
                        {t('settings.credits.badge')}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-body)] opacity-90 mt-1">
                      {t('settings.credits.subtitle')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] flex items-center gap-2 shadow-sm transition cursor-pointer">
                      <Sparkles size={16} /> {t('settings.credits.send_thanks')}
                    </button>
                  </div>
                </div>

                {loadingContributors ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contributors.map((contributor) => (
                      <div
                        key={contributor.id}
                        className="p-5 border border-[var(--border-color)] rounded-xl hover:shadow-lg transition-all bg-[var(--bg-card)] group flex items-center gap-4"
                      >
                        <img
                          src={contributor.avatar_url}
                          alt={contributor.login}
                          className="w-14 h-14 rounded-full border-2 border-[var(--border-color)] group-hover:border-[var(--primary)]/20 transition-colors"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[var(--text-main)] truncate">
                            {contributor.login}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
                              {contributor.contributions} {t('settings.credits.commits')}
                            </span>
                          </div>
                        </div>
                        <a
                          href={contributor.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-[var(--text-body)] opacity-70 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
                        >
                          <Share2 size={18} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {contributors.length === 0 && !loadingContributors && (
                  <div className="text-center text-[var(--text-body)] opacity-90 py-10">
                    {t('settings.credits.no_contributors')}
                  </div>
                )}

                <div className="text-center text-xs text-[var(--text-body)] opacity-70 mt-12 pt-8 border-t border-[var(--border-color)]">
                  {t('settings.credits.footer')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
