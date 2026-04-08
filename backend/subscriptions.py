"""
PayPal Subscription Service for StorageHunter Pro
Handles subscription plans: Free, Pro ($19.99/mo), Enterprise ($49.99/mo)
"""
import os
import logging
import httpx
from typing import Dict, Optional, List
from datetime import datetime, timezone
from enum import Enum

logger = logging.getLogger(__name__)

# PayPal Configuration
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_CLIENT_SECRET = os.environ.get('PAYPAL_CLIENT_SECRET', '')
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'live')  # 'sandbox' or 'live'

# PayPal API URLs
PAYPAL_API_BASE = 'https://api-m.paypal.com' if PAYPAL_MODE == 'live' else 'https://api-m.sandbox.paypal.com'


class SubscriptionTier(str, Enum):
    FREE = 'free'
    PRO = 'pro'
    ENTERPRISE = 'enterprise'


# Tier configurations
TIER_CONFIG = {
    SubscriptionTier.FREE: {
        'name': 'Free',
        'price': 0,
        'scans_per_day': 5,
        'vision_analysis': False,
        'push_notifications': False,
        'api_access': False,
        'team_members': 1,
        'features': ['5 scans per day', 'Basic AI analysis', 'Dashboard access']
    },
    SubscriptionTier.PRO: {
        'name': 'Pro',
        'price': 19.99,
        'scans_per_day': -1,  # Unlimited
        'vision_analysis': True,
        'push_notifications': True,
        'api_access': False,
        'team_members': 1,
        'features': [
            'Unlimited scans',
            'Vision AI photo analysis',
            'Push notifications',
            'Hot deal alerts',
            'Priority analysis',
            'Advanced filters'
        ]
    },
    SubscriptionTier.ENTERPRISE: {
        'name': 'Enterprise',
        'price': 49.99,
        'scans_per_day': -1,  # Unlimited
        'vision_analysis': True,
        'push_notifications': True,
        'api_access': True,
        'team_members': 5,
        'features': [
            'Everything in Pro',
            'API access',
            'Team accounts (5 members)',
            'Priority support',
            'Custom integrations',
            'Bulk scanning',
            'White-label reports'
        ]
    }
}


class PayPalService:
    """PayPal API service for subscriptions"""
    
    def __init__(self):
        self.client_id = PAYPAL_CLIENT_ID
        self.client_secret = PAYPAL_CLIENT_SECRET
        self.base_url = PAYPAL_API_BASE
        self._access_token = None
        self._token_expires = None
    
    async def _get_access_token(self) -> str:
        """Get PayPal OAuth access token"""
        if self._access_token and self._token_expires and datetime.now(timezone.utc) < self._token_expires:
            return self._access_token
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{self.base_url}/v1/oauth2/token',
                auth=(self.client_id, self.client_secret),
                data={'grant_type': 'client_credentials'},
                headers={'Accept': 'application/json'}
            )
            
            if response.status_code != 200:
                logger.error(f"PayPal token error: {response.text}")
                raise Exception("Failed to get PayPal access token")
            
            data = response.json()
            self._access_token = data['access_token']
            # Token expires in seconds, subtract 60 for safety margin
            expires_in = data.get('expires_in', 3600) - 60
            self._token_expires = datetime.now(timezone.utc) + __import__('datetime').timedelta(seconds=expires_in)
            
            return self._access_token
    
    async def _make_request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make authenticated request to PayPal API"""
        token = await self._get_access_token()
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        async with httpx.AsyncClient() as client:
            if method == 'GET':
                response = await client.get(f'{self.base_url}{endpoint}', headers=headers)
            elif method == 'POST':
                response = await client.post(f'{self.base_url}{endpoint}', headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response.json() if response.text else {}
    
    async def create_subscription_order(self, tier: SubscriptionTier, user_id: str, return_url: str, cancel_url: str) -> Dict:
        """Create a PayPal order for subscription"""
        if tier == SubscriptionTier.FREE:
            return {'status': 'FREE_TIER', 'message': 'No payment needed for free tier'}
        
        config = TIER_CONFIG[tier]
        
        order_data = {
            'intent': 'CAPTURE',
            'purchase_units': [{
                'reference_id': f'{user_id}_{tier.value}',
                'description': f'StorageHunter Pro - {config["name"]} Plan (Monthly)',
                'amount': {
                    'currency_code': 'USD',
                    'value': str(config['price'])
                }
            }],
            'application_context': {
                'brand_name': 'StorageHunter Pro',
                'landing_page': 'BILLING',
                'user_action': 'PAY_NOW',
                'return_url': return_url,
                'cancel_url': cancel_url
            }
        }
        
        result = await self._make_request('POST', '/v2/checkout/orders', order_data)
        return result
    
    async def capture_order(self, order_id: str) -> Dict:
        """Capture a PayPal order after approval"""
        result = await self._make_request('POST', f'/v2/checkout/orders/{order_id}/capture')
        return result
    
    async def get_order_details(self, order_id: str) -> Dict:
        """Get details of a PayPal order"""
        result = await self._make_request('GET', f'/v2/checkout/orders/{order_id}')
        return result


# Singleton instance
paypal_service = PayPalService()


def get_tier_config(tier: SubscriptionTier) -> Dict:
    """Get configuration for a subscription tier"""
    return TIER_CONFIG.get(tier, TIER_CONFIG[SubscriptionTier.FREE])


def get_all_tiers() -> List[Dict]:
    """Get all tier configurations for display"""
    return [
        {
            'id': tier.value,
            'name': config['name'],
            'price': config['price'],
            'features': config['features'],
            'scans_per_day': 'Unlimited' if config['scans_per_day'] == -1 else config['scans_per_day'],
            'vision_analysis': config['vision_analysis'],
            'push_notifications': config['push_notifications'],
            'api_access': config['api_access'],
            'team_members': config['team_members']
        }
        for tier, config in TIER_CONFIG.items()
    ]


def check_scan_limit(tier: SubscriptionTier, scans_today: int) -> bool:
    """Check if user has remaining scans for today"""
    config = TIER_CONFIG.get(tier, TIER_CONFIG[SubscriptionTier.FREE])
    if config['scans_per_day'] == -1:
        return True  # Unlimited
    return scans_today < config['scans_per_day']


def can_use_vision(tier: SubscriptionTier) -> bool:
    """Check if tier has vision analysis feature"""
    config = TIER_CONFIG.get(tier, TIER_CONFIG[SubscriptionTier.FREE])
    return config['vision_analysis']


def can_use_notifications(tier: SubscriptionTier) -> bool:
    """Check if tier has push notifications feature"""
    config = TIER_CONFIG.get(tier, TIER_CONFIG[SubscriptionTier.FREE])
    return config['push_notifications']


def can_use_api(tier: SubscriptionTier) -> bool:
    """Check if tier has API access feature"""
    config = TIER_CONFIG.get(tier, TIER_CONFIG[SubscriptionTier.FREE])
    return config['api_access']
