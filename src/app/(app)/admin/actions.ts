"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminIdOrNull, type ActionState } from "@/lib/admin";
import { normalizePlate } from "@/lib/parking";
import { notify } from "@/lib/notify";

const denied: ActionState = { ok: false, message: "Not authorised" };
const fail = (message: string): ActionState => ({ ok: false, message });
const ok = (message: string): ActionState => ({ ok: true, message });
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Invalid input";

/** Empty string -> undefined, so optional number fields accept a blank input. */
const optional = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), s.optional());

const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/* ------------------------------ Zones ------------------------------ */

const zoneSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    capacity: optional(z.coerce.number().int().min(0, "Capacity can't be negative").max(100000)),
    lat: optional(z.coerce.number().min(-90, "Latitude must be -90 to 90").max(90, "Latitude must be -90 to 90")),
    lng: optional(z.coerce.number().min(-180, "Longitude must be -180 to 180").max(180, "Longitude must be -180 to 180")),
    dataSource: z.string().trim().max(60).default("admin"),
  })
  .refine((d) => (d.lat == null) === (d.lng == null), { message: "Enter both latitude and longitude, or neither" });

export async function updateZone(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminIdOrNull();
  if (!admin) return denied;

  const parsed = zoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const categoryIds = formData
    .getAll("categoryId")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (categoryIds.length === 0) return fail("Select at least one permit category that may park here");

  const validCats = await prisma.permitCategory.count({ where: { id: { in: categoryIds } } });
  if (validCats !== new Set(categoryIds).size) return fail("Unknown permit category");

  try {
    await prisma.$transaction([
      prisma.zone.update({
        where: { id: d.id },
        data: {
          capacity: d.capacity ?? null,
          lat: d.lat ?? null,
          lng: d.lng ?? null,
          dataSource: d.dataSource || "admin",
          isVerified: formData.get("isVerified") === "on",
          isActive: formData.get("isActive") === "on",
        },
      }),
      prisma.zoneAccess.deleteMany({ where: { zoneId: d.id } }),
      prisma.zoneAccess.createMany({ data: [...new Set(categoryIds)].map((categoryId) => ({ zoneId: d.id, categoryId })) }),
      prisma.auditLog.create({
        data: { actorId: admin, action: "UPDATE_ZONE", entity: "Zone", entityId: String(d.id), meta: { capacity: d.capacity ?? null, lat: d.lat ?? null, lng: d.lng ?? null } },
      }),
    ]);
  } catch {
    return fail("Zone not found");
  }

  revalidatePath("/admin/zones");
  revalidatePath("/discover");
  return ok("Zone saved");
}

const newZoneSchema = z.object({
  name: z.string().trim().min(2, "Enter a zone name").max(60),
  blockNumber: optional(z.coerce.number().int().min(1).max(200)),
  capacity: optional(z.coerce.number().int().min(0).max(100000)),
});

export async function createZone(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminIdOrNull();
  if (!admin) return denied;

  const parsed = newZoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const everyone = await prisma.permitCategory.findMany({ select: { id: true } });
  try {
    const block = d.blockNumber
      ? await prisma.block.upsert({ where: { number: d.blockNumber }, update: {}, create: { number: d.blockNumber, name: `Block ${d.blockNumber}` } })
      : null;
    const zone = await prisma.zone.create({
      data: {
        name: d.name,
        blockId: block?.id ?? null,
        capacity: d.capacity ?? null,
        dataSource: "admin",
        access: { create: everyone.map((c) => ({ categoryId: c.id })) },
      },
    });
    await prisma.auditLog.create({ data: { actorId: admin, action: "CREATE_ZONE", entity: "Zone", entityId: String(zone.id) } });
  } catch (e) {
    return fail(isUnique(e) ? "A zone with that name already exists" : "Could not create zone");
  }

  revalidatePath("/admin/zones");
  revalidatePath("/discover");
  return ok("Zone created (open to all categories; edit access below)");
}

/* ------------------------------ Users ------------------------------ */

const roleEnum = z.enum(["RIDER", "ATTENDANT", "ADMIN"]);

const createUserSchema = z
  .object({
    regNo: z.string().trim().max(20).optional(),
    email: z.string().trim().toLowerCase().max(100).optional(),
    name: z.string().trim().min(2, "Enter the name").max(80),
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
    role: roleEnum,
    categoryId: optional(z.coerce.number().int().positive()),
    maxBlock: optional(z.coerce.number().int().min(1).max(200)),
  })
  .refine((d) => !!d.regNo || !!d.email, { message: "Enter a registration number or an email" })
  .refine((d) => !d.email || z.string().email().safeParse(d.email).success, { message: "Email looks invalid" });

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminIdOrNull();
  if (!admin) return denied;

  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  try {
    const user = await prisma.user.create({
      data: {
        regNo: d.regNo || null,
        email: d.email || null,
        name: d.name,
        role: d.role,
        categoryId: d.categoryId ?? null,
        maxBlock: d.maxBlock ?? null,
        passwordHash: await bcrypt.hash(d.password, 10),
      },
    });
    await prisma.auditLog.create({ data: { actorId: admin, action: "CREATE_USER", entity: "User", entityId: user.id, meta: { role: d.role } } });
  } catch (e) {
    return fail(isUnique(e) ? "That registration number or email is already in use" : "Could not create user");
  }

  revalidatePath("/admin/users");
  return ok("User created");
}

const updateUserSchema = z.object({
  id: z.string().min(1),
  role: roleEnum,
  categoryId: optional(z.coerce.number().int().positive()),
  maxBlock: optional(z.coerce.number().int().min(1).max(200)),
  newPassword: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(8, "Password must be at least 8 characters").max(100).optional()),
});

export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminIdOrNull();
  if (!admin) return denied;

  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  // Prevent locking yourself out of the admin area
  if (d.id === admin && d.role !== "ADMIN") return fail("You can't remove your own admin role");

  try {
    await prisma.user.update({
      where: { id: d.id },
      data: {
        role: d.role,
        categoryId: d.categoryId ?? null,
        maxBlock: d.maxBlock ?? null,
        ...(d.newPassword ? { passwordHash: await bcrypt.hash(d.newPassword, 10) } : {}),
      },
    });
    await prisma.auditLog.create({
      data: { actorId: admin, action: "UPDATE_USER", entity: "User", entityId: d.id, meta: { role: d.role, passwordChanged: !!d.newPassword } },
    });
  } catch {
    return fail("User not found");
  }

  revalidatePath("/admin/users");
  return ok("User updated");
}

const vehicleSchema = z.object({
  ownerId: z.string().min(1),
  plateNo: z.string().transform(normalizePlate).pipe(z.string().regex(/^[A-Z0-9]{4,12}$/, "Plate must be 4-12 letters/numbers")),
  model: z.string().trim().max(40).optional(),
  colour: z.string().trim().max(30).optional(),
});

export async function addVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminIdOrNull();
  if (!admin) return denied;

  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  try {
    const v = await prisma.vehicle.create({
      data: { ownerId: d.ownerId, plateNo: d.plateNo, model: d.model || null, colour: d.colour || null },
    });
    await prisma.auditLog.create({ data: { actorId: admin, action: "ADD_VEHICLE", entity: "Vehicle", entityId: v.id, meta: { plateNo: d.plateNo } } });
  } catch (e) {
    return fail(isUnique(e) ? "That plate is already registered" : "Could not add vehicle (owner not found?)");
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/tags");
  return ok("Vehicle added");
}

/* ------------------------------ RFID tags ------------------------------ */

const tagStatus = z.enum(["ACTIVE", "BLOCKED", "LOST"]);

const addTagSchema = z.object({
  uid: z.string().trim().toUpperCase().min(3, "Enter the tag UID").max(40),
  plateNo: z.string().optional(),
});

export async function addTag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminIdOrNull();
  if (!admin) return denied;

  const parsed = addTagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  let vehicleId: string | null = null;
  if (parsed.data.plateNo?.trim()) {
    const v = await prisma.vehicle.findUnique({ where: { plateNo: normalizePlate(parsed.data.plateNo) } });
    if (!v) return fail("No registered vehicle with that plate");
    vehicleId = v.id;
  }

  try {
    const tag = await prisma.rfidTag.create({ data: { uid: parsed.data.uid, vehicleId } });
    await prisma.auditLog.create({ data: { actorId: admin, action: "ADD_TAG", entity: "RfidTag", entityId: tag.id } });
  } catch (e) {
    return fail(isUnique(e) ? "That tag UID already exists" : "Could not add tag");
  }

  revalidatePath("/admin/tags");
  return ok("Tag added");
}

const updateTagSchema = z.object({ id: z.string().min(1), status: tagStatus, plateNo: z.string().optional() });

export async function updateTag(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminIdOrNull();
  if (!admin) return denied;

  const parsed = updateTagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  let vehicleId: string | null = null;
  if (parsed.data.plateNo?.trim()) {
    const v = await prisma.vehicle.findUnique({ where: { plateNo: normalizePlate(parsed.data.plateNo) } });
    if (!v) return fail("No registered vehicle with that plate");
    vehicleId = v.id;
  }

  const before = await prisma.rfidTag.findUnique({
    where: { id: parsed.data.id },
    select: { status: true, uid: true, vehicle: { select: { ownerId: true } } },
  });

  try {
    await prisma.rfidTag.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status, vehicleId } });
    if (before && before.status !== parsed.data.status && parsed.data.status !== "ACTIVE") {
      await notify(prisma, [before.vehicle?.ownerId], {
        type: "TAG",
        title: `RFID tag ${parsed.data.status.toLowerCase()}`,
        body: `Your tag ${before.uid} was marked ${parsed.data.status.toLowerCase()}. It will be refused at the gates. Contact security if this is a mistake.`,
        link: "/profile",
      });
    }
    await prisma.auditLog.create({
      data: { actorId: admin, action: "UPDATE_TAG", entity: "RfidTag", entityId: parsed.data.id, meta: { status: parsed.data.status } },
    });
  } catch {
    return fail("Tag not found");
  }

  revalidatePath("/admin/tags");
  return ok("Tag updated");
}
