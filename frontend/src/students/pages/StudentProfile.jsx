import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient  } from "@tanstack/react-query";
import { fetchMyStudentProfile } from "../../api/auth.js";
import {fetchAvailableSubjects, addSubjectToStudent, removeSubjectFromStudent } from "../../api/students.js"

import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  CheckCircle, 
  BookOpen, 
  Mail, 
  Phone, 
  MapPin, 
  Camera,
  Edit2,
  Home,
  TrendingUp,
  User
} from "lucide-react";
import StudentNavigation from "../components/StudentNavigation"
import { Link } from "react-router-dom";
import { uploadFaceImage } from "../../api/students"
import { useRef } from "react";
import { useTranslation } from "react-i18next";

export default function StudentProfile() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const {data, isLoading, isError, error} = useQuery({
    queryKey: ["myStudentProfile"],
    queryFn: fetchMyStudentProfile,
    retry: false,
  });

  const {data: availableSubjects} = useQuery({
    queryKey: ["availableSubjects"],
    queryFn: fetchAvailableSubjects,
    enabled: open,
  })

  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: uploadFaceImage,
    onSuccess: () => {
      queryClient.invalidateQueries(["myStudentProfile"]);
    }
  });

  const addSubjectMutation = useMutation({
    mutationFn: addSubjectToStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(["myStudentProfile"]);
      setOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: removeSubjectFromStudent,
    onSuccess: () => {
      queryClient.invalidateQueries(["myStudentProfile"]);
      setSelectedSub(null);
    }
  });

  
  
  if (isLoading) return <div>{t('profile.loading')}</div>;
  if (isError){
    return <div>{t('profile.error', { message: error?.message || t('profile.not_found') })}</div>;
  }
  if(!data) return <div>{t('profile.not_found')}</div>;
  

  const img = data.image_url;
  // console.log(data)


  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* 1. Sidebar */}
      <StudentNavigation activePage="profile" />


      {/* 2. Main Content */}
      <main className="flex-1 md:ml-64 p-6 md:p-8 pb-24 md:pb-8 animate-in fade-in duration-500 relative">
        
        {/* Language Switcher */}
        <div className="absolute top-6 right-6 z-10">
            <div className="flex gap-2 items-center bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <button 
                onClick={() => changeLanguage('en')} 
                className={`text-xs ${i18n.language === 'en' ? 'font-bold text-blue-900 border-b-2 border-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                English
              </button>
              <span className="text-gray-300 text-xs">|</span>
              <button 
                onClick={() => changeLanguage('hi')} 
                className={`text-xs ${i18n.language === 'hi' ? 'font-bold text-blue-900 border-b-2 border-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                हिंदी
              </button>
            </div>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{t('profile.title')}</h2>
              <p className="text-slate-500 text-sm">{t('profile.subtitle')}</p>
            </div>
          </div>

          {/* Card 1: Personal Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-sm overflow-hidden">
                  <img 
                    src={img} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white w-6 h-6" />
                </div>
              </div>
              
              {/* Info */}
              <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{data.name || "John"}</h3>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">{t('profile.roll_no')}: {data.roll || "21CS045"}</span>
                    </div>
                  </div>
                  <button className="text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition mt-3 sm:mt-0 border border-gray-200 flex items-center gap-2 cursor-not-allowed">
                    <Edit2 size={12} />
                    {t('profile.edit_details')}
                  </button>
                </div>
                
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-slate-600 pt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">{t('profile.year')}:</span>
                    <span className="font-medium text-slate-800">{data.year || "1st"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">{t('profile.branch')}:</span>
                    <span className="font-medium text-slate-800">{(data.branch).toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">{t('profile.email')}:</span>
                    <span className="font-medium text-slate-800">{data.email || "ananya@example.edu"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            hidden
            onChange={(e) => {
              if (e.target.files[0]) {
                uploadMutation.mutate(e.target.files[0]);
              }
            }}
          />


          {/* Card 2: Face Image Upload */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-base font-bold text-slate-800">{t('profile.face_image.title')}</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
                  {t('profile.face_image.desc')}
                </p>
              </div>
              {img ? (
                <div className="flex flex-col items-center">
                  <img
                    src={img}
                    alt="Face preview"
                    className="w-20 h-20 object-cover border border-gray-200 shadow-sm"
                  />

                  <button
                    onClick={() => fileRef.current.click()}
                    className="mt-2 text-xs font-medium text-blue-600 underline hover:text-blue-700 cursor-pointer"
                  >
                   {t('profile.face_image.replace')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-gray-50 transition shadow-sm active:scale-95 text-slate-600 cursor-pointer"
                >
                  <Upload size={14} />
                  {t('profile.face_image.upload')}
                </button>
              )}

            </div>
            <div className="bg-gray-50 text-slate-500 text-[10px] px-3 py-2 rounded-lg inline-block font-medium border border-gray-100">
              {t('profile.face_image.tips')}
            </div>
          </div>

          {/* Card 3: Attendance Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-slate-800">{t('profile.summary.title')}</h4>
              <span className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">{t('profile.summary.this_semester')}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end text-sm mb-1">
                <span className="text-slate-500 font-medium">{t('profile.summary.overall')}</span>
                <span className="font-bold text-slate-900 text-lg">{data.attendance.percentage}</span>
              </div>
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-[#10B981] rounded-full`}
                  style={{ width: `${data.attendance.percentage}%` }}
                ></div>

              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">{t('profile.summary.attended')}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{data.attendance.present}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">{t('profile.summary.total')}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{data.attendance.present + data.attendance.absent}</p>
              </div>
            </div>

            <div className="bg-[#10B981] text-white px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold shadow-sm">
              <CheckCircle size={18} className="text-white" />
              {t('profile.summary.on_track')}
            </div>
          </div>

          {/* Card 4: Subjects */}
          {open && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-80 space-y-4">
                <h3 className="font-bold text-lg">{t('profile.subjects_card.modal_title')}</h3>

                {availableSubjects?.map(sub => (
                  <button
                    key={sub._id}
                    onClick={() => addSubjectMutation.mutate(sub._id)}
                    className="w-full text-left px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    {sub.name}
                  </button>
                ))}

                <button
                  onClick={() => setOpen(false)}
                  className="text-sm text-gray-500"
                >
                  {t('profile.subjects_card.cancel')}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-base font-bold text-slate-800">{t('profile.subjects_card.title')}</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                  {t('profile.subjects_card.desc')}
                </p>
              </div>

              <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 transition uppercase tracking-wide text-slate-600"
              >
                <Plus size={14} />
                {t('profile.subjects_card.add_btn')}
              </button>
            </div>

            {/* ✅ Corrected subject rendering */}
            <div className="flex flex-wrap gap-3">
              {data.subjects?.map((sub) => (
                <div
                  key={sub._id}
                  onClick={()=> setSelectedSub(sub._id)}
                  className="relative bg-blue-500 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-200 cursor-pointer group"
                >
                  <BookOpen size={14} className="opacity-80" />
                  {sub.name}
                  {sub.code && (
                    <span className="opacity-70">({sub.code})</span>
                  )}

                  {selectedSub == sub._id && (
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const ok = window.confirm(`Delete subject ${sub.name}`);
                      if(ok) deleteMutation.mutate(sub._id);
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition" 
                    >x</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      
    </div>
  );
}