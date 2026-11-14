import { DEMO_USER_ID } from '@/lib/demo';
import { loadDemoEntries } from '@/lib/demo-entries';
import { defaultProfile } from '@/lib/profile';
import { platformService } from '@/services/platform.service';
import { DEFAULT_SETTINGS } from '@/services/settings.service';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore, welcomeMessage } from '@/store/chat-store';
import { resetCreditStore, useCreditStore } from '@/store/credit-store';
import { useFarmStore } from '@/store/farm-store';
import { useApplicationsStore } from '@/store/applications-store';
import { useLoanStore } from '@/store/loan-store';
import { useProfileStore } from '@/store/profile-store';
import { useSettingsStore } from '@/store/settings-store';
import { useUiStore } from '@/store/ui-store';
import { useModalStore } from '@/store/modal-store';
import { initialPlatformState, usePlatformStore } from '@/store/platform-store';
import { useSubscriptionStore } from '@/store/subscription-store';
import { ApiError, isSignedOut } from '@/services/api';

export {
  useAuthStore,
  useChatStore,
  useFarmStore,
  usePlatformStore,
  useProfileStore,
  useSettingsStore,
};

/** Core farm/profile/settings are required; optional services fail within their own sections. */
export async function loadAllStores(userId: string): Promise<void> {
  const results = await Promise.allSettled([
    useFarmStore.getState().load(userId),
    useProfileStore.getState().load(userId),
    useChatStore.getState().load(userId),
    useSettingsStore.getState().load(userId),
    useLoanStore.getState().load(userId),
    useCreditStore.getState().load(userId),
    usePlatformStore.getState().load(userId),
    useSubscriptionStore.getState().load(userId),
  ]);
  for (const result of results) {
    if (
      result.status === 'rejected' &&
      (isSignedOut(result.reason) ||
        (result.reason instanceof ApiError && result.reason.code === 'maintenance'))
    )
      throw result.reason;
  }
  for (const index of [0, 1, 3]) {
    const result = results[index];
    if (result.status === 'rejected') throw result.reason;
  }
}

/**
 * The guest demo (lib/demo.ts): no account. The farm store opens with the entries the guest
 * added earlier today (this browser only), every other store empty and ready, and only the
 * platform's public information (lenders, prices, plans, content) is read.
 */
export async function loadDemoStores(): Promise<void> {
  const userId = DEMO_USER_ID;
  const snapshot = await platformService.load();
  // What the guest added earlier today, kept in this browser for the demo's day.
  const { records, momo } = loadDemoEntries();
  useFarmStore.setState({ userId, records, momo, diagnoses: [], status: 'ready' });
  // Only a label: the demo has no farmer behind it.
  useProfileStore.setState({
    userId,
    profile: { ...defaultProfile(userId), name: 'Guest' },
    status: 'ready',
  });
  useSettingsStore.setState({
    userId,
    language: DEFAULT_SETTINGS.language,
    notifications: DEFAULT_SETTINGS.notifications,
    status: 'ready',
  });
  useChatStore.setState({ userId, messages: [welcomeMessage()], isTyping: false, status: 'ready' });
  useLoanStore.setState({ userId, applications: [], status: 'ready' });
  useSubscriptionStore.setState({ userId, snapshot: null, status: 'ready' });
  usePlatformStore.setState({
    ...snapshot,
    userId,
    dismissed: [],
    verifications: [],
    underReview: false,
    status: 'ready',
    flagsStatus: 'ready',
  });
}

/**
 * Reloads the farmer's data in place, with no loading state: another tab changed it.
 * (The platform store has its own refresh(); it is kept in step separately.)
 */
export async function refreshUserStores(userId: string): Promise<void> {
  const silent = { silent: true };
  await Promise.all([
    useFarmStore.getState().load(userId, silent),
    useProfileStore.getState().load(userId, silent),
    useChatStore.getState().load(userId, silent),
    useSettingsStore.getState().load(userId, silent),
    useLoanStore.getState().load(userId, silent),
    useCreditStore.getState().load(userId, silent),
    useSubscriptionStore.getState().load(userId, silent),
  ]);
}

/** Empties every in-memory store, so no data from the previous user is left behind. */
export function resetAllStores(): void {
  useModalStore.getState().closeModal();
  useFarmStore.setState({ userId: null, records: [], momo: [], diagnoses: [], status: 'idle' });
  useProfileStore.setState({ userId: null, profile: null, status: 'idle' });
  useSubscriptionStore.setState({ userId: null, snapshot: null, status: 'idle' });
  useChatStore.setState({ userId: null, messages: [], isTyping: false, status: 'idle' });
  useSettingsStore.setState({
    userId: null,
    language: DEFAULT_SETTINGS.language,
    notifications: DEFAULT_SETTINGS.notifications,
    status: 'idle',
  });
  useUiStore.setState({ mobileNavOpen: false });
  usePlatformStore.setState(initialPlatformState());
  useLoanStore.setState({
    userId: null,
    applications: [],
    status: 'idle',
    tab: null,
    confirm: null,
    ghanaCardOpen: false,
  });
  useApplicationsStore.getState().reset();
  resetCreditStore();
}

/**
 * Clears every store when it still holds another account's data, e.g. the demo guest's after
 * the guest signs in or creates an account: the farmer starts from their own (fresh) data, and
 * a load that fails can never leave the guest's records on screen. The platform's feature flags
 * are the same for everyone, so they are kept.
 */
export function forgetOtherAccount(userId: string): void {
  const owners = [
    useFarmStore.getState().userId,
    useProfileStore.getState().userId,
    useChatStore.getState().userId,
    useSettingsStore.getState().userId,
    useLoanStore.getState().userId,
    useCreditStore.getState().userId,
    useSubscriptionStore.getState().userId,
    usePlatformStore.getState().userId,
  ];
  if (owners.every((owner) => !owner || owner === userId)) return;
  const { flags, flagsStatus } = usePlatformStore.getState();
  resetAllStores();
  usePlatformStore.setState({ flags, flagsStatus });
}

/** Ends the session (clears it and the proxy cookie), then wipes the in-memory stores. */
export async function signOutAndReset(): Promise<void> {
  await useAuthStore.getState().signOut();
  resetAllStores();
}
