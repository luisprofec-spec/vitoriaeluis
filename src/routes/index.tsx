import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Calendar, Check, Clock, Heart, MapPin, ShoppingBag, Menu, ExternalLink } from "lucide-react";
import couple from "@/assets/couple.jpg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GiftPhoto } from "@/components/GiftImage";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { CheckoutDialog } from "@/components/GiftDialog";
import { CartSheet } from "@/components/CartSheet";
import { Postcard } from "@/components/Postcard";
import { RsvpSection } from "@/components/RsvpSection";
import { WeddingLoading } from "@/components/WeddingLoading";
import { useInfoMenus } from "@/lib/guest-data";
import { safeExternalUrl } from "@/lib/wedding-rules";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { brl, useGifts, coupleNames, fmtDate, fmtLongDate, useCart, useMessages, settingsQuery, weddingDate } from "@/lib/wedding";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  pendingComponent: WeddingLoading,
  pendingMs: 0,
  head: ({ loaderData }) => {
    const title = loaderData ? `${coupleNames(loaderData)} · Nosso Casamento` : "Nosso Casamento · Lista de Presentes";
    const image = loaderData?.heroImages[0] || loaderData?.heroImage;
    return {
    meta: [
      { title },
      { name: "description", content: "Celebre conosco: data, local, confirmação de presença, lista de presentes via Pix e mural de recados." },
      { property: "og:title", content: title },
      { property: "og:description", content: "Nosso casamento: data, local, presença, presentes e palavras de carinho." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(image?.startsWith("https://") ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
    ],
  }; },
  component: Index,
});

const FILTERS = [
  { label: "Todos", fn: () => true },
  { label: "Até R$ 100", fn: (p: number) => p <= 100 },
  { label: "R$ 100 a R$ 300", fn: (p: number) => p > 100 && p <= 300 },
  { label: "Acima de R$ 300", fn: (p: number) => p > 300 },
];

function useCountdown(target: Date) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, target.getTime() - (now ?? target.getTime()));
  return { d: Math.floor(diff / 864e5), h: Math.floor(diff / 36e5) % 24, m: Math.floor(diff / 6e4) % 60, ready: now !== null };
}

function Index() {
  const { data: st } = useSuspenseQuery(settingsQuery);
  const names = coupleNames(st);
  const cd = useCountdown(weddingDate(st));
  const [filter, setFilter] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const menus = (useInfoMenus().data ?? []).filter(menu => menu.is_active);
  const cart = useCart();
  const messages = useMessages().filter((m) => m.visible);
  const gifts = useGifts();
  const heroes = st.heroImages.length ? st.heroImages : [st.heroImage || couple];
  const [api, setApi] = useState<CarouselApi>();
  useEffect(() => { if (!api || heroes.length < 2) return; const t = setInterval(() => api.scrollNext(), 5000); return () => clearInterval(t); }, [api, heroes.length]);
  const storyImg = st.storyImage || couple;
  useEffect(() => { document.title = `${names} · Nosso Casamento`; }, [names]);
  const nav = [["#historia", "Nossa História"], ["#evento", "Onde e Quando"], ["#presenca", "Confirmar Presença"], ["#presentes", "Lista de Presentes"], ["#mural", "Mural de Recados"], ...menus.map(menu => [`#menu-${menu.id}`, menu.title])];

  return (
    <div className="min-h-screen bg-background">
      <header className="relative flex min-h-[92vh] flex-col overflow-hidden">
        <Carousel setApi={setApi} opts={{ loop: true }} className="absolute inset-0">
          <CarouselContent className="ml-0">
            {heroes.map((src, i) => (
              <CarouselItem key={src + i} className="pl-0"><img src={src} alt={`Foto ${i + 1} de ${names}`} loading={i ? "lazy" : "eager"} className="h-[92vh] min-h-full w-full object-cover" /></CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/20 to-foreground/70" />
        <nav aria-label="Navegação do casamento" className="relative z-10 mx-auto hidden w-full max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-20 py-6 text-sm text-primary-foreground/90 md:flex">
          {nav.map(([h, l]) => <a key={h} href={h} className="max-w-full break-words hover:text-primary-foreground">{l}</a>)}
        </nav>
        <div className="relative z-10 p-5 md:hidden"><Sheet open={mobileNav} onOpenChange={setMobileNav}><SheetTrigger asChild><Button size="icon" variant="secondary" aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left"><SheetHeader><SheetTitle>{names}</SheetTitle></SheetHeader><nav aria-label="Menu do casamento" className="flex flex-col gap-5 px-6 py-8">{nav.map(([h, l]) => <a key={h} href={h} className="break-words text-sm" onClick={() => setMobileNav(false)}>{l}</a>)}</nav></SheetContent></Sheet></div>
        <div className="pointer-events-none relative z-10 m-auto px-6 text-center text-primary-foreground">
          <p className="eyebrow mb-6">{st.tagline}</p>
          <h1 className="max-w-5xl break-words text-5xl font-medium italic sm:text-6xl md:text-8xl">{names}</h1>
          <p className="mt-6 text-lg tracking-wide first-letter:uppercase">{fmtLongDate(st.date)}</p>
          <div className="mt-10 flex justify-center gap-8">
            {[["Dias", cd.d], ["Horas", cd.h], ["Minutos", cd.m]].map(([l, v]) => (
              <div key={l as string}><div className="font-serif text-4xl md:text-5xl">{cd.ready ? v : "–"}</div><div className="text-xs uppercase tracking-[0.25em] opacity-80">{l}</div></div>
            ))}
          </div>
        </div>
      </header>

      <section id="historia" className="mx-auto grid max-w-5xl items-center gap-12 px-6 py-24 md:grid-cols-2">
        <img src={storyImg} alt="O casal" loading="lazy" width={1600} height={1008} className="aspect-[4/5] w-full rounded-sm object-cover object-[60%]" />
        <div>
          <p className="eyebrow">Nossa história</p>
          <h2 className="mt-3 text-4xl">Como tudo começou</h2>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">{st.story}</p>
          <p className="mt-4 font-serif text-xl italic text-terracotta">— {names}</p>
        </div>
      </section>
      {st.gallery.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {st.gallery.map((src, i) => <img key={i} src={src} alt={`Galeria ${i + 1}`} loading="lazy" className="aspect-square w-full rounded-sm object-cover" />)}
          </div>
        </section>
      )}

      <section id="evento" className="bg-secondary/50 px-6 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <p className="eyebrow">Onde e quando</p>
          <h2 className="mt-3 text-4xl">O grande dia</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[{ t: "Cerimônia", h: st.ceremony.time, p: st.ceremony.place, a: st.ceremony.address }, { t: "Recepção", h: st.reception.time, p: st.reception.place, a: st.reception.address }].map((e) => (
              <Card key={e.t} className="p-8 text-left">
                <h3 className="text-2xl">{e.t}</h3>
                <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gold" /> <span className="first-letter:uppercase">{fmtLongDate(st.date)}</span></p>
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold" /> {e.h}</p>
                  <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-gold" /><span><span className="text-foreground">{e.p}</span><br />{e.a}</span></p>
                </div>
                <Button asChild variant="outline" className="mt-6"><a href={`https://maps.google.com/?q=${encodeURIComponent(e.p + " " + e.a)}`} target="_blank" rel="noreferrer">Ver no Google Maps</a></Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <RsvpSection />

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
          {gifts.filter((g) => (FILTERS[filter]?.fn(g.price) ?? true)).map((g) => (
            <Card key={g.id} className="group overflow-hidden p-0">
              <GiftPhoto gift={g} className="aspect-[4/3] transition duration-500 group-hover:scale-[1.03]" />
              <div className="p-6">
                <p className="eyebrow text-[10px]">{g.category}</p>
                <h3 className="mt-1 text-xl">{g.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-lg font-semibold">{brl(g.price)}</span>
                  {g.unavailable ? <Button size="sm" variant="secondary" disabled>Indisponível</Button> : cart.has(g.id)
                    ? <Button size="sm" variant="secondary" onClick={() => setCartOpen(true)}><Check className="h-4 w-4" /> Na sacola</Button>
                    : <Button size="sm" onClick={() => cart.add(g)}><ShoppingBag className="h-4 w-4" /> Adicionar à Sacola</Button>}
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
              <div key={m.id} className="mb-6 break-inside-avoid">
                <Postcard compact style={m.card_style} text={m.text} from={m.guest} />
                <p className="mt-1 text-right text-xs text-muted-foreground">{fmtDate(m.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {menus.map(menu => <section id={`menu-${menu.id}`} key={menu.id} className="scroll-mt-8 border-t px-6 py-20"><div className={`mx-auto grid max-w-5xl items-center gap-10 ${menu.image_url ? "md:grid-cols-2" : ""}`}>{menu.image_url && <img src={menu.image_url} alt={menu.title} loading="lazy" className="aspect-[4/3] w-full rounded-sm object-cover" />}<div><h2 className="break-words text-4xl">{menu.title}</h2><p className="mt-6 whitespace-pre-line break-words leading-relaxed text-muted-foreground">{menu.content}</p>{safeExternalUrl(menu.link_url) && menu.link_label && <Button asChild variant="outline" className="mt-6 h-auto whitespace-normal py-2"><a href={safeExternalUrl(menu.link_url)} target="_blank" rel="noopener noreferrer">{menu.link_label}<ExternalLink className="h-4 w-4 shrink-0" /></a></Button>}</div></div></section>)}

      <footer className="px-6 py-12 text-center text-sm text-muted-foreground">
        <Heart className="mx-auto mb-3 h-5 w-5 text-terracotta" />
        <p className="font-serif text-lg text-foreground">{names}</p>
        <Link to="/admin" className="mt-4 inline-block text-xs underline-offset-4 hover:underline">Painel dos Noivos</Link>
      </footer>

      <div className="fixed right-5 top-5 z-40"><CartSheet open={cartOpen} onOpenChange={setCartOpen} onCheckout={() => { setCartOpen(false); setCheckout(true); }} /></div>
      <MusicPlayer />
      <CheckoutDialog open={checkout} onClose={() => setCheckout(false)} />
    </div>
  );
}
