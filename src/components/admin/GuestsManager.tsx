import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { normName } from "@/lib/wedding";

type Guest = { id: string; full_name: string; phone: string | null; allowed_companions: number; rsvp_status: string; confirmed_guests_count: number };
const STATUS: Record<string, string> = { pending: "Pendente", confirmed: "Confirmado", declined: "Não vai" };
const FILTERS = [["all", "Todos"], ["confirmed", "Confirmados"], ["pending", "Pendentes"], ["declined", "Não irão"]] as const;

export function GuestsManager() {
  const qc = useQueryClient();
  const guests = useQuery({ queryKey: ["guests"], queryFn: async () => {
    const { data, error } = await supabase.from("guests").select("*").order("full_name");
    if (error) throw error; return data as Guest[];
  } }).data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["guests"] });
  const [q, setQ] = useState(""); const [filter, setFilter] = useState<string>("all");
  const [edit, setEdit] = useState<Partial<Guest> | null>(null);
  const [bulk, setBulk] = useState("");
  const shown = guests.filter((g) => (filter === "all" || g.rsvp_status === filter) && normName(g.full_name).includes(normName(q)));
  const save = async () => {
    if (!edit?.full_name?.trim()) return;
    const row = { full_name: edit.full_name.trim(), phone: edit.phone?.trim() || null, allowed_companions: Math.max(0, Number(edit.allowed_companions) || 0) };
    const { error } = edit.id ? await supabase.from("guests").update({ ...row, updated_at: new Date().toISOString() }).eq("id", edit.id) : await supabase.from("guests").insert(row);
    if (error) { toast.error("Não foi possível salvar."); return; }
    toast.success("Convidado salvo."); setEdit(null); refresh();
  };
  const importBulk = async () => {
    const existing = new Set(guests.map((g) => normName(g.full_name)));
    const names = [...new Set(bulk.split("\n").map((l) => l.trim().replace(/\s+/g, " ")).filter((l) => l.length >= 3))].filter((n) => !existing.has(normName(n)));
    if (!names.length) { toast.info("Nenhum nome novo para importar."); return; }
    const { error } = await supabase.from("guests").insert(names.map((full_name) => ({ full_name })));
    if (error) { toast.error("Falha na importação."); return; }
    toast.success(`${names.length} convidados importados.`); setBulk(""); refresh();
  };
  const del = async (g: Guest) => { if (!confirm(`Excluir ${g.full_name}?`)) return; await supabase.from("guests").delete().eq("id", g.id); refresh(); };
  const stats = [["Convidados na lista", guests.length], ["Confirmados", guests.filter((g) => g.rsvp_status === "confirmed").length], ["Pendentes", guests.filter((g) => g.rsvp_status === "pending").length], ["Pessoas confirmadas", guests.reduce((s, g) => s + g.confirmed_guests_count, 0)]];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map(([l, v]) => <Card key={l} className="p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4 text-gold" />{l}</div><div className="mt-2 font-serif text-3xl">{v}</div></Card>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3 p-5 lg:col-span-1">
          <h3 className="text-xl">Importação rápida</h3>
          <Textarea rows={6} placeholder={"Um nome completo por linha\nMaria Silva\nJoão Souza"} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <Button className="w-full" variant="outline" disabled={!bulk.trim()} onClick={importBulk}>Importar nomes</Button>
          <Button className="w-full" onClick={() => setEdit({ allowed_companions: 0 })}><Plus className="h-4 w-4" /> Adicionar convidado</Button>
        </Card>
        <Card className="space-y-3 p-5 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-xs" placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} />
            {FILTERS.map(([v, l]) => <Button key={v} size="sm" variant={filter === v ? "default" : "outline"} onClick={() => setFilter(v)}>{l}</Button>)}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead>Acomp.</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {shown.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.full_name}</TableCell>
                    <TableCell>{g.phone || "—"}</TableCell>
                    <TableCell>{g.allowed_companions}</TableCell>
                    <TableCell><Badge variant={g.rsvp_status === "confirmed" ? "default" : "secondary"} className={g.rsvp_status === "confirmed" ? "bg-success" : ""}>{STATUS[g.rsvp_status]}{g.rsvp_status === "confirmed" ? ` · ${g.confirmed_guests_count}` : ""}</Badge></TableCell>
                    <TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit(g)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => del(g)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                ))}
                {!shown.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum convidado.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar convidado" : "Novo convidado"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nome completo</Label><Input maxLength={120} value={edit?.full_name ?? ""} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Telefone (opcional)</Label><Input maxLength={30} value={edit?.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Acompanhantes permitidos</Label><Input type="number" min={0} value={edit?.allowed_companions ?? 0} onChange={(e) => setEdit({ ...edit, allowed_companions: Number(e.target.value) })} /></div>
            <Button className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
