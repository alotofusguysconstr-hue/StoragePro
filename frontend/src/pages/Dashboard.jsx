import { useEffect, useState } from 'react';
import { TrendingUp, Gavel, Package, DollarSign, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { HotDealsCard } from '../components/HotDealsCard';
import { getUnits, getMyBids, getPublishQueue, getSettings } from '../lib/storage';

export const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUnits: 0,
    myBids: 0,
    pendingPublish: 0,
    potentialProfit: 0,
  });
  const [settings, setSettingsState] = useState(null);

  const loadData = () => {
    const units = getUnits();
    const bids = getMyBids();
    const queue = getPublishQueue();
    const settingsData = getSettings();

    const potentialProfit = bids.reduce((sum, unit) => {
      return sum + (unit.estimatedValue - unit.startingBid);
    }, 0);

    setStats({
      totalUnits: units.length,
      myBids: bids.length,
      pendingPublish: queue.length,
      potentialProfit,
    });
    setSettingsState(settingsData);
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
      value: stats.totalUnits,
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'My Bids',
      value: stats.myBids,
      icon: Gavel,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Pending Publish',
      value: stats.pendingPublish,
      icon: RefreshCw,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Potential Profit',
      value: formatCurrency(stats.potentialProfit),
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
          variant="outline"
          className="bg-[#131B2F] border-[#1E293B] text-slate-200 hover:bg-[#1E293B] hover:text-slate-100"
          data-testid="refresh-dashboard"
        >
          <RefreshCw size={16} className="mr-2" />
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
      <HotDealsCard />

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
            <Package size={18} className="mr-2" />
            Find New Units
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
