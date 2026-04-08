import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { 
  getAppConfig, 
  subscribeToPushNotifications, 
  unsubscribeFromPush,
  isPushEnabled,
  getUserTier 
} from '../lib/storage';
import { toast } from 'sonner';

export const PushNotificationToggle = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);
  const [vapidKey, setVapidKey] = useState('');
  const [tier, setTier] = useState('free');

  useEffect(() => {
    checkSupport();
    loadConfig();
    setTier(getUserTier());
  }, []);

  const checkSupport = () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
      return;
    }
    setEnabled(isPushEnabled());
  };

  const loadConfig = async () => {
    try {
      const config = await getAppConfig();
      setVapidKey(config.vapid_public_key || '');
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleToggle = async (newValue) => {
    if (tier === 'free') {
      toast.error('Push notifications require Pro or Enterprise plan');
      return;
    }

    setLoading(true);
    try {
      if (newValue) {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Notification permission denied');
          setLoading(false);
          return;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw-push.js');
        await navigator.serviceWorker.ready;

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });

        // Send to server
        await subscribeToPushNotifications(subscription);
        setEnabled(true);
        toast.success('Push notifications enabled!');
      } else {
        // Unsubscribe
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        }
        await unsubscribeFromPush();
        setEnabled(false);
        toast.success('Push notifications disabled');
      }
    } catch (error) {
      console.error('Push toggle error:', error);
      toast.error('Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="flex items-center justify-between p-4 bg-[#0B1121] rounded-lg border border-[#1E293B]">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-slate-500" />
          <div>
            <Label className="text-slate-300">Push Notifications</Label>
            <p className="text-xs text-slate-500">Not supported in this browser</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-[#0B1121] rounded-lg border border-[#1E293B]">
      <div className="flex items-center gap-3">
        {enabled ? (
          <Bell className="w-5 h-5 text-emerald-400" />
        ) : (
          <BellOff className="w-5 h-5 text-slate-500" />
        )}
        <div>
          <Label className="text-slate-300">Push Notifications</Label>
          <p className="text-xs text-slate-500">
            {tier === 'free' ? 'Upgrade to Pro for alerts' : 'Get hot deal alerts'}
          </p>
        </div>
      </div>
      
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
      ) : (
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={tier === 'free'}
          data-testid="push-toggle"
        />
      )}
    </div>
  );
};

export default PushNotificationToggle;
