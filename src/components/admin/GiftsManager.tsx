import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GiftPhoto } from "@/components/GiftImage";
import { uploadPhoto } from "@/components/admin/IdentityForm";
import { brl, useGifts, type Gift } from "@/lib/wedding";

type Draft = { id?: string; title: string; price: string; category: string; description: string; image_url: string; sprite_index: number | null };
const empty: Draft = { title: "", price: "", category: "", description: "", image_url: "", sprite_index: null };

export function GiftsManager() {
  const gifts = useGifts();
  const qc = useQueryClient();
  const [d, setD] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["gifts"] });
  const save = async () => {
    if (!d) return;
    const price = Number(d.price.replace(",", "."));
    if (!d.title.trim() || !(price > 0)) { toast.error("Informe título e valor."); return; }
    setBusy(true);
    const row = { title: d.title.trim(), price, category: d.category.trim() || "Geral", description: d.description.trim(), image_url: d.image_url.trim(), sprite_index: d.image_url.trim() ? null : d.sprite_index };
    const { error } = d.id ? await supabase.from("gifts").update(row).eq("id", d.id) : await supabase.from("gifts").insert({ ...row, sort: gifts.length + 1 });
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar."); return; }
    toast.success("Presente salvo!"); setD(null); refresh();
  };
  const del = async (g: Gift) => {
    if (!confirm(`Excluir "${g.title}"?`)) return;
    const { error } = await supabase.from("gifts").delete().eq("id", g.id);
    if (error) { toast.error("Não foi possível excluir."); return; }
    toast.success("Presente excluído."); refresh();
  };
  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between"><h3 className="text-xl">Catálogo de presentes</h3><Button onClick={() => setD(empty)}><Plus className="h-4 w-4" /> Novo Presente</Button></div>
      <div className="divide-y">
        {gifts.map((g) => (
          <div key={g.id} className="flex items-center gap-4 py-3">
            <GiftPhoto gift={g} className="h-14 w-20 shrink-0 rounded" />
            <div className="flex-1"><p className="font-medium">{g.title}</p><p className="text-xs text-muted-foreground">{g.category} · {brl(g.price)}</p></div>
            <Button size="sm" variant="outline" onClick={() => setD({ id: g.id, title: g.title, price: String(g.price), category: g.category, description: g.description, image_url: g.image_url, sprite_index: g.sprite_index })}><Pencil className="h-4 w-4" /> Editar</Button>
            <Button size="sm" variant="ghost" onClick={() => del(g)}><Trash2 className="h-4 w-4" /> Excluir</Button>
          </div>
        ))}
      </div>
      <Dialog open={!!d} onOpenChange={(o) => !o && setD(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{d?.id ? "Editar presente" : "Novo presente"}</DialogTitle></DialogHeader>
          {d && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="gt">Título</Label><Input id="gt" maxLength={120} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="gp">Valor (R$)</Label><Input id="gp" inputMode="decimal" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="gc">Categoria</Label><Input id="gc" maxLength={40} value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="gd">Descrição</Label><Input id="gd" maxLength={200} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="gi">URL da imagem</Label>
                <div className="flex gap-2"><Input id="gi" placeholder="https://…" value={d.image_url} onChange={(e) => setD({ ...d, image_url: e.target.value })} />
                  <Button asChild variant="outline"><label className="cursor-pointer"><Upload className="h-4 w-4" />Enviar
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const url = await uploadPhoto(f); setD((p) => p && { ...p, image_url: url }); } catch { toast.error("Falha no envio."); } }} /></label></Button>
                </div>
              </div>
              <GiftPhoto gift={{ ...d, title: d.title }} className="aspect-[4/3] w-full rounded" />
              <Button className="w-full" disabled={busy} onClick={save}>Salvar presente</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
