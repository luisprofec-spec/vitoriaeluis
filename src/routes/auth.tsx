import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Entrar · Painel dos Noivos" }, { name: "description", content: "Acesso ao painel dos noivos." },
    { property: "og:title", content: "Entrar · Painel dos Noivos" }, { property: "og:description", content: "Acesso ao painel dos noivos." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState(false);
  useEffect(() => { setInvited(new URLSearchParams(window.location.search).has("invite")); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) { toast.error("E-mail ou senha incorretos."); return; }
      nav({ to: "/admin" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
      setMode("in");
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-sm p-8">
        <p className="eyebrow text-center">Painel dos noivos</p>
        <h1 className="mt-2 text-center text-3xl">{mode === "in" ? "Entrar" : "Criar conta"}</h1>
        {invited && <p className="mt-3 text-center text-sm text-muted-foreground">Convite para administrar o casamento</p>}
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <div className="space-y-1.5"><Label htmlFor="e">E-mail</Label><Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="p">Senha</Label><Input id="p" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button className="w-full" type="submit" disabled={busy}>{mode === "in" ? "Entrar" : "Criar conta"}</Button>
        </form>
        <Button variant="ghost" className="mt-4 w-full text-center text-xs text-muted-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Primeiro acesso? Criar conta dos noivos" : "Já tenho conta"}
        </Button>
      </Card>
    </div>
  );
}
