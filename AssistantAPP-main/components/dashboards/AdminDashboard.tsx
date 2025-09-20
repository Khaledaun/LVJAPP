import React, { useState } from "react";
import { PanelLayout } from "@/components/layout/PanelLayout";
import useSWR from 'swr';
import { Users, BarChart3, Settings, FileText, Activity, AlertTriangle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const adminTabs = [
  { label: "Overview", path: "/admin/dashboard" },
  { label: "Users", path: "/admin/users" },
  { label: "Reports", path: "/admin/reports" },
  { label: "Settings", path: "/admin/settings" },
];

interface AdminDashboardProps {
  user: { name: string; email: string; avatarUrl?: string };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState(adminTabs[0].path);

  // Fetch admin data
  const { data: usersData, isLoading: usersLoading, error: usersError } = useSWR('/api/staff', fetcher);
  const { data: casesData, isLoading: casesLoading } = useSWR('/api/cases', fetcher);

  const users = usersData?.items || [];
  const cases = casesData?.items || [];

  // Calculate metrics
  const totalUsers = users.length;
  const totalCases = cases.length;
  const activeCases = cases.filter((c: any) => c.status !== 'completed' && c.status !== 'closed').length;
  const pendingCases = cases.filter((c: any) => c.status === 'pending' || c.status === 'in_review').length;

  const handleTabClick = (path: string) => {
    setActiveTab(path);
  };

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-[#0C1F19] tracking-tight">System Administration</h1>
        <p className="text-xl text-gray-600 font-medium">Comprehensive system oversight and user management</p>
        <div className="h-1 w-24 bg-gradient-to-r from-[#F9D366] to-yellow-400 rounded-full"></div>
      </div>

      {/* Enhanced Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Total Users</p>
              <p className="text-3xl font-bold text-[#0C1F19] mb-1">{totalUsers}</p>
              <p className="text-sm text-gray-500">Active system users</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Total Cases</p>
              <p className="text-3xl font-bold text-[#0C1F19] mb-1">{totalCases}</p>
              <p className="text-sm text-gray-500">Cases in system</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Active Cases</p>
              <p className="text-3xl font-bold text-blue-600 mb-1">{activeCases}</p>
              <p className="text-sm text-gray-500">Currently processing</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Pending Review</p>
              <p className="text-3xl font-bold text-orange-600 mb-1">{pendingCases}</p>
              <p className="text-sm text-gray-500">Requiring attention</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Activity Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-[#F9D366] rounded-xl">
            <Activity className="w-6 h-6 text-[#0C1F19]" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#0C1F19]">Recent System Activity</h3>
            <p className="text-gray-600">Latest system events and notifications</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
            <div className="w-3 h-3 bg-blue-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">New user registration</p>
              <p className="text-sm text-gray-600 mt-1">John Doe registered as client with verification pending</p>
              <span className="text-xs text-gray-500 mt-2 block">2 hours ago</span>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl border-l-4 border-green-500">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Case status updated</p>
              <p className="text-sm text-gray-600 mt-1">Case #12345 successfully moved to review stage</p>
              <span className="text-xs text-gray-500 mt-2 block">4 hours ago</span>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-xl border-l-4 border-purple-500">
            <div className="w-3 h-3 bg-purple-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">System backup completed</p>
              <p className="text-sm text-gray-600 mt-1">Daily automated backup completed successfully</p>
              <span className="text-xs text-gray-500 mt-2 block">1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">User Management</h1>
          <p className="text-gray-600">Manage system users and permissions</p>
        </div>
        <button className="px-4 py-2 bg-[#F9D366] text-[#0C1F19] font-semibold rounded-lg hover:bg-[#F9D366]/80 transition-colors">
          Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {usersLoading ? (
          <div className="p-6 text-center">Loading users...</div>
        ) : usersError ? (
          <div className="p-6 text-center text-red-600">Failed to load users</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F6F6] border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-[#0C1F19]">User</th>
                  <th className="text-left py-4 px-6 font-semibold text-[#0C1F19]">Email</th>
                  <th className="text-left py-4 px-6 font-semibold text-[#0C1F19]">Role</th>
                  <th className="text-left py-4 px-6 font-semibold text-[#0C1F19]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: any, index: number) => (
                  <tr key={user.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#F9D366] rounded-full flex items-center justify-center">
                          <span className="text-[#0C1F19] font-bold text-sm">
                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{user.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600">{user.email}</td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Staff
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                        <button className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">System Reports</h1>
        <p className="text-gray-600">Analytics and reporting dashboard</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-[#0C1F19] mb-4">Case Analytics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed Cases</span>
              <span className="font-bold text-green-600">85%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-[#0C1F19] mb-4">User Activity</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Users</span>
              <span className="font-bold text-blue-600">92%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">System Settings</h1>
        <p className="text-gray-600">Configure system parameters and preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-[#0C1F19] mb-4">Application Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-600">Send email notifications for case updates</p>
            </div>
            <button className="w-12 h-6 bg-[#F9D366] rounded-full relative transition-colors">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform"></div>
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Automatic Backups</p>
              <p className="text-sm text-gray-600">Enable daily system backups</p>
            </div>
            <button className="w-12 h-6 bg-[#F9D366] rounded-full relative transition-colors">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "/admin/users": return renderUsers();
      case "/admin/reports": return renderReports();
      case "/admin/settings": return renderSettings();
      default: return renderOverview();
    }
  };

  return (
    <PanelLayout
      role="admin"
      user={user}
      tabs={adminTabs}
      activeTab={activeTab}
      onTabClick={handleTabClick}
    >
      {renderContent()}
    </PanelLayout>
  );
};