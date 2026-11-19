import React from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, softShadow } from '@/lib/theme';

export function Screen({
  children, top = false, refreshing, onRefresh, scroll = true,
}: {
  children: React.ReactNode; top?: boolean; refreshing?: boolean; onRefresh?: () => void; scroll?: boolean;
}) {
  const edges = top ? (['top'] as const) : (['bottom'] as const);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 14 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 20 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={s.title}>{children}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({
  title, onPress, variant = 'primary', loading, disabled, small,
}: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  loading?: boolean; disabled?: boolean; small?: boolean;
}) {
  const bg = { primary: colors.primary, secondary: colors.primarySoft, danger: colors.dangerSoft, ghost: 'transparent', success: colors.successSoft }[variant];
  const fg = { primary: '#fff', secondary: colors.primary, danger: colors.danger, ghost: colors.primary, success: colors.success }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn, small && s.btnSmall,
        variant === 'primary' && !small && s.btnPrimaryShadow,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Input({ label, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput placeholderTextColor="#9CA3AF" style={[s.input, props.multiline && { minHeight: 84, textAlignVertical: 'top' }]} {...props} />
    </View>
  );
}

const BADGES: Record<string, { bg: string; fg: string }> = {
  COMPLETED: { bg: colors.successSoft, fg: colors.success },
  APPROVED: { bg: colors.successSoft, fg: colors.success },
  FAILED: { bg: colors.dangerSoft, fg: colors.danger },
  REJECTED: { bg: colors.dangerSoft, fg: colors.danger },
  MISSING: { bg: colors.dangerSoft, fg: colors.danger },
  SKIPPED: { bg: colors.warnSoft, fg: colors.warn },
  PENDING: { bg: colors.warnSoft, fg: colors.warn },
  LEADER: { bg: colors.primarySoft, fg: colors.primary },
  MEMBER: { bg: '#F1F2F6', fg: colors.muted },
};
export function Badge({ label, kind }: { label: string; kind?: string }) {
  const c = BADGES[kind ?? label] ?? BADGES.MEMBER;
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.primary, track = colors.border, height = 10 }: { value: number; color?: string; track?: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: track, borderRadius: 999, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height, backgroundColor: color, borderRadius: 999 }} />
    </View>
  );
}

export function Stat({ label, value, tint, icon }: { label: string; value: string | number; tint?: string; icon?: string }) {
  return (
    <View style={[s.card, { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, gap: 2 }]}>
      {icon ? <Text style={{ fontSize: 18 }}>{icon}</Text> : null}
      <Text style={{ fontSize: 24, fontWeight: '800', color: tint ?? colors.text }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: size * 0.4 }}>{(name || '?').charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function Empty({ text, icon = 'sparkles-outline' }: { text: string; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 22 }}>
      <Ionicons name={icon} size={28} color="#C4C8D4" />
      <Text style={{ color: colors.muted, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

export function ErrorText({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft, gap: 8 }}>
      <Text style={{ color: colors.danger }}>{error}</Text>
      {onRetry ? <Button title="Retry" variant="danger" small onPress={onRetry} /> : null}
    </Card>
  );
}

export function Loading() {
  return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
}

export function SectionTitle({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>{children}</Text>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  sub: { fontSize: 15, color: colors.muted },
  card: {
    backgroundColor: colors.card, borderRadius: radius, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 10, ...softShadow,
  },
  btn: { borderRadius: 14, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryShadow: {
    shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  btnSmall: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, flexGrow: 1 },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E6EE', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: colors.text,
  },
});
