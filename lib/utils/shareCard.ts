import * as Sharing from 'expo-sharing';
import { Alert, Linking, Platform } from 'react-native';
import type ViewShot from 'react-native-view-shot';

type CaptureOptions = {
  saveToLibrary?: boolean;
  instagramStory?: boolean;
};

async function trySaveToCameraRoll(uri: string): Promise<void> {
  try {
    const CameraRoll = require('@react-native-camera-roll/camera-roll');
    await CameraRoll.CameraRoll.save(uri, { type: 'photo' });
  } catch {
    /* camera-roll not available or permission denied — continue to share sheet */
  }
}

async function tryInstagramStory(uri: string): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }
  const igUrl = 'instagram-stories://share';
  const canOpen = await Linking.canOpenURL(igUrl).catch(() => false);
  if (!canOpen) {
    return false;
  }
  try {
    if (Platform.OS === 'ios') {
      const pasteboardUri = `file://${uri}`;
      await Linking.openURL(
        `instagram-stories://share?source_application=routeflow&backgroundImage=${encodeURIComponent(pasteboardUri)}`,
      );
      return true;
    }
    await Linking.openURL(igUrl);
    return true;
  } catch {
    return false;
  }
}

export async function captureAndShare(
  viewRef: React.RefObject<ViewShot | null>,
  options: CaptureOptions = {},
): Promise<string | null> {
  const uri = await viewRef.current?.capture?.();
  if (!uri) {
    return null;
  }

  if (options.saveToLibrary) {
    await trySaveToCameraRoll(uri);
  }

  if (options.instagramStory) {
    const opened = await tryInstagramStory(uri);
    if (opened) {
      return uri;
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/png' });
  }

  return uri;
}

export type ShareFormat = 'story' | 'square' | 'link';

export function showShareFormatSheet(
  t: (key: string) => string,
  onPick: (format: ShareFormat) => void,
): void {
  Alert.alert(t('shareTitle'), t('sharePickFormat'), [
    { text: t('shareStory'), onPress: () => onPick('story') },
    { text: t('shareSquare'), onPress: () => onPick('square') },
    { text: t('shareLink'), onPress: () => onPick('link') },
    { text: t('cancel'), style: 'cancel' },
  ]);
}
