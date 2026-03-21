export interface VisitRecord {
  date: string;
  clicks: number;
  device?: string;      // 'mobile' | 'tablet' | 'desktop'
  browser?: string;
  location?: string;
}

export interface LinkData {
  id: string;
  shortUrl: string;
  alias: string;        // custom alias part e.g. "my-url"
  originalUrl: string;
  clicks: number;
  lastVisited: string;
  recentVisits: VisitRecord[];
  status: 'Active' | 'Dormant' | 'Expired';
  expiryDate?: string | null;  // ISO date string or null
  createdAt: string;
  userId: string;       // owner
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: 'google' | 'credentials';
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export interface CsvRow {
  originalUrl: string;
  alias?: string;
  expiryDate?: string;
}

export interface CsvResult {
  row: CsvRow;
  success: boolean;
  shortUrl?: string;
  error?: string;
}

export type DeviceBreakdown = { device: string; count: number }[];
export type LocationBreakdown = { location: string; count: number }[];
