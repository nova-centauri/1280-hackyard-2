'use client';
import { create } from 'zustand';
import type { HouseProfile, PlanResult, WeatherSeries } from '@/engine/types';
import { DEFAULT_PROFILE } from '@/engine/defaults';
import { coerceProfile } from '@/lib/validate';
import { unitsFromLocale } from '@/lib/units';

const LS_KEY = 'breezevibe:house';
const LS_TIME = 'breezevibe:updatedAt';

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface HouseStore {
  profile: HouseProfile;
  hydrated: boolean;
  saveState: SaveState;
  shareCode: string | null;
  weather: WeatherSeries | null;
  weatherError: string | null;
  weatherLoading: boolean;
  plan: PlanResult | null;
  /** Apply a partial deep update to the profile. */
  update: (patch: (p: HouseProfile) => HouseProfile) => void;
  replace: (p: HouseProfile) => void;
  hydrate: () => Promise<void>;
  fetchWeather: () => Promise<void>;
  share: () => Promise<string | null>;
  loadCode: (code: string) => Promise<boolean>;
  setPlan: (plan: PlanResult | null) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useHouse = create<HouseStore>((set, get) => ({
  profile: DEFAULT_PROFILE,
  hydrated: false,
  saveState: 'idle',
  shareCode: null,
  weather: null,
  weatherError: null,
  weatherLoading: false,
  plan: null,

  update: (patch) => {
    const next = patch(get().profile);
    set({ profile: next, shareCode: null });
    persist(next, set);
  },
  replace: (p) => {
    set({ profile: p, shareCode: null });
    persist(p, set);
  },
  setPlan: (plan) => set({ plan }),

  hydrate: async () => {
    // 1. localStorage for instant restore
    let local: HouseProfile | null = null;
    let localAt = 0;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) local = coerceProfile(JSON.parse(raw));
      localAt = Number(localStorage.getItem(LS_TIME) ?? 0);
    } catch { /* ignore */ }
    if (local) set({ profile: local });
    // 2. server copy wins if newer
    try {
      const r = await fetch('/api/house', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (j.house) {
          const serverAt = j.updatedAt ? Date.parse(j.updatedAt) : 0;
          if (!local || serverAt >= localAt) {
            const p = coerceProfile(j.house);
            set({ profile: p });
            try { localStorage.setItem(LS_KEY, JSON.stringify(p)); localStorage.setItem(LS_TIME, String(serverAt)); } catch { /* ignore */ }
          }
        }
      }
    } catch { /* offline is fine */ }
    if (!local && !get().profile.location) {
      set({ profile: { ...get().profile, units: unitsFromLocale() } });
    }
    set({ hydrated: true });
    if (get().profile.location) void get().fetchWeather();
  },

  fetchWeather: async () => {
    const loc = get().profile.location;
    if (!loc) return;
    set({ weatherLoading: true, weatherError: null });
    try {
      const r = await fetch(`/api/weather?lat=${loc.lat}&lon=${loc.lon}`);
      if (!r.ok) throw new Error(`weather ${r.status}`);
      set({ weather: await r.json(), weatherLoading: false });
    } catch (e) {
      set({ weatherError: String(e), weatherLoading: false });
    }
  },

  share: async () => {
    try {
      const r = await fetch('/api/share', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ house: get().profile }) });
      if (!r.ok) return null;
      const j = await r.json();
      set({ shareCode: j.code });
      return j.code as string;
    } catch {
      return null;
    }
  },

  loadCode: async (code) => {
    try {
      const r = await fetch(`/api/share/${encodeURIComponent(code)}`);
      if (!r.ok) return false;
      const j = await r.json();
      const p = coerceProfile(j.house);
      get().replace(p);
      set({ shareCode: j.code });
      if (p.location) void get().fetchWeather();
      return true;
    } catch {
      return false;
    }
  },
}));

function persist(p: HouseProfile, set: (s: Partial<HouseStore>) => void) {
  const now = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); localStorage.setItem(LS_TIME, String(now)); } catch { /* ignore */ }
  set({ saveState: 'saving' });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const r = await fetch('/api/house', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ house: p }) });
      set({ saveState: r.ok ? 'saved' : 'error' });
    } catch {
      set({ saveState: 'offline' });
    }
  }, 800);
}
