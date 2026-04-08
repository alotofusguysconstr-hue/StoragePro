import { useState, useEffect } from 'react';
import { Gavel, Trash2, TrendingUp, Calendar, MapPin, Package, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { UnitCard } from '../components/UnitCard';
import { getMyBidsAPI, removeFromMyBidsAPI, getPublishedUnits } from '../lib/storage';
import { toast } from 'sonner';

export const MyBids = () => {
  const [myBids, setMyBids] = useState([]);
  const [publishedUnits, setPublishedUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-bids');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bidsData, publishedData] = await Promise.all([
        getMyBidsAPI(),
        getPublishedUnits()
      ]);
      setMyBids(bidsData.bids || []);
      setPublishedUnits(publishedData.units || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (unitId) => {
    try {
      await removeFromMyBidsAPI(unitId);
      setMyBids(myBids.filter(b => b.auction_id !== unitId));
      toast.success('Removed from My Bids');
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const currentList = activeTab === 'my-bids' ? myBids : publishedUnits;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="my-bids-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 font-['Outfit']">
            {activeTab === 'my-bids' ? 'My Bids' : 'All Published Units'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {currentList.length} unit{currentList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={loadData}
          disabled={loading}
          variant="outline"
          className="bg-[#131B2F] border-[#1E293B] text-slate-200 hover:bg-[#1E293B]"
          data-testid="refresh-bids"
        >
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'my-bids' ? 'default' : 'outline'}
          onClick={() => setActiveTab('my-bids')}
          className={activeTab === 'my-bids' 
            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' 
            : 'bg-[#131B2F] border-[#1E293B] text-slate-200 hover:bg-[#1E293B]'
          }
          data-testid="tab-my-bids"
        >
          <Gavel size={16} className="mr-2" />
          My Bids ({myBids.length})
        </Button>
        <Button
          variant={activeTab === 'published' ? 'default' : 'outline'}
          onClick={() => setActiveTab('published')}
          className={activeTab === 'published' 
            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' 
            : 'bg-[#131B2F] border-[#1E293B] text-slate-200 hover:bg-[#1E293B]'
          }
          data-testid="tab-published"
        >
          <Package size={16} className="mr-2" />
          All Published ({publishedUnits.length})
        </Button>
      </div>

      {/* Bids List */}
      {loading ? (
        <Card className="bg-[#131B2F] border-[#1E293B]">
          <CardContent className="py-12 text-center">
            <RefreshCw size={32} className="text-slate-500 mx-auto animate-spin mb-4" />
            <p className="text-slate-400">Loading...</p>
          </CardContent>
        </Card>
      ) : currentList.length === 0 ? (
        <Card className="bg-[#131B2F] border-[#1E293B]">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1E293B] flex items-center justify-center mx-auto mb-4">
              <Gavel size={32} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 font-['Outfit']">
              {activeTab === 'my-bids' ? 'No Bids Yet' : 'No Published Units'}
            </h3>
            <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
              {activeTab === 'my-bids' 
                ? 'Save units from the published list to track them here.'
                : 'Units approved by admin will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {currentList.map((unit) => (
            <UnitCard 
              key={unit.auction_id} 
              unit={unit} 
              showActions={activeTab === 'my-bids'}
              onRemove={() => handleRemove(unit.auction_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBids;
