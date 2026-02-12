import React, { useState } from "react";
import SettingsSidebar from "../components/SettingsSidebar";
import { 
  Bell, 
  Lock, 
  HelpCircle, 
  Check, 
  Moon, 
  Shield 
} from "lucide-react";

export default function Settings() {
  const [emailPreferences, setEmailPreferences] = useState({
    attendanceAlerts: true,
    weeklyReports: false,
    securityAlerts: true
  });

  const handleToggle = (key) => {
    setEmailPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    alert("Preferences saved! (Mock)");
  };

  return (
    <div className="min-h-screen bg-(--bg-primary) flex">
      <SettingsSidebar activePage="General" />
      
      <main className="flex-1 p-8 md:p-12 overflow-y-auto w-full">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <div>
            <h1 className="text-3xl font-bold text-(--text-main)">Settings</h1>
            <p className="text-(--text-body) mt-2">Manage your account preferences and application settings.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
            
            {/* Email Notifications */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Bell size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-(--text-main)">Email Notifications</h3>
                  <p className="text-sm text-(--text-body) mt-1">Choose what updates you want to receive.</p>
                  
                  <div className="mt-6 space-y-4">
                    {/* Toggle Item */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">Attendance Alerts</p>
                        <p className="text-xs text-gray-500">Get notified when a student is marked absent consecutively.</p>
                      </div>
                      <button 
                        onClick={() => handleToggle("attendanceAlerts")}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${emailPreferences.attendanceAlerts ? "bg-blue-600" : "bg-gray-200"}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${emailPreferences.attendanceAlerts ? "translate-x-6" : "translate-x-0"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">Weekly Reports</p>
                        <p className="text-xs text-gray-500">Receive a summary of class attendance stats every Friday.</p>
                      </div>
                      <button 
                        onClick={() => handleToggle("weeklyReports")}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${emailPreferences.weeklyReports ? "bg-blue-600" : "bg-gray-200"}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${emailPreferences.weeklyReports ? "translate-x-6" : "translate-x-0"}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                  <Shield size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-(--text-main)">Security</h3>
                  <p className="text-sm text-(--text-body) mt-1">Manage your password and active sessions.</p>
                  
                  <div className="mt-4 flex gap-3">
                    <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Change Password</button>
                    <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition text-red-600 hover:text-red-700 hover:border-red-100">Log out all devices</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Moon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-(--text-main)">Appearance</h3>
                  <p className="text-sm text-(--text-body) mt-1">Customize the interface theme.</p>
                  
                  <div className="mt-4 grid grid-cols-3 gap-3 w-fit">
                    <button className="px-4 py-2 bg-gray-100 border-2 border-transparent rounded-lg text-sm font-medium">Light</button>
                    <button className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium hover:border-blue-500">Dark</button>
                    <button className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium hover:border-blue-500">Auto</button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3">
            <button className="px-6 py-2.5 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md transition flex items-center gap-2">
              <Check size={18} />
              Save Changes
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
