import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  MessageSquare, 
  Menu, 
  Bell, 
  User 
} from 'lucide-react';

const ParentDashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Overview', icon: LayoutDashboard, path: '/parent/dashboard' },
    { name: 'Academics', icon: BookOpen, path: '/parent/academics' },
    { name: 'Reports', icon: FileText, path: '/parent/reports' },
    { name: 'Messages', icon: MessageSquare, path: '/parent/messages' },
  ];

  // Mobile Bottom Nav Items (slightly different labels as per requirement)
  const mobileNavItems = [
    { name: 'Home', icon: LayoutDashboard, path: '/parent/dashboard' },
    { name: 'Subjects', icon: BookOpen, path: '/parent/academics' },
    { name: 'Reports', icon: FileText, path: '/parent/reports' },
    { name: 'Messages', icon: MessageSquare, path: '/parent/messages' },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans text-slate-800">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed h-full bg-white border-r border-slate-200">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            SA
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">Smart Attendance</h1>
            <p className="text-xs text-slate-500">Parent portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon size={20} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
               <img src="https://ui-avatars.com/api/?name=R+Nemchand&background=random" alt="Profile" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">R. Nemchand</p>
              <p className="text-xs text-slate-500 truncate">Parent</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-64 pb-20 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-20 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    SA
                </div>
                <span className="font-semibold text-slate-900">Parent Portal</span>
             </div>
             <div className="flex items-center gap-3">
                <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                    <img src="https://ui-avatars.com/api/?name=R+Nemchand&background=random" alt="Profile" />
                </div>
             </div>
        </header>

        {/* Desktop Header (Top Bar) */}
        <header className="hidden md:flex justify-between items-center p-8 pb-0">
             <div>
                <h2 className="text-2xl font-bold text-slate-900">Parent Dashboard</h2>
                <p className="text-slate-500">Track Nemchand's attendance and academic engagement in real time.</p>
             </div>
             <div className="flex items-center gap-4">
                <button className="p-2 bg-white text-slate-600 rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50">
                    <Bell size={20} />
                </button>
                <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200">
                    <div className="w-8 h-8 rounded-md overflow-hidden">
                         <img src="https://ui-avatars.com/api/?name=R+Nemchand&background=random" alt="Profile" />
                    </div>
                    <div className="text-right hidden lg:block">
                        <p className="text-sm font-medium text-slate-900">R. Nemchand</p>
                        <p className="text-xs text-slate-500">Parent</p>
                    </div>
                </div>
             </div>
        </header>

        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-4 py-2 safe-area-pb">
        <ul className="flex justify-between items-center">
          {mobileNavItems.map((item) => (
            <li key={item.path} className="flex-1">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-indigo-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`
                }
              >
                <item.icon size={20} strokeWidth={2.5} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default ParentDashboardLayout;
