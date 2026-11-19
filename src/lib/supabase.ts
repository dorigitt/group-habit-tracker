import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** False until .env is filled in; the UI shows a setup banner instead of crashing. */
export const isConfigured = Boolean(url && key);

// During web pre-rendering (Node) there is no `window`, so skip persistent storage there.
const isServer = typeof window === 'undefined';

export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-anon-key', {
  auth: {
    storage: isServer ? undefined : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
