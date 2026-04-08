import { useState, useEffect } from 'react';
import { Settings, MapPin, Target, Bell, Plus, X, Save, Search, Gavel, Globe, Flame, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Slider } from '../components/ui/slider';
import { PinModal } from '../components/PinModal';
import { US_STATES } from '../lib/constants';
import { 
  getSettings, 
  setSettings, 
  getHotDealSettings, 
  setHotDealSettings,
  getPublishQueue,
  removeFromPublishQueue,
  addToMyBids,
  isAdminUnlocked,
  setAdminUnlocked,
  getAdminPin,
  setAdminPin
} from '../lib/storage';
import { toast } from 'sonner';

export const Admin = () => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [settings, setSettingsState] = useState(getSettings());
  const [hotDealSettings, setHotDealSettingsState] = useState(getHotDealSettings());
  const [publishQueue, setPublishQueueState] = useState([]);
  const [newCounty, setNewCounty] = useState('');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    const unlocked = isAdminUnlocked();
    if (unlocked) {
      setIsUnlocked(true);
    } else {
      setShowPinModal(true);
    }
    setPublishQueueState(getPublishQueue());
  }, []);

  const handlePinSuccess = () => {
    setIsUnlocked(true);
    setShowPinModal(false);
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

  const handlePublishToMyBids = (unit) => {
    addToMyBids(unit);
    removeFromPublishQueue(unit.id);
    setPublishQueueState(getPublishQueue());
    toast.success('Added to My Bids');
  };

  const handleRemoveFromQueue = (unitId) => {
    removeFromPublishQueue(unitId);
    setPublishQueueState(getPublishQueue());
    toast.success('Removed from queue');
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
            Manage settings and publish queue
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
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="bg-[#131B2F] border border-[#1E293B] p-1">
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
          <TabsTrigger 
            value="queue"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            data-testid="tab-queue"
          >
            <Globe size={16} className="mr-2" />
            Publish Queue
          </TabsTrigger>
        </TabsList>

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
                <p className="text-xs text-slate-500">Minimum profit percentage to highlight deals</p>
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
                  data-testid="credit-threshold-slider"
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
                  data-testid="credit-alerts-toggle"
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
                    data-testid="new-pin-input"
                  />
                  <Button
                    onClick={handleChangePin}
                    variant="outline"
                    className="bg-[#0B1121] border-[#1E293B] text-slate-200 hover:bg-[#1E293B]"
                    data-testid="change-pin-btn"
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
                  <SelectTrigger 
                    className="bg-[#0B1121] border-[#1E293B] text-slate-200"
                    data-testid="default-state-select"
                  >
                    <SelectValue placeholder="Select default state" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131B2F] border-[#1E293B]">
                    {US_STATES.map((state) => (
                      <SelectItem 
                        key={state.value} 
                        value={state.value}
                        className="text-slate-200 focus:bg-emerald-500/20 focus:text-emerald-400"
                      >
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
                    data-testid="add-county-input"
                  />
                  <Button
                    onClick={handleAddCounty}
                    variant="outline"
                    className="bg-[#0B1121] border-[#1E293B] text-slate-200 hover:bg-[#1E293B]"
                    data-testid="add-county-btn"
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
                        data-testid={`county-badge-${county}`}
                      >
                        {county}
                        <button
                          onClick={() => handleRemoveCounty(county)}
                          className="ml-2 p-1 hover:bg-rose-500/20 rounded"
                          data-testid={`remove-county-${county}`}
                        >
                          <X size={12} className="text-rose-400" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No counties saved. Add your target counties above.</p>
                )}
              </div>

              {/* Find Units Button */}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-12"
                onClick={() => window.location.href = '/scan'}
                data-testid="find-units-btn"
              >
                <Search size={18} className="mr-2" />
                Find Units in Selected Areas
              </Button>

              <Button
                onClick={handleSaveSettings}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
                data-testid="save-location-settings"
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
                  data-testid="hot-deals-toggle"
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
                  data-testid="min-profit-slider"
                />
                <p className="text-xs text-slate-500">Units must have at least this ROI to be flagged</p>
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
                  data-testid="min-value-slider"
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
                  data-testid="max-bid-slider"
                />
              </div>

              <Button
                onClick={handleSaveHotDealSettings}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
                data-testid="save-hotdeal-settings"
              >
                <Save size={16} className="mr-2" />
                Save Hot Deal Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Publish Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card className="bg-[#131B2F] border-[#1E293B]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-100 font-['Outfit'] flex items-center gap-2">
                <Globe size={20} className="text-emerald-400" />
                Publish Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {publishQueue.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-[#1E293B] flex items-center justify-center mx-auto mb-4">
                    <Globe size={32} className="text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-300 font-['Outfit']">
                    Queue Empty
                  </h3>
                  <p className="text-slate-500 text-sm mt-2">
                    Analyzed units will appear here for publishing
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {publishQueue.map((unit) => (
                    <div 
                      key={unit.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-[#0B1121] border border-[#1E293B]"
                      data-testid={`queue-item-${unit.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-200">{unit.facilityName}</p>
                        <p className="text-sm text-slate-500">
                          {unit.unitSize} • {unit.county}, {unit.state}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handlePublishToMyBids(unit)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                          data-testid={`publish-to-bids-${unit.id}`}
                        >
                          <Gavel size={14} className="mr-1" />
                          My Bids
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveFromQueue(unit.id)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          data-testid={`remove-from-queue-${unit.id}`}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
