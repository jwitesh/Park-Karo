import type { AvailabilityStatus } from "@/lib/zones";

export const STATUS_COLOR: Record<AvailabilityStatus, string> = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  grey: "#94a3b8",
};

export const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  green: "Plenty of space",
  amber: "Filling up",
  red: "Almost full / full",
  grey: "Availability unknown",
};
