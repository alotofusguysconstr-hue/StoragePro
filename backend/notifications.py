"""
Push Notification Service for StorageHunter Pro
Uses Web Push API for browser notifications
"""
import os
import json
import logging
from typing import List, Optional, Dict
from pywebpush import webpush, WebPushException

logger = logging.getLogger(__name__)

# VAPID keys for Web Push
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_CLAIMS_EMAIL = os.environ.get('VAPID_CLAIMS_EMAIL', 'admin@storagehunter.pro')


def get_vapid_public_key() -> str:
    """Get the VAPID public key for client-side subscription"""
    return VAPID_PUBLIC_KEY


async def send_push_notification(
    subscription_info: Dict,
    title: str,
    body: str,
    icon: str = '/logo192.png',
    url: str = '/',
    tag: str = 'storagehunter'
) -> bool:
    """
    Send a push notification to a single subscriber
    
    Args:
        subscription_info: The push subscription object from the client
        title: Notification title
        body: Notification body text
        icon: URL to notification icon
        url: URL to open when notification is clicked
        tag: Tag for notification grouping
    
    Returns:
        True if successful, False otherwise
    """
    if not VAPID_PRIVATE_KEY or not subscription_info:
        logger.warning("Missing VAPID key or subscription info")
        return False
    
    payload = json.dumps({
        'title': title,
        'body': body,
        'icon': icon,
        'url': url,
        'tag': tag,
        'timestamp': __import__('datetime').datetime.utcnow().isoformat()
    })
    
    try:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={
                'sub': f'mailto:{VAPID_CLAIMS_EMAIL}'
            }
        )
        logger.info(f"Push notification sent: {title}")
        return True
    except WebPushException as e:
        logger.error(f"Push notification failed: {e}")
        # If subscription is invalid, return False so it can be removed
        if e.response and e.response.status_code in [404, 410]:
            return False
        return False
    except Exception as e:
        logger.error(f"Unexpected push error: {e}")
        return False


async def send_hot_deal_notification(
    subscription_info: Dict,
    unit_name: str,
    profit_percent: int,
    max_bid: float
) -> bool:
    """Send a hot deal alert notification"""
    return await send_push_notification(
        subscription_info=subscription_info,
        title="🔥 Hot Deal Alert!",
        body=f"{unit_name} - {profit_percent}% ROI potential! Max bid: ${max_bid:.0f}",
        url='/my-bids',
        tag='hot-deal'
    )


async def send_auction_ending_notification(
    subscription_info: Dict,
    unit_name: str,
    time_left: str
) -> bool:
    """Send an auction ending soon notification"""
    return await send_push_notification(
        subscription_info=subscription_info,
        title="⏰ Auction Ending Soon!",
        body=f"{unit_name} ends in {time_left}",
        url='/my-bids',
        tag='auction-ending'
    )


async def send_scan_complete_notification(
    subscription_info: Dict,
    units_found: int,
    hot_deals: int
) -> bool:
    """Send a scan complete notification"""
    return await send_push_notification(
        subscription_info=subscription_info,
        title="✅ Scan Complete",
        body=f"Found {units_found} units, {hot_deals} hot deals!",
        url='/',
        tag='scan-complete'
    )


async def broadcast_notification(
    subscriptions: List[Dict],
    title: str,
    body: str,
    url: str = '/'
) -> Dict:
    """
    Send notification to multiple subscribers
    Returns stats about delivery
    """
    success = 0
    failed = 0
    invalid_subscriptions = []
    
    for sub in subscriptions:
        result = await send_push_notification(
            subscription_info=sub.get('subscription'),
            title=title,
            body=body,
            url=url
        )
        if result:
            success += 1
        else:
            failed += 1
            # Track invalid subscriptions for cleanup
            if sub.get('user_id'):
                invalid_subscriptions.append(sub['user_id'])
    
    return {
        'success': success,
        'failed': failed,
        'invalid_subscriptions': invalid_subscriptions
    }
