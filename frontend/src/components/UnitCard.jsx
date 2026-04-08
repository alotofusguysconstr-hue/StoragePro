import { useState } from 'react';
import { TrendingUp, MapPin, Package, Calendar, ExternalLink, ChevronDown, ChevronUp, Trash2, DollarSign, Target, AlertTriangle, CheckCircle, XCircle, Gavel } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { addToMyBidsAPI, isHotDeal } from '../lib/storage';
import { toast } from 'sonner';

export const UnitCard = ({ unit, compact = false, showFullAnalysis = false, showActions = false, onRemove }) => {
  const [expanded, setExpanded] = useState(showFullAnalysis);
  
  const hunter = unit.hunter_analysis || {};
  const optimizer = unit.optimizer_analysis || {};
  
  const isHot = isHotDeal(unit);
  const verdict = optimizer?.final_recommendation?.verdict || hunter?.initial_recommendation || 'PENDING';
  const verdictColor = {
    'GO': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'PROMISING': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'MAYBE': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'NO-GO': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'PASS': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'ERROR': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'PENDING': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }[verdict] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';

  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleAddToMyBids = async () => {
    try {
      await addToMyBidsAPI(unit.auction_id);
      toast.success('Added to My Bids!');
    } catch (error) {
      toast.error('Failed to add');
    }
  };

  const estimatedValue = hunter?.estimated_value?.mid || 0;
  const currentBid = hunter?.current_bid || 0;
  const maxBid = optimizer?.final_recommendation?.max_bid || 0;
  const expectedProfit = optimizer?.final_recommendation?.expected_profit?.mid || 0;
  const predictabilityScore = hunter?.predictability_score || 0;

  return (
    <Card 
      className={`bg-[#131B2F] border-[#1E293B] hover:border-emerald-500/20 transition-all duration-200 ${isHot ? 'glow-emerald border-emerald-500/30' : ''}`}
      data-testid={`unit-card-${unit.auction_id}`}
    >
      <CardContent className="p-4 sm:p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-semibold text-slate-100 font-['Outfit'] truncate">
                {hunter?.facility_name || 'Storage Unit'}
              </h3>
              <Badge className={verdictColor}>
                {verdict}
              </Badge>
              {isHot && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">
                  Hot Deal
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {unit.county || hunter?.county || 'Unknown'}, {unit.state || hunter?.state || 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Package size={14} />
                {hunter?.unit_size || 'N/A'}
              </span>
              {hunter?.auction_end_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(hunter.auction_end_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-xs text-slate-500 uppercase">Current Bid</p>
              <p className="text-lg font-bold text-slate-200">{formatCurrency(currentBid)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Est. Value</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(estimatedValue)}</p>
            </div>
            {maxBid > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase">Max Bid</p>
                <p className="text-lg font-bold text-blue-400">{formatCurrency(maxBid)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Compact Summary */}
        {!expanded && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            {predictabilityScore > 0 && (
              <Badge variant="outline" className="bg-[#0B1121] border-[#1E293B] text-slate-300">
                Predictability: {predictabilityScore}/10
              </Badge>
            )}
            {expectedProfit > 0 && (
              <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                <TrendingUp size={12} className="mr-1" />
                {formatCurrency(expectedProfit)} profit
              </Badge>
            )}
            {hunter?.visible_items?.slice(0, 3).map((item, i) => (
              <Badge key={i} variant="outline" className="bg-[#0B1121] border-[#1E293B] text-slate-400">
                {item}
              </Badge>
            ))}
          </div>
        )}

        {/* Expanded Analysis */}
        {expanded && (
          <div className="mt-4 space-y-4 pt-4 border-t border-[#1E293B]">
            {/* Hunter Analysis */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                <Target size={14} />
                StorageBid Hunter Analysis
              </h4>
              
              {hunter?.visible_items?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Visible Items</p>
                  <div className="flex flex-wrap gap-1">
                    {hunter.visible_items.map((item, i) => (
                      <Badge key={i} variant="outline" className="bg-[#0B1121] border-[#1E293B] text-slate-300 text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {hunter?.item_categories && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  {Object.entries(hunter.item_categories).map(([cat, items]) => (
                    items && (Array.isArray(items) ? items.length > 0 : items) && (
                      <div key={cat} className="bg-[#0B1121] rounded p-2">
                        <p className="text-xs text-slate-500 capitalize">{cat.replace('_', ' ')}</p>
                        <p className="text-slate-300 text-xs">
                          {Array.isArray(items) ? items.join(', ') : items}
                        </p>
                      </div>
                    )
                  ))}
                </div>
              )}

              {hunter?.red_flags?.length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-rose-500/10 rounded border border-rose-500/20">
                  <AlertTriangle size={14} className="text-rose-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-rose-400 font-medium">Red Flags</p>
                    <p className="text-xs text-rose-300">{hunter.red_flags.join(', ')}</p>
                  </div>
                </div>
              )}

              {hunter?.summary && (
                <p className="text-sm text-slate-400 italic">"{hunter.summary}"</p>
              )}
            </div>

            {/* Optimizer Analysis */}
            {optimizer && Object.keys(optimizer).length > 0 && !optimizer.error && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                  <DollarSign size={14} />
                  StorageProfit Optimizer Analysis
                </h4>

                {optimizer?.value_breakdown?.total && (
                  <div className="bg-[#0B1121] rounded p-3">
                    <p className="text-xs text-slate-500 uppercase mb-2">Total Value Estimate</p>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Low</p>
                        <p className="text-slate-300">{formatCurrency(optimizer.value_breakdown.total.low)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-emerald-500">Best</p>
                        <p className="text-emerald-400 font-semibold">{formatCurrency(optimizer.value_breakdown.total.mid)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">High</p>
                        <p className="text-slate-300">{formatCurrency(optimizer.value_breakdown.total.high)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {optimizer?.resale_strategy && (
                  <div className="bg-[#0B1121] rounded p-3">
                    <p className="text-xs text-slate-500 uppercase mb-2">Resale Strategy</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-slate-300">
                        <span className="text-slate-500">Platforms:</span> {optimizer.resale_strategy.platforms?.join(', ')}
                      </p>
                      <p className="text-slate-300">
                        <span className="text-slate-500">Time to sell:</span> {optimizer.resale_strategy.estimated_time_to_sell}
                      </p>
                      <p className="text-slate-300">
                        <span className="text-slate-500">Effort:</span> {optimizer.resale_strategy.effort_level}
                      </p>
                    </div>
                  </div>
                )}

                {optimizer?.costs && (
                  <div className="bg-[#0B1121] rounded p-3">
                    <p className="text-xs text-slate-500 uppercase mb-2">Estimated Costs</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-slate-300">Transport: {formatCurrency(optimizer.costs.transportation)}</span>
                      <span className="text-slate-300">Cleanup: {formatCurrency(optimizer.costs.cleanup_time_value)}</span>
                      <span className="text-slate-300">Disposal: {formatCurrency(optimizer.costs.disposal_fees)}</span>
                      <span className="text-amber-400 font-semibold">Total: {formatCurrency(optimizer.costs.total_costs)}</span>
                    </div>
                  </div>
                )}

                {optimizer?.risk_analysis && (
                  <div className={`p-3 rounded border ${
                    optimizer.risk_analysis.risk_score === 'Low' ? 'bg-emerald-500/10 border-emerald-500/20' :
                    optimizer.risk_analysis.risk_score === 'Medium' ? 'bg-amber-500/10 border-amber-500/20' :
                    'bg-rose-500/10 border-rose-500/20'
                  }`}>
                    <p className="text-xs uppercase mb-1 text-slate-500">Risk Assessment</p>
                    <p className={`text-sm font-semibold ${
                      optimizer.risk_analysis.risk_score === 'Low' ? 'text-emerald-400' :
                      optimizer.risk_analysis.risk_score === 'Medium' ? 'text-amber-400' :
                      'text-rose-400'
                    }`}>
                      {optimizer.risk_analysis.risk_score} Risk
                    </p>
                    {optimizer.risk_analysis.concerns?.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">{optimizer.risk_analysis.concerns.join(', ')}</p>
                    )}
                  </div>
                )}

                {optimizer?.final_recommendation && (
                  <div className={`p-4 rounded-lg border ${
                    optimizer.final_recommendation.verdict === 'GO' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {optimizer.final_recommendation.verdict === 'GO' ? (
                        <CheckCircle size={20} className="text-emerald-400" />
                      ) : (
                        <XCircle size={20} className="text-rose-400" />
                      )}
                      <span className={`text-lg font-bold ${
                        optimizer.final_recommendation.verdict === 'GO' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {optimizer.final_recommendation.verdict}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{optimizer.final_recommendation.reasoning}</p>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm">
                      <span className="text-blue-400">Max Bid: {formatCurrency(optimizer.final_recommendation.max_bid)}</span>
                      <span className="text-emerald-400">Expected Profit: {formatCurrency(optimizer.final_recommendation.expected_profit?.mid)}</span>
                      <span className="text-slate-400">Strategy: {optimizer.final_recommendation.bid_strategy}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-slate-200"
            data-testid={`toggle-details-${unit.auction_id}`}
          >
            {expanded ? (
              <>
                <ChevronUp size={16} className="mr-1" />
                Less Details
              </>
            ) : (
              <>
                <ChevronDown size={16} className="mr-1" />
                View Analysis
              </>
            )}
          </Button>

          <div className="flex gap-2">
            {unit.auction_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(unit.auction_url, '_blank')}
                className="bg-[#0B1121] border-[#1E293B] text-slate-300 hover:bg-[#1E293B]"
                data-testid={`view-auction-${unit.auction_id}`}
              >
                <ExternalLink size={14} className="mr-1" />
                View Auction
              </Button>
            )}
            
            {unit.status === 'published' && !showActions && (
              <Button
                size="sm"
                onClick={handleAddToMyBids}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                data-testid={`add-to-bids-${unit.auction_id}`}
              >
                <Gavel size={14} className="mr-1" />
                Save to My Bids
              </Button>
            )}

            {showActions && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                data-testid={`remove-${unit.auction_id}`}
              >
                <Trash2 size={14} className="mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnitCard;
