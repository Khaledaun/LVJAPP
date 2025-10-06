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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-primary shadow-sm">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded bg-accent flex items-center justify-center shadow-sm">
              <span className="text-accent-foreground font-bold text-sm">LVJ</span>
            </div>
            <span className="font-bold text-xl text-primary-foreground">Case Assistant</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  className="flex items-center space-x-2 text-primary-foreground/80 hover:text-accent transition-colors font-medium"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 px-3 rounded-lg bg-accent/10 hover:bg-accent/20 text-primary-foreground border border-accent/30">
                <Avatar className="h-7 w-7 mr-2">
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                    {initials || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-xs font-semibold text-accent">{getRoleDisplayName(userRole)}</span>
                  <span className="text-xs text-primary-foreground/80">{displayName}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card border-border" align="end">
              <div className="flex items-center justify-start gap-2 p-3 bg-secondary rounded-t-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                    {initials || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-semibold text-sm text-foreground">{(user as any)?.firstName} {(user as any)?.lastName}</p>
                  <p className="text-xs font-medium text-accent">
                    {getRoleDisplayName(userRole)}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={"/profile" as Route} className="flex items-center font-medium">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center font-medium">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="font-medium text-destructive focus:text-destructive">
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
