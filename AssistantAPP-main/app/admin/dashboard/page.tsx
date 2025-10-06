'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminDashboard from "@/components/dashboards/AdminDashboard";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!session?.user) {
      router.push("/signin");
      return;
    }

    const userRole = (session.user as any)?.role;
    
    // Check if user has admin access
    if (userRole !== 'lvj_admin' && userRole !== 'admin') {
      // Redirect to their appropriate dashboard
      if (userRole?.startsWith('lawyer')) {
        router.push("/lawyer/dashboard");
      } else if (userRole === 'client') {
        router.push("/customer/dashboard");
      } else {
        router.push("/dashboard");
      }
      return;
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

  if (!session?.user) {
    return null;
  }

  const user = {
    name: (session.user as any)?.name || session.user.email?.split('@')[0] || 'Admin',
    email: session.user.email || '',
    avatarUrl: session.user.image || undefined,
  };

  return <AdminDashboard user={user} />;
}