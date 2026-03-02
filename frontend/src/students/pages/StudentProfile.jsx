import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyStudentProfile } from "../../api/auth.js";
import { logout } from "../../api/auth.js";
import LogoutConfirmDialog from "../../components/LogoutConfirmDialog.jsx";
import {
  fetchAvailableSubjects,
  addSubjectToStudent,
  removeSubjectFromStudent,
  fetchMySubjects
} from "../../api/students.js";

import {
  ArrowLeft,
  Upload,
  Plus,
  CheckCircle,
  Camera,
  Edit2,
  LogOut,
  Fingerprint
} from "lucide-react";
import StudentNavigation from "../components/StudentNavigation";
import ProfileSkeleton from "../components/ProfileSkeleton";
import { useNavigate } from "react-router-dom";
import { uploadFaceImage } from "../../api/students";
import { useTranslation } from "react-i18next";
import SubjectAttendanceCard from "../../components/SubjectAttendanceCard";
import { useTheme } from "../../theme/ThemeContext";
import { registerDevice } from "../../api/webauthn";
import { toast } from "react-hot-toast";

export default function StudentProfile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [isLogoutOpen, setLogoutOpen] = useState(false);
  const [registeringDevice, setRegisteringDevice] = useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const handleRegisterDevice = async () => {
    setRegisteringDevice(true);
    try {
      await registerDevice();
      toast.success("Device registered successfully!");
      queryClient.invalidateQueries(["myStudentProfile"]);
    } catch (error) {
      console.error("Device registration error:", error);
      toast.error(error.message || "Failed to register device.");
    } finally {
      setRegisteringDevice(false);
    }
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["myStudentProfile"],
    queryFn: fetchMyStudentProfile,
    retry: false,
  });

  // Fetch detailed subjects
  const { data: mySubjects } = useQuery({
    queryKey: ["mySubjects"],
    queryFn: fetchMySubjects,
  });

  const { data: availableSubjects } = useQuery({
    queryKey: ["availableSubjects"],
    queryFn: fetchAvailableSubjects,
    enabled: open,
  });

  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: uploadFaceImage,
    onSuccess: () => {
      queryClient.invalidateQueries(["myStudentProfile"]);
      // Reset file input to allow selecting the same file again
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    },
  });

  const addSubjectMutation = useMutation({
    mutationFn: addSubjectToStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(["myStudentProfile"]);
      queryClient.invalidateQueries(["mySubjects"]);
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: removeSubjectFromStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(["myStudentProfile"]);
      queryClient.invalidateQueries(["mySubjects"]);
    },
  });

  // Calculate data outside of conditional rendering
  const img = data?.image_url;
  const subjectsData = mySubjects ||  [];
  const totalPresent =  subjectsData.reduce((acc, sub) => acc + (sub.attended || 0), 0);
  const totalClasses = subjectsData.reduce((acc, sub) => acc + (sub.total || 0), 0);
  const overallPercentage = totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0;
  const isOverallOnTrack = overallPercentage >= 75;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col md:flex-row font-sans text-[var(--text-main)]">
      {/* 1. Sidebar - Always visible */}
      <StudentNavigation activePage="profile" />

      {/* 2. Main Content */}
      <main className="flex-1 md:ml-64 p-6 md:p-8 pb-24 md:pb-8 animate-in fade-in duration-500 relative">
        
        {/* Language Switcher */}
        <div className="absolute top-6 right-6 z-10">
          <div className="flex gap-2 items-center bg-[var(--bg-card)] px-3 py-1.5 rounded-full border border-[var(--border-color)] shadow-sm">
            <button
              onClick={() => changeLanguage("en")}
              className={`text-xs ${
                i18n.language === "en"
                  ? "font-bold text-[var(--primary)] border-b-2 border-[var(--primary)]"
                  : "text-[var(--text-body)]/80 hover:text-[var(--text-body)]"
              }`}
            >
              English
            </button>
            <span className="text-[var(--text-body)]/70 text-xs">|</span>
            <button
              onClick={() => changeLanguage("hi")}
              className={`text-xs ${
                i18n.language === "hi"
                  ? "font-bold text-[var(--primary)] border-b-2 border-[var(--primary)]"
                  : "text-[var(--text-body)]/80 hover:text-[var(--text-body)]"
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>

        {/* Loading State - Show skeleton in content area only */}
        {isLoading ? (
          <ProfileSkeleton />
        ) : isError ? (
          // Error State
          <div className="max-w-3xl mx-auto">
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm p-8 text-center">
              <p className="text-[var(--danger)] text-lg font-semibold">
                {t("profile.error", {
                  message: error?.message || t("profile.not_found"),
                })}
              </p>
            </div>
          </div>
        ) : !data ? (
          // No Data State
          <div className="max-w-3xl mx-auto">
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm p-8 text-center">
              <p className="text-[var(--text-body)] text-lg">
                {t("profile.not_found")}
              </p>
            </div>
          </div>
        ) : (
          // Data loaded successfully - Render profile content
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-colors text-[var(--text-body)] cursor-pointer"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-main)]">
                  {t("profile.title")}
                </h2>
                <p className="text-[var(--text-body)]/80 text-sm">
                  {t("profile.subtitle")}
                </p>
              </div>
            </div>

            {/* Card 1: Personal Details */}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar */}
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileRef.current.click()}
                >
                  <div className="w-24 h-24 rounded-full bg-[var(--bg-secondary)] border-4 border-[var(--bg-card)] shadow-sm overflow-hidden">
                    <img
                      src={img}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-[var(--overlay)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-[var(--text-on-primary)] w-6 h-6" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                  <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text-main)]">
                        {data.name || "John"}
                      </h3>
                      <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                        <span className="bg-[var(--action-info-bg)] text-[var(--text-on-primary)] text-[10px] font-bold px-2 py-0.5 rounded">
                          {t("profile.roll_no")}: {data.roll || "21CS045"}
                        </span>
                      </div>
                    </div>
                    <button className="text-xs font-medium text-[var(--text-body)] hover:text-[var(--primary)] hover:bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg transition mt-3 sm:mt-0 border border-[var(--border-color)] flex items-center gap-2 cursor-not-allowed">
                      <Edit2 size={12} />
                      {t("profile.edit_details")}
                    </button>
                  </div>

                  <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-[var(--text-body)] pt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--text-body)]/80">
                        {t("profile.year")}:
                      </span>
                      <span className="font-medium text-[var(--text-main)]">
                        {data.year || "1st"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--text-body)]/80">
                        {t("profile.branch")}:
                      </span>
                      <span className="font-medium text-[var(--text-main)]">
                        {(data?.branch ?? "N/A").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--text-body)]/80">
                        {t("profile.email")}:
                      </span>
                      <span className="font-medium text-[var(--text-main)]">
                        {data.email || "ananya@example.edu"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden File Input (Used by Avatar and Face Image Card) */}
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              ref={fileRef}
              hidden
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // Validate file size (5MB max)
                const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
                if (file.size > MAX_FILE_SIZE) {
                  toast.error(t("profile.face_image.error_size"));
                  e.target.value = ""; // Reset input
                  return;
                }
                
                // Validate file type
                const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
                if (!allowedTypes.includes(file.type)) {
                  toast.error(t("profile.face_image.error_type"));
                  e.target.value = ""; // Reset input
                  return;
                }
                
                // Validate image dimensions
                const img = new Image();
                const objectUrl = URL.createObjectURL(file);
                
                img.onload = () => {
                  URL.revokeObjectURL(objectUrl); // Clean up memory
                  const MAX_DIMENSION = 4096;
                  if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
                    toast.error(t("profile.face_image.error_dimensions"));
                    e.target.value = ""; // Reset input
                    return;
                  }
                  
                  // All validations passed, upload the file
                  uploadMutation.mutate(file);
                };
                
                img.onerror = () => {
                  URL.revokeObjectURL(objectUrl); // Clean up memory
                  toast.error(t("profile.face_image.error_load"));
                  e.target.value = ""; // Reset input
                };
                
                img.src = objectUrl;
              }}
            />

            {/* Card: Appearance / Theme Settings */}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm p-6 mb-4">
              <h4 className="text-base font-bold text-[var(--text-main)] mb-1">
                {t("profile.appearance")}
              </h4>
              <p className="text-xs text-[var(--text-main)] mb-4">
                Customize the look and feel of the application.
              </p>

              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-[var(--text-body)]">
                  Theme
                </label>

                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm cursor-pointer focus:outline-none"
                >
                  <option value="Light">Light</option>
                  <option value="Dark">Dark</option>
                  <option value="Forest">Forest</option>
                  <option value="Cyber">Cyber</option>
                </select>
              </div>
            </div>

            {/* Card: Biometric/Device Registration */}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm p-6 space-y-4">
               <div>
                  <h4 className="text-base font-bold text-[var(--text-main)]">
                    {t("profile.biometric_auth")}
                  </h4>
                  <p className="text-xs text-[var(--text-body)]/80 mt-1 max-w-md leading-relaxed">
                    Register your device (Fingerprint, FaceID, or Windows Hello) for fast, secure attendance marking.
                  </p>
               </div>
               
               <div>
                 {data.webauthn_credentials && data.webauthn_credentials.length > 0 ? (
                   <div className="flex flex-col gap-3">
                     <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                        <CheckCircle size={18} className="text-emerald-500" />
                        <span className="text-sm font-semibold">Device Registered</span>
                        <span className="text-xs ml-auto text-emerald-600/80 bg-white px-2 py-0.5 rounded-full border border-emerald-100">
                          {data.webauthn_credentials.length} key(s)
                        </span>
                     </div>
                     <button
                        onClick={handleRegisterDevice}
                        disabled={registeringDevice}
                        className="text-sm text-[var(--text-body)] hover:text-[var(--primary)] font-medium flex items-center gap-2 transition ml-1"
                     >
                        <Plus size={14} /> Add another device
                     </button>
                   </div>
                 ) : (
                    <button
                        onClick={handleRegisterDevice}
                        disabled={registeringDevice}
                        className="bg-[var(--action-info-bg)] hover:bg-[var(--action-info-hover)] active:scale-95 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm shadow-[var(--primary)]/20"
                    >
                        {registeringDevice ? (
                          <>
                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             <span>Registering...</span>
                          </>
                        ) : (
                          <>
                             <Fingerprint size={18} />
                             <span>Register Biometrics</span>
                          </>
                        )}
                    </button>
                 )}
               </div>
            </div>

            {/* Card 2: Face Image Upload */}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-[var(--text-main)]">
                    {t("profile.face_image.title")}
                  </h4>
                  <p className="text-xs text-[var(--text-body)]/80 mt-1 max-w-md leading-relaxed">
                    {t("profile.face_image.desc")}
                  </p>
                </div>
                {img ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={img}
                      alt="Face preview"
                      className="w-20 h-20 object-cover border border-[var(--border-color)] shadow-sm rounded-md"
                    />

                    <button
                      onClick={() => fileRef.current.click()}
                      className="mt-2 text-xs font-medium text-[var(--primary)] underline hover:text-[var(--primary-hover)] cursor-pointer"
                    >
                      {t("profile.face_image.replace")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current.click()}
                    className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-[var(--bg-secondary)] transition shadow-sm active:scale-95 text-[var(--text-body)] cursor-pointer"
                  >
                    <Upload size={14} />
                    {t("profile.face_image.upload")}
                  </button>
                )}
              </div>
              <div className="bg-[var(--bg-primary)] text-[var(--text-body)]/80 text-[10px] px-3 py-2 rounded-lg inline-block font-medium border border-[var(--border-color)]">
                {t("profile.face_image.tips")}
              </div>
            </div>

            {/* Card 3: Attendance Summary (Weighted) */}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-bold text-[var(--text-main)]">
                  {t("profile.summary.title")}
                </h4>
                <span className="bg-[var(--action-info-bg)] text-[var(--text-on-primary)] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {t("profile.summary.this_semester")}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end text-sm mb-1">
                  <span className="text-[var(--text-body)]/80 font-medium">
                    {t("profile.summary.overall")}
                  </span>
                  <span className="font-bold text-[var(--text-main)] text-lg">
                    {data?.attendance?.percentage ?? "0%"}
                  </span>
                </div>
                <div className="h-3 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isOverallOnTrack
                        ? "bg-[var(--success)]"
                        : "bg-[var(--danger)]"
                    }`}
                    style={{ width: `${Math.min(100, overallPercentage)}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-[var(--text-body)]/80 uppercase font-bold tracking-wide">
                    {t("profile.summary.attended")}
                  </p>
                  <p className="text-xl font-bold text-[var(--text-main)] mt-1">
                    {data?.attendance?.present ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-body)]/80 uppercase font-bold tracking-wide">
                    {t("profile.summary.total")}
                  </p>
                  <p className="text-xl font-bold text-[var(--text-main)] mt-1">
                    {(data?.attendance?.present ?? 0) +
                      (data?.attendance?.absent ?? 0)}
                  </p>
                </div>
              </div>

              <div
                className={`px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold shadow-sm ${
                  isOverallOnTrack
                    ? "bg-[var(--success)] text-[var(--text-on-primary)]"
                    : "bg-[var(--danger)] text-[var(--text-on-primary)]"
                }`}
              >
                <CheckCircle
                  size={18}
                  className="text-[var(--text-on-primary)]"
                />
                {isOverallOnTrack
                  ? t("profile.summary.on_track")
                  : t("profile.summary.off_track")}
              </div>
            </div>

            {/* Card 4: Subjects Grid */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-[var(--text-main)]">
                    {t("profile.subjects_card.title")}
                  </h4>
                  <p className="text-xs text-[var(--text-body)]/80 mt-1 max-w-sm leading-relaxed">
                    {t("profile.subjects_card.desc")}
                  </p>
                </div>

                <button
                  onClick={() => setOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[var(--border-color)] rounded-lg text-xs font-bold hover:bg-[var(--bg-secondary)] transition uppercase tracking-wide text-[var(--text-body)] cursor-pointer"
                >
                  <Plus size={14} />
                  {t("profile.subjects_card.add_btn")}
                </button>
              </div>

              {/* Grid of Cards */}
              {subjectsData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjectsData.map((sub) => (
                    <SubjectAttendanceCard
                      key={sub.id || sub._id}
                      subject={sub}
                      onDelete={(id) => {
                        const ok = window.confirm(
                          `Delete subject ${sub.name}?`
                        );
                        if (ok) deleteMutation.mutate(id);
                      }}
                    />
                  ))}
                </div>
              ) : (
                // Empty state
                <div className="text-center py-12 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] border-dashed">
                  <p className="text-[var(--text-body)]">
                    {t("profile.no_subjects")}
                  </p>
                  <button
                    onClick={() => setOpen(true)}
                    className="text-[var(--primary)] text-sm font-bold mt-2 hover:underline cursor-pointer"
                  >
                    {t("profile.enroll_subject")}
                  </button>
                </div>
              )}
            </div>
            
            {/* Modal for Adding Subjects */}
            {open && (
              <div className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-50">
                <div className="bg-[var(--bg-card)] rounded-xl p-6 w-80 space-y-4 border border-[var(--border-color)] shadow-lg">
                  <h3 className="font-bold text-lg text-[var(--text-main)]">
                    {t("profile.subjects_card.modal_title")}
                  </h3>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {availableSubjects?.map((sub) => (
                      <button
                        key={sub._id}
                        onClick={() => addSubjectMutation.mutate(sub._id)}
                        className="w-full text-left px-4 py-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-main)] transition-colors"
                      >
                        {sub.name}
                      </button>
                    ))}
                    {(!availableSubjects || availableSubjects.length === 0) && (
                         <p className="text-sm text-[var(--text-body)] text-center">No new subjects available.</p>
                    )}
                  </div>

                  <button
                    onClick={() => setOpen(false)}
                    className="w-full text-sm text-[var(--text-body)] hover:text-[var(--text-main)] py-2"
                  >
                    {t("profile.subjects_card.cancel")}
                  </button>
                </div>
              </div>
            )}
            <div className="block pb-4 md:hidden">
  <div
    className="flex justify-center gap-2 items-center px-12 py-1 rounded-2xl cursor-pointer"
    onClick={() => setLogoutOpen(true)}
  >
    <span className="text-red-500">
      {t("profile.logout")}
    </span>
    <LogOut
      className="text-[var(--danger)] transition-colors"
      size={24}
    />
  </div>
</div>

<LogoutConfirmDialog
  isOpen={isLogoutOpen}
  onClose={() => setLogoutOpen(false)}
  onConfirm={async () => {
    try {
      // 1. Notify backend to update the last_logout_time
      await logout();
    } catch (error) {
      console.error("Logout API failed, forcing local logout", error);
    } finally {
      // 2. Always clear local storage and redirect
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate("/");
    }
  }}
/>
             
          </div>
        )}
      </main>
    </div>
  );
}
