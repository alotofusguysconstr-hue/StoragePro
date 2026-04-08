// LocalStorage utility functions for StorageHunter Pro

const STORAGE_KEYS = {
  ADMIN_PIN: 'sh_admin_pin',
  SETTINGS: 'sh_settings',
  UNITS: 'sh_units',
  MY_BIDS: 'sh_my_bids',
  PUBLISH_QUEUE: 'sh_publish_queue',
  HOT_DEAL_SETTINGS: 'sh_hot_deal_settings',
  IS_ADMIN_UNLOCKED: 'sh_admin_unlocked',
};

// Default settings
const DEFAULT_SETTINGS = {
  defaultState: '',
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

// Units functions
export const getUnits = () => getItem(STORAGE_KEYS.UNITS, []);
export const setUnits = (units) => setItem(STORAGE_KEYS.UNITS, units);
export const addUnit = (unit) => {
  const units = getUnits();
  const newUnit = { ...unit, id: Date.now().toString(), createdAt: new Date().toISOString() };
  units.push(newUnit);
  setUnits(units);
  return newUnit;
};

// My Bids functions
export const getMyBids = () => getItem(STORAGE_KEYS.MY_BIDS, []);
export const setMyBids = (bids) => setItem(STORAGE_KEYS.MY_BIDS, bids);
export const addToMyBids = (unit) => {
  const bids = getMyBids();
  if (!bids.find(b => b.id === unit.id)) {
    bids.push({ ...unit, addedAt: new Date().toISOString() });
    setMyBids(bids);
  }
  return bids;
};
export const removeFromMyBids = (unitId) => {
  const bids = getMyBids().filter(b => b.id !== unitId);
  setMyBids(bids);
  return bids;
};

// Publish Queue functions
export const getPublishQueue = () => getItem(STORAGE_KEYS.PUBLISH_QUEUE, []);
export const setPublishQueue = (queue) => setItem(STORAGE_KEYS.PUBLISH_QUEUE, queue);
export const addToPublishQueue = (unit) => {
  const queue = getPublishQueue();
  if (!queue.find(u => u.id === unit.id)) {
    queue.push({ ...unit, queuedAt: new Date().toISOString() });
    setPublishQueue(queue);
  }
  return queue;
};
export const removeFromPublishQueue = (unitId) => {
  const queue = getPublishQueue().filter(u => u.id !== unitId);
  setPublishQueue(queue);
  return queue;
};

// Check if unit qualifies as hot deal
export const isHotDeal = (unit) => {
  const settings = getHotDealSettings();
  if (!settings.enabled) return false;
  
  const profitPercent = unit.estimatedValue > 0 
    ? ((unit.estimatedValue - unit.startingBid) / unit.startingBid) * 100 
    : 0;
  
  return (
    profitPercent >= settings.minProfitPercent &&
    unit.estimatedValue >= settings.minEstimatedValue &&
    unit.startingBid <= settings.maxStartingBid
  );
};

// Get hot deals from units
export const getHotDeals = () => {
  const units = getUnits();
  return units.filter(isHotDeal);
};

export { STORAGE_KEYS, DEFAULT_SETTINGS, DEFAULT_HOT_DEAL_SETTINGS };
