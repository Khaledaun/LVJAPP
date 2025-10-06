import React, { useState } from "react";
import { PanelLayout } from "@/components/layout/PanelLayout";
import useSWR from 'swr';
import { FileText, Calendar, Users, MessageSquare, Clock, CheckCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const lawyerTabs = [
  { label: "Overview", path: "/lawyer/dashboard" },
  { label: "Cases", path: "/lawyer/cases" },
  { label: "Clients", path: "/lawyer/clients" },
  { label: "Tasks", path: "/lawyer/tasks" },
  { label: "Schedule", path: "/lawyer/schedule" },
];

interface LawyerDashboardProps {
  user: { name: string; email: string; avatarUrl?: string };
}

export const LawyerDashboard: React.FC<LawyerDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState(lawyerTabs[0].path);

  // Fetch lawyer data
  const { data: casesData, isLoading: casesLoading } = useSWR('/api/cases', fetcher);
  const { data: clientsData, isLoading: clientsLoading } = useSWR('/api/staff', fetcher);

  const cases = casesData?.items || [];
  const clients = clientsData?.items || [];

  // Calculate metrics
  const totalCases = cases.length;
  const activeCases = cases.filter((c: any) => c.status !== 'completed' && c.status !== 'closed').length;
  const completedCases = cases.filter((c: any) => c.status === 'completed').length;
  const urgentCases = cases.filter((c: any) => c.urgencyLevel === 'high').length;

  const handleTabClick = (path: string) => {
    setActiveTab(path);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">Lawyer Dashboard</h1>
        <p className="text-gray-600">Manage your cases and client interactions</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cases</p>
              <p className="text-2xl font-bold text-[#0C1F19]">{totalCases}</p>
            </div>
            <div className="p-3 bg-[#F9D366]/20 rounded-lg">
              <FileText className="w-6 h-6 text-[#0C1F19]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Cases</p>
              <p className="text-2xl font-bold text-blue-600">{activeCases}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedCases}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Urgent Cases</p>
              <p className="text-2xl font-bold text-red-600">{urgentCases}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-[#0C1F19] mb-4">Recent Cases</h3>
          <div className="space-y-3">
            {cases.slice(0, 5).map((caseItem: any, index: number) => (
              <div key={caseItem.id || index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{caseItem.title || `Case #${index + 1}`}</p>
                  <p className="text-sm text-gray-600">{caseItem.applicantName || 'Unknown Client'}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    caseItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                    caseItem.status === 'in_review' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {caseItem.status || 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-[#0C1F19] mb-4">Today's Schedule</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[#F6F6F6] rounded-lg">
              <div className="w-2 h-2 bg-[#F9D366] rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Client consultation</p>
                <p className="text-sm text-gray-600">10:00 AM - John Doe</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#F6F6F6] rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Case review meeting</p>
                <p className="text-sm text-gray-600">2:00 PM - Immigration case</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#F6F6F6] rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Document filing</p>
                <p className="text-sm text-gray-600">4:00 PM - USCIS submission</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCases = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">Case Management</h1>
          <p className="text-gray-600">Track and manage your legal cases</p>
        </div>
        <button className="px-4 py-2 bg-[#F9D366] text-[#0C1F19] font-semibold rounded-lg hover:bg-[#F9D366]/80 transition-colors">
          New Case
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {casesLoading ? (
          <div className="p-6 text-center">Loading cases...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F6F6] border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-[#0C1F19]">Case</th>
                  <th className="text-left py-4 px-6 font-semibold text-[#0C1F19]">Client</th>
                  <th className="text-left py-4 px-6 font-semibold text-[#0C1F19]">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-[#0C1F19]">Updated</th>
                  <th className="text-left py-4 px-6 font-semibold text-[#0C1F19]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((caseItem: any, index: number) => (
                  <tr key={caseItem.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-gray-900">{caseItem.title || `Case #${index + 1}`}</p>
                        <p className="text-sm text-gray-600">{caseItem.visaType || 'Immigration'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-gray-900">{caseItem.applicantName || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{caseItem.applicantEmail || ''}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        caseItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                        caseItem.status === 'in_review' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {caseItem.status || 'pending'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600 text-sm">
                      {caseItem.updatedAt ? new Date(caseItem.updatedAt).toLocaleDateString() : 'Recently'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</button>
                        <button className="text-green-600 hover:text-green-800 text-sm font-medium">Update</button>
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

  const renderClients = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">Client Management</h1>
          <p className="text-gray-600">Manage your client relationships</p>
        </div>
        <button className="px-4 py-2 bg-[#F9D366] text-[#0C1F19] font-semibold rounded-lg hover:bg-[#F9D366]/80 transition-colors">
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client: any, index: number) => (
          <div key={client.id || index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#F9D366] rounded-full flex items-center justify-center">
                <span className="text-[#0C1F19] font-bold">
                  {(client.name || client.email || 'C').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{client.name || 'Unknown Client'}</p>
                <p className="text-sm text-gray-600">{client.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Cases:</span>
                <span className="font-medium">2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Contact:</span>
                <span className="font-medium">2 days ago</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 px-3 py-2 bg-[#F9D366] text-[#0C1F19] font-medium rounded-lg hover:bg-[#F9D366]/80 transition-colors text-sm">
                Message
              </button>
              <button className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm">
                View Profile
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">Task Management</h1>
          <p className="text-gray-600">Track your pending and completed tasks</p>
        </div>
        <button className="px-4 py-2 bg-[#F9D366] text-[#0C1F19] font-semibold rounded-lg hover:bg-[#F9D366]/80 transition-colors">
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-[#0C1F19] mb-4">Pending Tasks</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <input type="checkbox" className="rounded border-gray-300" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Review case documents</p>
                <p className="text-sm text-gray-600">Due: Today, 5:00 PM</p>
              </div>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">High</span>
            </div>
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <input type="checkbox" className="rounded border-gray-300" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Client consultation prep</p>
                <p className="text-sm text-gray-600">Due: Tomorrow, 9:00 AM</p>
              </div>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Medium</span>
            </div>
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <input type="checkbox" className="rounded border-gray-300" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">File USCIS application</p>
                <p className="text-sm text-gray-600">Due: Friday, 12:00 PM</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Low</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-[#0C1F19] mb-4">Completed Tasks</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-75">
              <input type="checkbox" checked disabled className="rounded border-gray-300" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 line-through">Draft legal memo</p>
                <p className="text-sm text-gray-600">Completed: Yesterday</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-75">
              <input type="checkbox" checked disabled className="rounded border-gray-300" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 line-through">Court filing submission</p>
                <p className="text-sm text-gray-600">Completed: 2 days ago</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">Schedule & Calendar</h1>
          <p className="text-gray-600">Manage your appointments and deadlines</p>
        </div>
        <button className="px-4 py-2 bg-[#F9D366] text-[#0C1F19] font-semibold rounded-lg hover:bg-[#F9D366]/80 transition-colors">
          New Appointment
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-[#0C1F19] mb-4">This Week's Schedule</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-[#F9D366] pl-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">Client Consultation - Jane Smith</p>
                <p className="text-sm text-gray-600">Immigration status review</p>
              </div>
              <span className="text-sm text-gray-500">Today, 10:00 AM</span>
            </div>
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">Court Hearing - Case #1234</p>
                <p className="text-sm text-gray-600">Immigration court proceeding</p>
              </div>
              <span className="text-sm text-gray-500">Tomorrow, 2:00 PM</span>
            </div>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">Document Review - Team Meeting</p>
                <p className="text-sm text-gray-600">Weekly case review session</p>
              </div>
              <span className="text-sm text-gray-500">Friday, 3:00 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "/lawyer/cases": return renderCases();
      case "/lawyer/clients": return renderClients();
      case "/lawyer/tasks": return renderTasks();
      case "/lawyer/schedule": return renderSchedule();
      default: return renderOverview();
    }
  };

  return (
    <PanelLayout
      role="lawyer"
      user={user}
      tabs={lawyerTabs}
      activeTab={activeTab}
      onTabClick={handleTabClick}
    >
      {renderContent()}
    </PanelLayout>
  );
};