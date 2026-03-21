import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LinkData, CsvResult } from '../types';

// ── helpers ──────────────────────────────────────────────────────────
const getDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const DEVICES = ['desktop', 'mobile', 'tablet'];
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge'];
const LOCATIONS = ['US', 'IN', 'DE', 'FR', 'BR', 'GB'];

const makeVisits = (base: number) =>
  Array.from({ length: 7 }).map((_, i) => ({
    date: getDaysAgo(6 - i),
    clicks: Math.max(1, Math.floor(Math.random() * (base / 7) * 1.5)),
    device: DEVICES[Math.floor(Math.random() * DEVICES.length)],
    browser: BROWSERS[Math.floor(Math.random() * BROWSERS.length)],
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
  }));

const SEED_LINKS: Omit<LinkData, 'userId'>[] = [
  {
    id: '1', alias: 'premium-dash', shortUrl: 'shrt.ly/premium-dash',
    originalUrl: 'https://github.com/your-username/premium-dashboard',
    clicks: 12450, lastVisited: getDaysAgo(0), recentVisits: makeVisits(12450),
    status: 'Active', expiryDate: null, createdAt: getDaysAgo(30),
  },
  {
    id: '2', alias: 'dribbble-saas', shortUrl: 'shrt.ly/dribbble-saas',
    originalUrl: 'https://dribbble.com/shots/12345-saas-dashboard-design',
    clicks: 4320, lastVisited: getDaysAgo(1), recentVisits: makeVisits(4320),
    status: 'Active', expiryDate: null, createdAt: getDaysAgo(20),
  },
  {
    id: '3', alias: 'q3-campaign', shortUrl: 'shrt.ly/q3-campaign',
    originalUrl: 'https://example.com/marketing/q3-campaign-results',
    clicks: 890, lastVisited: getDaysAgo(2), recentVisits: makeVisits(890),
    status: 'Active', expiryDate: getDaysAgo(-14), createdAt: getDaysAgo(15),
  },
  {
    id: '4', alias: 'legacy-page', shortUrl: 'shrt.ly/legacy-page',
    originalUrl: 'https://legacy-site.co/old/page',
    clicks: 15, lastVisited: getDaysAgo(45), recentVisits: makeVisits(15),
    status: 'Dormant', expiryDate: null, createdAt: getDaysAgo(90),
  },
  {
    id: '5', alias: 'series-a', shortUrl: 'shrt.ly/series-a',
    originalUrl: 'https://blog.startup.io/announcing-series-a',
    clicks: 25800, lastVisited: getDaysAgo(0), recentVisits: makeVisits(25800),
    status: 'Active', expiryDate: null, createdAt: getDaysAgo(7),
  },
  {
    id: '6', alias: 'old-promo', shortUrl: 'shrt.ly/old-promo',
    originalUrl: 'https://example.com/promotions/expired-deal',
    clicks: 340, lastVisited: getDaysAgo(20),
    recentVisits: makeVisits(340),
    status: 'Expired', expiryDate: getDaysAgo(5), createdAt: getDaysAgo(40),
  },
];

// ── Auth store ────────────────────────────────────────────────────────
interface AuthStore {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'auth-store' }
  )
);

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
  addFromCsv: (userId: string, rows: { originalUrl: string; alias?: string; expiryDate?: string }[]) => Promise<CsvResult[]>;
}

export const useLinksStore = create<LinksStore>()((set, get) => ({
  links: [],
  isLoading: false,

  fetchLinks: async (userId) => {
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 700));
    const seeded = SEED_LINKS.map((l) => ({ ...l, userId }));
    set({ links: seeded, isLoading: false });
  },

  addLink: async (userId, { originalUrl, alias, expiryDate }) => {
    // Uniqueness check
    const exists = get().links.some((l) => l.alias === alias);
    if (exists) throw new Error(`Alias "${alias}" is already taken`);

    await new Promise((r) => setTimeout(r, 400));
    const newLink: LinkData = {
      id: Date.now().toString(),
      alias,
      shortUrl: `shrt.ly/${alias}`,
      originalUrl,
      clicks: 0,
      lastVisited: new Date().toISOString(),
      recentVisits: makeVisits(0),
      status: 'Active',
      expiryDate: expiryDate ?? null,
      createdAt: new Date().toISOString(),
      userId,
    };
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
    await new Promise((r) => setTimeout(r, 300));
    set((s) => ({ links: s.links.filter((l) => l.id !== id) }));
  },

  addFromCsv: async (userId, rows) => {
    const results: CsvResult[] = [];
    for (const row of rows) {
      const alias = row.alias?.trim() || `csv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        const link = await get().addLink(userId, {
          originalUrl: row.originalUrl,
          alias,
          expiryDate: row.expiryDate || null,
        });
        results.push({ row: { originalUrl: row.originalUrl, alias }, success: true, shortUrl: link.shortUrl });
      } catch (e: unknown) {
        results.push({ row: { originalUrl: row.originalUrl, alias }, success: false, error: (e as Error).message });
      }
    }
    return results;
  },
}));
