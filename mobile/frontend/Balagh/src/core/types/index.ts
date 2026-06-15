export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Category = 'GUNFIRE' | 'STABBING' | 'ASSAULT' | 'ROBBERY' | 'SUSPICIOUS' | 'OTHER';
export type SafetyState = 'calm' | 'watch' | 'active';
export type AppLanguage = 'ar' | 'he' | 'en';

export interface Locality {
  id: string;
  nameAr: string;
  nameHe: string;
  nameEn: string;
  lat: number;
  lng: number;
}

export interface Incident {
  id: string;
  ref: string;
  category: Category;
  severity: Severity;
  description?: string;
  /** Optional free-text place description typed by the reporter (§5.13). */
  locationText?: string;
  lat: number;
  lng: number;
  localityId: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AppNotification {
  id: string;
  type: 'nearby' | 'verification' | 'status' | 'follow_up';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  incidentRef?: string;
}

// Feeds screen content — organization announcements/events and curated news
// about violence in the Arab community. Not tied to a map location.
export type FeedPostKind = 'announcement' | 'news';

export interface FeedPost {
  id: string;
  kind: FeedPostKind;
  source: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface StatusResponse {
  state: SafetyState;
  reason: string;
}

export type WsEvent =
  | { t: 'incident.created'; incident: Incident }
  | { t: 'incident.resolved'; id: string }
  | { t: 'status.changed'; state: SafetyState; reason: string }
  | { t: 'notification.new'; notification: AppNotification };

export interface ApiError {
  code: string;
  message: string;
}
