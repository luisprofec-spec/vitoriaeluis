import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export type Venue = { time: string; place: string; address: string };
export type Settings = {
  partner1: string; partner2: string; tagline: string; story: string;
  heroImage: string; storyImage: string; gallery: string[];
  date: string; ceremony: Venue; reception: Venue;
  pixType: string; pixKey: string; pixCity: string; whatsapp: string; cardLink: string; boletoLink: string; goal: number;
  heroImages: string[];
  musicEnabled: boolean; musicTitle: string; musicUrl: string; musicLoop: boolean;
};
export const DEFAULT_SETTINGS: Settings = {
  partner1: "Helena", partner2: "Rafael", tagline: "Vamos nos casar",
  story: "Nos conhecemos numa manhã chuvosa de 2019, disputando a última mesa de uma cafeteria.",
  heroImage: "", storyImage: "", gallery: [], date: "2028-10-14",
  ceremony: { time: "16:00", place: "", address: "" }, reception: { time: "18:30", place: "", address: "" },
  heroImages: [], musicEnabled: false, musicTitle: "", musicUrl: "", musicLoop: true,
  pixType: "E-mail", pixKey: "", pixCity: "SAO PAULO", whatsapp: "", cardLink: "", boletoLink: "", goal: 15000,
};
export const PIX_TYPES = ["E-mail", "CPF", "CNPJ", "Telefone", "Chave aleatória"];
export const coupleNames = (s: Settings) => `${s.partner1} & ${s.partner2}`;
export const weddingDate = (s: Settings) => new Date(`${s.date}T${s.ceremony.time || "16:00"}:00-03:00`);

export const settingsQuery = { queryKey: ["settings"], queryFn: async (): Promise<Settings> => {
  const { data, error } = await supabase.from("site_settings").select("data").eq("id", 1).maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_SETTINGS, ...((data?.data as Partial<Settings>) ?? {}) };
} };
export function useSettings() {
  const q = useQuery(settingsQuery);
  return q.data ?? DEFAULT_SETTINGS;
}
export function useSettingsReady() {
  return useQuery(settingsQuery).isSuccess;
}
export function useSaveSettings() {
  const qc = useQueryClient();
  return async (s: Settings) => {
    const { error } = await supabase.from("site_settings").update({ data: s as never, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["settings"] });
  };
}

export type Gift = { id: string; title: string; price: number; category: string; description: string; image_url: string; sprite_index: number | null; sort: number };
export const giftsQuery = { queryKey: ["gifts"], queryFn: async (): Promise<Gift[]> => {
  const { data, error } = await supabase.from("gifts").select("*").order("sort").order("created_at");
  if (error) throw error;
  return (data ?? []).map((g) => ({ ...g, price: Number(g.price) }));
} };
export function useGifts() { return useQuery(giftsQuery).data ?? []; }

export type CardStyle = "floral" | "honeymoon" | "minimal" | "party";
export const CARD_STYLES: { id: CardStyle; label: string }[] = [
  { id: "floral", label: "Floral" }, { id: "honeymoon", label: "Lua de Mel" },
  { id: "minimal", label: "Romântico Minimalista" }, { id: "party", label: "Brinde/Festa" },
];
export type PaymentMethod = "Pix" | "Cartão" | "Boleto";
export type CartItem = { id: string; title: string; price: number };
export type Contribution = { id: string; created_at: string; guest: string; contact: string; items: CartItem[]; total: number; method: PaymentMethod; status: "Pendente" | "Confirmado" | "Cancelado"; proof?: string | null; guest_id?: string | null };
export type Message = { id: string; created_at: string; guest: string; text: string; card_style: CardStyle; gifts: string | null; visible: boolean };

export function useMessages() {
  return useQuery({ queryKey: ["messages"], queryFn: async () => {
    const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Message[];
  } }).data ?? [];
}

// ---- Cart (per-guest, browser only) ----
const CART_KEY = "wedding-cart-v1";
const cartListeners = new Set<() => void>();
let cart: CartItem[] = [];
let cartLoaded = false;
export const cartTotal = (items: CartItem[]) => Math.round(items.reduce((s, i) => s + i.price, 0) * 100) / 100;
function setCart(next: CartItem[]) { cart = next; localStorage.setItem(CART_KEY, JSON.stringify(cart)); cartListeners.forEach((l) => l()); }
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    if (!cartLoaded) { cartLoaded = true; try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { cart = []; } }
    setItems(cart);
    const l = () => setItems(cart); cartListeners.add(l); return () => { cartListeners.delete(l); };
  }, []);
  const add = useCallback((g: Gift) => { if (!cart.some((i) => i.id === g.id)) setCart([...cart, { id: g.id, title: g.title, price: g.price }]); }, []);
  const remove = useCallback((id: string) => setCart(cart.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setCart([]), []);
  return { items, total: cartTotal(items), add, remove, clear, has: (id: string) => items.some((i) => i.id === id) };
}

// ---- Guest submission ----
export const submissionSchema = z.object({
  guest: z.string().trim().min(1, "Informe seu nome").max(120),
  contact: z.string().trim().min(3, "Informe WhatsApp ou e-mail").max(160),
  text: z.string().trim().min(1, "Escreva uma mensagem").max(1000),
  cardStyle: z.enum(["floral", "honeymoon", "minimal", "party"]),
  method: z.enum(["Pix", "Cartão", "Boleto"]),
  items: z.array(z.object({ id: z.string(), title: z.string(), price: z.number().positive() })).min(1, "Sacola vazia"),
  guestId: z.string().uuid("Identifique-se na lista de convidados"),
  proof: z.string().trim().max(300).optional(),
});
export type Submission = z.infer<typeof submissionSchema>;
export async function submitGift(input: Submission) {
  const s = submissionSchema.parse(input);
  const gifts = s.items.map((i) => i.title).join(", ");
  const { error: e1 } = await supabase.from("contributions").insert({ guest: s.guest, contact: s.contact, items: s.items, total: cartTotal(s.items), method: s.method, guest_id: s.guestId, proof: s.proof || null });
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("messages").insert({ guest: s.guest, text: s.text, card_style: s.cardStyle, gifts });
  if (e2) throw e2;
}

// ---- Messages / links ----
export const thankYouMessage = (guest: string, gifts: string[], s: Pick<Settings, "partner1" | "partner2">) =>
  `Olá ${guest}, recebemos seu presente (${gifts.join(", ")}) e a mensagem linda no cartão postal! Muito obrigado pelo carinho com nosso casamento! — ${s.partner1} e ${s.partner2}`;
export function contactLink(contact: string, text: string) {
  if (contact.includes("@")) return `mailto:${contact}?subject=${encodeURIComponent("Obrigado pelo presente!")}&body=${encodeURIComponent(text)}`;
  let d = contact.replace(/\D/g, "");
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
export const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtDate = (d: string) => new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR");
export const fmtLongDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ---- Pix BR Code (EMV, static with amount) ----
const tlv = (id: string, v: string) => id + String(v.length).padStart(2, "0") + v;
const ascii = (v: string, max: number) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 .@+\-_]/g, "").trim().slice(0, max).toUpperCase();
export function crc16(str: string) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
export function normalizePixKey(type: string, key: string) {
  const k = key.trim();
  if (type === "CPF" || type === "CNPJ") return k.replace(/\D/g, "");
  if (type === "Telefone") { if (k.startsWith("+")) return "+" + k.replace(/\D/g, ""); const d = k.replace(/\D/g, ""); return "+" + (d.length <= 11 ? "55" + d : d); }
  if (type === "E-mail") return k.toLowerCase();
  return k;
}
export function pixPayload({ key, type, name, city, amount, txid = "***" }: { key: string; type: string; name: string; city: string; amount: number; txid?: string }) {
  const body =
    tlv("00", "01") +
    tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", normalizePixKey(type, key))) +
    tlv("52", "0000") + tlv("53", "986") +
    (amount > 0 ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "BR") + tlv("59", ascii(name, 25) || "NOIVOS") + tlv("60", ascii(city, 15) || "BRASIL") +
    tlv("62", tlv("05", txid)) + "6304";
  return body + crc16(body);
}

// ---- Guest list identification ----
export type GuestMatch = { id: string; full_name: string; allowed_companions: number; rsvp_status: "pending" | "confirmed" | "declined"; confirmed_guests_count: number };
export const GUEST_NOT_FOUND = "Seu nome não foi encontrado na lista de convidados. Verifique se digitou seu nome completo corretamente ou fale com os noivos.";
export const normName = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
export async function findGuest(name: string): Promise<GuestMatch | null> {
  const { data, error } = await supabase.rpc("find_guest", { _name: name.trim() });
  if (error) throw error;
  return ((data ?? [])[0] as GuestMatch | undefined) ?? null;
}
export const companionsValid = (n: number, allowed: number) => Number.isInteger(n) && n >= 0 && n <= allowed;
export async function sendRsvp(g: GuestMatch, attending: boolean, companions: number) {
  if (attending && !companionsValid(companions, g.allowed_companions)) throw new Error("Acompanhantes acima do limite");
  const { error } = await supabase.rpc("guest_rsvp", { _id: g.id, _name: g.full_name, _attending: attending, _companions: attending ? companions : 0 });
  if (error) throw error;
}
const GUEST_KEY = "wedding-guest-v1";
const guestListeners = new Set<() => void>();
let guest: GuestMatch | null = null; let guestLoaded = false;
export function setGuest(g: GuestMatch | null) { guest = g; if (g) localStorage.setItem(GUEST_KEY, JSON.stringify(g)); else localStorage.removeItem(GUEST_KEY); guestListeners.forEach((l) => l()); }
export function useGuest() {
  const [g, setG] = useState<GuestMatch | null>(null);
  useEffect(() => {
    if (!guestLoaded) { guestLoaded = true; try { guest = JSON.parse(localStorage.getItem(GUEST_KEY) || "null"); } catch { guest = null; } }
    setG(guest); const l = () => setG(guest); guestListeners.add(l); return () => { guestListeners.delete(l); };
  }, []);
  return g;
}

// ---- Custom info menus ----
export type CustomMenu = { id: string; title: string; content: string; image_url: string; display_order: number; is_active: boolean };
export const menusQuery = { queryKey: ["menus"], queryFn: async (): Promise<CustomMenu[]> => {
  const { data, error } = await supabase.from("custom_menus").select("*").order("display_order").order("created_at");
  if (error) throw error; return data ?? [];
} };
export const menuAnchor = (m: Pick<CustomMenu, "id">) => `info-${m.id.slice(0, 8)}`;

export const STATUS_LABEL: Record<string, string> = { Pendente: "Aguardando Conferência", Confirmado: "Pagamento Confirmado", Cancelado: "Cancelado / Liberado" };
