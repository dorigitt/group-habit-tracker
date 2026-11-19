import { useState } from 'react';
import { Alert, Image, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import { colors } from '@/lib/theme';

export default function Proof() {
  const { assignmentId, groupId, habit } = useLocalSearchParams<{ assignmentId: string; groupId: string; habit: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (camera: boolean) => {
    setError(null);
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError('Permission denied. Enable it in Settings to attach a photo.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) setUri(res.assets[0].uri);
  };

  const submit = async () => {
    if (!uri || !user) return;
    setBusy(true); setError(null);
    try {
      const path = await api.uploadProof(groupId, user.id, assignmentId, uri);
      await api.submitCheckIn(assignmentId, 'COMPLETED', path);
      Alert.alert('Submitted', 'Your check-in is recorded. A group leader will review your proof (status: PENDING).');
      router.back();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Title sub="This habit needs a photo as evidence.">{habit ?? 'Proof'}</Title>
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: 320, borderRadius: 16 }} resizeMode="cover" /> : (
        <Card><Text style={{ color: colors.muted, textAlign: 'center' }}>No photo selected yet</Text></Card>
      )}
      <Button title="Take a photo" variant="secondary" onPress={() => pick(true)} />
      <Button title="Choose from gallery" variant="secondary" onPress={() => pick(false)} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Text style={{ color: colors.muted, fontSize: 12 }}>The photo is stored privately. Only you and the group leader can see it.</Text>
      <Button title="Submit check-in with proof" onPress={submit} loading={busy} disabled={!uri} />
    </Screen>
  );
}
