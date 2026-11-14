import { z } from "zod";

export const normalizeGuestName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
export const guestSchema = z.object({ full_name: z.string().trim().min(3).max(160), phone: z.string().trim().max(40).nullable().optional(), allowed_companions: z.number().int().min(0), confirmed_companions: z.number().int().min(0).default(0), rsvp_status: z.enum(["pending", "confirmed", "declined"]).default("pending") }).refine(g => g.confirmed_companions <= g.allowed_companions, { message: "Acompanhantes acima do permitido", path: ["confirmed_companions"] });
export function parseGuestBatch(text: string) {
  const seen = new Set<string>();
  return text.split(/\r?\n/).filter(line => line.trim()).map((line, i) => {
    const parts = line.split(";");
    const name = parts[0]?.trim() ?? "";
    const amount = parts[1]?.trim();
    if (parts.length > 2 || (amount && !/^\d+$/.test(amount))) throw new Error(`Linha ${i + 1}: quantidade de acompanhantes inválida.`);
    const result = guestSchema.safeParse({ full_name: name, allowed_companions: amount ? Number(amount) : 0 });
    if (!result.success) throw new Error(`Linha ${i + 1}: confira o nome e os acompanhantes.`);
    const key = normalizeGuestName(name);
    if (seen.has(key)) throw new Error(`Linha ${i + 1}: nome repetido.`);
    seen.add(key);
    return result.data;
  });
}
export type GuestRecord = { full_name: string; phone: string | null; allowed_companions: number; confirmed_companions: number; rsvp_status: string };
export function guestSummary(guests: GuestRecord[]) {
  return { total: guests.length, confirmed: guests.filter(g => g.rsvp_status === "confirmed").reduce((sum, g) => sum + 1 + g.confirmed_companions, 0), pending: guests.filter(g => g.rsvp_status === "pending").length };
}
export const isConfirmedPayment = (status: string) => status === "confirmed" || status === "Confirmado";
export const isPendingPayment = (status: string) => status === "pending_confirmation" || status === "Pendente";
export const confirmedTotal = (rows: { status: string; total: number }[]) => rows.filter(r => isConfirmedPayment(r.status)).reduce((sum, r) => sum + Number(r.total), 0);
export function guestCsv(guests: GuestRecord[]) {
  const quote = (value: unknown) => `"${String(value ?? "").replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""')}"`;
  const labels: Record<string, string> = { pending: "Pendente", confirmed: "Confirmado", declined: "Não irá" };
  return "\uFEFF" + [["Nome", "Telefone", "Acompanhantes permitidos", "Acompanhantes confirmados", "Status", "Total de pessoas"], ...guests.map(g => [g.full_name, g.phone ?? "", g.allowed_companions, g.confirmed_companions, labels[g.rsvp_status] ?? g.rsvp_status, g.rsvp_status === "confirmed" ? 1 + g.confirmed_companions : 0])].map(row => row.map(quote).join(";")).join("\r\n");
}
export function safeExternalUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.href : ""; } catch { return ""; } }
export const inviteSchema = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()) });
export const canRevokeAdmin = (currentUserId: string, targetUserId: string | null) => targetUserId !== currentUserId;