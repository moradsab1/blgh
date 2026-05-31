import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Incident, Locality } from '../../lib/contracts';
import { pinSvg, pinColor } from './pinStyle';

interface Props {
  locality: Locality | null;
  incidents: Incident[];
  selectedId: string | null;
  onSelectIncident: (id: string) => void;
}

const TILE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function IncidentMap({ locality, incidents, selectedId, onSelectIncident }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  const flyToLocality = useCallback((loc: Locality) => {
    mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 800 });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_URL,
      center: locality ? [locality.lng, locality.lat] : [35.3, 32.7],
      zoom: locality ? 14 : 9,
      attributionControl: false,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to locality on change
  useEffect(() => {
    if (locality && mapRef.current) flyToLocality(locality);
  }, [locality, flyToLocality]);

  // Sync incident markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const existingIds = new Set(markersRef.current.keys());

    for (const incident of incidents) {
      existingIds.delete(incident.id);
      const isSelected = incident.id === selectedId;

      if (markersRef.current.has(incident.id)) {
        // Update existing marker element for selection state
        const marker = markersRef.current.get(incident.id)!;
        const el = marker.getElement();
        el.innerHTML = pinSvg(incident.severity, isSelected);
        el.style.cursor = 'pointer';
        continue;
      }

      const el = document.createElement('div');
      el.innerHTML = pinSvg(incident.severity, isSelected);
      el.style.cursor = 'pointer';
      el.style.width = '28px';
      el.style.height = '28px';
      el.addEventListener('click', () => onSelectIncident(incident.id));

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([incident.lng, incident.lat])
        .addTo(map);

      markersRef.current.set(incident.id, marker);
    }

    // Remove stale markers
    for (const staleId of existingIds) {
      markersRef.current.get(staleId)?.remove();
      markersRef.current.delete(staleId);
    }
  }, [incidents, selectedId, onSelectIncident]);

  // Center on selected incident
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const inc = incidents.find((i) => i.id === selectedId);
    if (inc) {
      mapRef.current.easeTo({ center: [inc.lng, inc.lat], zoom: 15, duration: 400 });
    }
  }, [selectedId, incidents]);

  // Add pulsing ring on selected pin color
  const selectedIncident = incidents.find((i) => i.id === selectedId);
  const selectedColor = selectedIncident ? pinColor(selectedIncident.severity) : 'transparent';

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      {selectedIncident && (
        <style>{`
          @keyframes ping {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(2.5); opacity: 0; }
          }
        `}</style>
      )}
      <div
        className="absolute bottom-4 start-4 text-xs text-text-muted bg-surface/80 rounded px-2 py-1"
        style={{ backdropFilter: 'blur(4px)' }}
      >
        {incidents.length} حادثة نشطة
      </div>
      {selectedIncident && (
        <div
          className="absolute bottom-4 end-4 h-3 w-3 rounded-full"
          style={{
            backgroundColor: selectedColor,
            boxShadow: `0 0 0 0 ${selectedColor}`,
            animation: 'ping 1.5s ease-out infinite',
          }}
        />
      )}
    </div>
  );
}
