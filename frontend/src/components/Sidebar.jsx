import { Home, Search, Gavel, Settings, Warehouse, CreditCard, Crown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getUserTier } from '../lib/storage';
import { Badge } from './ui/badge';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/scan', icon: Search, label: 'Scan Units' },
  { path: '/my-bids', icon: Gavel, label: 'My Bids' },
  { path: '/pricing', icon: CreditCard, label: 'Plans' },
  { path: '/admin', icon: Settings, label: 'Admin' },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const tier = getUserTier();

  const tierColors = {
    free: 'bg-slate-500/20 text-slate-400',
    pro: 'bg-emerald-500/20 text-emerald-400',
    enterprise: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <aside className="sidebar" data-testid="sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Warehouse className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-100 font-['Outfit']">StorageHunter</h1>
          <div className="flex items-center gap-2">
            <p className="text-xs text-emerald-400 font-medium">PRO</p>
            <Badge className={`text-[10px] px-1.5 py-0 ${tierColors[tier]}`}>
              {tier.toUpperCase()}
            </Badge>
          </div>
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
              {item.path === '/pricing' && tier === 'free' && (
                <Crown size={14} className="ml-auto text-amber-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Upgrade CTA for free users */}
      {tier === 'free' && (
        <div className="p-4 mb-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
          <p className="text-sm text-slate-200 font-medium">Unlock Pro Features</p>
          <p className="text-xs text-slate-400 mt-1">Vision AI, unlimited scans, alerts</p>
          <button
            onClick={() => navigate('/pricing')}
            className="mt-3 w-full py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors"
          >
            Upgrade Now
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-[#1E293B]">
        <p className="text-xs text-slate-500">StorageHunter Pro v2.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
