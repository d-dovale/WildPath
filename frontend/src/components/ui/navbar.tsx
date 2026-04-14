import {
  Search,
  Bell,
  Settings,
  Compass,
  Map as MapIcon,
  Leaf,
  Info,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import * as React from "react";

interface NavbarProps {
  activePage?: string;
  hideSearch?: boolean;
}

export default function Navbar({
  activePage,
  hideSearch = false,
}: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage =
    activePage ?? (location.pathname === "/quiz" ? "quiz" : "explore");

  return (
    <header className="h-14 border-b bg-background px-4 flex items-center justify-between z-20 sticky top-0">
      {/* Left: Brand & Search */}
      <div className="flex items-center gap-6 flex-1">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Leaf className="w-5 h-5 text-green-600" />
          <span className="font-bold text-lg tracking-tight">WildPath</span>
        </button>

        {!hideSearch && (
          <div className="relative max-w-md w-full hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search wildlife or regions..."
              aria-label="Search wildlife or regions"
              className="w-full bg-muted/50 border rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {/* Middle: Main Nav */}
      <nav className="flex items-center gap-1 mx-4">
        <NavButton
          icon={<MapIcon className="w-4 h-4" />}
          label="Explore"
          active={currentPage === "explore"}
          onClick={() => navigate("/")}
        />
        <NavButton
          icon={<Compass className="w-4 h-4" />}
          label="Tracking"
          onClick={() => {}}
        />
        <NavButton
          icon={<Leaf className="w-4 h-4" />}
          label="Quiz"
          active={currentPage === "quiz"}
          onClick={() => navigate("/quiz")}
        />
        <NavButton
          icon={<Info className="w-4 h-4" />}
          label="About"
          onClick={() => {}}
        />
      </nav>

      {/* Right: User Controls */}
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-muted rounded-full relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="p-2 hover:bg-muted rounded-full">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 flex items-center justify-center text-white font-medium text-xs ml-1 cursor-pointer">
          WP
        </div>
      </div>
    </header>
  );
}

function NavButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
