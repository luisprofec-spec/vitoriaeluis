import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getWeddingSettings } from "@/lib/settings.functions";

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
  partner1: "", partner2: "", tagline: "", story: "",
  heroImage: "", storyImage: "", gallery: [], date: "",
  ceremony: { time: "", place: "", address: "" }, reception: { time: "", place: "", address: "" },
  heroImages: [], musicEnabled: false, musicTitle: "", musicUrl: "", musicLoop: true,
  pixType: "E-mail", pixKey: "", pixCity: "", whatsapp: "", cardLink: "", boletoLink: "", goal: 0,
};
export const PIX_TYPES = ["E-mail", "CPF", "CNPJ", "Telefone", "Chave aleatória"];
export const coupleNames = (s: Pick<Settings, "partner1" | "partner2">) => [s.partner1, s.partner2].filter(Boolean).join(" & ");
export const weddingDate = (s: Settings) => new Date(`${s.date}T${s.ceremony.time || "16:00"}:00-03:00`);

export const settingsQuery = { queryKey: ["settings"], queryFn: async (): Promise<Settings> => {
  const data = await getWeddingSettings();
  return { ...DEFAULT_SETTINGS, ...((data as Partial<Settings>) ?? {}) };
} };
export function useSettingsQuery() { return useQuery(settingsQuery); }
export function useSettings() {
  const q = useQuery(settingsQuery);
  return q.data ?? DEFAULT_SETTINGS;
}
export function useSaveSettings() {
  const qc = useQueryClient();
  return async (s: Settings) => {
    const { error } = await supabase.from("site_settings").upsert({ id: 1, data: s as never, updated_at: new Date().toISOString() });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["settings"] });
  };
}

export type Gift = { id: string; title: string; price: number; category: string; description: string; image_url: string; sprite_index: number | null; sort: number; unavailable?: boolean };
export const giftsQuery = { queryKey: ["gifts"], queryFn: async (): Promise<Gift[]> => {
  const [{ data, error }, reserved] = await Promise.all([supabase.from("gifts").select("*").order("sort").order("created_at"), supabase.rpc("unavailable_gift_ids")]);
  if (error) throw error;
  if (reserved.error) throw reserved.error;
  return (data ?? []).map((g) => ({ ...g, price: Number(g.price), unavailable: reserved.data?.includes(g.id) ?? false }));
} };
export function useGifts() { return useQuery(giftsQuery).data ?? []; }

export type CardStyle = "floral" | "honeymoon" | "minimal" | "party";
export const CARD_STYLES: { id: CardStyle; label: string }[] = [
  { id: "floral", label: "Floral" }, { id: "honeymoon", label: "Lua de Mel" },
  { id: "minimal", label: "Romântico Minimalista" }, { id: "party", label: "Brinde/Festa" },
];
export type PaymentMethod = "Pix" | "Cartão" | "Boleto";
export type CartItem = { id: string; title: string; price: number };
export type Contribution = { id: string; created_at: string; guest: string; contact: string; items: CartItem[]; total: number; method: PaymentMethod; status: "Pendente" | "Confirmado" | "pending_confirmation" | "confirmed" | "cancelled"; proof: string | null; transaction_id: string | null };
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
  const add = useCallback((g: Gift) => { if (!g.unavailable && !cart.some((i) => i.id === g.id)) setCart([...cart, { id: g.id, title: g.title, price: g.price }]); }, []);
  const remove = useCallback((id: string) => setCart(cart.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setCart([]), []);
  return { items, total: cartTotal(items), add, remove, clear, has: (id: string) => items.some((i) => i.id === id) };
}

// ---- Guest submission ----
export const submissionSchema = z.object({
  guest: z.string().trim().min(1, "Informe seu nome").max(120),
  contact: z.string().trim().max(160).default(""),
  text: z.string().trim().max(1000).default(""),
  cardStyle: z.enum(["floral", "honeymoon", "minimal", "party"]),
  method: z.enum(["Pix", "Cartão", "Boleto"]),
  items: z.array(z.object({ id: z.string(), title: z.string(), price: z.number().positive() })).min(1, "Sacola vazia"),
  paid: z.literal(true),
  proof: z.string().nullable().optional(),
  transactionId: z.string().trim().max(200).optional(),
  id: z.string().uuid(),
});
export type Submission = z.infer<typeof submissionSchema>;
export async function submitGift(input: Submission) {
  const s = submissionSchema.parse(input);
  const { data, error } = await supabase.rpc("register_paid_gift", { _id: s.id, _guest: s.guest, _contact: s.contact, _items: s.items, _method: s.method, _text: s.text, _card_style: s.cardStyle, _proof: s.proof ?? "", _transaction_id: s.transactionId ?? "", _paid: s.paid });
  if (error) throw error;
  return data;
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
