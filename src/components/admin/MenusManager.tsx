import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useInfoMenus, type InfoMenu } from "@/lib/guest-data";
import { safeExternalUrl } from "@/lib/wedding-rules";
import { uploadPhoto } from "@/components/admin/IdentityForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Draft = Pick<InfoMenu, "title" | "content" | "image_url" | "link_url" | "link_label" | "is_active"> & { id?: string };
const empty: Draft = { title: "", content: "", image_url: "", link_url: "", link_label: "", is_active: true };
export function MenusManager() {
  const query = useInfoMenus();
  const menus = query.data ?? [];
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["custom-menus"] });
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!draft) return;
    if (draft.link_url && (!safeExternalUrl(draft.link_url) || !draft.link_label.trim())) { toast.error("Informe um link válido e o texto do botão."); return; }
    if (draft.image_url && !safeExternalUrl(draft.image_url)) { toast.error("Informe uma URL válida para a imagem."); return; }
    const row = { title: draft.title.trim(), content: draft.content, image_url: draft.image_url.trim(), link_url: draft.link_url.trim(), link_label: draft.link_label.trim(), is_active: draft.is_active };
    setBusy(true); const { error } = draft.id ? await supabase.from("custom_menus").update(row).eq("id", draft.id) : await supabase.from("custom_menus").insert({ ...row, display_order: Math.max(-1, ...menus.map(m => m.display_order)) + 1 });
    setBusy(false); if (error) { toast.error("Não foi possível salvar o menu."); return; } setDraft(null); toast.success("Menu salvo!"); refresh();
  };
  const toggle = async (menu: InfoMenu) => { const { error } = await supabase.from("custom_menus").update({ is_active: !menu.is_active }).eq("id", menu.id); if (error) toast.error("Não foi possível alterar o menu."); else refresh(); };
  const move = async (index: number, direction: number) => {
    const reordered = [...menus]; const a = reordered[index]; const b = reordered[index + direction]; if (!a || !b) return;
    reordered[index] = b; reordered[index + direction] = a;
    setBusy(true); const results = await Promise.all(reordered.map((m, i) => supabase.from("custom_menus").update({ display_order: i }).eq("id", m.id))); setBusy(false);
    if (results.some(r => r.error)) toast.error("Não foi possível reordenar todos os menus."); refresh();
  };
  const remove = async (menu: InfoMenu) => { if (!window.confirm(`Excluir o menu ${menu.title}?`)) return; const { error } = await supabase.from("custom_menus").delete().eq("id", menu.id); if (error) toast.error("Não foi possível excluir."); else { toast.success("Menu excluído."); refresh(); } };
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-2xl">Menus Informativos</h3><Button onClick={() => setDraft(empty)}><Plus className="h-4 w-4" />Novo Menu</Button></div>
    {query.isError && <p role="alert" className="text-destructive">Não foi possível carregar os menus.</p>}
    <div className="divide-y">{menus.map((menu, index) => <div key={menu.id} className="flex flex-wrap items-center gap-3 py-4"><div className="min-w-0 flex-1"><h4 className="break-words text-xl">{menu.title}</h4><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{menu.content}</p></div><Switch aria-label={`Exibir ${menu.title}`} checked={menu.is_active} onCheckedChange={() => toggle(menu)} /><div className="flex gap-1"><Button size="icon" variant="ghost" disabled={index === 0 || busy} title="Subir menu" aria-label={`Subir ${menu.title}`} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" disabled={index === menus.length - 1 || busy} title="Descer menu" aria-label={`Descer ${menu.title}`} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button><Button size="icon" variant="outline" title="Editar menu" aria-label={`Editar menu ${menu.title}`} onClick={() => setDraft(menu)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Excluir menu" aria-label={`Excluir menu ${menu.title}`} onClick={() => remove(menu)}><Trash2 className="h-4 w-4" /></Button></div></div>)}{!menus.length && !query.isLoading && <p className="py-8 text-center text-muted-foreground">Nenhum menu cadastrado.</p>}</div>
    <Dialog open={draft !== null} onOpenChange={open => { if (!open) setDraft(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{draft?.id ? "Editar Menu" : "Novo Menu"}</DialogTitle><DialogDescription>Informações do casamento</DialogDescription></DialogHeader>{draft && <form onSubmit={save} className="space-y-4"><div className="space-y-2"><Label htmlFor="menu-title">Título do menu</Label><Input id="menu-title" required maxLength={80} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="menu-content">Conteúdo</Label><Textarea id="menu-content" rows={5} maxLength={10000} value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="menu-image">Imagem (opcional)</Label><div className="flex gap-2"><Input id="menu-image" placeholder="https://" value={draft.image_url} onChange={e => setDraft({ ...draft, image_url: e.target.value })} /><Button asChild variant="outline" disabled={busy}><label className="cursor-pointer"><Upload className="h-4 w-4" /><input aria-label="Enviar imagem do menu" type="file" accept="image/*" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { const url = await uploadPhoto(file); setDraft(current => current && { ...current, image_url: url }); } catch { toast.error("Não foi possível enviar a imagem."); } finally { setBusy(false); } }} /></label></Button></div></div><div className="space-y-2"><Label htmlFor="menu-link">Link do botão (opcional)</Label><Input id="menu-link" placeholder="https://" value={draft.link_url} onChange={e => setDraft({ ...draft, link_url: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="menu-link-label">Texto do botão</Label><Input id="menu-link-label" maxLength={80} value={draft.link_label} onChange={e => setDraft({ ...draft, link_label: e.target.value })} /></div><div className="flex items-center gap-3"><Switch id="menu-active" checked={draft.is_active} onCheckedChange={value => setDraft({ ...draft, is_active: value })} /><Label htmlFor="menu-active">Exibir no site</Label></div><Button className="w-full" disabled={busy} type="submit">Salvar Menu</Button></form>}</DialogContent></Dialog>
  </div>;
}