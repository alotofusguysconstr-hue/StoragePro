import { useState, useEffect } from 'react';
import { Settings, MapPin, Target, Bell, Plus, X, Save, Search, Gavel, Globe, Flame, Lock, RefreshCw, Check, Loader2, Link } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Slider } from '../components/ui/slider';
import { PinModal } from '../components/PinModal';
import { UnitCard } from '../components/UnitCard';
import { US_STATES } from '../lib/constants';
import { 
  getSettings, 
  setSettings, 
  getHotDealSettings, 
  setHotDealSettings,
  isAdminUnlocked,
  setAdminUnlocked,
  getAdminPin,
  setAdminPin,
  getReviewQueue,
  reviewQueueAction,
  scanAuctions
} from '../lib/storage';
import { toast } from 'sonner';

// Sample auction URLs for demo
const SAMPLE_URLS = [
  'https://www.storagetreasures.com/auctions/detail/1234567',
  'https://www.hibid.com/lot/12345678',
  'https://bid4assets.com/auction/56789',
];

export const Admin = () => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [settings, setSettingsState] = useState(getSettings());
  const [hotDealSettings, setHotDealSettingsState] = useState(getHotDealSettings());
  const [reviewQueue, setReviewQueueState] = useState([]);
  const [newCounty, setNewCounty] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [stateFilter, setStateFilter] = useState('');
  const [countyFilter, setCountyFilter] = useState('');

  useEffect(() => {
    const unlocked = isAdminUnlocked();
    if (unlocked) {
      setIsUnlocked(true);
      loadReviewQueue();
    } else {
      setShowPinModal(true);
    }
  }, []);

  const loadReviewQueue = async () => {
    setLoading(true);
    try {
      const effectiveStateFilter = stateFilter === 'all' ? '' : stateFilter;
      const data = await getReviewQueue(effectiveStateFilter, countyFilter);
      setReviewQueueState(data.units || []);
    } catch (error) {
      console.error('Error loading review queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSuccess = () => {
    setIsUnlocked(true);
    setShowPinModal(false);
    loadReviewQueue();
  };

  const handleSaveSettings = () => {
    setSettings(settings);
    toast.success('Settings saved successfully');
  };

  const handleSaveHotDealSettings = () => {
    setHotDealSettings(hotDealSettings);
    toast.success('Hot deal settings saved');
  };

  const handleAddCounty = () => {
    if (newCounty.trim() && !settings.counties.includes(newCounty.trim())) {
      const updated = {
        ...settings,
        counties: [...settings.counties, newCounty.trim()]
      };
      setSettingsState(updated);
      setNewCounty('');
    }
  };

  const handleRemoveCounty = (county) => {
    const updated = {
      ...settings,
      counties: settings.counties.filter(c => c !== county)
    };
    setSettingsState(updated);
  };

  const handleApprove = async (unitId) => {
    try {
      await reviewQueueAction(unitId, 'approve');
      toast.success('Unit published!');
      loadReviewQueue();
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (unitId) => {
    try {
      await reviewQueueAction(unitId, 'reject');
      toast.success('Unit rejected');
      loadReviewQueue();
    } catch (error) {
      toast.error('Failed to reject');
    }
  };

  const handleFindUnits = async () => {
    const urls = urlInput.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    
    if (urls.length === 0) {
      toast.error('Please enter at least one auction URL');
      return;
    }

    setIsScanning(true);
    try {
      const response = await scanAuctions(urls, settings.defaultState, '');
      
      if (response.analyzed > 0) {
        toast.success(`Analyzed ${response.analyzed} unit(s)! Check Review Queue.`);
        loadReviewQueue();
        setUrlInput('');
      }
      if (response.duplicates > 0) {
        toast.warning(`${response.duplicates} duplicate(s) skipped`);
      }
    } catch (error) {
      toast.error('Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleLoadSampleUrls = () => {
    setUrlInput(SAMPLE_URLS.join('\n'));
    toast.info('Sample URLs loaded');
  };

  const handleChangePin = () => {
    if (newPin.length === 4 && /^\d+$/.test(newPin)) {
      setAdminPin(newPin);
      setNewPin('');
      toast.success('PIN changed successfully');
    } else {
      toast.error('PIN must be 4 digits');
    }
  };

  const handleLockAdmin = () => {
    setAdminUnlocked(false);
    setIsUnlocked(false);
    setShowPinModal(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (!isUnlocked) {
    return (
      <PinModal 
        isOpen={showPinModal} 
        onSuccess={handlePinSuccess}
        onClose={() => window.location.href = '/'}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="admin-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 font-['Outfit']">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage settings, scan units, and review queue
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleLockAdmin}
          className="bg-[#131B2F] border-[#1E293B] text-slate-200 hover:bg-[#1E293B]"
          data-testid="lock-admin"
        >
          <Lock size={16} className="mr-2" />
          Lock Admin
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="find-units" className="space-y-6">
        <TabsList className="bg-[#131B2F] border border-[#1E293B] p-1 flex-wrap h-auto">
          <TabsTrigger 
            value="find-units" 
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            data-testid="tab-find-units"
          >
            <Search size={16} className="mr-2" />
            Find Units
          </TabsTrigger>
          <TabsTrigger 
            value="queue"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            data-testid="tab-queue"
          >
            <Globe size={16} className="mr-2" />
            Review Queue ({reviewQueue.length})
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            data-testid="tab-settings"
          >
            <Settings size={16} className="mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger 
            value="location"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            data-testid="tab-location"
          >
            <MapPin size={16} className="mr-2" />
            Location
          </TabsTrigger>
          <TabsTrigger 
            value="hotdeals"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            data-testid="tab-hotdeals"
          >
            <Flame size={16} className="mr-2" />
            Hot Deals
          </TabsTrigger>
        </TabsList>

        {/* Find Units Tab */}
        <TabsContent value="find-units" className="space-y-4">
          <Card className="bg-[#131B2F] border-[#1E293B]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-100 font-['Outfit'] flex items-center gap-2">
                <Link size={20} className="text-emerald-400" />
                Scan Auction URLs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Paste auction listing URLs (one per line)</Label>
                <Textarea
                  placeholder={`https://www.storagetreasures.com/auctions/detail/...\nhttps://www.hibid.com/lot/...`}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="min-h-[150px] bg-[#0B1121] border-[#1E293B] text-slate-200 placeholder:text-slate-500 font-mono text-sm"
                  data-testid="admin-url-input"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleLoadSampleUrls}
                  className="bg-[#0B1121] border-[#1E293B] text-slate-300 hover:bg-[#1E293B]"
                  data-testid="load-sample-urls"
                >
                  Load Sample URLs
                </Button>
              </div>

              <Button
                onClick={handleFindUnits}
                disabled={isScanning || !urlInput.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-12"
                data-testid="find-units-btn"
              >
                {isScanning ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Running AI Agents...
                  </>
                ) : (
                  <>
                    <Search size={18} className="mr-2" />
                    Find Units (Run AI Analysis)
                  </>
                )}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Units will be analyzed by StorageBid Hunter → StorageProfit Optimizer → Added to Review Queue
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card className="bg-[#131B2F] border-[#1E293B]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-100 font-['Outfit'] flex items-center gap-2">
                <Globe size={20} className="text-emerald-400" />
                Review Queue
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadReviewQueue}
                disabled={loading}
                className="bg-[#0B1121] border-[#1E293B] text-slate-200 hover:bg-[#1E293B]"
                data-testid="refresh-queue"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </Button>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); }}>
                  <SelectTrigger className="bg-[#0B1121] border-[#1E293B] text-slate-200">
                    <SelectValue placeholder="Filter by state" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131B2F] border-[#1E293B]">
                    <SelectItem value="all" className="text-slate-200">All states</SelectItem>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value} className="text-slate-200">
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Filter by county"
                  value={countyFilter}
                  onChange={(e) => setCountyFilter(e.target.value)}
                  className="bg-[#0B1121] border-[#1E293B] text-slate-200"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadReviewQueue}
                className="mb-4 bg-[#0B1121] border-[#1E293B] text-slate-200 hover:bg-[#1E293B]"
              >
                Apply Filters
              </Button>

              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw size={32} className="text-slate-500 mx-auto animate-spin mb-4" />
                  <p className="text-slate-400">Loading...</p>
                </div>
              ) : reviewQueue.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-[#1E293B] flex items-center justify-center mx-auto mb-4">
                    <Globe size={32} className="text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-300 font-['Outfit']">
                    Queue Empty
                  </h3>
                  <p className="text-slate-500 text-sm mt-2">
                    Use "Find Units" to scan auction URLs
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewQueue.map((unit) => (
                    <div key={unit.auction_id} className="space-y-2">
                      <UnitCard unit={unit} showFullAnalysis />
                      <div className="flex gap-2 pl-4">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(unit.auction_id)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                          data-testid={`approve-${unit.auction_id}`}
                        >
                          <Check size={14} className="mr-1" />
                          Approve & Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(unit.auction_id)}
                          className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                          data-testid={`reject-${unit.auction_id}`}
                        >
                          <X size={14} className="mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-[#131B2F] border-[#1E293B]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-100 font-['Outfit'] flex items-center gap-2">
                <Target size={20} className="text-emerald-400" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profit Margin Target */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Profit Margin Target</Label>
                  <span className="text-emerald-400 font-semibold">{settings.profitMarginTarget}%</span>
                </div>
                <Slider
                  value={[settings.profitMarginTarget]}
                  onValueChange={(value) => setSettingsState({ ...settings, profitMarginTarget: value[0] })}
                  max={200}
                  min={10}
                  step={5}
                  className="[&_[role=slider]]:bg-emerald-500"
                  data-testid="profit-margin-slider"
                />
              </div>

              {/* Credit Alert Threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Credit Alert Threshold</Label>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(settings.creditAlertThreshold)}</span>
                </div>
                <Slider
                  value={[settings.creditAlertThreshold]}
                  onValueChange={(value) => setSettingsState({ ...settings, creditAlertThreshold: value[0] })}
                  max={1000}
                  min={25}
                  step={25}
                  className="[&_[role=slider]]:bg-emerald-500"
                />
              </div>

              {/* Credit Alerts Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Credit Alerts</Label>
                  <p className="text-xs text-slate-500 mt-1">Get notified when credits run low</p>
                </div>
                <Switch
                  checked={settings.creditAlertsEnabled}
                  onCheckedChange={(checked) => setSettingsState({ ...settings, creditAlertsEnabled: checked })}
                />
              </div>

              {/* Change PIN */}
              <div className="space-y-2 pt-4 border-t border-[#1E293B]">
                <Label className="text-slate-300">Change Admin PIN</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="New 4-digit PIN"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="bg-[#0B1121] border-[#1E293B] text-slate-200 max-w-[150px]"
                  />
                  <Button
                    onClick={handleChangePin}
                    variant="outline"
                    className="bg-[#0B1121] border-[#1E293B] text-slate-200 hover:bg-[#1E293B]"
                  >
                    Change PIN
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleSaveSettings}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
                data-testid="save-settings"
              >
                <Save size={16} className="mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location" className="space-y-4">
          <Card className="bg-[#131B2F] border-[#1E293B]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-100 font-['Outfit'] flex items-center gap-2">
                <MapPin size={20} className="text-emerald-400" />
                Location Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default State */}
              <div className="space-y-2">
                <Label className="text-slate-300">Default State</Label>
                <Select 
                  value={settings.defaultState} 
                  onValueChange={(value) => setSettingsState({ ...settings, defaultState: value })}
                >
                  <SelectTrigger className="bg-[#0B1121] border-[#1E293B] text-slate-200">
                    <SelectValue placeholder="Select default state" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131B2F] border-[#1E293B]">
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value} className="text-slate-200">
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* County List */}
              <div className="space-y-3">
                <Label className="text-slate-300">Saved Counties</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add county name"
                    value={newCounty}
                    onChange={(e) => setNewCounty(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCounty()}
                    className="bg-[#0B1121] border-[#1E293B] text-slate-200"
                  />
                  <Button
                    onClick={handleAddCounty}
                    variant="outline"
                    className="bg-[#0B1121] border-[#1E293B] text-slate-200 hover:bg-[#1E293B]"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
                
                {settings.counties.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {settings.counties.map((county) => (
                      <Badge
                        key={county}
                        variant="outline"
                        className="bg-[#0B1121] border-[#1E293B] text-slate-300 pr-1"
                      >
                        {county}
                        <button
                          onClick={() => handleRemoveCounty(county)}
                          className="ml-2 p-1 hover:bg-rose-500/20 rounded"
                        >
                          <X size={12} className="text-rose-400" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No counties saved.</p>
                )}
              </div>

              <Button
                onClick={handleSaveSettings}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
              >
                <Save size={16} className="mr-2" />
                Save Location Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hot Deals Tab */}
        <TabsContent value="hotdeals" className="space-y-4">
          <Card className="bg-[#131B2F] border-[#1E293B]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-100 font-['Outfit'] flex items-center gap-2">
                <Flame size={20} className="text-emerald-400" />
                Extraordinary Deal Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Hot Deals */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Enable Hot Deal Detection</Label>
                  <p className="text-xs text-slate-500 mt-1">Highlight units that match your criteria</p>
                </div>
                <Switch
                  checked={hotDealSettings.enabled}
                  onCheckedChange={(checked) => setHotDealSettingsState({ ...hotDealSettings, enabled: checked })}
                />
              </div>

              {/* Min Profit Percent */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Minimum Profit %</Label>
                  <span className="text-emerald-400 font-semibold">{hotDealSettings.minProfitPercent}%</span>
                </div>
                <Slider
                  value={[hotDealSettings.minProfitPercent]}
                  onValueChange={(value) => setHotDealSettingsState({ ...hotDealSettings, minProfitPercent: value[0] })}
                  max={500}
                  min={25}
                  step={25}
                  className="[&_[role=slider]]:bg-emerald-500"
                />
              </div>

              {/* Min Estimated Value */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Minimum Estimated Value</Label>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(hotDealSettings.minEstimatedValue)}</span>
                </div>
                <Slider
                  value={[hotDealSettings.minEstimatedValue]}
                  onValueChange={(value) => setHotDealSettingsState({ ...hotDealSettings, minEstimatedValue: value[0] })}
                  max={5000}
                  min={100}
                  step={100}
                  className="[&_[role=slider]]:bg-emerald-500"
                />
              </div>

              {/* Max Starting Bid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Maximum Starting Bid</Label>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(hotDealSettings.maxStartingBid)}</span>
                </div>
                <Slider
                  value={[hotDealSettings.maxStartingBid]}
                  onValueChange={(value) => setHotDealSettingsState({ ...hotDealSettings, maxStartingBid: value[0] })}
                  max={1000}
                  min={25}
                  step={25}
                  className="[&_[role=slider]]:bg-emerald-500"
                />
              </div>

              <Button
                onClick={handleSaveHotDealSettings}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
              >
                <Save size={16} className="mr-2" />
                Save Hot Deal Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
