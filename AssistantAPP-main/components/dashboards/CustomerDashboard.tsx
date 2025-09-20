import React, { useState } from "react";
import { PanelLayout } from "@/components/layout/PanelLayout";
import useSWR from 'swr';
import { FileText, MessageSquare, CreditCard, Clock, CheckCircle, AlertCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const customerTabs = [
  { label: "Overview", path: "/customer/dashboard" },
  { label: "My Case", path: "/customer/case" },
  { label: "Documents", path: "/customer/documents" },
  { label: "Messages", path: "/customer/messages" },
  { label: "Billing", path: "/customer/billing" },
];

interface CustomerDashboardProps {
  user: { name: string; email: string; avatarUrl?: string };
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState(customerTabs[0].path);

  // Fetch customer data - using cases API but filtering for client
  const { data: casesData, isLoading: casesLoading } = useSWR('/api/cases', fetcher);

  const cases = casesData?.items || [];
  const userCases = cases.filter((c: any) => c.applicantEmail === user.email);

  // Calculate metrics
  const totalCases = userCases.length;
  const activeCases = userCases.filter((c: any) => c.status !== 'completed' && c.status !== 'closed').length;
  const completedCases = userCases.filter((c: any) => c.status === 'completed').length;
  const currentCase = userCases.find((c: any) => c.status !== 'completed' && c.status !== 'closed') || userCases[0];

  const handleTabClick = (path: string) => {
    setActiveTab(path);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">Welcome, {user.name}</h1>
        <p className="text-gray-600">Track your immigration case progress and communications</p>
      </div>

      {/* Case Status Overview */}
      {currentCase ? (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-[#0C1F19] mb-2">Current Case Status</h3>
              <p className="text-gray-600">{currentCase.title || 'Immigration Case'}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentCase.status === 'completed' ? 'bg-green-100 text-green-800' :
              currentCase.status === 'in_review' ? 'bg-blue-100 text-blue-800' :
              currentCase.status === 'documents_pending' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {currentCase.status?.replace('_', ' ') || 'Pending'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-[#F6F6F6] rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Case Number</p>
              <p className="font-bold text-[#0C1F19]">{currentCase.caseNumber || '#12345'}</p>
            </div>
            <div className="text-center p-4 bg-[#F6F6F6] rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Visa Type</p>
              <p className="font-bold text-[#0C1F19]">{currentCase.visaType || 'Immigration'}</p>
            </div>
            <div className="text-center p-4 bg-[#F6F6F6] rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Progress</p>
              <p className="font-bold text-[#0C1F19]">{currentCase.completionPercentage || 60}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Case Progress</span>
              <span>{currentCase.completionPercentage || 60}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-[#F9D366] h-3 rounded-full transition-all duration-300" 
                style={{ width: `${currentCase.completionPercentage || 60}%` }}
              ></div>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="px-4 py-2 bg-[#F9D366] text-[#0C1F19] font-semibold rounded-lg hover:bg-[#F9D366]/80 transition-colors">
              View Details
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
              Message Lawyer
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#0C1F19] mb-2">No Active Cases</h3>
          <p className="text-gray-600 mb-4">You don't have any active cases at the moment.</p>
          <button className="px-4 py-2 bg-[#F9D366] text-[#0C1F19] font-semibold rounded-lg hover:bg-[#F9D366]/80 transition-colors">
            Start New Case
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <p className="text-sm font-medium text-gray-600">Completed Cases</p>
              <p className="text-2xl font-bold text-green-600">{completedCases}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Updates */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-[#0C1F19] mb-4">Recent Updates</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-[#F6F6F6] rounded-lg">
            <div className="p-2 bg-blue-100 rounded-full">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Document submitted</p>
              <p className="text-sm text-gray-600">Your passport copy has been received and reviewed</p>
              <span className="text-xs text-gray-500">2 hours ago</span>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-[#F6F6F6] rounded-lg">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Case status updated</p>
              <p className="text-sm text-gray-600">Your case has moved to the review stage</p>
              <span className="text-xs text-gray-500">1 day ago</span>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-[#F6F6F6] rounded-lg">
            <div className="p-2 bg-yellow-100 rounded-full">
              <MessageSquare className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">New message from lawyer</p>
              <p className="text-sm text-gray-600">Please provide additional documentation</p>
              <span className="text-xs text-gray-500">3 days ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCase = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">My Case Details</h1>
        <p className="text-gray-600">Detailed information about your immigration case</p>
      </div>

      {currentCase ? (
        <div className="space-y-6">
          {/* Case Information */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-[#0C1F19] mb-4">Case Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Case Number</label>
                  <p className="text-lg font-semibold text-[#0C1F19]">{currentCase.caseNumber || '#12345'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Case Type</label>
                  <p className="text-lg font-semibold text-[#0C1F19]">{currentCase.visaType || 'Immigration Case'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Application Type</label>
                  <p className="text-lg font-semibold text-[#0C1F19]">{currentCase.title || 'Standard Application'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Current Status</label>
                  <p className="text-lg font-semibold text-[#0C1F19]">{currentCase.status?.replace('_', ' ') || 'In Progress'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-lg font-semibold text-[#0C1F19]">
                    {currentCase.updatedAt ? new Date(currentCase.updatedAt).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Assigned Lawyer</label>
                  <p className="text-lg font-semibold text-[#0C1F19]">Sarah Johnson, Esq.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-[#0C1F19] mb-4">Case Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Case opened</p>
                  <p className="text-sm text-gray-600">Initial consultation completed and case file created</p>
                  <span className="text-xs text-gray-500">30 days ago</span>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Documents collected</p>
                  <p className="text-sm text-gray-600">All required initial documents have been submitted</p>
                  <span className="text-xs text-gray-500">20 days ago</span>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#F9D366] rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#0C1F19]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Under review</p>
                  <p className="text-sm text-gray-600">Application is currently being reviewed by immigration authorities</p>
                  <span className="text-xs text-gray-500">Current stage</span>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-400">Decision pending</p>
                  <p className="text-sm text-gray-400">Awaiting final decision from immigration office</p>
                  <span className="text-xs text-gray-400">Upcoming</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#0C1F19] mb-2">No Case Found</h3>
          <p className="text-gray-600">You don't have any cases to display.</p>
        </div>
      )}
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">Documents</h1>
          <p className="text-gray-600">Manage your case documents and uploads</p>
        </div>
        <button className="px-4 py-2 bg-[#F9D366] text-[#0C1F19] font-semibold rounded-lg hover:bg-[#F9D366]/80 transition-colors">
          Upload Document
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6">
          <h3 className="text-lg font-bold text-[#0C1F19] mb-4">Required Documents</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Passport Copy</p>
                  <p className="text-sm text-gray-600">Uploaded on March 15, 2024</p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</button>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Birth Certificate</p>
                  <p className="text-sm text-gray-600">Uploaded on March 10, 2024</p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</button>
            </div>
            <div className="flex items-center justify-between p-3 border border-yellow-300 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-gray-900">Employment Authorization</p>
                  <p className="text-sm text-gray-600">Required - Please upload</p>
                </div>
              </div>
              <button className="px-3 py-1 bg-[#F9D366] text-[#0C1F19] font-medium rounded text-sm">Upload</button>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg opacity-60">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Financial Statement</p>
                  <p className="text-sm text-gray-600">Will be required in next stage</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">Pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMessages = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">Messages</h1>
          <p className="text-gray-600">Communicate with your legal team</p>
        </div>
        <button className="px-4 py-2 bg-[#F9D366] text-[#0C1F19] font-semibold rounded-lg hover:bg-[#F9D366]/80 transition-colors">
          New Message
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">SJ</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">Sarah Johnson, Esq.</p>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
                <p className="text-gray-700">Thank you for submitting the additional documents. I've reviewed everything and it looks good. We should expect to hear back from USCIS within 2-3 weeks.</p>
              </div>
            </div>
            
            <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-[#F9D366] rounded-full flex items-center justify-center">
                <span className="text-[#0C1F19] font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">You</p>
                  <span className="text-xs text-gray-500">1 day ago</span>
                </div>
                <p className="text-gray-700">I've uploaded the employment authorization document as requested. Please let me know if you need any additional information.</p>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">SJ</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">Sarah Johnson, Esq.</p>
                  <span className="text-xs text-gray-500">3 days ago</span>
                </div>
                <p className="text-gray-700">Hi! I need you to upload your employment authorization document when you have a chance. This will help move your case forward to the next stage.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <textarea 
              placeholder="Type your message..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#F9D366] focus:border-transparent"
              rows={3}
            />
            <div className="flex justify-end mt-3">
              <button className="px-4 py-2 bg-[#F9D366] text-[#0C1F19] font-semibold rounded-lg hover:bg-[#F9D366]/80 transition-colors">
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0C1F19] mb-2">Billing & Payments</h1>
        <p className="text-gray-600">Track your case fees and payment history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-[#0C1F19] mb-4">Current Balance</h3>
          <div className="text-center py-6">
            <p className="text-3xl font-bold text-[#0C1F19] mb-2">$2,500.00</p>
            <p className="text-gray-600 mb-4">Outstanding balance</p>
            <button className="px-6 py-3 bg-[#F9D366] text-[#0C1F19] font-semibold rounded-lg hover:bg-[#F9D366]/80 transition-colors">
              Make Payment
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-[#0C1F19] mb-4">Payment Plan</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Case Fee</span>
              <span className="font-bold text-[#0C1F19]">$5,000.00</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Paid to Date</span>
              <span className="font-bold text-green-600">$2,500.00</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Remaining Balance</span>
              <span className="font-bold text-[#0C1F19]">$2,500.00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6">
          <h3 className="text-lg font-bold text-[#0C1F19] mb-4">Payment History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F6F6] border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-[#0C1F19]">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0C1F19]">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0C1F19]">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-[#0C1F19]">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">March 1, 2024</td>
                  <td className="py-3 px-4 text-gray-900">Initial retainer fee</td>
                  <td className="py-3 px-4 font-medium text-gray-900">$2,500.00</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Paid</span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">April 1, 2024</td>
                  <td className="py-3 px-4 text-gray-900">Second installment</td>
                  <td className="py-3 px-4 font-medium text-gray-900">$2,500.00</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Pending</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "/customer/case": return renderCase();
      case "/customer/documents": return renderDocuments();
      case "/customer/messages": return renderMessages();
      case "/customer/billing": return renderBilling();
      default: return renderOverview();
    }
  };

  return (
    <PanelLayout
      role="customer"
      user={user}
      tabs={customerTabs}
      activeTab={activeTab}
      onTabClick={handleTabClick}
    >
      {renderContent()}
    </PanelLayout>
  );
};