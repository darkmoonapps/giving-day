export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listening = false;

function isBeforeInstallPromptEvent(
  event: Event
): event is BeforeInstallPromptEvent {
  return 'prompt' in event;
}

export function listenForInstallPrompt(): void {
  if (listening || typeof window === 'undefined') {
    return;
  }

  listening = true;
  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    if (isBeforeInstallPromptEvent(event)) {
      deferredPrompt = event;
    }
  });
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  if (deferredPrompt === null) {
    return 'unavailable';
  }

  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  return choice.outcome;
}

export function isIosDevice(userAgent: string = navigator.userAgent): boolean {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export function isStandaloneDisplay(): boolean {
  const mediaStandalone = window.matchMedia(
    '(display-mode: standalone)'
  ).matches;
  const navigatorStandalone =
    'standalone' in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mediaStandalone || navigatorStandalone;
}

export function shouldShowIosInstallHelp(): boolean {
  return isIosDevice() && !isStandaloneDisplay();
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (
    typeof Notification === 'undefined' ||
    typeof Notification.requestPermission !== 'function'
  ) {
    return 'unsupported';
  }

  return Notification.requestPermission();
}

export function resetInstallPromptForTests(): void {
  deferredPrompt = null;
  listening = false;
}
