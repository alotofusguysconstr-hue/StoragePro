import { Home, Search, Gavel, Settings, Warehouse } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/scan', icon: Search, label: 'Scan Units' },
  { path: '/my-bids', icon: Gavel, label: 'My Bids' },
  { path: '/admin', icon: Settings, label: 'Admin' },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="sidebar" data-testid="sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Warehouse className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-100 font-['Outfit']">StorageHunter</h1>
          <p className="text-xs text-emerald-400 font-medium">PRO</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              data-testid={`sidebar-${item.label.toLowerCase().replace(' ', '-')}`}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left',
                isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/50'
              )}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="pt-6 border-t border-[#1E293B]">
        <p className="text-xs text-slate-500">StorageHunter Pro v1.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
