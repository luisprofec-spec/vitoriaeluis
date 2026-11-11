import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export type Venue = { time: string; place: string; address: string };
export type Settings = {
  partner1: string; partner2: string; tagline: string; story: string;
  heroImage: string; storyImage: string; gallery: string[];
  date: string; ceremony: Venue; reception: Venue;
  pixType: string; pixKey: string; whatsapp: string; cardLink: string; boletoLink: string; goal: number;
};
export const DEFAULT_SETTINGS: Settings = {
  partner1: "Helena", partner2: "Rafael", tagline: "Vamos nos casar",
  story: "Nos conhecemos numa manhã chuvosa de 2019, disputando a última mesa de uma cafeteria.",
  heroImage: "", storyImage: "", gallery: [], date: "2028-10-14",
  ceremony: { time: "16:00", place: "", address: "" }, reception: { time: "18:30", place: "", address: "" },
  pixType: "E-mail", pixKey: "", whatsapp: "", cardLink: "", boletoLink: "", goal: 15000,
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
export function useSaveSettings() {
  const qc = useQueryClient();
  return async (s: Settings) => {
    const { error } = await supabase.from("site_settings").update({ data: s as never, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["settings"] });
  };
}

export type Gift = { id: string; title: string; price: number; img: number; description: string };
export const GIFTS: Gift[] = [
  { id: "jantar", title: "Jantar Romântico na Lua de Mel", price: 280, img: 0, description: "Velas, vinho e vista para o mar." },
  { id: "barco", title: "Passeio de Barco", price: 450, img: 1, description: "Uma tarde velejando em águas azuis." },
  { id: "cafeteira", title: "Cafeteira dos Sonhos", price: 180, img: 2, description: "Para os cafés da manhã a dois." },
  { id: "mercado", title: "Primeira Compra do Mês", price: 90, img: 3, description: "A despensa do novo lar agradece." },
  { id: "enxoval", title: "Enxoval Aconchegante", price: 220, img: 4, description: "Lençóis macios para dias preguiçosos." },
  { id: "balao", title: "Voo de Balão ao Amanhecer", price: 650, img: 5, description: "Um nascer do sol inesquecível." },
];

export type CardStyle = "floral" | "honeymoon" | "minimal" | "party";
export const CARD_STYLES: { id: CardStyle; label: string }[] = [
  { id: "floral", label: "Floral" }, { id: "honeymoon", label: "Lua de Mel" },
  { id: "minimal", label: "Romântico Minimalista" }, { id: "party", label: "Brinde/Festa" },
];
export type PaymentMethod = "Pix" | "Cartão" | "Boleto";
export type CartItem = { id: string; title: string; price: number };
export type Contribution = { id: string; created_at: string; guest: string; contact: string; items: CartItem[]; total: number; method: PaymentMethod; status: "Pendente" | "Confirmado" };
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
});
export type Submission = z.infer<typeof submissionSchema>;
export async function submitGift(input: Submission) {
  const s = submissionSchema.parse(input);
  const gifts = s.items.map((i) => i.title).join(", ");
  const { error: e1 } = await supabase.from("contributions").insert({ guest: s.guest, contact: s.contact, items: s.items, total: cartTotal(s.items), method: s.method });
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
