import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './auth';
import { getMyGroups } from './api';
import type { Group } from './types';

interface GroupsCtx {
  groups: Group[];
  current: Group | null;
  loading: boolean;
  setCurrent: (id: string) => void;
  refresh: () => Promise<void>;
}
const Ctx = createContext<GroupsCtx | null>(null);
const KEY = 'ght.currentGroup';

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setGroups([]); return; }
    setLoading(true);
    try { setGroups(await getMyGroups(user.id)); } catch { /* shown by screens on their own queries */ }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => v && setCurrentId(v)); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const current = groups.find((g) => g.id === currentId) ?? groups[0] ?? null;
  const setCurrent = (id: string) => { setCurrentId(id); AsyncStorage.setItem(KEY, id); };

  return <Ctx.Provider value={{ groups, current, loading, setCurrent, refresh }}>{children}</Ctx.Provider>;
}

export function useGroups(): GroupsCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGroups must be used inside GroupsProvider');
  return v;
}
