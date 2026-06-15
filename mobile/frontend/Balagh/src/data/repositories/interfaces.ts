import type {
  Incident,
  AppNotification,
  Locality,
  StatusResponse,
} from '../../core/types';

export interface IIncidentRepository {
  /** Currently open incidents only — the backend closes pins after 24 h. */
  getIncidents(lat: number, lng: number, radiusKm: number): Promise<Incident[]>;
  /** Incident history (incl. resolved) within a time range, optionally per locality. */
  getIncidentHistory(rangeHours: number, localityId?: string): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident>;
  submitReport(
    category: string,
    lat: number,
    lng: number,
    description?: string,
    locationText?: string,
  ): Promise<{ id: string; ref: string }>;
}

export interface INotificationRepository {
  getNotifications(): Promise<AppNotification[]>;
  markRead(ids: string[]): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface ILocalityRepository {
  searchLocalities(query: string): Promise<Locality[]>;
}

export interface IStatusRepository {
  getStatus(lat: number, lng: number): Promise<StatusResponse>;
}
