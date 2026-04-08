import { useState, useEffect } from 'react';
import { TrendingUp, Gavel, Package, DollarSign, RefreshCw, Zap, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { HotDealsCard } from '../components/HotDealsCard';
import { UnitCard } from '../components/UnitCard';
import { getSettings, getStats, getPublishedUnits } from '../lib/storage';

export const Dashboard = () => {
  const [stats, setStatsState] = useState({
    total_units: 0,
    my_bids: 0,
    pending_review: 0,
    potential_profit: 0,
    scanned_today: 0,
  });
  const [publishedUnits, setPublishedUnits] = useState([]);
  const [settings, setSettingsState] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, publishedData, settingsData] = await Promise.all([
        getStats(),
        getPublishedUnits(),
        Promise.resolve(getSettings())
      ]);
      
      setStatsState(statsData);
      setPublishedUnits(publishedData.units || []);
      setSettingsState(settingsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const statCards = [
    {
      title: 'Total Units',
      value: stats.total_units,
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'My Bids',
      value: stats.my_bids,
      icon: Gavel,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Scanned Today',
      value: stats.scanned_today,
      icon: Zap,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Potential Profit',
      value: formatCurrency(stats.potential_profit),
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 font-['Outfit']">
            Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {settings?.defaultState 
              ? `Tracking units in ${settings.defaultState}` 
              : 'Welcome to StorageHunter Pro'}
          </p>
        </div>
        <Button 
          onClick={loadData}
          disabled={loading}
          variant="outline"
          className="bg-[#131B2F] border-[#1E293B] text-slate-200 hover:bg-[#1E293B] hover:text-slate-100"
          data-testid="refresh-dashboard"
        >
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title}
              className="bg-[#131B2F] border-[#1E293B] hover:border-emerald-500/20 transition-all duration-200"
              data-testid={`stat-${stat.title.toLowerCase().replace(' ', '-')}`}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-400 uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-100 mt-1 font-['Outfit']">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <Icon size={20} className={stat.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hot Deals Section */}
      <HotDealsCard units={publishedUnits} />

      {/* Recent Published Units */}
      {publishedUnits.length > 0 && (
        <Card className="bg-[#131B2F] border-[#1E293B]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-100 font-['Outfit']">
              Recent Opportunities
            </CardTitle>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              {publishedUnits.length} units
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {publishedUnits.slice(0, 3).map((unit) => (
              <UnitCard key={unit.auction_id} unit={unit} compact />
            ))}
            {publishedUnits.length > 3 && (
              <Button
                variant="ghost"
                className="w-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => window.location.href = '/my-bids'}
                data-testid="view-all-units"
              >
                View all {publishedUnits.length} units
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-[#131B2F] border-[#1E293B]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-100 font-['Outfit']">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-12"
            onClick={() => window.location.href = '/scan'}
            data-testid="quick-scan"
          >
            <Zap size={18} className="mr-2" />
            Start New Scan
          </Button>
          <Button
            variant="outline"
            className="bg-[#0B1121] border-[#1E293B] text-slate-200 hover:bg-[#1E293B] hover:text-slate-100 h-12"
            onClick={() => window.location.href = '/my-bids'}
            data-testid="quick-my-bids"
          >
            <Gavel size={18} className="mr-2" />
            View My Bids
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
