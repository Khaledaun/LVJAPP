'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!session?.user) {
      router.push("/signin");
      return;
    }

    const userRole = (session.user as any)?.role;
    
    // Redirect to role-specific dashboard
    if (userRole === 'lvj_admin' || userRole === 'admin') {
      router.push("/admin/dashboard");
    } else if (userRole?.startsWith('lawyer')) {
      router.push("/lawyer/dashboard");
    } else if (userRole === 'client' || userRole === 'customer') {
      router.push("/customer/dashboard");
    } else {
      // Default fallback - show generic dashboard
      // Keep the existing dashboard content as fallback
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#F9D366] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no redirect happened, show the original dashboard
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your case management dashboard.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-2">Total Cases</h3>
          <p className="text-2xl font-bold text-accent">24</p>
          <p className="text-sm text-muted-foreground">Active cases</p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-2">Pending Review</h3>
          <p className="text-2xl font-bold text-primary">8</p>
          <p className="text-sm text-muted-foreground">Requiring attention</p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-2">Completed This Month</h3>
          <p className="text-2xl font-bold text-green-600">12</p>
          <p className="text-sm text-muted-foreground">Successfully processed</p>
        </div>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
        <p className="text-muted-foreground">Recent case updates and notifications will appear here.</p>
      </div>
    </div>
  );
}
