import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../../db/client';
import type { Locality } from '../../lib/contracts';

interface QueryRow {
  id: string;
  name_ar: string;
  name_he: string;
  name_en: string;
  lat: number;
  lng: number;
}

function toLocality(row: QueryRow): Locality {
  return {
    id: row.id,
    nameAr: row.name_ar,
    nameHe: row.name_he,
    nameEn: row.name_en,
    lat: row.lat,
    lng: row.lng,
  };
}

const localitiesRoutes: FastifyPluginAsync = async app => {
  app.get<{ Querystring: { q?: string } }>(
    '/localities',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: { q: { type: 'string' } },
        },
      },
    },
    async request => {
      const q = request.query.q?.trim();

      if (!q) {
        const { rows } = await pool.query<QueryRow>(
          'SELECT id, name_ar, name_he, name_en, lat, lng FROM localities ORDER BY name_en',
        );
        return rows.map(toLocality);
      }

      // Trigram ILIKE — backed by GIN gin_trgm_ops indexes
      const { rows } = await pool.query<QueryRow>(
        `SELECT id, name_ar, name_he, name_en, lat, lng
         FROM localities
         WHERE name_ar ILIKE $1
            OR name_he ILIKE $1
            OR name_en ILIKE $1
         ORDER BY name_en`,
        [`%${q}%`],
      );
      return rows.map(toLocality);
    },
  );
};

export default localitiesRoutes;
