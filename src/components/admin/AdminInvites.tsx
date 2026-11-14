import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, ShieldCheck, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inviteSchema, canRevokeAdmin } from "@/lib/wedding-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function AdminInvites() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const query = useQuery({ queryKey: ["panel-admins"], queryFn: async () => {
    const [{ data, error }, session] = await Promise.all([supabase.from("panel_admins").select("*").order("created_at"), supabase.auth.getUser()]);
    if (error) throw error;
    return { admins: data ?? [], userId: session.data.user?.id ?? "", ownEmail: session.data.user?.email ?? "" };
  } });
  const inviteLink = (token: string) => `${window.location.origin}/auth?invite=${encodeURIComponent(token)}`;
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); toast.success("Link de convite copiado!"); } catch { setLink(value); toast.error("Não foi possível copiar automaticamente. Selecione o link."); } };
  const invite = async (event: React.FormEvent) => {
    event.preventDefault(); const parsed = inviteSchema.safeParse({ email });
    if (!parsed.success || !query.data?.userId) { toast.error("Informe um e-mail válido."); return; }
    if (parsed.data.email === query.data.ownEmail.toLowerCase()) { toast.error("Você já tem acesso ao painel."); return; }
    const existing = query.data.admins.find(a => a.email.toLowerCase() === parsed.data.email);
    if (existing) { setLink(inviteLink(existing.token)); toast.info(existing.status === "active" ? "Este administrador já tem acesso." : "Já existe um convite para este e-mail."); return; }
    setBusy(true);
    const { data, error } = await supabase.from("panel_admins").insert({ email: parsed.data.email, invited_by: query.data.userId, status: "invited" }).select("token").single();
    setBusy(false);
    if (error || !data) { toast.error("Não foi possível criar o convite."); return; }
    const url = inviteLink(data.token); setLink(url); setEmail(""); toast.success("Convite criado!"); qc.invalidateQueries({ queryKey: ["panel-admins"] });
  };
  const revoke = async (id: string, userId: string | null) => {
    if (!canRevokeAdmin(query.data?.userId ?? "", userId)) return;
    if (!window.confirm("Revogar o acesso deste administrador?")) return;
    const { error } = await supabase.rpc("revoke_panel_admin", { _id: id });
    if (error) { toast.error("Não foi possível revogar o acesso."); return; }
    setLink(""); toast.success("Acesso revogado."); qc.invalidateQueries({ queryKey: ["panel-admins"] });
  };
  return <section className="space-y-5 border-t pt-8">
    <h3 className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5 text-gold" />Convide seu Administrador</h3>
    <form onSubmit={invite} className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1 space-y-2"><Label htmlFor="admin-email">E-mail do(a) parceiro(a)</Label><Input id="admin-email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></div><Button disabled={busy} type="submit"><Mail className="h-4 w-4" />Convidar Administrador</Button></form>
    {link && <div className="flex gap-2"><Input aria-label="Link direto de convite" value={link} readOnly /><Button type="button" size="icon" variant="outline" title="Copiar link de convite" aria-label="Copiar link de convite" onClick={() => copy(link)}><Copy className="h-4 w-4" /></Button></div>}
    {query.isError && <p role="alert" className="text-destructive">Não foi possível carregar os administradores.</p>}
    <div className="divide-y">{query.data?.ownEmail && <div className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="break-all text-sm">{query.data.ownEmail}</span><Badge>Você · Ativo</Badge></div>}{query.data?.admins.filter(a => a.user_id !== query.data?.userId).map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-all text-sm">{a.email}</p><Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status === "active" ? "Ativo" : "Convite pendente"}</Badge></div><div className="flex gap-2">{a.status === "invited" && <Button type="button" size="icon" variant="outline" title="Copiar convite" aria-label={`Copiar convite de ${a.email}`} onClick={() => copy(inviteLink(a.token))}><Copy className="h-4 w-4" /></Button>}<Button type="button" size="sm" variant="ghost" onClick={() => revoke(a.id, a.user_id)}><UserMinus className="h-4 w-4" />Revogar</Button></div></div>)}</div>
  </section>;
}