import { Platform, Share } from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';

/** A link that opens the join screen with the code pre-filled (web: http://host/group/join?code=ABC123). */
export function inviteLink(code: string): string {
  return Linking.createURL('group/join', { queryParams: { code } });
}

export function inviteMessage(groupName: string, code: string): string {
  return `Join my group "${groupName}" on Group Habit Tracker!\n${inviteLink(code)}\nOr enter the code ${code} in the app.`;
}

export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}

/** Opens the system share sheet; on desktop browsers without one, copies the message instead. */
export async function shareInvite(groupName: string, code: string): Promise<'shared' | 'copied'> {
  const message = inviteMessage(groupName, code);
  const canShare = Platform.OS !== 'web' || (typeof navigator !== 'undefined' && !!(navigator as any).share);
  if (!canShare) {
    await copyText(message);
    return 'copied';
  }
  await Share.share({ message });
  return 'shared';
}
