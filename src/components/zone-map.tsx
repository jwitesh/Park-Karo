"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { ZoneDTO } from "@/lib/zones";
import { STATUS_COLOR, STATUS_LABEL } from "@/components/status";

// Centre of LPU campus, Phagwara
const CENTER: [number, number] = [31.2555, 75.7059];

export default function ZoneMap({ zones }: { zones: ZoneDTO[] }) {
  const plotted = zones.filter((z) => z.lat != null && z.lng != null);

  return (
    <div className="space-y-2">
      <div className="h-[55vh] overflow-hidden rounded-xl border border-border">
        <MapContainer center={CENTER} zoom={16} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {plotted.map((z) => (
            <CircleMarker
              key={z.id}
              center={[z.lat!, z.lng!]}
              radius={z.allowed ? 12 : 8}
              pathOptions={{
                color: "#0f172a",
                weight: 2,
                fillColor: STATUS_COLOR[z.status],
                fillOpacity: z.allowed ? 0.9 : 0.35,
              }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <b>{z.name}</b>
                  <div>{STATUS_LABEL[z.status]}</div>
                  <div>
                    {z.capacity == null ? "Capacity not confirmed" : `${z.available} of ${z.capacity} free`}
                  </div>
                  {!z.allowed && <div className="text-red-600">{z.deniedReason}</div>}
                  {!z.isVerified && <div className="text-amber-600">Unverified</div>}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <p className="text-xs text-muted">
        Showing {plotted.length} of {zones.length} zones. Zones without confirmed coordinates are only in the list.
      </p>
    </div>
  );
}
