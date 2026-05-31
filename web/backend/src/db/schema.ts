// Mirror of mobile/backend/src/db/schema.ts — keep in sync.
// This service reads the shared DB but never runs migrations.
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const localities = pgTable('localities', {
  id: text('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  nameHe: text('name_he').notNull(),
  nameEn: text('name_en').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
});

export const incidents = pgTable(
  'incidents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ref: text('ref').notNull().unique(),
    idempotencyKey: text('idempotency_key').unique(),
    deviceId: text('device_id').notNull(),
    category: text('category').notNull(),
    severity: text('severity').notNull(),
    description: text('description'),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    // geom (geography, generated stored) is in the DB but not tracked by Drizzle.
    // Use raw SQL for PostGIS queries: ST_DWithin(geom, ...).
    localityId: text('locality_id').references(() => localities.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'string' }),
    hidden: boolean('hidden').notNull().default(false),
    confirmations: integer('confirmations').notNull().default(0),
    denials: integer('denials').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
  },
  table => ({
    createdAtIdx: index('idx_incidents_created').on(table.createdAt),
  }),
);

export const votes = pgTable(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    incidentId: uuid('incident_id')
      .notNull()
      .references(() => incidents.id),
    deviceId: text('device_id').notNull(),
    vote: text('vote').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  table => ({
    uniqueVote: uniqueIndex('votes_incident_device_uidx').on(
      table.incidentId,
      table.deviceId,
    ),
  }),
);

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => incidents.id),
  deviceId: text('device_id').notNull(),
  emoji0: text('emoji0').notNull(),
  emoji1: text('emoji1').notNull(),
  emoji2: text('emoji2').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});

export const devices = pgTable('devices', {
  deviceId: text('device_id').primaryKey(),
  lastLat: doublePrecision('last_lat'),
  lastLng: doublePrecision('last_lng'),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deviceId: text('device_id').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    incidentRef: text('incident_ref'),
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  table => ({
    deviceCreatedIdx: index('idx_notifications_device').on(
      table.deviceId,
      table.createdAt,
    ),
  }),
);

export const followUps = pgTable('follow_ups', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentRef: text('incident_ref').notNull(),
  deviceId: text('device_id').notNull(),
  vehicle: text('vehicle'),
  assailants: text('assailants'),
  direction: text('direction'),
  weapon: text('weapon'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});
