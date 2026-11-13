import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GuestGate } from "@/components/GuestGate";
import { sendRsvp, setGuest, useGuest } from "@/lib/wedding";

export function RsvpSection() {
  const g = useGuest();
  const [companions, setCompanions] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (g) setCompanions(Math.max(0, Math.min(g.allowed_companions, g.confirmed_guests_count - 1))); }, [g]);
  const answer = async (attending: boolean) => {
    if (!g) return; setBusy(true);
    try {
      await sendRsvp(g, attending, companions);
      setGuest({ ...g, rsvp_status: attending ? "confirmed" : "declined", confirmed_guests_count: attending ? 1 + companions : 0 });
      toast.success(attending ? "Presença confirmada! Mal podemos esperar." : "Que pena! Obrigado por avisar.");
    } catch { toast.error("Não foi possível registrar. Tente novamente."); }
    finally { setBusy(false); }
  };
  return (
    <section id="rsvp" className="px-6 py-24">
      <div className="mx-auto max-w-lg text-center">
        <p className="eyebrow">Confirmação de presença</p>
        <h2 className="mt-3 text-4xl">Você vem?</h2>
        <Card className="mt-10 p-8 text-left">
          {!g ? (
            <><p className="mb-4 text-sm text-muted-foreground">Digite seu nome completo para encontrarmos seu convite.</p><GuestGate /></>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="font-serif text-2xl">Olá, {g.full_name.split(" ")[0]}!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {g.rsvp_status === "confirmed" ? `Presença confirmada para ${g.confirmed_guests_count} ${g.confirmed_guests_count === 1 ? "pessoa" : "pessoas"}.` : g.rsvp_status === "declined" ? "Você informou que não poderá ir." : "Conte para a gente se poderá comparecer."}
                </p>
              </div>
              {g.allowed_companions > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="comp">Acompanhantes (até {g.allowed_companions})</Label>
                  <Input id="comp" type="number" min={0} max={g.allowed_companions} value={companions} onChange={(e) => setCompanions(Math.max(0, Math.min(g.allowed_companions, Number(e.target.value) || 0)))} />
                </div>
              )}
              <div className="flex gap-2">
                <Button className="flex-1" disabled={busy} onClick={() => answer(true)}>Vou comparecer</Button>
                <Button className="flex-1" variant="outline" disabled={busy} onClick={() => answer(false)}>Não poderei ir</Button>
              </div>
              <button className="w-full text-center text-xs text-muted-foreground hover:underline" onClick={() => setGuest(null)}>Não é você? Trocar convidado</button>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
