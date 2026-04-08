// LocalStorage utility functions for StorageHunter Pro
// Now also includes API integration

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const API = `${BACKEND_URL}/api`;

const STORAGE_KEYS = {
  ADMIN_PIN: 'sh_admin_pin',
  SETTINGS: 'sh_settings',
  HOT_DEAL_SETTINGS: 'sh_hot_deal_settings',
  IS_ADMIN_UNLOCKED: 'sh_admin_unlocked',
  USER_ID: 'sh_user_id',
  USER_TIER: 'sh_user_tier',
  PUSH_ENABLED: 'sh_push_enabled',
};

// Default settings
const DEFAULT_SETTINGS = {
  defaultState: 'WA',
  counties: [],
  profitMarginTarget: 50,
  creditAlertThreshold: 100,
  creditAlertsEnabled: true,
};

// Default hot deal settings
const DEFAULT_HOT_DEAL_SETTINGS = {
  minProfitPercent: 100,
  minEstimatedValue: 500,
  maxStartingBid: 200,
  enabled: true,
};

// Generic storage functions
export const getItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const setItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
    return false;
  }
};

export const removeItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
    return false;
  }
};

// Admin PIN functions
export const getAdminPin = () => getItem(STORAGE_KEYS.ADMIN_PIN, '1234');
export const setAdminPin = (pin) => setItem(STORAGE_KEYS.ADMIN_PIN, pin);
export const isAdminUnlocked = () => getItem(STORAGE_KEYS.IS_ADMIN_UNLOCKED, false);
export const setAdminUnlocked = (unlocked) => setItem(STORAGE_KEYS.IS_ADMIN_UNLOCKED, unlocked);

// User functions
export const getUserId = () => getItem(STORAGE_KEYS.USER_ID, 'default');
export const setUserId = (id) => setItem(STORAGE_KEYS.USER_ID, id);
export const getUserTier = () => getItem(STORAGE_KEYS.USER_TIER, 'free');
export const setUserTier = (tier) => setItem(STORAGE_KEYS.USER_TIER, tier);
export const isPushEnabled = () => getItem(STORAGE_KEYS.PUSH_ENABLED, false);
export const setPushEnabled = (enabled) => setItem(STORAGE_KEYS.PUSH_ENABLED, enabled);

// Settings functions
export const getSettings = () => getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
export const setSettings = (settings) => setItem(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS, ...settings });
export const updateSettings = (updates) => {
  const current = getSettings();
  return setSettings({ ...current, ...updates });
};

// Hot deal settings
export const getHotDealSettings = () => getItem(STORAGE_KEYS.HOT_DEAL_SETTINGS, DEFAULT_HOT_DEAL_SETTINGS);
export const setHotDealSettings = (settings) => setItem(STORAGE_KEYS.HOT_DEAL_SETTINGS, { ...DEFAULT_HOT_DEAL_SETTINGS, ...settings });

// ============ API FUNCTIONS ============

// Get app config (VAPID key, tiers)
export const getAppConfig = async () => {
  try {
    const response = await fetch(`${API}/config`);
    return await response.json();
  } catch (error) {
    console.error('Get config error:', error);
    throw error;
  }
};

// Scan auctions with AI agents
export const scanAuctions = async (urls, stateFilter = null, countyFilter = null, useVision = true) => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API}/scan?user_id=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: urls,
        state_filter: stateFilter,
        county_filter: countyFilter,
        use_vision: useVision
      })
    });
    
    if (response.status === 429) {
      const data = await response.json();
      throw new Error(data.detail || 'Scan limit reached');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Scan error:', error);
    throw error;
  }
};

// Get review queue (Admin)
export const getReviewQueue = async (state = null, county = null) => {
  try {
    let url = `${API}/review-queue`;
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (county) params.append('county', county);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Get review queue error:', error);
    throw error;
  }
};

// Review queue action (approve/reject)
export const reviewQueueAction = async (unitId, action, notes = null) => {
  try {
    const response = await fetch(`${API}/review-queue/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_id: unitId,
        action: action,
        notes: notes
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Review action error:', error);
    throw error;
  }
};

// Get published units
export const getPublishedUnits = async (state = null, county = null) => {
  try {
    let url = `${API}/published-units`;
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (county) params.append('county', county);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Get published units error:', error);
    throw error;
  }
};

// Get my bids from API
export const getMyBidsAPI = async () => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API}/my-bids?user_id=${userId}`);
    return await response.json();
  } catch (error) {
    console.error('Get my bids error:', error);
    throw error;
  }
};

// Add to my bids via API
export const addToMyBidsAPI = async (unitId) => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API}/my-bids/add?unit_id=${unitId}&user_id=${userId}`, {
      method: 'POST'
    });
    return await response.json();
  } catch (error) {
    console.error('Add to my bids error:', error);
    throw error;
  }
};

// Remove from my bids via API
export const removeFromMyBidsAPI = async (unitId) => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API}/my-bids/${unitId}?user_id=${userId}`, {
      method: 'DELETE'
    });
    return await response.json();
  } catch (error) {
    console.error('Remove from my bids error:', error);
    throw error;
  }
};

// Get dashboard stats
export const getStats = async () => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API}/stats?user_id=${userId}`);
    return await response.json();
  } catch (error) {
    console.error('Get stats error:', error);
    throw error;
  }
};

// Get subscription tiers
export const getSubscriptionTiers = async () => {
  try {
    const response = await fetch(`${API}/subscription/tiers`);
    return await response.json();
  } catch (error) {
    console.error('Get tiers error:', error);
    throw error;
  }
};

// Create subscription order
export const createSubscriptionOrder = async (tier, returnUrl, cancelUrl) => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API}/subscription/create-order?user_id=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: tier,
        return_url: returnUrl,
        cancel_url: cancelUrl
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Create subscription order error:', error);
    throw error;
  }
};

// Capture subscription
export const captureSubscription = async (orderId) => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API}/subscription/capture/${orderId}?user_id=${userId}`, {
      method: 'POST'
    });
    const result = await response.json();
    if (result.tier) {
      setUserTier(result.tier);
    }
    return result;
  } catch (error) {
    console.error('Capture subscription error:', error);
    throw error;
  }
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (subscription) => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API}/notifications/subscribe?user_id=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        }
      })
    });
    setPushEnabled(true);
    return await response.json();
  } catch (error) {
    console.error('Subscribe to push error:', error);
    throw error;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async () => {
  try {
    const userId = getUserId();
    const response = await fetch(`${API}/notifications/unsubscribe?user_id=${userId}`, {
      method: 'DELETE'
    });
    setPushEnabled(false);
    return await response.json();
  } catch (error) {
    console.error('Unsubscribe from push error:', error);
    throw error;
  }
};

// Helper: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Check if unit is a hot deal based on settings
export const isHotDeal = (unit) => {
  const settings = getHotDealSettings();
  if (!settings.enabled) return false;
  
  const optimizer = unit?.optimizer_analysis;
  if (!optimizer || !optimizer.final_recommendation) return false;
  
  const hunter = unit?.hunter_analysis;
  const estimatedValue = hunter?.estimated_value?.mid || 0;
  const currentBid = hunter?.current_bid || 0;
  
  const profitRange = optimizer.final_recommendation.expected_profit || {};
  const expectedProfit = profitRange.mid || 0;
  const profitPercent = currentBid > 0 ? (expectedProfit / currentBid) * 100 : 0;
  
  return (
    profitPercent >= settings.minProfitPercent &&
    estimatedValue >= settings.minEstimatedValue &&
    currentBid <= settings.maxStartingBid
  );
};

export { STORAGE_KEYS, DEFAULT_SETTINGS, DEFAULT_HOT_DEAL_SETTINGS };
