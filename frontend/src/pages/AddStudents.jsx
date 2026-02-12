import React, { useEffect, useState } from "react";
import { 
  Search, 
  RefreshCw, 
  CheckCircle, 
  LayoutDashboard, 
  CalendarCheck, 
  Users, 
  BarChart2, 
  FileText, 
  UserPlus, 
  LogOut,
  ChevronDown,
  Check,
  X,
  User
} from "lucide-react";
import { fetchMySubjects, fetchSubjectStudents, verifyStudent, deleteStudent } from "../api/teacher";

export default function AddStudents() {
  const [filterType, setFilterType] = useState("Unverified only");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);



  useEffect(() => {
    fetchMySubjects().then(setSubjects);
  }, []);
  
  useEffect(() => {
    if(!selectedSubject) return;
    fetchSubjectStudents(selectedSubject).then(setStudents);
  }, [selectedSubject]);

  // console.log(students)

  const filteredStudents = students
    .filter((s) => {
      if (filterType === "Unverified only") return s.verified === false;
      return true;
    })
    .map((s) => ({
      id: s.student_id,
      name: s.name,
      roll: s.roll,           
      year: s.year,           
      branch: s.branch.toUpperCase(),
      status: s.verified ? "Verified" : "Unverified",
      addedTime: "Just now",
      avatar: s.avatar,
      hasImage: true,
      actionType: s.verified ? "none" : "verify"
  }));

  const unverifiedCount = filteredStudents.filter(s => s.status === "Unverified").length;

  const handleVerify = async (studentId) => {
    if (!confirm("Verify this student for attendance?")) return;

    await verifyStudent(selectedSubject, studentId);
    fetchSubjectStudents(selectedSubject).then(setStudents);
  };

  const handleDelete = async (studentId) => {
    if (!confirm("Remove this student from subject?")) return;

    await deleteStudent(selectedSubject, studentId);
    fetchSubjectStudents(selectedSubject).then(setStudents);
  };


  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      
      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 m-auto p-8 overflow-y-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">Add students</h2>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Unverified list</span>
            </div>
            <p className="text-gray-500 text-sm">Students who added subjects in their profile appear here automatically. Review and verify them for face-recognition attendance.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition shadow-sm">
              <RefreshCw size={16} />
              Refresh
            </button>
            <button className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-sm font-medium hover:bg-[#4338ca] flex items-center gap-2 shadow-md transition">
              <CheckCircle size={16} />
              Verify all visible
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by name or roll number" 
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Subjects</label>
              <div className="relative">
                <select
                  value={selectedSubject || ""}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700"
                >
                  <option value="">Select subject</option>
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Year</label>
              <div className="relative">
                <select className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700">
                  <option>All years</option>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-50">
             <p className="text-xs text-gray-500">
               <span className="font-bold text-gray-700">Auto-populated list:</span> Whenever a student adds a new subject on their profile, they appear here as <span className="font-bold text-gray-900">unverified</span> until you confirm or delete.
             </p>
             <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setFilterType("Unverified only")}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === "Unverified only" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Unverified only
                </button>
                <button 
                  onClick={() => setFilterType("All requests")}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === "All requests" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  All requests
                </button>
             </div>
          </div>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Unverified students</h3>
              <p className="text-sm text-gray-500">Review face images, details, and linked subjects before allowing them into attendance sessions.</p>
            </div>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
              {unverifiedCount} pending approvals
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Roll no</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Year</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors group">

                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{student.roll}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full bg-gray-100" />
                        <div>
                          <div className="font-semibold text-gray-900">{student.name}</div>
                          <div className="text-xs text-gray-400">Added {student.addedTime}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.year}</td>
                    <td className="px-6 py-4 text-sm text-gray-800 max-w-[200px]">{student.branch}</td>
                    <td className="px-6 py-4">
                      {student.status === "Unverified" ? (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                           <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                           Unverified
                         </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                           <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                           Waiting image
                         </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {!student.verified && (
                          <button
                            onClick={() => handleVerify(student.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition shadow-sm"
                          >
                            <Check size={14} /> Verify
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(student.id)}
                          className="px-3 py-1.5 border border-rose-200 text-rose-500 rounded-lg text-xs font-bold hover:bg-rose-50 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
             Older requests are hidden. Adjust filters above to see all previously verified or deleted students.
          </div>
        </div>
        
        <p className="mt-6 text-xs text-gray-400 text-center">
          Note: Verified students will start appearing in the attendance marking list for their selected subjects and classes. You can revoke access anytime by deleting their entry from the main Students page.
        </p>

      </main>
    </div>
  );
}

// Simple Helper Component for Sidebar Items
// eslint-disable-next-line no-unused-vars
function NavItem({ icon: IconComp, label }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors">
      <IconComp size={18} />
      <span>{label}</span>
    </button>
  );
}