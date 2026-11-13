import { useState } from "react";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GUEST_NOT_FOUND, findGuest, setGuest, type GuestMatch } from "@/lib/wedding";

/** Asks the visitor's full name and only lets listed guests through. */
export function GuestGate({ onFound }: { onFound?: (g: GuestMatch) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const g = await findGuest(name);
      if (!g) { setError(GUEST_NOT_FOUND); return; }
      setGuest(g); onFound?.(g);
    } catch { setError("Não foi possível consultar a lista agora. Tente novamente."); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="guest-name">Seu nome completo</Label>
        <Input id="guest-name" maxLength={120} autoComplete="name" placeholder="Como está no convite" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy || name.trim().length < 3}><UserCheck className="h-4 w-4" /> {busy ? "Procurando…" : "Identificar-me"}</Button>
    </form>
  );
}
