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

  const [unverifiedCount, setUnverifiedCount] = useState(0)

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
    .map((s, idx) => ({
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

  useEffect(() => {
    setUnverifiedCount(
      filteredStudents.filter(s => s.status === "Unverified").length
    );
  }, [filteredStudents]);

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
    <div className="flex h-screen bg-[var(--bg-secondary)]">
      
      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 m-auto p-8 overflow-y-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-[var(--text-main)]">Add students</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: "color-mix(in srgb, var(--info) 18%, transparent)", color: "var(--info)",}}>Unverified list</span>
            </div>
            <p className="text-[var(--text-body)] text-sm">Students who added subjects in their profile appear here automatically. Review and verify them for face-recognition attendance.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-body)] rounded-lg text-sm font-medium hover:bg-[var(--bg-hover)] flex items-center gap-2 transition shadow-sm">
              <RefreshCw size={16} />
              Refresh
            </button>
            <button className="px-4 py-2 bg-[var(--primary)] text-[var(--text-on-primary)] rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2 shadow-md transition">
              <CheckCircle size={16} />
              Verify all visible
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-body)]">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by name or roll number" 
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>
            </div>
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-body)]">Subjects</label>
              <div className="relative">
                <select
                  value={selectedSubject || ""}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm appearance-none focus:ring-2 focus:ring-[var(--primary)] outline-none text-[var(--text-main)]"
                >
                  <option value="">Select subject</option>
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70 pointer-events-none" size={16} />
              </div>
            </div>
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-body)]">Year</label>
              <div className="relative">
                <select className="w-full pl-3 pr-10 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm appearance-none focus:ring-2 focus:ring-[var(--primary)] outline-none text-[var(--text-main)]">
                  <option>All years</option>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-body)] opacity-70 pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-[var(--border-color)]">
             <p className="text-xs text-[var(--text-body)] opacity-70">
               <span className="font-bold text-[var(--text-main)]">Auto-populated list:</span> Whenever a student adds a new subject on their profile, they appear here as <span className="font-bold text-[var(--text-main)]">unverified</span> until you confirm or delete.
             </p>
             <div className="flex bg-[var(--bg-secondary)] p-1 rounded-lg">
                <button 
                  onClick={() => setFilterType("Unverified only")}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === "Unverified only" ? "bg-[var(--primary)] text-[var(--text-on-primary)] shadow-sm" : "text-[var(--text-body)] opacity-70 hover:opacity-100"}`}
                >
                  Unverified only
                </button>
                <button 
                  onClick={() => setFilterType("All requests")}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === "All requests" ? "bg-[var(--primary)] text-[var(--text-on-primary)] shadow-sm" : "text-[var(--text-body)] opacity-70 hover:opacity-100"}`}
                >
                  All requests
                </button>
             </div>
          </div>
        </div>

        {/* List Section */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center">
            <div>
              <h3 className="font-bold text-[var(--text-main)] text-lg">Unverified students</h3>
              <p className="text-sm text-[var(--text-body)]">Review face images, details, and linked subjects before allowing them into attendance sessions.</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{backgroundColor: "color-mix(in srgb, var(--amber-500) 18%, transparent)",color: "var(--amber-500)"}}>
             {unverifiedCount} pending approvals
            </span>

          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-[var(--bg-secondary)]">
                <tr className="text-left text-xs font-semibold text-[var(--text-body)] opacity-70 uppercase tracking-wider">
                  <th className="px-6 py-4">Roll no</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Year</th>
                  <th className="px-6 py-4">Branch</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-[var(--bg-hover)] transition-colors group">

                    <td className="px-6 py-4 text-sm font-medium text-[var(--text-body)]">{student.roll}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full bg-[var(--bg-secondary)]" />
                        <div>
                          <div className="font-semibold text-[var(--text-main)]">{student.name}</div>
                          <div className="text-xs text-[var(--text-body)]">Added {student.addedTime}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-body)]">{student.year}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-main)] max-w-[200px]">{student.branch}</td>
                    <td className="px-6 py-4">
                      {student.status === "Unverified" ? (
                         <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border" style={{backgroundColor: "color-mix(in srgb, var(--amber-500) 18%, transparent)",color: "var(--amber-500)", borderColor: "color-mix(in srgb, var(--amber-500) 35%, transparent)"}}>
                           <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--amber-500)" }} />
                           Unverified
                         </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border" style={{ backgroundColor: "color-mix(in srgb, var(--text-body) 10%, transparent)", color: "var(--text-body)", borderColor: "var(--border-color)" }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--text-body)" }} />
                          Waiting image
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {!student.verified && (
                          <button
                            onClick={() => handleVerify(student.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm hover:opacity-90"
                            style={{ backgroundColor: "var(--emerald-500)", color: "var(--text-on-primary)" }}>
                            <Check size={14} /> Verify
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(student.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition hover:opacity-90"
                          style={{
                             border: "1px solid color-mix(in srgb, var(--rose-500) 35%, transparent)",color: "var(--rose-500)",backgroundColor: "transparent"
                          }}>
                          <X size={14} />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] text-xs text-[var(--text-body)] opacity-70 text-center">
             Older requests are hidden. Adjust filters above to see all previously verified or deleted students.
          </div>
        </div>
        
        <p className="mt-6 text-xs text-[var(--text-body)] opacity-70 text-center">
          Note: Verified students will start appearing in the attendance marking list for their selected subjects and classes. You can revoke access anytime by deleting their entry from the main Students page.
        </p>

      </main>
    </div>
  );
}

// Simple Helper Component for Sidebar Items
function NavItem({ icon: Icon, label }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[var(--text-body)] hover:bg-[var(--bg-hover)] rounded-lg text-sm font-medium transition-colors">
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}