import { useEffect, useState, useCallback } from "react";

export const COUPLE = { names: "Helena & Rafael", bride: "Helena", groom: "Rafael" };
export const WEDDING_DATE = new Date("2028-10-14T16:00:00-03:00");
export const PIX_KEY = "noivos2028@email.com";
export const WHATSAPP = "5511999999999";
export const GOAL = 15000;

export type Gift = { id: string; title: string; price: number; img: number; description: string };
export const GIFTS: Gift[] = [
  { id: "jantar", title: "Jantar Romântico na Lua de Mel", price: 280, img: 0, description: "Velas, vinho e vista para o mar." },
  { id: "barco", title: "Passeio de Barco", price: 450, img: 1, description: "Uma tarde velejando em águas azuis." },
  { id: "cafeteira", title: "Cafeteira dos Sonhos", price: 180, img: 2, description: "Para os cafés da manhã a dois." },
  { id: "mercado", title: "Primeira Compra do Mês", price: 90, img: 3, description: "A despensa do novo lar agradece." },
  { id: "enxoval", title: "Enxoval Aconchegante", price: 220, img: 4, description: "Lençóis macios para dias preguiçosos." },
  { id: "balao", title: "Voo de Balão ao Amanhecer", price: 650, img: 5, description: "Um nascer do sol inesquecível." },
];

export type PaymentMethod = "Pix" | "Cartão" | "Boleto";
export type Contribution = { id: string; date: string; guest: string; contact: string; giftId: string; giftTitle: string; amount: number; method: PaymentMethod; status: "Pendente" | "Confirmado" };
export type Message = { id: string; date: string; guest: string; text: string; visible: boolean };
type State = { contributions: Contribution[]; messages: Message[] };

const seed: State = {
  contributions: [
    { id: "c1", date: "2026-10-02", guest: "Marina Alves", contact: "marina@email.com", giftId: "jantar", giftTitle: "Jantar Romântico na Lua de Mel", amount: 280, method: "Pix", status: "Confirmado" },
    { id: "c2", date: "2026-10-11", guest: "Tio Carlos", contact: "(11) 98888-1111", giftId: "balao", giftTitle: "Voo de Balão ao Amanhecer", amount: 650, method: "Pix", status: "Confirmado" },
    { id: "c3", date: "2026-10-20", guest: "Juliana e Pedro", contact: "ju.pedro@email.com", giftId: "cafeteira", giftTitle: "Cafeteira dos Sonhos", amount: 180, method: "Cartão", status: "Pendente" },
    { id: "c4", date: "2026-11-03", guest: "Vó Lourdes", contact: "(11) 97777-2222", giftId: "mercado", giftTitle: "Primeira Compra do Mês", amount: 90, method: "Pix", status: "Pendente" },
  ],
  messages: [
    { id: "m1", date: "2026-10-02", guest: "Marina Alves", text: "Que esse amor siga crescendo a cada dia. Vocês são inspiração!", visible: true },
    { id: "m2", date: "2026-10-11", guest: "Tio Carlos", text: "Aproveitem cada segundo lá no alto. Amo vocês!", visible: true },
    { id: "m3", date: "2026-10-20", guest: "Juliana e Pedro", text: "Muitos cafés, risadas e domingos juntinhos. Felicidades!", visible: true },
    { id: "m4", date: "2026-11-03", guest: "Vó Lourdes", text: "Meus netos queridos, que Deus abençoe essa união. Despensa cheia sempre!", visible: true },
  ],
};

const KEY = "wedding-state-v1";
const listeners = new Set<() => void>();
let state: State = seed;
let loaded = false;
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = JSON.parse(raw); } catch { /* ignore */ }
}
function set(next: State) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useWedding() {
  const [s, setS] = useState<State>(seed);
  useEffect(() => {
    load(); setS(state);
    const l = () => setS(state);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  const addGift = useCallback((c: Omit<Contribution, "id" | "date" | "status">, text: string) => {
    const date = new Date().toISOString().slice(0, 10);
    const id = crypto.randomUUID();
    set({
      contributions: [{ ...c, id, date, status: "Pendente" }, ...state.contributions],
      messages: [{ id, date, guest: c.guest, text, visible: true }, ...state.messages],
    });
  }, []);
  const confirm = useCallback((id: string) => set({ ...state, contributions: state.contributions.map((c) => (c.id === id ? { ...c, status: c.status === "Confirmado" ? "Pendente" : "Confirmado" } : c)) }), []);
  const toggleMsg = useCallback((id: string) => set({ ...state, messages: state.messages.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m)) }), []);
  return { ...s, addGift, confirm, toggleMsg };
}

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
