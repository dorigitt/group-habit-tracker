import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

const W = 390;
const H = 844;
const BEZEL = 12;
const clock = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false });

function Clock() {
  const [t, setT] = useState(clock());
  useEffect(() => {
    const i = setInterval(() => setT(clock()), 15000);
    return () => clearInterval(i);
  }, []);
  return <Text style={styles.time}>{t}</Text>;
}

/** On a desktop browser, shows the app inside a phone. On real phones (and narrow windows) it renders the app as-is. */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < 520) return <>{children}</>;

  const phoneH = Math.min(H, height - 48);
  const outerW = W + BEZEL * 2;
  return (
    <View style={[styles.stage, { height }]}>
      <View style={[styles.device, { width: outerW, height: phoneH + BEZEL * 2 }]}>
        {/* side buttons */}
        <View style={[styles.btn, { left: -4, top: 120, height: 32 }]} />
        <View style={[styles.btn, { left: -4, top: 170, height: 56 }]} />
        <View style={[styles.btn, { left: -4, top: 240, height: 56 }]} />
        <View style={[styles.btn, { right: -4, top: 190, height: 84 }]} />

        <View style={styles.screen}>
          <View style={styles.statusBar}>
            <Clock />
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Ionicons name="cellular" size={16} color="#111" />
              <Ionicons name="wifi" size={16} color="#111" />
              <Ionicons name="battery-full" size={22} color="#111" />
            </View>
          </View>
          <View style={{ flex: 1 }}>{children}</View>
          <View style={styles.homeBarWrap}>
            <View style={styles.homeBar} />
          </View>
        </View>
        <View style={[styles.island, { left: (outerW - 110) / 2 - BEZEL }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: '100%', backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  device: {
    backgroundColor: '#111',
    borderRadius: 58,
    padding: BEZEL,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
  },
  btn: { position: 'absolute', width: 4, borderRadius: 2, backgroundColor: '#2A2A2E' },
  screen: { flex: 1, borderRadius: 46, overflow: 'hidden', backgroundColor: colors.bg },
  statusBar: {
    height: 50, paddingHorizontal: 30, paddingTop: 14, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg,
  },
  time: { fontSize: 15, fontWeight: '700', color: '#111' },
  island: { position: 'absolute', top: BEZEL + 11, width: 110, height: 30, borderRadius: 15, backgroundColor: '#000' },
  homeBarWrap: { height: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  homeBar: { width: 130, height: 5, borderRadius: 3, backgroundColor: '#111' },
});
