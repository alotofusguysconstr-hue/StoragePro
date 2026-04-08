import { useState } from 'react';
import { Search, MapPin, Filter, Loader2, Link, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { UnitCard } from '../components/UnitCard';
import { US_STATES } from '../lib/constants';
import { getSettings, scanAuctions } from '../lib/storage';
import { toast } from 'sonner';

// Sample auction URLs for demo
const SAMPLE_URLS = [
  'https://www.storagetreasures.com/auctions/detail/1234567',
  'https://www.hibid.com/lot/12345678',
  'https://bid4assets.com/auction/56789',
];

export const Scan = () => {
  const settings = getSettings();
  const [selectedState, setSelectedState] = useState(settings.defaultState || '');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    const urls = urlInput.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    
    if (urls.length === 0) {
      toast.error('Please enter at least one auction URL');
      return;
    }

    setIsScanning(true);
    setError(null);
    setResults(null);

    try {
      const effectiveState = selectedState === 'any' ? '' : selectedState;
      const response = await scanAuctions(urls, effectiveState, selectedCounty);
      setResults(response);
      
      if (response.analyzed > 0) {
        toast.success(`Analyzed ${response.analyzed} unit(s) successfully!`);
      }
      if (response.duplicates > 0) {
        toast.warning(`${response.duplicates} duplicate(s) skipped`);
      }
    } catch (err) {
      setError(err.message || 'Failed to scan auctions');
      toast.error('Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanPopular = async () => {
    setUrlInput(SAMPLE_URLS.join('\n'));
    toast.info('Sample URLs loaded. Click "Analyze" to scan.');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="scan-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 font-['Outfit']">
          Scan for Units
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Paste auction URLs to analyze with AI agents
        </p>
      </div>

      {/* URL Input */}
      <Card className="bg-[#131B2F] border-[#1E293B]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link size={20} className="text-emerald-400" />
            <CardTitle className="text-lg font-semibold text-slate-100 font-['Outfit']">
              Auction URLs
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Paste auction listing URLs (one per line)</Label>
            <Textarea
              placeholder={`https://www.storagetreasures.com/auctions/detail/...\nhttps://www.hibid.com/lot/...\nhttps://bid4assets.com/auction/...`}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="min-h-[120px] bg-[#0B1121] border-[#1E293B] text-slate-200 placeholder:text-slate-500 font-mono text-sm"
              data-testid="url-input"
            />
            <p className="text-xs text-slate-500">
              Supports StorageTreasures, HiBid, Bid4Assets, and other auction sites
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleScanPopular}
            className="bg-[#0B1121] border-[#1E293B] text-slate-300 hover:bg-[#1E293B] hover:text-slate-100"
            data-testid="scan-popular-btn"
          >
            <Zap size={16} className="mr-2" />
            Load Sample URLs (Demo)
          </Button>
        </CardContent>
      </Card>

      {/* Location Filters */}
      <Card className="bg-[#131B2F] border-[#1E293B]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-emerald-400" />
            <CardTitle className="text-lg font-semibold text-slate-100 font-['Outfit']">
              Location Filters (Optional)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">State</Label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger 
                  className="bg-[#0B1121] border-[#1E293B] text-slate-200"
                  data-testid="state-select"
                >
                  <SelectValue placeholder="Any state" />
                </SelectTrigger>
                <SelectContent className="bg-[#131B2F] border-[#1E293B]">
                  <SelectItem value="any" className="text-slate-200">Any state</SelectItem>
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
              <Input
                placeholder="e.g., King, Pierce, Snohomish"
                value={selectedCounty}
                onChange={(e) => setSelectedCounty(e.target.value)}
                className="bg-[#0B1121] border-[#1E293B] text-slate-200 placeholder:text-slate-500"
                data-testid="county-input"
              />
            </div>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={handleScan}
            disabled={isScanning || !urlInput.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-12"
            data-testid="analyze-button"
          >
            {isScanning ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Analyzing with AI Agents...
              </>
            ) : (
              <>
                <Search size={18} className="mr-2" />
                Analyze with StorageBid Hunter
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-400">
          <AlertCircle size={16} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="bg-[#131B2F] border-[#1E293B]">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-emerald-400" />
                  <span className="text-slate-200 font-medium">Scan Complete</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {results.analyzed} Analyzed
                  </Badge>
                  {results.duplicates > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      {results.duplicates} Duplicates
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duplicate Warnings */}
          {results.duplicate_warnings?.length > 0 && (
            <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-400">
              <AlertCircle size={16} />
              <AlertDescription>
                <p className="font-medium mb-2">Duplicates Found:</p>
                <ul className="text-sm space-y-1">
                  {results.duplicate_warnings.map((dup, i) => (
                    <li key={i}>{dup.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Analyzed Units */}
          {results.results?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100 font-['Outfit']">
                Analysis Results
              </h3>
              <p className="text-sm text-slate-400">
                Units are now in Admin Review Queue for approval before publishing.
              </p>
              {results.results.map((unit) => (
                <UnitCard key={unit.auction_id} unit={unit} showFullAnalysis />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!results && !isScanning && (
        <Card className="bg-[#131B2F] border-[#1E293B]">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1E293B] flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 font-['Outfit']">
              Ready to Hunt
            </h3>
            <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
              Paste auction URLs above and click "Analyze" to run the AI agents.
              StorageBid Hunter will scan first, then StorageProfit Optimizer will analyze promising units.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Scan;
