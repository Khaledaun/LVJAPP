export type UserRole = 'client' | 'lvj_admin' | 'lvj_team' | 'lvj_marketing' | 'lawyer_admin' | 'lawyer_associate' | 'lawyer_assistant';

"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

import type { Route } from 'next';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  User, 
  Settings, 
  LogOut, 
  FileText, 
  CreditCard,
  MessageSquare,
  BarChart3,
  Users,
  Calendar
} from "lucide-react";
import { getRoleDisplayName } from "@/lib/rbac";


export function Header() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const user = session.user;
  const displayName = (user?.name ?? user?.email?.split('@')[0] ?? '').trim();
const initials = displayName
  ? displayName.split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0].toUpperCase()).join('')
  : 'U';
  const userRole = ((user as any)?.role ?? 'client') as UserRole;

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const navigationItems = [
    { 
      href: "/dashboard", 
      label: "Dashboard", 
      icon: BarChart3,
      roles: ["CLIENT", "LVJ_ADMIN", "LVJ_TEAM", "LVJ_MARKETING", "LAWYER_ADMIN", "LAWYER_ASSOCIATE", "LAWYER_ASSISTANT"]
    },
    { 
      href: "/cases", 
      label: "Cases", 
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
      icon: BarChart3,
      roles: ["LVJ_ADMIN", "LVJ_MARKETING"]
    },
    { 
      href: "/users", 
      label: "Users", 
      icon: Users,
      roles: ["LVJ_ADMIN"]
    }
  ];

  const visibleItems = navigationItems.filter(item => item.roles.includes(userRole));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">LVJ</span>
            </div>
            <span className="font-bold text-xl text-gray-900">Case Assistant</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-600 text-white">
                    {initials || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{(user as any)?.firstName} {(user as any)?.lastName}</p>
                  <p className="text-xs text-muted-foreground">
                    {getRoleDisplayName(userRole)}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={"/profile" as Route} className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
