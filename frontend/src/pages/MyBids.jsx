import { useState, useEffect } from 'react';
import { Gavel, Trash2, TrendingUp, Calendar, MapPin, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { getMyBids, removeFromMyBids, isHotDeal } from '../lib/storage';

export const MyBids = () => {
  const [bids, setBids] = useState([]);

  useEffect(() => {
    loadBids();
  }, []);

  const loadBids = () => {
    setBids(getMyBids());
  };

  const handleRemove = (unitId) => {
    removeFromMyBids(unitId);
    loadBids();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const calculateProfitPercent = (unit) => {
    if (unit.startingBid === 0) return 0;
    return Math.round(((unit.estimatedValue - unit.startingBid) / unit.startingBid) * 100);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="my-bids-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 font-['Outfit']">
            My Bids
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {bids.length} unit{bids.length !== 1 ? 's' : ''} saved
          </p>
        </div>
      </div>

      {/* Bids List */}
      {bids.length === 0 ? (
        <Card className="bg-[#131B2F] border-[#1E293B]">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1E293B] flex items-center justify-center mx-auto mb-4">
              <Gavel size={32} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 font-['Outfit']">
              No Bids Yet
            </h3>
            <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
              Units you add from the Admin publish queue will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bids.map((unit, index) => {
            const isHot = isHotDeal(unit);
            const profitPercent = calculateProfitPercent(unit);
            
            return (
              <Card 
                key={unit.id}
                className={`bg-[#131B2F] border-[#1E293B] hover:border-emerald-500/20 transition-all duration-200 animate-fade-in-up ${isHot ? 'glow-emerald border-emerald-500/30' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
                data-testid={`bid-card-${unit.id}`}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Unit Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-100 font-['Outfit']">
                          {unit.facilityName}
                        </h3>
                        {isHot && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Hot Deal
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {unit.county}, {unit.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package size={14} />
                          {unit.unitSize}
                        </span>
                        {unit.auctionDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(unit.auctionDate)}
                          </span>
                        )}
                      </div>

                      {unit.notes && (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                          {unit.notes}
                        </p>
                      )}
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-2">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-slate-500 uppercase">Start Bid</p>
                          <p className="text-lg font-bold text-slate-200">
                            {formatCurrency(unit.startingBid)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 uppercase">Est. Value</p>
                          <p className="text-lg font-bold text-emerald-400">
                            {formatCurrency(unit.estimatedValue)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 uppercase">ROI</p>
                          <div className="flex items-center gap-1 text-emerald-400">
                            <TrendingUp size={16} />
                            <span className="text-lg font-bold">+{profitPercent}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(unit.id)}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        data-testid={`remove-bid-${unit.id}`}
                      >
                        <Trash2 size={16} className="mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBids;
