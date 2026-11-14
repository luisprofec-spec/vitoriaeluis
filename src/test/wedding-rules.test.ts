import { describe, expect, it } from "vitest";
import { normalizeGuestName, parseGuestBatch, guestSchema, guestSummary, guestCsv, confirmedTotal, isPendingPayment, inviteSchema, canRevokeAdmin, safeExternalUrl } from "@/lib/wedding-rules";

describe("Guest list and presence rules", () => {
  it("normalizes accents, uppercase and extra spaces for full-name matching", () => { expect(normalizeGuestName("  JOÃO   Silva  ")).toBe("joao silva"); expect(normalizeGuestName("João")).not.toBe(normalizeGuestName("João Silva")); });
  it("imports one name per line and defaults companions to zero", () => { expect(parseGuestBatch("João Silva; 2\nMaria Souza").map(g => [g.full_name, g.allowed_companions])).toEqual([["João Silva", 2], ["Maria Souza", 0]]); });
  it("rejects invalid companion quantities instead of silently granting them", () => { expect(() => parseGuestBatch("João Silva; -2")).toThrow(); expect(() => parseGuestBatch("João Silva; 1.5")).toThrow(); });
  it("cannot confirm more companions than the guest allowance", () => { expect(guestSchema.safeParse({ full_name: "João Silva", allowed_companions: 2, confirmed_companions: 3, rsvp_status: "confirmed" }).success).toBe(false); expect(guestSchema.safeParse({ full_name: "João Silva", allowed_companions: 2, confirmed_companions: 2, rsvp_status: "confirmed" }).success).toBe(true); });
  it("counts confirmed titular guests plus confirmed companions, not their maximum allowance", () => { expect(guestSummary([{ full_name: "João Silva", phone: null, allowed_companions: 2, confirmed_companions: 1, rsvp_status: "confirmed" }, { full_name: "Maria Souza", phone: null, allowed_companions: 3, confirmed_companions: 0, rsvp_status: "pending" }])).toEqual({ total: 2, confirmed: 2, pending: 1 }); });
  it("exports receipt-ready people counts and escapes spreadsheet formula cells", () => { const csv = guestCsv([{ full_name: "=João", phone: null, allowed_companions: 2, confirmed_companions: 2, rsvp_status: "confirmed" }]); expect(csv).toContain('"\'=João";"";"2";"2";"Confirmado";"3"'); });
});
describe("Payment and admin permissions", () => {
  it("only confirmed payments count towards the goal", () => { expect(confirmedTotal([{ status: "pending_confirmation", total: 270 }, { status: "confirmed", total: 100 }, { status: "cancelled", total: 300 }, { status: "Confirmado", total: 50 }])).toBe(150); expect(isPendingPayment("pending_confirmation")).toBe(true); });
  it("invites only valid normalized email addresses", () => { expect(inviteSchema.parse({ email: " Partner@Example.com " }).email).toBe("partner@example.com"); expect(inviteSchema.safeParse({ email: "not-an-email" }).success).toBe(false); });
  it("an administrator cannot revoke their own access", () => { expect(canRevokeAdmin("creator", "creator")).toBe(false); expect(canRevokeAdmin("creator", "partner")).toBe(true); });
  it("informative menus only allow web links", () => { expect(safeExternalUrl("javascript:alert(1)")).toBe(""); expect(safeExternalUrl("https://maps.google.com/")).toBe("https://maps.google.com/"); });
});