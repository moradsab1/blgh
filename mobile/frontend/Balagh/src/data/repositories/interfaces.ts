import type {
  Incident,
  Comment,
  AppNotification,
  Locality,
  StatusResponse,
} from '../../core/types';

export interface IIncidentRepository {
  getIncidents(lat: number, lng: number, radiusKm: number): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident>;
  submitReport(
    category: string,
    lat: number,
    lng: number,
    description?: string,
  ): Promise<{ id: string; ref: string }>;
  vote(incidentId: string, vote: 'confirm' | 'deny'): Promise<Incident>;
  getComments(incidentId: string): Promise<Comment[]>;
  addComment(incidentId: string, body: string): Promise<Comment>;
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
