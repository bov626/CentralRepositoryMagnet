import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CheckSquare, ShieldAlert, Plus, Search, Settings } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Pipeline", icon: LayoutDashboard },
    { href: "/today", label: "Today", icon: CheckSquare },
    { href: "/blockers", label: "Blockers", icon: ShieldAlert },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/20">
      {/* Sidebar */}
      <aside className="w-16 lg:w-64 border-r border-sidebar-border bg-sidebar flex flex-col fixed inset-y-0 z-50 transition-all duration-300">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-sidebar-border">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="font-bold text-primary-foreground">J</span>
          </div>
          <span className="ml-3 font-semibold text-lg hidden lg:block tracking-tight">Jumpseat</span>
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
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="hidden lg:block">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button className="flex items-center justify-center w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 h-10 rounded-md transition-colors">
            <Plus className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline font-medium">New Lead</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-16 lg:ml-64 bg-background min-h-screen relative">
        <header className="h-16 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-40 px-6 flex items-center justify-between">
           <h1 className="text-lg font-semibold capitalize">
             {location === "/" ? "Pipeline" : location.replace("/", "")}
           </h1>
           
           <div className="flex items-center gap-4">
             <div className="relative hidden md:block">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <input 
                 type="text" 
                 placeholder="Search leads..." 
                 className="h-9 w-64 rounded-md bg-muted/50 border border-transparent focus:border-primary pl-9 pr-4 text-sm outline-none transition-all"
               />
             </div>
             <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 border-2 border-background ring-1 ring-border"></div>
           </div>
        </header>
        <div className="p-6 h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
