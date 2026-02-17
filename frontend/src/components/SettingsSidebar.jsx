import React from "react";
import PropTypes from "prop-types";
import { User, Sliders, AlertCircle, ScanFace, Heart, LogOut } from "lucide-react";
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
    <aside className="w-full md:w-64 flex-shrink-0 bg-[var(--bg-card)] md:bg-transparent rounded-xl border md:border-none border-[var(--border-color)] shadow-sm md:shadow-none p-2 md:p-0">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-[var(--text-body)]/80 uppercase tracking-wide mb-3 px-3 hidden md:block">
          {t('settings.sidebar.heading')}
        </h3>
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === item.id
                ? "bg-[var(--action-info-bg)] text-[var(--text-on-primary)] shadow-lg shadow-black/10"
                : "text-[var(--text-body)]/80 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-main)]"
            }`}
          >
            <item.icon size={18} />
            {t(`settings.sidebar.${item.id}`)}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-[var(--border-color)]">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
        >
          <LogOut size={18} />
          {t('settings.sidebar.logout')}
        </button>
      </div>
    </aside>
  );
}

SettingsSidebar.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};
