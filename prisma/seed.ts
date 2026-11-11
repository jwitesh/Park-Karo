import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  { code: "PUBLIC", name: "Public / Visitor" },
  { code: "DAY_SCHOLAR", name: "Day Scholar" },
  { code: "HOSTEL_BOYS", name: "Hostel (Boys)" },
  { code: "HOSTEL_GIRLS", name: "Hostel (Girls)" },
  { code: "FACULTY", name: "Faculty / Staff" },
  { code: "VIP", name: "VIP / Operational" },
];

const ALL = CATEGORIES.map((c) => c.code);
const STUDENTS = ["DAY_SCHOLAR", "HOSTEL_BOYS", "HOSTEL_GIRLS"];

// Zone names are from Google research (unverified) except the two Maps-verified entries.
// Capacity 50 is a DEMO PLACEHOLDER. Coordinates only where verified on Google Maps.
type Z = {
  name: string;
  block?: number;
  allow: string[];
  lat?: number;
  lng?: number;
  verified?: boolean;
  source?: string;
};

const ZONES: Z[] = [
  { name: "LPU Main Parking", allow: ALL, lat: 31.2528, lng: 75.7057, verified: true, source: "google-maps" },
  { name: "LPU Main Gate Parking", allow: ALL, lat: 31.2598, lng: 75.7061, verified: true, source: "google-maps" },
  { name: "Main Gate 1-A", allow: ALL },
  { name: "Block 29/30 Front", block: 29, allow: [...STUDENTS, "FACULTY", "VIP"] },
  { name: "Uni Mall", allow: ALL },
  { name: "Hospital", allow: ALL },
  { name: "Outer Student Lots", allow: [...STUDENTS, "VIP"] },
  { name: "Block 35/36 Rear Grounds", block: 35, allow: [...STUDENTS, "FACULTY", "VIP"] },
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ name: `BH-${n}`, allow: ["HOSTEL_BOYS", "VIP"] })),
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ name: `GH-${n}`, allow: ["HOSTEL_GIRLS", "VIP"] })),
  { name: "Blocks 31-34 Front", block: 31, allow: [...STUDENTS, "FACULTY", "VIP"] },
  { name: "Block 32 Business", block: 32, allow: ["FACULTY", "VIP", "DAY_SCHOLAR"] },
  { name: "Stadium", allow: ALL },
  { name: "Agriculture", allow: [...STUDENTS, "FACULTY", "VIP"] },
  { name: "Western Gate Loading", allow: ["FACULTY", "VIP"] },
];

async function main() {
  const cats: Record<string, number> = {};
  for (const c of CATEGORIES) {
    const row = await prisma.permitCategory.upsert({ where: { code: c.code }, update: { name: c.name }, create: c });
    cats[c.code] = row.id;
  }

  const blockIds: Record<number, number> = {};
  for (const n of [29, 31, 32, 35]) {
    const b = await prisma.block.upsert({
      where: { number: n },
      update: {},
      create: { number: n, name: `Block ${n}` },
    });
    blockIds[n] = b.id;
  }

  for (const z of ZONES) {
    const data = {
      blockId: z.block ? blockIds[z.block] : null,
      capacity: 50, // placeholder for demo
      lat: z.lat ?? null,
      lng: z.lng ?? null,
      isVerified: z.verified ?? false,
      dataSource: z.source ?? "google-research",
    };
    const zone = await prisma.zone.upsert({
      where: { name: z.name },
      update: data,
      create: { name: z.name, ...data },
    });
    await prisma.zoneAccess.deleteMany({ where: { zoneId: zone.id } });
    await prisma.zoneAccess.createMany({
      data: z.allow.map((code) => ({ zoneId: zone.id, categoryId: cats[code] })),
    });
  }

  const pw = await bcrypt.hash("demo1234", 10);
  const users: { regNo: string; email: string; name: string; role: Role; cat: string; maxBlock?: number; plate?: string; tag?: string }[] = [
    { regNo: "ADMIN001", email: "admin@demo.lpu", name: "Demo Admin", role: "ADMIN", cat: "VIP" },
    { regNo: "GUARD001", email: "guard@demo.lpu", name: "Demo Guard", role: "ATTENDANT", cat: "VIP" },
    { regNo: "12300001", email: "dayscholar@demo.lpu", name: "Aman (Day Scholar)", role: "RIDER", cat: "DAY_SCHOLAR", maxBlock: 32, plate: "PB08AA0001", tag: "TAG-0001" },
    { regNo: "12300002", email: "hostel@demo.lpu", name: "Rohit (Hostel Boys)", role: "RIDER", cat: "HOSTEL_BOYS", maxBlock: 35, plate: "PB08AA0002", tag: "TAG-0002" },
    { regNo: "FAC001", email: "faculty@demo.lpu", name: "Dr. Sharma (Faculty)", role: "RIDER", cat: "FACULTY", plate: "PB08AA0003", tag: "TAG-0003" },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { regNo: u.regNo },
      update: {},
      create: {
        regNo: u.regNo,
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: pw,
        categoryId: cats[u.cat],
        maxBlock: u.maxBlock ?? null,
      },
    });
    if (u.plate && u.tag) {
      const vehicle = await prisma.vehicle.upsert({
        where: { plateNo: u.plate },
        update: {},
        create: { plateNo: u.plate, ownerId: user.id, model: "Demo Bike" },
      });
      await prisma.rfidTag.upsert({
        where: { uid: u.tag },
        update: {},
        create: { uid: u.tag, vehicleId: vehicle.id },
      });
    }
  }

  console.log("Seeded. Demo password for all accounts: demo1234");
}

main().finally(() => prisma.$disconnect());
