import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Bell, Menu, X, Leaf } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getFilteredNavGroups, mobileNavItems, roleLabels } from "@/lib/navigation";

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const userRole = user?.role || null;
  const filteredGroups = getFilteredNavGroups(userRole);
  const roleLabel = roleLabels[userRole] || "User";
  const { t } = useLanguage();

  useEffect(() => {
    base44.entities.Alert.list("-triggered_at", 20)
      .then(setAlerts)
      .catch(() => {});
  }, []);

  const unackCount = alerts.filter((a) => !a.acknowledged).length;
  const isActive = (path) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">Wildlife MS</div>
            <div className="text-slate-500 text-[10px] uppercase tracking-wider">{roleLabel}</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      )}
                    >
                      <Icon className="flex-shrink-0" style={{ width: 16, height: 16 }} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm flex-shrink-0">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "A"}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-white font-medium truncate">
                {user?.full_name || user?.email || "User"}
              </div>
              <div className="text-xs text-slate-500 truncate">{roleLabel}</div>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <header className="h-16 glass border-b border-slate-200/80 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-slate-800">
                {filteredGroups.flatMap((g) => g.items).find((n) => isActive(n.path))?.label || "Dashboard"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-slate-100"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {unackCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unackCount > 9 ? "9+" : unackCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 max-h-96 overflow-y-auto z-50">
                  <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800">
                    Notifications
                  </div>
                  {alerts.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-slate-400">No alerts</div>
                  )}
                  {alerts.slice(0, 10).map((a) => (
                    <div key={a.id} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50">
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-1.5 w-2 h-2 rounded-full flex-shrink-0",
                            a.severity === "critical"
                              ? "bg-red-500"
                              : a.severity === "high"
                              ? "bg-orange-500"
                              : a.severity === "warning"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          )}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{a.title}</div>
                          <div className="text-xs text-slate-500 truncate">{a.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden lg:flex w-8 h-8 rounded-full bg-emerald-100 items-center justify-center text-emerald-700 font-semibold text-sm">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "A"}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-x-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-2 lg:hidden">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                active ? "text-emerald-600" : "text-slate-400"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}