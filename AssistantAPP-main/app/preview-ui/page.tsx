'use client';

import React, { useState } from 'react';
import { UserPlus, BarChart3, Calendar, MessageSquare, Settings, Eye, FileText, Users, Clock, CheckCircle, Star, Shield, Zap } from 'lucide-react';

const PreviewUIPage = () => {
  const [activePanel, setActivePanel] = useState('admin');
  const [activeTab, setActiveTab] = useState('overview');

  const panels = [
    { id: 'admin', name: 'Admin Panel', role: 'Administrator' },
    { id: 'lawyer', name: 'Lawyer Panel', role: 'Legal Professional' },
    { id: 'customer', name: 'Customer Panel', role: 'Client' },
    { id: 'signin', name: 'Sign-In Page', role: 'Authentication' }
  ];

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const lawyerTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'cases', label: 'Cases', icon: FileText },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'schedule', label: 'Schedule', icon: Calendar }
  ];

  const customerTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'case', label: 'My Case', icon: FileText },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'messages', label: 'Messages', icon: MessageSquare }
  ];

  const renderHeader = (panelType: string, userInfo: any) => (
    <nav className="flex items-center justify-between h-16 px-8 bg-[#0C1F19] text-white shadow-lg">
      <div className="flex items-center space-x-4">
        <div className="h-10 w-10 rounded-lg bg-[#F9D366] flex items-center justify-center shadow-md">
          <span className="text-[#0C1F19] font-bold text-lg">LVJ</span>
        </div>
        <div>
          <div className="text-xl font-bold tracking-wide">Case Assistant</div>
          <div className="text-xs text-gray-300">Professional Legal Management</div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="px-4 py-2 bg-[#F9D366] text-[#0C1F19] rounded-lg font-bold text-sm shadow-md">
            {userInfo.role}
          </span>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F9D366] text-[#0C1F19] flex items-center justify-center font-bold shadow-md">
              {userInfo.initials}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{userInfo.name}</div>
              <div className="text-xs text-gray-300">{userInfo.email}</div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );

  const renderTabs = (tabs: any[], panelType: string) => (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex px-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-6 font-bold text-base border-b-3 transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-[#F9D366] text-[#0C1F19] border-[#F9D366] shadow-md rounded-t-lg"
                  : "bg-transparent text-[#0C1F19] border-transparent hover:bg-[#F9D366]/20 hover:text-[#0C1F19]"
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderMetricCard = (title: string, value: string, subtitle: string, icon: any, color: string) => {
    const Icon = icon;
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-[#0C1F19] mb-1">{value}</p>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className={`p-4 ${color} rounded-xl shadow-md`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>
    );
  };

  const renderSignInPreview = () => (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F6F6] to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-[#0C1F19] flex items-center justify-center shadow-lg">
              <span className="text-[#F9D366] font-bold text-xl">LVJ</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#0C1F19]">Case Assistant</div>
              <div className="text-sm text-gray-600">Professional Legal Management</div>
            </div>
          </div>
        </div>

        {/* Sign-in Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-[#0C1F19]">Welcome Back</h1>
            <p className="text-lg text-gray-600">Sign in to your account</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0C1F19] block">Email Address</label>
              <div className="relative">
                <input 
                  className="w-full border-2 border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#F9D366]/20 focus:border-[#F9D366] transition-all duration-300" 
                  type="email" 
                  placeholder="Enter your email address"
                  defaultValue="demo@lvj.local"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#0C1F19] block">Access Code</label>
              <div className="relative">
                <input 
                  className="w-full border-2 border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-[#F9D366]/20 focus:border-[#F9D366] transition-all duration-300" 
                  type="password" 
                  placeholder="Enter your access code"
                  defaultValue="lvjdev"
                />
              </div>
              <p className="text-xs text-gray-500">Use <span className="font-mono bg-gray-100 px-2 py-1 rounded">lvjdev</span> for development</p>
            </div>

            <button className="w-full py-4 bg-[#F9D366] hover:bg-[#F9D366]/90 text-[#0C1F19] font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" />
                Sign In Securely
              </div>
            </button>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="font-medium">or</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <button className="w-full py-3 border-2 border-gray-200 hover:border-[#0C1F19] text-[#0C1F19] font-semibold rounded-xl transition-all duration-300 hover:bg-gray-50">
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                Email me a magic link
              </div>
            </button>
          </div>

          <div className="mt-6 text-xs text-center text-gray-500 leading-relaxed">
            Email login activates with proper <span className="font-mono bg-gray-100 px-1 rounded">EMAIL_FROM</span> configuration
          </div>
        </div>
      </div>
    </div>
  );

  const renderPanelContent = () => {
    if (activePanel === 'signin') {
      return renderSignInPreview();
    }

    const userInfo = {
      admin: { name: 'Sarah Johnson', email: 'admin@lvj.local', role: 'Administrator', initials: 'SJ' },
      lawyer: { name: 'Michael Chen', email: 'lawyer@lvj.local', role: 'Attorney', initials: 'MC' },
      customer: { name: 'Emily Davis', email: 'client@example.com', role: 'Client', initials: 'ED' }
    };

    const currentUser = userInfo[activePanel as keyof typeof userInfo];
    const currentTabs = activePanel === 'admin' ? adminTabs : activePanel === 'lawyer' ? lawyerTabs : customerTabs;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F6F6F6] to-gray-100">
        {renderHeader(activePanel, currentUser)}
        {renderTabs(currentTabs, activePanel)}
        
        <main className="px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-[#0C1F19] mb-2">
                {activePanel === 'admin' ? 'System Administration' : 
                 activePanel === 'lawyer' ? 'Legal Practice Management' : 
                 'Client Portal'}
              </h1>
              <p className="text-lg text-gray-600">
                {activePanel === 'admin' ? 'Comprehensive system oversight and user management' : 
                 activePanel === 'lawyer' ? 'Streamlined case and client management workflow' : 
                 'Track your case progress and manage your legal journey'}
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {activePanel === 'admin' && (
                <>
                  {renderMetricCard('Total Users', '156', 'Active system users', Users, 'bg-blue-500')}
                  {renderMetricCard('Active Cases', '89', 'Cases in progress', FileText, 'bg-green-500')}
                  {renderMetricCard('System Health', '99.8%', 'Uptime this month', Shield, 'bg-purple-500')}
                  {renderMetricCard('Reports Generated', '234', 'This month', BarChart3, 'bg-orange-500')}
                </>
              )}
              {activePanel === 'lawyer' && (
                <>
                  {renderMetricCard('Active Cases', '24', 'Your current caseload', FileText, 'bg-blue-500')}
                  {renderMetricCard('Clients', '67', 'Under your representation', Users, 'bg-green-500')}
                  {renderMetricCard('This Week', '12', 'Scheduled appointments', Calendar, 'bg-purple-500')}
                  {renderMetricCard('Completed', '8', 'Cases this month', CheckCircle, 'bg-orange-500')}
                </>
              )}
              {activePanel === 'customer' && (
                <>
                  {renderMetricCard('Case Progress', '75%', 'Application advancement', Clock, 'bg-blue-500')}
                  {renderMetricCard('Documents', '12', 'Submitted and verified', FileText, 'bg-green-500')}
                  {renderMetricCard('Messages', '3', 'New from legal team', MessageSquare, 'bg-purple-500')}
                  {renderMetricCard('Next Step', '2 days', 'Court hearing scheduled', Calendar, 'bg-orange-500')}
                </>
              )}
            </div>

            {/* Feature Showcase Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-[#F9D366] rounded-xl">
                    <Star className="w-6 h-6 text-[#0C1F19]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0C1F19]">Premium Features</h3>
                    <p className="text-gray-600">Advanced tools and capabilities</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Real-time case status updates</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Automated document processing</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Secure client communication</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Advanced reporting and analytics</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-[#0C1F19] rounded-xl">
                    <MessageSquare className="w-6 h-6 text-[#F9D366]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0C1F19]">Recent Activity</h3>
                    <p className="text-gray-600">Latest updates and notifications</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-2 h-2 bg-[#F9D366] rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Case status updated</p>
                      <p className="text-sm text-gray-600">Immigration case moved to review stage</p>
                      <span className="text-xs text-gray-500">2 hours ago</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Document approved</p>
                      <p className="text-sm text-gray-600">Passport verification completed</p>
                      <span className="text-xs text-gray-500">1 day ago</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">New message received</p>
                      <p className="text-sm text-gray-600">Attorney response to your inquiry</p>
                      <span className="text-xs text-gray-500">3 days ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview Navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-[#0C1F19] flex items-center justify-center">
                <Eye className="w-5 h-5 text-[#F9D366]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#0C1F19]">LVJ Design Preview</h1>
                <p className="text-xs text-gray-600">Brand Theme Showcase</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {panels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => {
                    setActivePanel(panel.id);
                    setActiveTab('overview');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    activePanel === panel.id
                      ? 'bg-[#F9D366] text-[#0C1F19] shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {panel.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="transition-all duration-500">
        {renderPanelContent()}
      </div>

      {/* Design Info Footer */}
      <div className="bg-[#0C1F19] text-white p-6">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-xl font-bold mb-2">LVJ Brand Theme Implementation</h3>
          <p className="text-gray-300 mb-4">
            Forest Green (#0C1F19) • Warm Yellow (#F9D366) • Montserrat Typography • Modern UI/UX
          </p>
          <div className="flex justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#0C1F19] border-2 border-[#F9D366]"></div>
              <span>Primary: Forest Green</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#F9D366]"></div>
              <span>Accent: Warm Yellow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white"></div>
              <span>Background: White</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#F6F6F6] border border-gray-300"></div>
              <span>Secondary: Light Gray</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewUIPage;