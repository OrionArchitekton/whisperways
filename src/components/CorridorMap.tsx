"use client";

import type { Feature, FeatureCollection } from "geojson";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import gridJson from "../data/la-grid.json";
import type { Vertiport } from "@/lib/la";

interface Props {
  directLine: [number, number][];
  quietLine: [number, number][];
  vertiports: Vertiport[];
  fromId: string;
  toId: string;
}

const BASEMAP = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Population heat source built once from the committed census raster. */
function populationGeojson(): FeatureCollection {
  const m = gridJson.meta;
  const features: Feature[] = [];
  for (let row = 0; row < m.rows; row++) {
    for (let col = 0; col < m.cols; col++) {
      const pop = gridJson.pop[row * m.cols + col];
      if (pop < 50) continue;
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            m.bbox.west + (col + 0.5) * m.dLon,
            m.bbox.south + (row + 0.5) * m.dLat,
          ],
        },
        properties: { pop },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

function lineGeojson(line: [number, number][]): Feature {
  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates: line },
    properties: {},
  };
}

export default function CorridorMap({
  directLine,
  quietLine,
  vertiports,
  fromId,
  toId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP,
      center: [-118.35, 34.06],
      zoom: 9.6,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.on("load", () => {
      map.addSource("population", {
        type: "geojson",
        data: populationGeojson(),
      });
      map.addLayer({
        id: "population-heat",
        type: "heatmap",
        source: "population",
        paint: {
          "heatmap-weight": [
            "interpolate", ["linear"], ["get", "pop"], 0, 0, 4000, 1,
          ],
          "heatmap-intensity": 0.6,
          "heatmap-radius": 14,
          "heatmap-opacity": 0.35,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(30,20,60,0)",
            0.3, "rgba(90,60,140,0.55)",
            0.6, "rgba(190,90,110,0.7)",
            1, "rgba(255,180,120,0.9)",
          ],
        },
      });
      for (const [id, color] of [
        ["direct", "#f59e0b"],
        ["quiet", "#2dd4bf"],
      ] as const) {
        map.addSource(id, { type: "geojson", data: lineGeojson([]) });
        map.addLayer({
          id: `${id}-glow`,
          type: "line",
          source: id,
          paint: { "line-color": color, "line-width": 9, "line-blur": 8, "line-opacity": 0.55 },
        });
        map.addLayer({
          id: `${id}-core`,
          type: "line",
          source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": color,
            "line-width": 2.5,
            ...(id === "direct" ? { "line-dasharray": [2, 1.6] } : {}),
          },
        });
      }
      map.addSource("vertiports", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: vertiports.map((v) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [v.lon, v.lat] },
            properties: { id: v.id, name: v.name },
          })),
        },
      });
      map.addLayer({
        id: "vertiport-dots",
        type: "circle",
        source: "vertiports",
        paint: {
          "circle-radius": 5,
          "circle-color": "#e2e8f0",
          "circle-stroke-color": "#0f172a",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "vertiport-labels",
        type: "symbol",
        source: "vertiports",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.3],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#cbd5e1",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1.2,
        },
      });
      readyRef.current = true;
      syncRoutes();
    });
    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncRoutes() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource("direct") as maplibregl.GeoJSONSource | undefined)?.setData(
      lineGeojson(directLine),
    );
    (map.getSource("quiet") as maplibregl.GeoJSONSource | undefined)?.setData(
      lineGeojson(quietLine),
    );
    const all = [...directLine, ...quietLine];
    if (all.length > 1) {
      const lons = all.map((p) => p[0]);
      const lats = all.map((p) => p[1]);
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 70, duration: 900 },
      );
    }
  }

  useEffect(syncRoutes, [directLine, quietLine, fromId, toId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
