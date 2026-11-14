import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, FileCheck, MessageCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, contactLink, thankYouMessage, type Contribution, type Settings } from "@/lib/wedding";
import { isConfirmedPayment, isPendingPayment } from "@/lib/wedding-rules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PaymentsManager({ contributions, settings }: { contributions: Contribution[]; settings: Settings }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const filtered = contributions.filter(c => filter === "all" || (filter === "confirmed" ? isConfirmedPayment(c.status) : filter === "pending" ? isPendingPayment(c.status) : c.status === "cancelled"));
  const update = async (c: Contribution, status: "confirmed" | "cancelled") => {
    if (status === "cancelled" && !window.confirm("Cancelar este registro e liberar os presentes?")) return;
    setBusy(c.id); const { error } = await supabase.from("contributions").update({ status }).eq("id", c.id); setBusy(null);
    if (error) { toast.error("Não foi possível atualizar o pagamento."); return; }
    toast.success(status === "confirmed" ? "Pagamento confirmado!" : "Registro cancelado e presentes liberados.");
    await Promise.all([qc.invalidateQueries({ queryKey: ["contributions"] }), qc.invalidateQueries({ queryKey: ["gifts"] })]);
  };
  const proof = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 300);
    if (error || !data) { toast.error("Não foi possível abrir o comprovante."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-2xl">Conferência de pagamentos</h3><Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="Filtrar pagamentos por status" className="w-60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Aguardando Confirmação</SelectItem><SelectItem value="confirmed">Confirmados</SelectItem><SelectItem value="cancelled">Cancelados</SelectItem><SelectItem value="all">Todos</SelectItem></SelectContent></Select></div>
    <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Convidado</TableHead><TableHead>Presentes</TableHead><TableHead>Valor</TableHead><TableHead>Pagamento</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{filtered.map(c => <TableRow key={c.id}><TableCell className="whitespace-nowrap">{fmtDate(c.created_at)}</TableCell><TableCell><p className="font-medium">{c.guest}</p><p className="text-xs text-muted-foreground">{c.contact || "—"}</p></TableCell><TableCell className="min-w-44 max-w-64">{c.items.map(i => i.title).join(", ")}</TableCell><TableCell className="whitespace-nowrap">{brl(Number(c.total))}</TableCell><TableCell>{c.method}{c.transaction_id && <p className="mt-1 max-w-36 break-all text-xs text-muted-foreground">{c.transaction_id}</p>}{c.proof && <Button size="sm" variant="outline" className="mt-2" onClick={() => c.proof && proof(c.proof)}><FileCheck className="h-4 w-4" />Comprovante</Button>}</TableCell><TableCell><Badge variant={isConfirmedPayment(c.status) ? "default" : "secondary"}>{isConfirmedPayment(c.status) ? "Confirmado" : isPendingPayment(c.status) ? "Aguardando Confirmação" : "Cancelado"}</Badge></TableCell><TableCell><div className="flex min-w-52 flex-col items-end gap-2">{isPendingPayment(c.status) && <><Button size="sm" disabled={busy === c.id} onClick={() => update(c, "confirmed")}><CheckCircle className="h-4 w-4" />Confirmar Pagamento</Button><Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => update(c, "cancelled")}><XCircle className="h-4 w-4" />Cancelar / Liberar Presente</Button></>}{c.contact && <Button size="sm" variant="ghost" asChild><a href={contactLink(c.contact, thankYouMessage(c.guest, c.items.map(i => i.title), settings))} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />Agradecer no WhatsApp</a></Button>}</div></TableCell></TableRow>)}{!filtered.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum pagamento neste status.</TableCell></TableRow>}</TableBody></Table></div>
  </div>;
}