import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronDown, LogOut, Settings, User, Help } from "lucide-react";

// Example props: pass children for main content, role, user info, tabs
interface PanelLayoutProps {
  role: "admin" | "lawyer" | "customer";
  user: { name: string; avatarUrl?: string; email?: string };
  tabs: { label: string; path: string; active?: boolean }[];
  activeTab: string;
  onTabClick: (path: string) => void;
  children: React.ReactNode;
}

export const PanelLayout: React.FC<PanelLayoutProps> = ({
  role,
  user,
  tabs,
  activeTab,
  onTabClick,
  children,
}) => {
  const router = useRouter();

  const roleDisplayNames = {
    admin: "Administrator",
    lawyer: "Attorney", 
    customer: "Client"
  };

  // Generate initials from user name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F6F6] to-gray-100">
      {/* Enhanced Navigation Bar */}
      <nav className="bg-[#0C1F19] shadow-xl border-b-2 border-[#F9D366]/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Brand Section */}
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#F9D366] to-yellow-400 flex items-center justify-center shadow-lg">
                <span className="text-[#0C1F19] font-bold text-lg">LVJ</span>
              </div>
              <div>
                <div className="text-xl font-bold tracking-wide text-white">Case Assistant</div>
                <div className="text-xs text-gray-300 font-medium">Professional Legal Management</div>
              </div>
            </div>
            
            {/* User Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {/* Notifications */}
                <button className="relative p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                  <Bell className="w-5 h-5" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#F9D366] rounded-full border-2 border-[#0C1F19]"></div>
                </button>

                {/* Role Badge */}
                <div className="px-4 py-2 bg-gradient-to-r from-[#F9D366] to-yellow-400 text-[#0C1F19] rounded-xl font-bold text-sm shadow-lg">
                  {roleDisplayNames[role]}
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 pl-3 border-l border-gray-600">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F9D366] to-yellow-400 text-[#0C1F19] flex items-center justify-center font-bold shadow-lg">
                    {getInitials(user.name)}
                  </div>
                  <div className="text-right hidden md:block">
                    <div className="text-sm font-semibold text-white">{user.name}</div>
                    <div className="text-xs text-gray-300">{user.email}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-300 ml-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Tabs Navigation */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex px-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.path}
                onClick={() => onTabClick(tab.path)}
                className={`flex items-center gap-2 py-4 px-6 font-bold text-base border-b-3 transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.path
                    ? "bg-gradient-to-t from-[#F9D366]/20 to-transparent text-[#0C1F19] border-[#F9D366] shadow-sm"
                    : "bg-transparent text-gray-600 border-transparent hover:bg-[#F9D366]/10 hover:text-[#0C1F19]"
                }`}
                aria-current={activeTab === tab.path ? "page" : undefined}
              >
                <span className={`text-lg ${activeTab === tab.path ? 'font-bold' : 'font-medium'}`}>
                  {tab.label}
                </span>
                {activeTab === tab.path && (
                  <div className="w-2 h-2 bg-[#F9D366] rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="bg-[#0C1F19] text-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-lg bg-[#F9D366] flex items-center justify-center">
                <span className="text-[#0C1F19] font-bold text-sm">LVJ</span>
              </div>
              <div>
                <div className="text-sm font-semibold">LVJ Case Assistant</div>
                <div className="text-xs text-gray-400">Professional Legal Management Platform</div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <span>Support</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span>Settings</span>
              </div>
              <div className="h-4 w-px bg-gray-600"></div>
              <div className="text-xs text-gray-400">
                © 2024 LVJ Legal Services
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};