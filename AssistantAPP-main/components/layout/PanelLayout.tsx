import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    admin: "Admin",
    lawyer: "Lawyer", 
    customer: "Customer"
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
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between h-16 px-8 bg-[#0C1F19] text-white shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded bg-[#F9D366] flex items-center justify-center shadow-sm">
            <span className="text-[#0C1F19] font-bold text-sm">LVJ</span>
          </div>
          <div className="text-2xl font-bold tracking-wide">Case Assistant</div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-[#F9D366] text-[#0C1F19] rounded font-bold uppercase text-sm">
              {roleDisplayNames[role]}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#F9D366] text-[#0C1F19] flex items-center justify-center font-bold text-sm">
                {getInitials(user.name)}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{user.name}</div>
                <div className="text-xs text-gray-300">{user.email}</div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Tabs Navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex px-8">
          {tabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => onTabClick(tab.path)}
              className={`py-4 px-6 font-bold text-base border-b-2 transition-all duration-200 ${
                activeTab === tab.path
                  ? "bg-[#F9D366] text-[#0C1F19] border-[#F9D366]"
                  : "bg-transparent text-[#0C1F19] border-transparent hover:bg-[#F9D366]/20 hover:border-[#F9D366]/50"
              }`}
              aria-current={activeTab === tab.path ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};