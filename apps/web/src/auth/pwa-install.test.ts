import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canPromptInstall,
  isIosDevice,
  listenForInstallPrompt,
  promptInstall,
  requestNotificationPermission,
  resetInstallPromptForTests,
  shouldShowIosInstallHelp,
  type BeforeInstallPromptEvent,
} from './pwa-install';

describe('pwa install helpers', () => {
  afterEach(() => {
    resetInstallPromptForTests();
    vi.unstubAllGlobals();
  });

  it('detects iOS user agents', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(
      false
    );
  });

  it('captures a deferred install prompt', async () => {
    listenForInstallPrompt();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    event.preventDefault = vi.fn();

    window.dispatchEvent(event);

    expect(canPromptInstall()).toBe(true);
    await expect(promptInstall()).resolves.toBe('accepted');
    expect(prompt).toHaveBeenCalledOnce();
    expect(canPromptInstall()).toBe(false);
  });

  it('returns unsupported when Notification is missing', async () => {
    vi.stubGlobal('Notification', undefined);
    await expect(requestNotificationPermission()).resolves.toBe('unsupported');
  });

  it('shows iOS install help when not standalone', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    );
    expect(shouldShowIosInstallHelp()).toBe(true);
  });
});
