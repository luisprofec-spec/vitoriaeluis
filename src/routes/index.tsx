import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Clock, Gift as GiftIcon, Heart, MapPin, MessageSquare } from "lucide-react";
import couple from "@/assets/couple.jpg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GiftImage } from "@/components/GiftImage";
import { GiftDialog } from "@/components/GiftDialog";
import { COUPLE, GIFTS, WEDDING_DATE, brl, fmtDate, useWedding, type Gift } from "@/lib/wedding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${COUPLE.names} · Nosso Casamento` },
      { name: "description", content: "Celebre conosco: data, local, nossa história, lista de presentes via Pix e mural de recados." },
      { property: "og:title", content: `${COUPLE.names} · Nosso Casamento` },
      { property: "og:description", content: "Data, local, lista de presentes via Pix e mural de recados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FILTERS = [
  { label: "Todos", fn: () => true },
  { label: "Até R$ 100", fn: (p: number) => p <= 100 },
  { label: "R$ 100 a R$ 300", fn: (p: number) => p > 100 && p <= 300 },
  { label: "Acima de R$ 300", fn: (p: number) => p > 300 },
];

function useCountdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, WEDDING_DATE.getTime() - (now ?? WEDDING_DATE.getTime()));
  return { d: Math.floor(diff / 864e5), h: Math.floor(diff / 36e5) % 24, m: Math.floor(diff / 6e4) % 60, ready: now !== null };
}

function Index() {
  const cd = useCountdown();
  const [filter, setFilter] = useState(0);
  const [selected, setSelected] = useState<Gift | null>(null);
  const { messages } = useWedding();
  const nav = [["#historia", "Nossa História"], ["#evento", "Onde e Quando"], ["#presentes", "Lista de Presentes"], ["#mural", "Mural de Recados"]];

  return (
    <div className="min-h-screen bg-background">
      <header className="relative flex min-h-[92vh] flex-col overflow-hidden">
        <img src={couple} alt="Os noivos de mãos dadas ao pôr do sol" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/20 to-foreground/70" />
        <nav className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 py-6 text-sm text-primary-foreground/90">
          {nav.map(([h, l]) => <a key={h} href={h} className="hover:text-primary-foreground">{l}</a>)}
        </nav>
        <div className="relative z-10 m-auto px-6 text-center text-primary-foreground">
          <p className="eyebrow mb-6">Vamos nos casar</p>
          <h1 className="text-6xl font-medium italic md:text-8xl">{COUPLE.names}</h1>
          <p className="mt-6 text-lg tracking-wide">14 de Outubro de 2028</p>
          <div className="mt-10 flex justify-center gap-8">
            {[["Dias", cd.d], ["Horas", cd.h], ["Minutos", cd.m]].map(([l, v]) => (
              <div key={l as string}><div className="font-serif text-4xl md:text-5xl">{cd.ready ? v : "–"}</div><div className="text-xs uppercase tracking-[0.25em] opacity-80">{l}</div></div>
            ))}
          </div>
        </div>
      </header>

      <section id="historia" className="mx-auto grid max-w-5xl items-center gap-12 px-6 py-24 md:grid-cols-2">
        <img src={couple} alt="O casal" loading="lazy" width={1600} height={1008} className="aspect-[4/5] w-full rounded-sm object-cover object-[60%]" />
        <div>
          <p className="eyebrow">Nossa história</p>
          <h2 className="mt-3 text-4xl">Tudo começou com um café</h2>
          <p className="mt-6 leading-relaxed text-muted-foreground">Nos conhecemos numa manhã chuvosa de 2019, disputando a última mesa de uma cafeteria. Dividimos a mesa, depois a conversa, e nunca mais paramos. Entre viagens, mudanças e muitos domingos preguiçosos, decidimos que queremos dividir a vida inteira.</p>
          <p className="mt-4 font-serif text-xl italic text-terracotta">— {COUPLE.bride} & {COUPLE.groom}</p>
        </div>
      </section>

      <section id="evento" className="bg-secondary/50 px-6 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <p className="eyebrow">Onde e quando</p>
          <h2 className="mt-3 text-4xl">O grande dia</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[{ t: "Cerimônia", h: "16h00", p: "Capela Nossa Senhora da Luz", a: "Estrada do Vale, 120 · Campos do Jordão, SP" }, { t: "Recepção", h: "18h30", p: "Fazenda Santa Clara", a: "Rod. SP-123, km 8 · Campos do Jordão, SP" }].map((e) => (
              <Card key={e.t} className="p-8 text-left">
                <h3 className="text-2xl">{e.t}</h3>
                <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gold" /> Sábado, 14 de outubro de 2028</p>
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold" /> {e.h}</p>
                  <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-gold" /><span><span className="text-foreground">{e.p}</span><br />{e.a}</span></p>
                </div>
                <Button asChild variant="outline" className="mt-6"><a href={`https://maps.google.com/?q=${encodeURIComponent(e.p + " " + e.a)}`} target="_blank" rel="noreferrer">Ver no Google Maps</a></Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="presentes" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="eyebrow">Lista de presentes</p>
          <h2 className="mt-3 text-4xl">Com carinho</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Nosso maior presente é a sua presença. Se desejar nos presentear, criamos cotas simbólicas para nossa nova vida a dois e lua de mel.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {FILTERS.map((f, i) => <Button key={f.label} size="sm" variant={filter === i ? "default" : "outline"} className="rounded-full" onClick={() => setFilter(i)}>{f.label}</Button>)}
          </div>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GIFTS.filter((g) => (FILTERS[filter]?.fn(g.price) ?? true)).map((g) => (
            <Card key={g.id} className="group overflow-hidden p-0">
              <GiftImage index={g.img} className="aspect-[4/3] transition duration-500 group-hover:scale-[1.03]" />
              <div className="p-6">
                <h3 className="text-xl">{g.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-lg font-semibold">{brl(g.price)}</span>
                  <Button size="sm" onClick={() => setSelected(g)}><GiftIcon className="h-4 w-4" /> Presentear os Noivos</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section id="mural" className="bg-secondary/50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center"><p className="eyebrow">Mural de recados</p><h2 className="mt-3 text-4xl">Palavras de carinho</h2></div>
          <div className="mt-12 columns-1 gap-6 sm:columns-2 lg:columns-3">
            {messages.filter((m) => m.visible).map((m) => (
              <Card key={m.id} className="mb-6 break-inside-avoid p-6">
                <MessageSquare className="h-5 w-5 text-gold" />
                <p className="mt-3 font-serif text-lg italic leading-relaxed">“{m.text}”</p>
                <p className="mt-4 text-sm font-medium">{m.guest}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(m.date)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 py-12 text-center text-sm text-muted-foreground">
        <Heart className="mx-auto mb-3 h-5 w-5 text-terracotta" />
        <p className="font-serif text-lg text-foreground">{COUPLE.names}</p>
        <Link to="/admin" className="mt-4 inline-block text-xs underline-offset-4 hover:underline">Painel dos Noivos</Link>
      </footer>

      <GiftDialog gift={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
