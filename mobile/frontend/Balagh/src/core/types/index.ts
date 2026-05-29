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
  lat: number;
  lng: number;
  localityId: string;
  createdAt: string;
  resolvedAt?: string;
  confirmations: number;
  denials: number;
  commentCount: number;
  myVote?: 'confirm' | 'deny' | null;
}

export interface Comment {
  id: string;
  incidentId: string;
  identityTag: [string, string, string];
  body: string;
  createdAt: string;
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

export interface StatusResponse {
  state: SafetyState;
  reason: string;
}

export type WsEvent =
  | { t: 'incident.created'; incident: Incident }
  | { t: 'incident.resolved'; id: string }
  | { t: 'status.changed'; state: SafetyState; reason: string }
  | { t: 'vote.updated'; id: string; confirmations: number; denials: number }
  | { t: 'notification.new'; notification: AppNotification };

export interface ApiError {
  code: string;
  message: string;
}
