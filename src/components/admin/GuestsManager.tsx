import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { guestsQuery, type Guest } from "@/lib/guest-data";
import { guestSchema, guestSummary, guestCsv, normalizeGuestName, parseGuestBatch } from "@/lib/wedding-rules";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statuses: Record<string, string> = { pending: "Pendente", confirmed: "Confirmado", declined: "Não irá" };
type Draft = { id?: string; full_name: string; phone: string; allowed_companions: number; confirmed_companions: number; rsvp_status: "pending" | "confirmed" | "declined" };
const blank: Draft = { full_name: "", phone: "", allowed_companions: 0, confirmed_companions: 0, rsvp_status: "pending" };
export function GuestsManager() {
  const query = useQuery(guestsQuery);
  const guests = query.data ?? [];
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [batch, setBatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const summary = guestSummary(guests);
  const filtered = guests.filter(g => normalizeGuestName(g.full_name).includes(normalizeGuestName(search)) && (status === "all" || g.rsvp_status === status));
  const refresh = () => qc.invalidateQueries({ queryKey: ["guests"] });
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!draft) return;
    const row = guestSchema.safeParse({ ...draft, confirmed_companions: draft.rsvp_status === "confirmed" ? draft.confirmed_companions : 0 });
    if (!row.success) { toast.error("Confira o nome e o limite de acompanhantes."); return; }
    if (guests.some(g => g.id !== draft.id && normalizeGuestName(g.full_name) === normalizeGuestName(draft.full_name))) { toast.error("Esse nome já está na lista."); return; }
    setBusy(true);
    const { error } = draft.id ? await supabase.from("guests").update(row.data).eq("id", draft.id) : await supabase.from("guests").insert(row.data);
    setBusy(false); if (error) { toast.error("Não foi possível salvar o convidado."); return; }
    setDraft(null); toast.success("Convidado salvo!"); refresh();
  };
  const importBatch = async () => {
    try {
      const rows = parseGuestBatch(batch ?? "");
      if (!rows.length) return;
      if (rows.some(row => guests.some(g => normalizeGuestName(g.full_name) === normalizeGuestName(row.full_name)))) { toast.error("Um dos nomes já está na lista. Remova os repetidos."); return; }
      setBusy(true); const { error } = await supabase.from("guests").insert(rows); if (error) throw error;
      setBatch(null); toast.success(`${rows.length} convidados importados!`); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha na importação."); } finally { setBusy(false); }
  };
  const remove = async (guest: Guest) => {
    if (!window.confirm(`Excluir ${guest.full_name} da lista?`)) return;
    const { error } = await supabase.from("guests").delete().eq("id", guest.id);
    if (error) { toast.error("Não foi possível excluir."); return; } toast.success("Convidado excluído."); refresh();
  };
  const exportCsv = () => { const url = URL.createObjectURL(new Blob([guestCsv(filtered)], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "lista-convidados.csv"; link.click(); URL.revokeObjectURL(url); };
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-3">{[["Total de Convidados", summary.total], ["Total Confirmados", summary.confirmed], ["Total Pendentes", summary.pending]].map(([label, value]) => <Card key={label} className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-serif text-3xl">{value}</p></Card>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-2xl"><Users className="h-5 w-5 text-gold" />Lista de Convidados</h3><div className="flex flex-wrap gap-2"><Button onClick={() => setDraft(blank)}><Plus className="h-4 w-4" />Novo Convidado</Button><Button variant="outline" onClick={() => setBatch("")}>Importar em lote</Button><Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Exportar Lista (CSV)</Button></div></div>
    <div className="flex flex-wrap gap-3"><Input aria-label="Buscar convidado" placeholder="Buscar por nome" className="max-w-sm" value={search} onChange={e => setSearch(e.target.value)} /><Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Filtrar convidados por status" className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="confirmed">Confirmados</SelectItem><SelectItem value="pending">Pendentes</SelectItem><SelectItem value="declined">Não irão</SelectItem></SelectContent></Select></div>
    {query.isError ? <p role="alert" className="text-destructive">Não foi possível carregar a lista.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead>Acompanhantes</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filtered.map(g => <TableRow key={g.id}><TableCell className="font-medium">{g.full_name}</TableCell><TableCell>{g.phone || "—"}</TableCell><TableCell>{g.confirmed_companions} / {g.allowed_companions}</TableCell><TableCell><Badge variant={g.rsvp_status === "confirmed" ? "default" : "secondary"}>{statuses[g.rsvp_status]}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" title="Editar convidado" aria-label={`Editar ${g.full_name}`} onClick={() => setDraft({ ...g, phone: g.phone ?? "", rsvp_status: g.rsvp_status as Draft["rsvp_status"] })}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Excluir convidado" aria-label={`Excluir ${g.full_name}`} onClick={() => remove(g)}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}{!filtered.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{query.isLoading ? "Carregando…" : "Nenhum convidado encontrado."}</TableCell></TableRow>}</TableBody></Table></div>}
    <Dialog open={draft !== null} onOpenChange={open => { if (!open) setDraft(null); }}><DialogContent><DialogHeader><DialogTitle>{draft?.id ? "Editar Convidado" : "Novo Convidado"}</DialogTitle><DialogDescription>Lista de presença do casamento</DialogDescription></DialogHeader>{draft && <form onSubmit={save} className="space-y-4"><div className="space-y-2"><Label htmlFor="guest-full-name">Nome completo</Label><Input id="guest-full-name" required maxLength={160} value={draft.full_name} onChange={e => setDraft({ ...draft, full_name: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="guest-phone">Telefone (opcional)</Label><Input id="guest-phone" type="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="guest-limit">Máximo de acompanhantes</Label><Input id="guest-limit" type="number" min={0} step={1} required value={draft.allowed_companions} onChange={e => setDraft({ ...draft, allowed_companions: Number(e.target.value) })} /></div>{draft.id && <><Select value={draft.rsvp_status} onValueChange={value => setDraft({ ...draft, rsvp_status: value as Draft["rsvp_status"] })}><SelectTrigger aria-label="Status de presença"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statuses).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>{draft.rsvp_status === "confirmed" && <div className="space-y-2"><Label htmlFor="guest-confirmed">Acompanhantes confirmados</Label><Input id="guest-confirmed" type="number" min={0} max={draft.allowed_companions} step={1} value={draft.confirmed_companions} onChange={e => setDraft({ ...draft, confirmed_companions: Number(e.target.value) })} /></div>}</>}<Button disabled={busy} type="submit" className="w-full">Salvar Convidado</Button></form>}</DialogContent></Dialog>
    <Dialog open={batch !== null} onOpenChange={open => { if (!open) setBatch(null); }}><DialogContent><DialogHeader><DialogTitle>Importar convidados em lote</DialogTitle><DialogDescription>Nomes do casamento</DialogDescription></DialogHeader><Label htmlFor="guest-batch">Nomes (um por linha)</Label><Textarea id="guest-batch" rows={8} placeholder={"João Silva; 2\nMaria Souza"} value={batch ?? ""} onChange={e => setBatch(e.target.value)} /><Button disabled={busy || !batch?.trim()} onClick={importBatch}>Importar Convidados</Button></DialogContent></Dialog>
  </div>;
}