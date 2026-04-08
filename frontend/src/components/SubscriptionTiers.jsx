import { useState, useEffect } from 'react';
import { Check, X, Zap, Crown, Building2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { getSubscriptionTiers, createSubscriptionOrder, getUserTier, setUserTier } from '../lib/storage';
import { toast } from 'sonner';

const TIER_ICONS = {
  free: Zap,
  pro: Crown,
  enterprise: Building2,
};

const TIER_COLORS = {
  free: 'border-slate-500/30',
  pro: 'border-emerald-500/50 glow-emerald',
  enterprise: 'border-blue-500/50',
};

export const SubscriptionTiers = ({ onSubscribe }) => {
  const [tiers, setTiers] = useState([]);
  const [currentTier, setCurrentTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const data = await getSubscriptionTiers();
      setTiers(data.tiers || []);
      setCurrentTier(getUserTier());
    } catch (error) {
      console.error('Error loading tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tierId) => {
    if (tierId === 'free') {
      setUserTier('free');
      setCurrentTier('free');
      toast.success('Free tier activated!');
      if (onSubscribe) onSubscribe('free');
      return;
    }

    setSubscribing(tierId);
    try {
      const returnUrl = `${window.location.origin}/subscription/success`;
      const cancelUrl = `${window.location.origin}/subscription/cancel`;
      
      const result = await createSubscriptionOrder(tierId, returnUrl, cancelUrl);
      
      if (result.links) {
        // Find approval URL and redirect
        const approvalLink = result.links.find(l => l.rel === 'approve');
        if (approvalLink) {
          window.location.href = approvalLink.href;
        }
      } else if (result.status === 'success') {
        setUserTier(tierId);
        setCurrentTier(tierId);
        toast.success(`${tierId} plan activated!`);
        if (onSubscribe) onSubscribe(tierId);
      }
    } catch (error) {
      toast.error('Failed to process subscription');
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-100 font-['Outfit']">Choose Your Plan</h2>
        <p className="text-slate-400 mt-2">Unlock powerful features to find the best storage deals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const Icon = TIER_ICONS[tier.id] || Zap;
          const isCurrentTier = currentTier === tier.id;
          const isPopular = tier.id === 'pro';
          
          return (
            <Card 
              key={tier.id}
              className={`bg-[#131B2F] ${TIER_COLORS[tier.id]} relative ${isPopular ? 'scale-105' : ''}`}
              data-testid={`tier-${tier.id}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-500 text-slate-950 font-semibold">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
                  tier.id === 'pro' ? 'bg-emerald-500/20' : 
                  tier.id === 'enterprise' ? 'bg-blue-500/20' : 'bg-slate-500/20'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    tier.id === 'pro' ? 'text-emerald-400' : 
                    tier.id === 'enterprise' ? 'text-blue-400' : 'text-slate-400'
                  }`} />
                </div>
                <CardTitle className="text-xl font-bold text-slate-100 font-['Outfit']">
                  {tier.name}
                </CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-slate-100">
                    ${tier.price}
                  </span>
                  {tier.price > 0 && (
                    <span className="text-slate-400 text-sm">/month</span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4 space-y-2 text-xs text-slate-500 border-t border-[#1E293B]">
                  <div className="flex justify-between">
                    <span>Scans/day:</span>
                    <span className="text-slate-300">{tier.scans_per_day}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vision AI:</span>
                    <span>{tier.vision_analysis ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-slate-500" />}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Push Alerts:</span>
                    <span>{tier.push_notifications ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-slate-500" />}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>API Access:</span>
                    <span>{tier.api_access ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-slate-500" />}</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={isCurrentTier || subscribing === tier.id}
                  className={`w-full ${
                    tier.id === 'pro' 
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' 
                      : tier.id === 'enterprise'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-[#1E293B] hover:bg-[#2E3B4B] text-slate-200'
                  }`}
                  data-testid={`subscribe-${tier.id}`}
                >
                  {subscribing === tier.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrentTier ? (
                    'Current Plan'
                  ) : tier.price === 0 ? (
                    'Get Started'
                  ) : (
                    'Upgrade Now'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-500">
        Secure payment via PayPal. Cancel anytime.
      </p>
    </div>
  );
};

export default SubscriptionTiers;
