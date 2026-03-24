import { Search, Bell, Settings, Compass, Map as MapIcon, Leaf, Info } from 'lucide-react';
import * as React from 'react';

export default function Navbar() {
  return (
    <header className="h-14 border-b bg-background px-4 flex items-center justify-between z-20 sticky top-0">
      {/* Left: Brand & Search */}
      <div className="flex items-center gap-6 flex-1">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-green-600" />
          <span className="font-bold text-lg tracking-tight">WildPath</span>
        </div>

        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search wildlife or regions..."
            aria-label="Search wildlife or regions"
            className="w-full bg-muted/50 border rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Middle: Main Nav Buttons */}
      <nav className="flex items-center gap-1 mx-4">
        <NavButton icon={<MapIcon className="w-4 h-4" />} label="Explore" active />
        <NavButton icon={<Compass className="w-4 h-4" />} label="Tracking" />
        <NavButton icon={<Leaf className="w-4 h-4" />} label="Species" />
        <NavButton icon={<Info className="w-4 h-4" />} label="About" />
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
            Placeholder
        </div>
      </div>
    </header>
  );
}

function NavButton({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}