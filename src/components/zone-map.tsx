"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import Link from "next/link";
import type { ZoneDTO } from "@/lib/zones";
import { STATUS_COLOR, STATUS_LABEL } from "@/components/status";

// Centre of LPU campus, Phagwara
const CENTER: [number, number] = [31.2555, 75.7059];

/** A round pin in the zone's status colour. Zones you can't use are dimmed and don't pulse. */
function pin(z: ZoneDTO) {
  return L.divIcon({
    className: "",
    html: `<span class="zone-pin${z.allowed ? "" : " is-dim"}" style="--c:${STATUS_COLOR[z.status]}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

export default function ZoneMap({ zones }: { zones: ZoneDTO[] }) {
  const plotted = zones.filter((z) => z.lat != null && z.lng != null);

  return (
    <div className="space-y-2">
      <div className="h-[55vh] overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-card)]">
        <MapContainer center={CENTER} zoom={16} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {plotted.map((z) => (
            <Marker key={z.id} position={[z.lat!, z.lng!]} icon={pin(z)} keyboard>
              <Popup>
                <div className="space-y-1.5 text-sm">
                  <p className="text-base font-semibold">{z.name}</p>
                  <p className="flex items-center gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[z.status] }} />
                    {STATUS_LABEL[z.status]}
                  </p>
                  <p>{z.capacity == null ? "Capacity not confirmed" : `${z.available} of ${z.capacity} free`}</p>
                  {!z.allowed && <p className="text-red-600">{z.deniedReason}</p>}
                  {!z.isVerified && <p className="text-amber-600">Unverified</p>}
                  <Link href={`/discover/${z.id}`} className="inline-block font-semibold text-brand underline">
                    View zone
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <p className="text-xs text-muted">
        Showing {plotted.length} of {zones.length} zones. Zones without confirmed coordinates are only in the list.
      </p>
    </div>
  );
}
