import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PIX_TYPES, useSaveSettings, type Settings, type Venue } from "@/lib/wedding";

function F({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [s, setS] = useState(settings);
  useEffect(() => setS(settings), [settings]);
  const save = useSaveSettings();
  const venue = (k: "ceremony" | "reception", f: keyof Venue, v: string) => setS({ ...s, [k]: { ...s[k], [f]: v } });
  return (
    <Card className="space-y-8 p-6">
      <section className="space-y-4"><h3 className="text-xl">Pix</h3>
        <div className="grid gap-4 md:grid-cols-[200px_1fr_200px]">
          <F label="Tipo de chave"><Select value={s.pixType} onValueChange={(v) => setS({ ...s, pixType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PIX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></F>
          <F label="Chave Pix"><Input value={s.pixKey} onChange={(e) => setS({ ...s, pixKey: e.target.value })} /></F>
          <F label="Cidade (para o Pix)"><Input maxLength={15} value={s.pixCity} onChange={(e) => setS({ ...s, pixCity: e.target.value })} /></F>
        </div>
      </section>
      <section className="space-y-4"><h3 className="text-xl">Contato e links de pagamento</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <F label="WhatsApp dos noivos (com DDD)"><Input value={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} /></F>
          <F label="Link de cartão de crédito"><Input placeholder="https://" value={s.cardLink} onChange={(e) => setS({ ...s, cardLink: e.target.value })} /></F>
          <F label="Link de boleto"><Input placeholder="https://" value={s.boletoLink} onChange={(e) => setS({ ...s, boletoLink: e.target.value })} /></F>
        </div>
        <F label="Meta de arrecadação (R$)"><Input type="number" className="max-w-xs" value={s.goal} onChange={(e) => setS({ ...s, goal: Number(e.target.value) || 0 })} /></F>
      </section>
      <section className="space-y-4"><h3 className="text-xl">Data e locais</h3>
        <F label="Data do casamento"><Input type="date" className="max-w-xs" value={s.date} onChange={(e) => setS({ ...s, date: e.target.value })} /></F>
        {(["ceremony", "reception"] as const).map((k) => (
          <div key={k} className="grid gap-4 md:grid-cols-[140px_1fr_1fr]">
            <F label={`Horário ${k === "ceremony" ? "cerimônia" : "recepção"}`}><Input type="time" value={s[k].time} onChange={(e) => venue(k, "time", e.target.value)} /></F>
            <F label="Local"><Input value={s[k].place} onChange={(e) => venue(k, "place", e.target.value)} /></F>
            <F label="Endereço"><Input value={s[k].address} onChange={(e) => venue(k, "address", e.target.value)} /></F>
          </div>
        ))}
      </section>
      <section className="space-y-4"><h3 className="text-xl">Trilha Sonora dos Noivos</h3>
        <div className="flex items-center gap-3"><Switch id="me" checked={s.musicEnabled} onCheckedChange={(v) => setS({ ...s, musicEnabled: v })} /><Label htmlFor="me">Ativar Música de Fundo</Label></div>
        <div className="grid gap-4 md:grid-cols-2">
          <F label="Título da Música / Artista"><Input placeholder="Nossa Trilha Sonora 🎵" value={s.musicTitle} onChange={(e) => setS({ ...s, musicTitle: e.target.value })} /></F>
          <F label="Link do Arquivo de Áudio (.mp3, rádio ou CDN)"><Input placeholder="https://…/musica.mp3" value={s.musicUrl} onChange={(e) => setS({ ...s, musicUrl: e.target.value })} /></F>
        </div>
        <div className="flex items-center gap-3"><Switch id="ml" checked={s.musicLoop} onCheckedChange={(v) => setS({ ...s, musicLoop: v })} /><Label htmlFor="ml">Repetir continuamente (loop)</Label></div>
        {s.musicUrl && <audio controls src={s.musicUrl} className="w-full" preload="none" />}
      </section>
      <Button onClick={async () => { try { await save(s); toast.success("Configurações salvas!"); } catch { toast.error("Não foi possível salvar."); } }}>Salvar Configurações</Button>
    </Card>
  );
}
