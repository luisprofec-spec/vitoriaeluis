import { Flower2, Plane, Heart, PartyPopper } from "lucide-react";
import type { CardStyle } from "@/lib/wedding";

const META: Record<CardStyle, { cls: string; Icon: typeof Heart; title: string }> = {
  floral: { cls: "postcard-floral", Icon: Flower2, title: "Com flores e carinho" },
  honeymoon: { cls: "postcard-honeymoon", Icon: Plane, title: "Boa viagem, pombinhos" },
  minimal: { cls: "postcard-minimal", Icon: Heart, title: "Com amor" },
  party: { cls: "postcard-party", Icon: PartyPopper, title: "Um brinde a vocês!" },
};

export function Postcard({ style, text, from, to, compact = false }: { style: CardStyle; text: string; from: string; to?: string; compact?: boolean }) {
  const { cls, Icon, title } = META[style];
  return (
    <div className={`${cls} relative overflow-hidden rounded-md shadow-sm ${compact ? "p-5" : "aspect-[3/2] p-6"}`}>
      <Icon className="absolute -right-4 -top-4 h-24 w-24 opacity-15" />
      <div className="flex h-full flex-col">
        {!compact && <p className="font-serif text-sm italic opacity-80">{title}</p>}
        {to && <p className="mt-1 text-xs uppercase tracking-[0.25em] opacity-70">Para {to}</p>}
        <p className={`font-serif italic leading-relaxed ${compact ? "text-lg" : "mt-3 flex-1 text-xl"}`}>“{text || "Sua mensagem aparecerá aqui…"}”</p>
        <p className="mt-3 text-sm font-medium">— {from || "Seu nome"}</p>
      </div>
    </div>
  );
}
export function PostcardThumb({ style }: { style: CardStyle }) {
  const { cls, Icon } = META[style];
  return <div className={`${cls} flex aspect-[3/2] items-center justify-center rounded`}><Icon className="h-6 w-6" /></div>;
}
