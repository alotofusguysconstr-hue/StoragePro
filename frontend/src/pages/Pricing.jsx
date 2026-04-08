import { SubscriptionTiers } from '../components/SubscriptionTiers';
import { useNavigate } from 'react-router-dom';

export const Pricing = () => {
  const navigate = useNavigate();

  const handleSubscribe = (tier) => {
    if (tier === 'free') {
      navigate('/');
    }
    // For paid tiers, the component handles PayPal redirect
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="pricing-page">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 font-['Outfit']">
          Pricing
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Find the perfect plan for your storage hunting needs
        </p>
      </div>

      {/* Tiers */}
      <SubscriptionTiers onSubscribe={handleSubscribe} />
    </div>
  );
};

export default Pricing;
