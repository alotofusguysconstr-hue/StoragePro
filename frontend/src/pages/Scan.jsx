import { useState } from 'react';
import { Search, MapPin, Filter, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { US_STATES, getCountiesForState } from '../lib/constants';
import { getSettings } from '../lib/storage';

export const Scan = () => {
  const settings = getSettings();
  const [selectedState, setSelectedState] = useState(settings.defaultState || '');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const counties = selectedState ? getCountiesForState(selectedState) : [];
  const savedCounties = settings.counties || [];

  const handleScan = () => {
    setIsScanning(true);
    // Simulate scanning - in real app this would call an API
    setTimeout(() => {
      setIsScanning(false);
    }, 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="scan-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 font-['Outfit']">
          Scan for Units
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Search storage auctions by location
        </p>
      </div>

      {/* Search Filters */}
      <Card className="bg-[#131B2F] border-[#1E293B]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-emerald-400" />
            <CardTitle className="text-lg font-semibold text-slate-100 font-['Outfit']">
              Location Filters
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* State Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">State</Label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger 
                  className="bg-[#0B1121] border-[#1E293B] text-slate-200"
                  data-testid="state-select"
                >
                  <SelectValue placeholder="Select state" />
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

            <div className="space-y-2">
              <Label className="text-slate-300">County</Label>
              <Select 
                value={selectedCounty} 
                onValueChange={setSelectedCounty}
                disabled={!selectedState}
              >
                <SelectTrigger 
                  className="bg-[#0B1121] border-[#1E293B] text-slate-200 disabled:opacity-50"
                  data-testid="county-select"
                >
                  <SelectValue placeholder={selectedState ? "Select county" : "Select state first"} />
                </SelectTrigger>
                <SelectContent className="bg-[#131B2F] border-[#1E293B]">
                  {counties.length > 0 ? (
                    counties.map((county) => (
                      <SelectItem 
                        key={county} 
                        value={county}
                        className="text-slate-200 focus:bg-emerald-500/20 focus:text-emerald-400"
                      >
                        {county}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="_none" disabled className="text-slate-500">
                      No counties available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Saved Counties */}
          {savedCounties.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Saved Counties</Label>
              <div className="flex flex-wrap gap-2">
                {savedCounties.map((county) => (
                  <Badge
                    key={county}
                    variant="outline"
                    className="bg-[#0B1121] border-[#1E293B] text-slate-300 cursor-pointer hover:border-emerald-500/30 hover:text-emerald-400"
                    onClick={() => setSelectedCounty(county)}
                    data-testid={`saved-county-${county}`}
                  >
                    <MapPin size={12} className="mr-1" />
                    {county}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="space-y-2">
            <Label className="text-slate-300">Search Facility Name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <Input
                placeholder="e.g., Public Storage, Extra Space..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#0B1121] border-[#1E293B] text-slate-200 placeholder:text-slate-500"
                data-testid="search-input"
              />
            </div>
          </div>

          {/* Scan Button */}
          <Button
            onClick={handleScan}
            disabled={isScanning}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-12"
            data-testid="scan-button"
          >
            {isScanning ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search size={18} className="mr-2" />
                Find Units
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Placeholder */}
      <Card className="bg-[#131B2F] border-[#1E293B]">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#1E293B] flex items-center justify-center mx-auto mb-4">
            <Search size={32} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-300 font-['Outfit']">
            No Results Yet
          </h3>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            Select a location and click "Find Units" to scan for storage auctions in your area.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Scan;
