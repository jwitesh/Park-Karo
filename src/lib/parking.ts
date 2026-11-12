import { Prisma, type CheckMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/zones";
import { notify, staffIds, violationLabel } from "@/lib/notify";

export type ResultCode =
  | "CHECKED_IN"
  | "CHECKED_IN_FLAGGED"
  | "CHECKED_OUT"
  | "ALREADY_CHECKED_IN"
  | "NO_ENTRY"
  | "ZONE_FULL"
  | "ZONE_NOT_FOUND"
  | "ZONE_INACTIVE"
  | "UNKNOWN_TAG"
  | "TAG_BLOCKED"
  | "UNASSIGNED_TAG"
  | "VEHICLE_NOT_FOUND";

export type ParkingResult = {
  ok: boolean;
  code: ResultCode;
  message: string;
  plateNo?: string;
  zoneName?: string;
  /** Set when entry was allowed but a violation was auto-created. */
  flagged?: string | null;
};

export const normalizePlate = (s: string) => s.replace(/[\s-]/g, "").toUpperCase();

/**
 * Check a vehicle into a zone.
 * - Locks the zone row so capacity can't be oversold by concurrent scans.
 * - Wrong-zone / block-rule entries are ALLOWED but flagged with an auto violation (one per record).
 * - A partial unique index guarantees one open record per vehicle (double check-in).
 */
export async function checkInVehicle(p: {
  vehicleId: string;
  zoneId: number;
  method: CheckMethod;
  actorId: string | null;
}): Promise<ParkingResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Zone" WHERE id = ${p.zoneId} FOR UPDATE`;

      const zone = await tx.zone.findUnique({
        where: { id: p.zoneId },
        include: { block: true, access: { select: { categoryId: true } } },
      });
      if (!zone) return { ok: false, code: "ZONE_NOT_FOUND", message: "Zone not found" };
      if (!zone.isActive) return { ok: false, code: "ZONE_INACTIVE", message: `${zone.name} is closed`, zoneName: zone.name };

      const vehicle = await tx.vehicle.findUnique({ where: { id: p.vehicleId }, include: { owner: true } });
      if (!vehicle) return { ok: false, code: "VEHICLE_NOT_FOUND", message: "Vehicle not found" };

      const open = await tx.parkingRecord.findFirst({
        where: { vehicleId: vehicle.id, status: "OPEN" },
        include: { zone: true },
      });
      if (open) {
        return {
          ok: false,
          code: "ALREADY_CHECKED_IN",
          message: `${vehicle.plateNo} is already parked in ${open.zone.name}`,
          plateNo: vehicle.plateNo,
          zoneName: open.zone.name,
        };
      }

      let occupied = 0;
      if (zone.capacity != null) {
        occupied = await tx.parkingRecord.count({ where: { zoneId: zone.id, status: "OPEN" } });
        if (occupied >= zone.capacity) {
          return {
            ok: false,
            code: "ZONE_FULL",
            message: `${zone.name} is full (${occupied}/${zone.capacity})`,
            plateNo: vehicle.plateNo,
            zoneName: zone.name,
          };
        }
      }

      const access = checkAccess(vehicle.owner, {
        allowedCategoryIds: zone.access.map((a) => a.categoryId),
        blockNumber: zone.block?.number ?? null,
      });

      const record = await tx.parkingRecord.create({
        data: { vehicleId: vehicle.id, zoneId: zone.id, method: p.method },
      });

      if (!access.allowed && access.violation) {
        await tx.violation.create({
          data: {
            type: access.violation,
            details: access.reason,
            userId: vehicle.ownerId,
            reporterId: p.actorId,
            zoneId: zone.id,
            recordId: record.id,
          },
        });
        await notify(tx, [vehicle.ownerId], {
          type: "VIOLATION",
          title: `${violationLabel(access.violation)} recorded`,
          body: `${vehicle.plateNo} was parked in ${zone.name}. ${access.reason ?? ""}`.trim(),
          link: "/my-parking",
        });
      }

      // This entry just filled the zone: tell the staff once (only on the transition to full).
      if (zone.capacity != null && occupied + 1 === zone.capacity) {
        await notify(tx, await staffIds(tx), {
          type: "ZONE_FULL",
          title: `${zone.name} is now full`,
          body: `${zone.capacity} of ${zone.capacity} spaces are taken.`,
          link: `/discover/${zone.id}`,
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: p.actorId,
          action: access.allowed ? "CHECK_IN" : "CHECK_IN_FLAGGED",
          entity: "ParkingRecord",
          entityId: record.id,
          meta: { method: p.method, zoneId: zone.id, plateNo: vehicle.plateNo },
        },
      });

      return access.allowed
        ? {
            ok: true,
            code: "CHECKED_IN",
            message: `${vehicle.plateNo} checked in to ${zone.name}`,
            plateNo: vehicle.plateNo,
            zoneName: zone.name,
          }
        : {
            ok: true,
            code: "CHECKED_IN_FLAGGED",
            message: `${vehicle.plateNo} checked in to ${zone.name}, but a violation was recorded`,
            plateNo: vehicle.plateNo,
            zoneName: zone.name,
            flagged: access.reason,
          };
    });
  } catch (e) {
    // Lost a race on the one-open-record-per-vehicle unique index
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, code: "ALREADY_CHECKED_IN", message: "Vehicle is already checked in" };
    }
    throw e;
  }
}

export async function checkOutVehicle(p: {
  vehicleId: string;
  actorId: string | null;
  /** Zone where the exit was scanned, to note a mismatch. */
  scannedZoneId?: number;
}): Promise<ParkingResult> {
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: p.vehicleId } });
    if (!vehicle) return { ok: false, code: "VEHICLE_NOT_FOUND", message: "Vehicle not found" };

    const open = await tx.parkingRecord.findFirst({
      where: { vehicleId: vehicle.id, status: "OPEN" },
      include: { zone: true },
    });
    if (!open) {
      return {
        ok: false,
        code: "NO_ENTRY",
        message: `${vehicle.plateNo} has no active check-in (exit with no entry)`,
        plateNo: vehicle.plateNo,
      };
    }

    // Guard against a concurrent checkout: only close if still open
    const closed = await tx.parkingRecord.updateMany({
      where: { id: open.id, status: "OPEN" },
      data: { status: "CLOSED", checkOutAt: new Date() },
    });
    if (closed.count === 0) {
      return { ok: false, code: "NO_ENTRY", message: `${vehicle.plateNo} was already checked out`, plateNo: vehicle.plateNo };
    }

    await tx.auditLog.create({
      data: {
        actorId: p.actorId,
        action: "CHECK_OUT",
        entity: "ParkingRecord",
        entityId: open.id,
        meta: { plateNo: vehicle.plateNo, zoneId: open.zoneId, scannedZoneId: p.scannedZoneId ?? null },
      },
    });

    const mismatch = p.scannedZoneId != null && p.scannedZoneId !== open.zoneId;
    return {
      ok: true,
      code: "CHECKED_OUT",
      message: mismatch
        ? `${vehicle.plateNo} checked out of ${open.zone.name} (scanned at a different zone)`
        : `${vehicle.plateNo} checked out of ${open.zone.name}`,
      plateNo: vehicle.plateNo,
      zoneName: open.zone.name,
    };
  });
}

export type Direction = "AUTO" | "IN" | "OUT";

/** RFID flow: tag -> vehicle -> user -> category -> zone access. */
export async function processScan(p: {
  tagUid: string;
  zoneId: number;
  direction: Direction;
  actorId: string | null;
  method?: CheckMethod;
}): Promise<ParkingResult> {
  const tag = await prisma.rfidTag.findUnique({
    where: { uid: p.tagUid.trim() },
    include: { vehicle: { include: { owner: true } } },
  });
  if (!tag) return { ok: false, code: "UNKNOWN_TAG", message: `Tag ${p.tagUid} is not registered` };

  if (tag.status !== "ACTIVE") {
    if (tag.vehicle) {
      await prisma.violation.create({
        data: {
          type: "TAG_MISMATCH",
          details: `Scan with ${tag.status.toLowerCase()} tag ${tag.uid}`,
          userId: tag.vehicle.ownerId,
          reporterId: p.actorId,
          zoneId: p.zoneId,
        },
      });
      await notify(prisma, [tag.vehicle.ownerId], {
        type: "VIOLATION",
        title: "Blocked tag was scanned",
        body: `Your ${tag.status.toLowerCase()} tag ${tag.uid} was used at a gate and entry was refused.`,
        link: "/my-parking",
      });
    }
    return {
      ok: false,
      code: "TAG_BLOCKED",
      message: `Tag ${tag.uid} is ${tag.status.toLowerCase()}. Entry refused`,
      plateNo: tag.vehicle?.plateNo,
    };
  }
  if (!tag.vehicle) return { ok: false, code: "UNASSIGNED_TAG", message: `Tag ${tag.uid} is not linked to a vehicle` };

  let direction = p.direction;
  if (direction === "AUTO") {
    const open = await prisma.parkingRecord.findFirst({
      where: { vehicleId: tag.vehicle.id, status: "OPEN" },
      select: { id: true },
    });
    direction = open ? "OUT" : "IN";
  }

  return direction === "IN"
    ? checkInVehicle({ vehicleId: tag.vehicle.id, zoneId: p.zoneId, method: p.method ?? "RFID", actorId: p.actorId })
    : checkOutVehicle({ vehicleId: tag.vehicle.id, actorId: p.actorId, scannedZoneId: p.zoneId });
}

/** Guard manual flow for vehicles without a working tag. */
export async function processManual(p: {
  plateNo: string;
  zoneId: number;
  direction: "IN" | "OUT";
  actorId: string | null;
}): Promise<ParkingResult> {
  const vehicle = await prisma.vehicle.findUnique({ where: { plateNo: normalizePlate(p.plateNo) } });
  if (!vehicle) {
    return { ok: false, code: "VEHICLE_NOT_FOUND", message: `No registered vehicle with plate ${normalizePlate(p.plateNo)}` };
  }
  return p.direction === "IN"
    ? checkInVehicle({ vehicleId: vehicle.id, zoneId: p.zoneId, method: "MANUAL", actorId: p.actorId })
    : checkOutVehicle({ vehicleId: vehicle.id, actorId: p.actorId, scannedZoneId: p.zoneId });
}
