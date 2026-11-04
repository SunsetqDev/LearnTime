export type NotifyPermission = NotificationPermission | 'unsupported';

export function notifyPermission(): NotifyPermission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/**
 * Показываем через Service Worker, если он есть: на Android обычный `new Notification`
 * не работает, а уведомление от SW появляется даже при свёрнутом браузере.
 */
export async function notify(title: string, body: string): Promise<void> {
  if (notifyPermission() !== 'granted') return;
  const options: NotificationOptions = {
    body,
    tag: 'focus-session',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
  };
  try {
    const reg =
      'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch {
    // Уведомление — приятное дополнение, его отсутствие не должно ломать таймер.
  }
}
