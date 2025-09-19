export type UserRole = 'client' | 'lvj_admin' | 'lvj_team' | 'lvj_marketing' | 'lawyer_admin' | 'lawyer_associate' | 'lawyer_assistant';

"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  BarChart3,
  FileText, 
  CreditCard,
  MessageSquare,
  Calendar,
  Users,
  TrendingUp,
  Settings,
  HelpCircle,
  Tags
} from "lucide-react";


export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) return null;

  const userRole = session.user.role as UserRole;

  const navigationItems = [
    { 
      href: "/dashboard", 
      label: "Dashboard", 
      icon: BarChart3,
      roles: ["CLIENT", "LVJ_ADMIN", "LVJ_TEAM", "LVJ_MARKETING", "LAWYER_ADMIN", "LAWYER_ASSOCIATE", "LAWYER_ASSISTANT"]
    },
    { 
      href: "/cases", 
      label: "My Cases", 
      icon: FileText,
      roles: ["CLIENT", "LVJ_ADMIN", "LVJ_TEAM", "LAWYER_ADMIN", "LAWYER_ASSOCIATE", "LAWYER_ASSISTANT"]
    },
    { 
      href: "/payments", 
      label: "Payments", 
      icon: CreditCard,
      roles: ["CLIENT", "LVJ_ADMIN", "LVJ_TEAM", "LAWYER_ADMIN"]
    },
    { 
      href: "/messages", 
      label: "Messages", 
      icon: MessageSquare,
      roles: ["LVJ_ADMIN", "LVJ_TEAM", "LAWYER_ADMIN", "LAWYER_ASSOCIATE", "LAWYER_ASSISTANT"]
    },
    { 
      href: "/tasks", 
      label: "Tasks", 
      icon: Calendar,
      roles: ["LVJ_ADMIN", "LVJ_TEAM", "LAWYER_ADMIN", "LAWYER_ASSOCIATE", "LAWYER_ASSISTANT"]
    },
    { 
      href: "/analytics", 
      label: "Analytics", 
      icon: TrendingUp,
      roles: ["LVJ_ADMIN", "LVJ_MARKETING"]
    },
    { 
      href: "/users", 
      label: "User Management", 
      icon: Users,
      roles: ["LVJ_ADMIN"]
    },
    { 
      href: "/admin/service-types", 
      label: "Service Types", 
      icon: Tags,
      roles: ["LVJ_ADMIN"]
    }
  ];

  const visibleItems = navigationItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="pb-12 w-64">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        
        <div className="px-3 py-2">
          <h2 className="mb-2 px-3 text-lg font-semibold tracking-tight">
            Support
          </h2>
          <div className="space-y-1">
            <Link
              href="/help"
              className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Help Center
            </Link>
            <Link
              href="/settings"
              className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
