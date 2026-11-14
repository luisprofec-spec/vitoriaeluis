import { useState } from "react";
import { Check, Heart, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/integrations/supabase/types";

type Match = Database["public"]["Functions"]["find_guest"]["Returns"][number];
export function RsvpSection() {
  const [name, setName] = useState("");
  const [matchedName, setMatchedName] = useState("");
  const [guest, setGuest] = useState<Match | null>(null);
  const [attending, setAttending] = useState(true);
  const [companions, setCompanions] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const search = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    const { data, error: failure } = await supabase.rpc("find_guest", { _name: name });
    setBusy(false);
    if (failure) { setError("Não foi possível consultar a lista. Tente novamente."); return; }
    const found = data?.[0];
    if (!found) { setGuest(null); setError("Seu nome não foi encontrado na lista de convidados. Verifique se digitou seu nome completo corretamente ou fale com os noivos."); return; }
    setGuest(found); setMatchedName(name); setAttending(found.rsvp_status !== "declined"); setCompanions(Math.max(0, found.confirmed_guests_count - 1));
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!guest) return;
    setBusy(true);
    const { error: failure } = await supabase.rpc("guest_rsvp", { _id: guest.id, _name: matchedName, _attending: attending, _companions: attending ? companions : 0 });
    setBusy(false);
    if (failure) { toast.error("Não foi possível salvar. Confira os acompanhantes e tente novamente."); return; }
    setSaved(true); toast.success("Resposta de presença salva!");
  };
  return <section id="presenca" className="scroll-mt-8 bg-secondary/50 px-6 py-20">
    <div className="mx-auto max-w-lg">
      <div className="mb-8 text-center"><p className="eyebrow">Sua presença</p><h2 className="mt-3 text-4xl">Confirmar Presença</h2><Heart className="mx-auto mt-4 h-5 w-5 text-terracotta" /></div>
      {!guest ? <form onSubmit={search} className="space-y-4"><div className="space-y-2"><Label htmlFor="rsvp-name">Nome Completo</Label><Input id="rsvp-name" autoComplete="name" required minLength={3} maxLength={160} value={name} onChange={e => setName(e.target.value)} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy} className="w-full"><Search className="h-4 w-4" />{busy ? "Consultando…" : "Buscar meu nome"}</Button></form> :
        saved ? <div role="status" className="space-y-4 text-center"><Check className="mx-auto h-8 w-8 text-success" /><h3 className="text-2xl">{guest.full_name}</h3><p>{attending ? `Presença confirmada para ${1 + companions} ${companions ? "pessoas" : "pessoa"}.` : "Resposta registrada: não poderei ir."}</p><Button variant="outline" onClick={() => setSaved(false)}>Alterar resposta</Button><Button variant="ghost" onClick={() => { setGuest(null); setName(""); }}>Outro convidado</Button></div> :
        <form onSubmit={save} className="space-y-5"><h3 className="text-center text-2xl">{guest.full_name}</h3><div className="grid gap-2 sm:grid-cols-2"><Button type="button" variant={attending ? "default" : "outline"} aria-pressed={attending} onClick={() => setAttending(true)}>Confirmar presença</Button><Button type="button" variant={attending ? "outline" : "default"} aria-pressed={!attending} onClick={() => setAttending(false)}>Não poderei ir</Button></div>{attending && <div className="space-y-2"><Label htmlFor="rsvp-companions">Acompanhantes (até {guest.allowed_companions})</Label><Input id="rsvp-companions" type="number" min={0} max={guest.allowed_companions} step={1} value={companions} onChange={e => setCompanions(Number(e.target.value))} required /></div>}<Button className="w-full" disabled={busy || companions < 0 || companions > guest.allowed_companions || !Number.isInteger(companions)} type="submit">{busy ? "Salvando…" : "Salvar resposta"}</Button><Button className="w-full" variant="ghost" type="button" onClick={() => { setGuest(null); setError(""); }}>Buscar outro nome</Button></form>}
    </div>
  </section>;
}