import { Alert, Platform } from 'react-native';

// react-native-web ignores Alert.alert, so map it to the browser's dialogs.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  (Alert as any).alert = (title: string, message?: string, buttons?: any[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    const ok = window.confirm(text);
    const cancel = buttons.find((b) => b.style === 'cancel') ?? buttons[0];
    const target = ok ? buttons[buttons.length - 1] : cancel;
    target?.onPress?.();
  };
}
