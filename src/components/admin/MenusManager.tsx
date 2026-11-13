import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadPhoto } from "@/components/admin/IdentityForm";
import { menusQuery, type CustomMenu } from "@/lib/wedding";

export function MenusManager() {
  const qc = useQueryClient();
  const menus = useQuery(menusQuery).data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["menus"] });
  const [edit, setEdit] = useState<Partial<CustomMenu> | null>(null);
  const save = async () => {
    if (!edit?.title?.trim()) return;
    const row = { title: edit.title.trim(), content: edit.content ?? "", image_url: edit.image_url ?? "", is_active: edit.is_active ?? true };
    const { error } = edit.id ? await supabase.from("custom_menus").update(row).eq("id", edit.id)
      : await supabase.from("custom_menus").insert({ ...row, display_order: (menus.at(-1)?.display_order ?? 0) + 1 });
    if (error) { toast.error("Não foi possível salvar."); return; }
    toast.success("Menu salvo."); setEdit(null); refresh();
  };
  const move = async (i: number, d: number) => {
    const a = menus[i], b = menus[i + d]; if (!a || !b) return;
    await Promise.all([supabase.from("custom_menus").update({ display_order: i + d }).eq("id", a.id), supabase.from("custom_menus").update({ display_order: i }).eq("id", b.id)]);
    refresh();
  };
  const toggle = async (m: CustomMenu) => { await supabase.from("custom_menus").update({ is_active: !m.is_active }).eq("id", m.id); refresh(); };
  const del = async (m: CustomMenu) => { if (!confirm(`Excluir "${m.title}"?`)) return; await supabase.from("custom_menus").delete().eq("id", m.id); refresh(); };
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><p className="text-sm text-muted-foreground">Menus ativos aparecem no topo do site e como seções informativas.</p><Button onClick={() => setEdit({ is_active: true })}><Plus className="h-4 w-4" /> Novo menu</Button></div>
      {menus.map((m, i) => (
        <Card key={m.id} className="flex items-center gap-4 p-4">
          {m.image_url && <img src={m.image_url} alt="" className="h-14 w-14 rounded object-cover" />}
          <div className="min-w-0 flex-1"><p className="font-medium">{m.title}</p><p className="truncate text-sm text-muted-foreground">{m.content}</p></div>
          <Switch checked={m.is_active} onCheckedChange={() => toggle(m)} aria-label="Ativo" />
          <Button size="icon" variant="ghost" aria-label="Subir" disabled={!i} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Descer" disabled={i === menus.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit(m)}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => del(m)}><Trash2 className="h-4 w-4" /></Button>
        </Card>
      ))}
      {!menus.length && <Card className="p-8 text-center text-muted-foreground">Nenhum menu ainda. Ex.: Dress Code, Hospedagem, Dicas.</Card>}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Editar menu" : "Novo menu"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Título</Label><Input maxLength={40} value={edit?.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Texto</Label><Textarea rows={6} value={edit?.content ?? ""} onChange={(e) => setEdit({ ...edit, content: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Imagem (URL ou envio)</Label>
              <Input value={edit?.image_url ?? ""} onChange={(e) => setEdit({ ...edit, image_url: e.target.value })} />
              <Input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const url = await uploadPhoto(f); setEdit((x) => ({ ...x, image_url: url })); } catch { toast.error("Falha no envio."); } }} />
            </div>
            <div className="flex items-center gap-2"><Switch checked={edit?.is_active ?? true} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} /><Label>Ativo no site</Label></div>
            <Button className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
