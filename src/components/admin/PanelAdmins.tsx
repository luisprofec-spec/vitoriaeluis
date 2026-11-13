import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function PanelAdmins() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["panel-admins"], queryFn: async () => {
    const { data, error } = await supabase.from("panel_admins").select("*").order("created_at");
    if (error) throw error; return data;
  } }).data ?? [];
  const [email, setEmail] = useState("");
  const link = typeof window !== "undefined" ? `${window.location.origin}/auth` : "/auth";
  const copy = async (e: string) => { await navigator.clipboard.writeText(`Você foi convidado(a) para administrar nosso site de casamento! Crie sua conta ou entre com o e-mail ${e} em: ${link}`); toast.success("Convite copiado!"); };
  const invite = async () => {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) { toast.error("E-mail inválido."); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("panel_admins").insert({ email: e, invited_by: u.user?.id });
    if (error) { toast.error(error.code === "23505" ? "Este e-mail já foi convidado." : "Não foi possível convidar."); return; }
    toast.success("Convite gerado!"); setEmail(""); copy(e); qc.invalidateQueries({ queryKey: ["panel-admins"] });
  };
  const revoke = async (id: string) => {
    if (!confirm("Revogar o acesso deste administrador?")) return;
    const { error } = await supabase.rpc("revoke_panel_admin", { _id: id });
    if (error) { toast.error("Não foi possível revogar."); return; }
    qc.invalidateQueries({ queryKey: ["panel-admins"] });
  };
  return (
    <Card className="mt-6 space-y-4 p-6">
      <div><h3 className="text-2xl">Administradores do Painel / Convide seu Administrador</h3>
        <p className="mt-1 text-sm text-muted-foreground">A pessoa convidada recebe acesso total ao painel ao criar conta ou entrar com este e-mail.</p></div>
      <div className="flex gap-2"><Input type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} /><Button onClick={invite}><UserPlus className="h-4 w-4" /> Gerar Convite / Adicionar Administrador</Button></div>
      <div className="divide-y">
        {list.map((a) => (
          <div key={a.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="flex-1">{a.email}</span>
            <Badge variant={a.status === "active" ? "default" : "secondary"} className={a.status === "active" ? "bg-success" : ""}>{a.status === "active" ? "Ativo" : "Convidado"}</Badge>
            <Button size="icon" variant="ghost" aria-label="Copiar convite" onClick={() => copy(a.email)}><Copy className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Revogar" onClick={() => revoke(a.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {!list.length && <p className="py-2 text-sm text-muted-foreground">Nenhum convite ainda.</p>}
      </div>
    </Card>
  );
}
