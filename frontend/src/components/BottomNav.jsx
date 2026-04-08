import { Home, Search, Gavel, Settings, CreditCard } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/scan', icon: Search, label: 'Scan' },
  { path: '/my-bids', icon: Gavel, label: 'My Bids' },
  { path: '/pricing', icon: CreditCard, label: 'Plans' },
  { path: '/admin', icon: Settings, label: 'Admin' },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav md:hidden" data-testid="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200',
              isActive 
                ? 'text-emerald-400' 
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Icon 
              size={22} 
              className={cn(
                'transition-all duration-200',
                isActive && 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
              )}
            />
            <span className={cn(
              'text-[10px] font-medium',
              isActive ? 'text-emerald-400' : 'text-slate-500'
            )}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
