import { create } from 'zustand';
import type { User, LinkData } from '../types';

// ── Analytics types ────────────────────────────────────────────────────
export type AnalyticsRange = '1d' | '7d' | '1m' | '1y';

export interface AnalyticsData {
  total_clicks: number;
  unique_visitors: number;
  previous_period_clicks: number;
  last_visited: string | null;
  created_at: string;
  daily_trend: { date: string; clicks: number }[];
  device_breakdown: { device: string; count: number }[];
  location_breakdown: { country: string; count: number }[];
  recent_history: { date: string; device: string; location: string }[];
}



// ── Auth store ────────────────────────────────────────────────────────
interface AuthStore {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  verifySession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => {
    set({ user: null });
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token'); // Clear stale legacy tokens
    localStorage.removeItem('auth-store'); // Clear stale legacy Zustand caches
  },
  verifySession: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null });
      return false;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Session invalid');
      const { data } = await res.json();
      set({ 
        user: {
          id: data.user.id,
          name: data.user.email.split('@')[0],
          email: data.user.email,
          avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(data.user.email)}`,
          provider: 'credentials'
        }
      });
      return true;
    } catch {
      set({ user: null });
      localStorage.removeItem('token');
      return false;
    }
  }
}));

// ── Links store ───────────────────────────────────────────────────────
interface LinksStore {
  links: LinkData[];
  isLoading: boolean;
  fetchLinks: (userId: string) => Promise<void>;
  addLink: (userId: string, data: {
    originalUrl: string;
    alias: string;
    expiryDate?: string | null;
  }) => Promise<LinkData>;
  updateLink: (id: string, data: { originalUrl: string; expiryDate?: string | null }) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  fetchAnalytics: (linkId: string, range?: AnalyticsRange, date?: string) => Promise<AnalyticsData>;
}

const API = `${import.meta.env.VITE_API_URL}/api`;
const getToken = () => localStorage.getItem('token') ?? '';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

/** Map backend URL row → frontend LinkData */
const mapUrl = (row: Record<string, unknown>): LinkData => {
  const isExpired = row.expires_at && new Date(row.expires_at as string) < new Date();
  const clicks = (row.clicks as number) ?? 0;
  // No updated_at column in urls table — use created_at as neutral fallback.
  // Real last_visited is fetched from the analytics API (MAX clicks.timestamp).
  const lastVisited = row.created_at as string;
  const status: LinkData['status'] = isExpired
    ? 'Expired'
    : clicks === 0
      ? 'Dormant'
      : 'Active';
  return {
    id: row.id as string,
    alias: row.short_code as string,
    shortUrl: row.short_url as string,
    originalUrl: row.original_url as string,
    clicks,
    lastVisited,
    recentVisits: [],
    status,
    expiryDate: (row.expires_at as string) ?? null,
    createdAt: row.created_at as string,
    userId: row.user_id as string,
  };
};

export const useLinksStore = create<LinksStore>()((set) => ({
  links: [],
  isLoading: false,

  fetchLinks: async (_userId) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/url`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch links');
      const data: Record<string, unknown>[] = await res.json();
      set({ links: data.map(mapUrl), isLoading: false });
    } catch {
      set({ isLoading: false });
      throw new Error('Failed to load links');
    }
  },

  addLink: async (_userId, { originalUrl, alias, expiryDate }) => {
    const res = await fetch(`${API}/url`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        original_url: originalUrl,
        custom_alias: alias?.trim() || undefined, // omit if empty → backend auto-generates
        expiry_date: expiryDate || undefined,
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || body.error || 'Failed to create URL');

    // Backend now returns { success, message, data: { ...urlRow } }
    const newLink = mapUrl(body.data ?? body);
    set((s) => ({ links: [newLink, ...s.links] }));
    return newLink;
  },

  updateLink: async (id, { originalUrl, expiryDate }) => {
    await new Promise((r) => setTimeout(r, 300));
    set((s) => ({
      links: s.links.map((l) =>
        l.id === id ? { ...l, originalUrl, expiryDate: expiryDate ?? l.expiryDate } : l
      ),
    }));
  },

  deleteLink: async (id) => {
    const res = await fetch(`${API}/url/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.message || body.error || 'Failed to delete URL');
    }
    set((s) => ({ links: s.links.filter((l) => l.id !== id) }));
  },

  fetchAnalytics: async (linkId, range = '7d', date?: string) => {
    let url = `${API}/url/${linkId}/analytics?range=${range}`;
    if (date) url += `&date=${date}`;
    const res = await fetch(url, { headers: authHeaders() });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || 'Failed to fetch analytics');
    return body.data as AnalyticsData;
  },
}));
