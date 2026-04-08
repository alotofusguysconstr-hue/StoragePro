import { Flame, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { getHotDeals, getHotDealSettings } from '../lib/storage';

export const HotDealsCard = () => {
  const navigate = useNavigate();
  const hotDeals = getHotDeals();
  const settings = getHotDealSettings();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const calculateProfit = (unit) => {
    return unit.estimatedValue - unit.startingBid;
  };

  const calculateProfitPercent = (unit) => {
    if (unit.startingBid === 0) return 0;
    return Math.round(((unit.estimatedValue - unit.startingBid) / unit.startingBid) * 100);
  };

  if (!settings.enabled) {
    return null;
  }

  return (
    <div 
      className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md p-6 glow-emerald"
      data-testid="hot-deals-card"
    >
      {/* Glow effect */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
      
      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center pulse-glow">
            <Flame className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 font-['Outfit']">Extraordinary Deals</h3>
            <p className="text-xs text-emerald-400">
              {hotDeals.length} unit{hotDeals.length !== 1 ? 's' : ''} meet your criteria
            </p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
        >
          {settings.minProfitPercent}%+ ROI
        </Badge>
      </div>

      {/* Content */}
      <div className="relative space-y-3">
        {hotDeals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No extraordinary deals found yet.</p>
            <p className="text-slate-500 text-xs mt-1">
              Configure thresholds in Admin settings
            </p>
          </div>
        ) : (
          <>
            {hotDeals.slice(0, 3).map((unit, index) => (
              <div 
                key={unit.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#0B1121]/50 border border-[#1E293B] hover:border-emerald-500/30 transition-all duration-200 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
                data-testid={`hot-deal-${unit.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {unit.facilityName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {unit.unitSize} • {unit.county}, {unit.state}
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-400">
                      <TrendingUp size={14} />
                      <span className="text-sm font-bold">+{calculateProfitPercent(unit)}%</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {formatCurrency(calculateProfit(unit))} profit
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-slate-200">
                      <DollarSign size={14} />
                      <span className="text-sm font-semibold">{unit.startingBid}</span>
                    </div>
                    <p className="text-xs text-slate-500">start</p>
                  </div>
                </div>
              </div>
            ))}
            
            {hotDeals.length > 3 && (
              <Button
                variant="ghost"
                className="w-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => navigate('/my-bids')}
                data-testid="view-all-hot-deals"
              >
                View all {hotDeals.length} deals
                <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Threshold info */}
      <div className="relative mt-4 pt-4 border-t border-emerald-500/20">
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span>Min ROI: {settings.minProfitPercent}%</span>
          <span>Min Value: {formatCurrency(settings.minEstimatedValue)}</span>
          <span>Max Bid: {formatCurrency(settings.maxStartingBid)}</span>
        </div>
      </div>
    </div>
  );
};

export default HotDealsCard;
