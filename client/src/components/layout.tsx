import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CheckSquare, ShieldAlert, Plus, Settings, PanelLeftClose, PanelLeft, UserPlus } from "lucide-react";
import { ComposeEmailModal } from "@/components/compose-email-modal";
import logo from "@assets/AutoPilot_(6)_1766016477027.png";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { href: "/", label: "Pipeline", icon: LayoutDashboard },
    { href: "/onboarding", label: "Onboarding", icon: UserPlus },
    { href: "/today", label: "Today", icon: CheckSquare },
    { href: "/blockers", label: "Blockers", icon: ShieldAlert },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/20">
      {/* Sidebar */}
      <aside 
        className={cn(
          "border-r border-sidebar-border bg-sidebar flex flex-col fixed inset-y-0 z-50 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="h-20 flex items-center justify-between px-4 border-b border-sidebar-border/50">
           {!collapsed && (
             <img src={logo} alt="Jumpseat Logo" className="h-10 w-auto object-contain" />
           )}
           <button 
             onClick={() => setCollapsed(!collapsed)}
             className={cn(
               "p-2 rounded-md hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground transition-colors",
               collapsed && "mx-auto"
             )}
             title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
           >
             {collapsed ? (
               <PanelLeft className="h-5 w-5" />
             ) : (
               <PanelLeftClose className="h-5 w-5" />
             )}
           </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 mt-4">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button 
            className={cn(
              "flex items-center justify-center w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 h-10 rounded-md transition-colors",
              collapsed && "px-2"
            )}
            title={collapsed ? "New Lead" : undefined}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span className="ml-2 font-medium">New Lead</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 bg-background min-h-screen relative transition-all duration-300",
          collapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="p-6 h-screen overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </main>

      <ComposeEmailModal />
    </div>
  );
}
