
"use client";

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// It's good practice to store your VAPID public key in an environment variable
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
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
}

export default function ServiceWorkerRegistrar() {
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
          
          // Request notification permission once SW is registered
          requestNotificationPermission(registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
          toast({
            title: "Offline Features Unavailable",
            description: "Could not register service worker. Some features might not work.",
            variant: "destructive"
          });
        });
    } else {
      console.warn('Service Worker or PushManager not supported in this browser.');
    }
  }, [toast]);

  const requestNotificationPermission = async (registration: ServiceWorkerRegistration) => {
    if (!VAPID_PUBLIC_KEY) {
      console.error("VAPID public key is not defined. Push notifications will not work.");
      toast({
        title: "Push Setup Incomplete",
        description: "Push notification configuration is missing (VAPID key).",
        variant: "destructive"
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        toast({
          title: "Notifications Enabled!",
          description: "You'll now receive updates.",
        });
        
        // Get Push Subscription
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        console.log('Push Subscription:', JSON.stringify(subscription));
        toast({
          title: "Push Subscription Successful",
          description: "Subscription details logged to console. Send this to your backend.",
          duration: 10000, // Show longer
        });
        // TODO: Send this subscription object to your backend server to store it.
        // Example: await fetch('/api/save-subscription', { method: 'POST', body: JSON.stringify(subscription), headers: {'Content-Type': 'application/json'} });

      } else {
        console.log('Notification permission denied.');
        toast({
          title: "Notifications Denied",
          description: "You won't receive push notifications.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission or subscribing:', error);
      toast({
        title: "Notification Error",
        description: "Could not set up notifications. Check console.",
        variant: "destructive"
      });
    }
  };

  return null; // This component doesn't render anything visible
}
