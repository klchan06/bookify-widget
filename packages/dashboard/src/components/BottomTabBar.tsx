import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  UserCircle,
  Users,
  MoreHorizontal,
} from 'lucide-react';

interface BottomTabBarProps {
  /** Opent de sidebar met de overige menu-items (Diensten, Instellingen, …) */
  onMore: () => void;
}

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/agenda', icon: Calendar, label: 'Agenda', end: false },
  { to: '/klanten', icon: UserCircle, label: 'Klanten', end: false },
  { to: '/medewerkers', icon: Users, label: 'Team', end: false },
];

/**
 * iOS-stijl onderbalk, alleen zichtbaar op mobiel (lg:hidden).
 * Geeft snelle toegang tot de belangrijkste secties; "Meer" opent de sidebar.
 */
export function BottomTabBar({ onMore }: BottomTabBarProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 app-tabbar-safe"
      aria-label="Hoofdnavigatie"
    >
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-500 active:text-gray-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon className="w-6 h-6" strokeWidth={isActive ? 2.4 : 1.9} />
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={onMore}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium text-gray-500 active:text-gray-700"
        >
          <MoreHorizontal className="w-6 h-6" strokeWidth={1.9} />
          <span>Meer</span>
        </button>
      </div>
    </nav>
  );
}
