import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { LogOut, PanelLeft, Users, Dumbbell, History, Settings2, Mail, CalendarDays, UserCog, TrendingUp, Crown, BarChart2, Trophy } from "lucide-react";
import PushNotificationBanner from "@/components/PushNotificationBanner";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { usePlan } from "@/hooks/usePlan";

const menuItems = [
  { icon: CalendarDays, label: "今日のトレーニング", path: "/calendar" },
  { icon: Dumbbell,     label: "トレーニング作成",   path: "/profile" },
  { icon: BarChart2,    label: "マイデータ",         path: "/stats" },
  { icon: Trophy,       label: "チャレンジ",         path: "/challenges" },
  { icon: TrendingUp,   label: "進捗・体重記録",     path: "/progress" },
  { icon: History,      label: "履歴",               path: "/history" },
  { icon: UserCog,      label: "アカウント設定",     path: "/account" },
];

const adminMenuItems = [
  { icon: Users, label: "ユーザー管理", path: "/admin/users" },
  { icon: Settings2, label: "種目重量管理", path: "/admin/exercise-weights" },
  { icon: Mail, label: "お問い合わせ管理", path: "/admin/contacts" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [currentPath] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  const ADMIN_PATHS = ["/admin/users", "/admin/exercise-weights", "/admin/contacts"];
  const requiresAuth = currentPath === "/history" || ADMIN_PATHS.some(p => currentPath.startsWith(p));
  const requiresAdmin = ADMIN_PATHS.some(p => currentPath.startsWith(p));

  if (!user && requiresAuth) {
    window.location.replace("/login");
    return <DashboardLayoutSkeleton />;
  }

  if (user && requiresAdmin && user.role !== "admin") {
    window.location.replace("/plan");
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const { isPremium, isAdmin, planType } = usePlan();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => { setIsResizing(false); };
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      {/* サイドバー */}
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-primary/20"
          disableTransition={isResizing}
        >
          {/* ヘッダー: ロゴ */}
          <SidebarHeader className="h-16 justify-center border-b border-primary/15">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-primary/10 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <a href="/" className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                  <img
                    src="/icon.svg"
                    alt=""
                    aria-hidden="true"
                    role="presentation"
                    className="h-4 w-4 object-contain shrink-0"
                  />
                  <span className="heading-futuristic text-xs text-primary truncate glow-orange-text">
                    M. AutoPlanning
                  </span>
                </a>
              )}
            </div>
          </SidebarHeader>

          {/* メニュー */}
          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-2">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal ${
                        isActive
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : "hover:bg-primary/5 hover:text-primary/80"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span className={isActive ? "text-primary" : ""}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {/* 管理者メニュー */}
            {user?.role === "admin" && (
              <>
                <div className="px-4 py-2 mt-2">
                  <p className="label-futuristic text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
                    Admin
                  </p>
                </div>
                <SidebarMenu className="px-2 py-1">
                  {adminMenuItems.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-10 transition-all font-normal ${
                            isActive
                              ? "bg-accent/10 text-accent border-l-2 border-accent"
                              : "hover:bg-accent/5 hover:text-accent/80"
                          }`}
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-accent" : "text-muted-foreground"}`}
                          />
                          <span className={isActive ? "text-accent" : ""}>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </>
            )}
          </SidebarContent>

          {/* フッター: ユーザー or ゲストログインボタン */}
          <SidebarFooter className="p-3 border-t border-primary/15">
            {/* プランバッジ / アップグレードボタン */}
            {user && !isCollapsed && (
              <div className="mb-2">
                {isAdmin ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
                    <Crown className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] text-blue-400 font-bold">管理者 — 全機能解放</span>
                  </div>
                ) : isPremium ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/20">
                    <Crown className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-primary font-bold">{planType === "premium_plus" ? "Premium+" : "Premium"} 利用中</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setLocation("/pricing")}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <Crown className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-primary font-bold">Premium にアップグレード</span>
                  </button>
                )}
              </div>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded px-1 py-1 hover:bg-primary/10 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Avatar className="h-9 w-9 border border-primary/30 shrink-0">
                      <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                      <p className="text-sm font-medium truncate leading-none">
                        {user?.name || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1.5">
                        {user?.email || "-"}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>ログアウト</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => { window.location.href = "/login"; }}
                className="flex items-center gap-3 rounded px-2 py-2 hover:bg-orange-500/10 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center border border-orange-500/30 hover:border-orange-500/60"
              >
                <Avatar className="h-9 w-9 border border-orange-500/30 shrink-0">
                  <AvatarFallback className="text-xs font-medium bg-orange-500/10 text-orange-500">
                    G
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium truncate leading-none text-orange-500">
                    ゲストユーザー
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-1.5">
                    ログインして履歴を保存
                  </p>
                </div>
              </button>
            )}
          </SidebarFooter>
        </Sidebar>

        {/* リサイズハンドル */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      {/* メインコンテンツ */}
      <SidebarInset className="hex-bg">
        {isMobile && (
          <div className="flex border-b border-primary/20 h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded bg-background" />
              <div className="flex items-center gap-3">
                <span className="tracking-tight text-foreground">
                  {activeMenuItem?.label ?? "Menu"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-2">
              <img
                src="/icon.svg"
                alt=""
                aria-hidden="true"
                role="presentation"
                className="h-4 w-4 object-contain"
              />
              <span className="heading-futuristic text-xs text-primary">M. AP</span>
            </div>
          </div>
        )}
        <PushNotificationBanner />
        <main className="flex-1 p-4">{children}</main>
        <footer className="border-t border-primary/15 px-4 py-3 text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="label-futuristic text-muted-foreground/50">
            © {new Date().getFullYear()} Shingo Morikawa
          </span>
          <Link href="/privacy" className="hover:text-primary transition-colors underline-offset-2 hover:underline">
            プライバシーポリシー
          </Link>
        </footer>
      </SidebarInset>
    </>
  );
}
