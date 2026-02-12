import React, { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  CalendarDays, 
  User, 
  LogOut,
  Sparkles,
  BookOpen
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getCurrentUser } from "../../api/auth";

export default function StudentNavigation() {
  const location = useLocation();
  const [studentName, setStudentName] = useState("Student");

  useEffect(() => {
    const user = getCurrentUser();
    if (user && user.full_name) {
      setStudentName(user.full_name);
    }
  }, []);

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/student/dashboard" },
    { label: "My Subjects", icon: BookOpen, path: "/student/subjects" },
    { label: "Attendance Forecast", icon: Sparkles, path: "/student/forecast" },
    { label: "Profile", icon: User, path: "/student/profile" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_role");
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around p-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`flex flex-col items-center p-2 rounded-lg transition ${ isActive ? "text-(--primary)" : "text-gray-500" }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}
      </div>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-3 text-(--primary)">
            <div className="w-8 h-8 rounded-lg bg-(--primary) flex items-center justify-center text-white font-bold text-xl">
              S
            </div>
            <span className="text-xl font-bold tracking-tight">SmartAttend</span>
          </div>
        </div>

        <div className="px-4 py-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Student Menu</p>
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? "bg-(--primary) text-white shadow-md shadow-blue-200" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                >
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-gray-50">
           <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                {studentName.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate text-gray-900">{studentName}</p>
                <p className="text-xs text-gray-500 truncate">Student Portal</p>
              </div>
           </div>
           <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-red-600 font-medium p-2 hover:bg-red-50 rounded-lg transition"
           >
             <LogOut size={16} />
             Sign out
           </button>
        </div>
      </nav>
    </>
  );
}
