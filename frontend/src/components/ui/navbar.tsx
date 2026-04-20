import {
  Map as MapIcon,
  Leaf,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import * as React from "react";

interface NavbarProps {
  activePage?: string;
}

export default function Navbar({
  activePage,
}: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isQuizPage = location.pathname === "/quiz" || activePage === "quiz";
  const currentPage = activePage ?? (isQuizPage ? "quiz" : "explore");

  return (
    <header className="h-14 border-b bg-background px-4 flex items-center justify-between z-20 sticky top-0">
      {/* Left side: Brand only */}
      <div className="flex items-center">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Leaf className="w-5 h-5 text-green-600" />
          <span className="font-bold text-lg tracking-tight">WildPath</span>
        </button>
      </div>

      {/* Right side: Navigation links aligned to the right */}
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-1">
          <NavButton
            icon={<MapIcon className="w-4 h-4" />}
            label="Explore"
            active={currentPage === "explore"}
            onClick={() => navigate("/")}
          />
          <NavButton
            icon={<Leaf className="w-4 h-4" />}
            label="Quiz"
            active={currentPage === "quiz"}
            onClick={() => navigate("/quiz")}
          />
        </nav>
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