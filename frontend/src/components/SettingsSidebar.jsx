import React from "react";
import { User, Sliders, AlertCircle, ScanFace, Heart,LogOut, } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SettingsSidebar({ activeTab, setActiveTab, onLogout}) {
  const { t } = useTranslation();

  const sidebarItems = [
    { id: "general", icon: Sliders },
    { id: "thresholds", icon: AlertCircle },
    { id: "profile", icon: User },
    { id: "face_settings", icon: ScanFace },
    { id: "credits", icon: Heart },
  ];

  return (
    <div className="w-full md:w-64 flex-shrink-0 bg-white md:bg-transparent rounded-xl border md:border-none border-gray-100 shadow-sm md:shadow-none p-2 md:p-0">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-3 hidden md:block">
          {t('settings.sidebar.heading')}
        </h3>
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === item.id
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <item.icon size={18} />
            {t(`settings.sidebar.${item.id}`)}
          </button>
        ))}
        
      </div>
      <div className="mt-4 border-t border-gray-200 pt-2">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} />
          {t('settings.sidebar.logout')}
        </button>
      </div>
    </div>
  );
}