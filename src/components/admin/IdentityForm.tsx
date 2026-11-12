import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import couple from "@/assets/couple.jpg";
import { useSaveSettings, type Settings } from "@/lib/wedding";

// Bucket is private (workspace blocks public buckets), so store a long-lived signed URL.
export async function uploadPhoto(file: File) {
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("photos").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2 || !data) throw e2 ?? new Error("no url");
  return data.signedUrl;
}

function PhotoField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <img src={value || couple} alt={label} className="aspect-video w-full rounded-md object-cover" />
      <div className="flex gap-2">
        <Input placeholder="https://… (ou envie um arquivo)" value={value} onChange={(e) => onChange(e.target.value)} />
        <Button asChild variant="outline" disabled={busy}>
          <label className="cursor-pointer"><Upload className="h-4 w-4" />{busy ? "Enviando…" : "Enviar"}
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return; setBusy(true);
              try { onChange(await uploadPhoto(f)); } catch { toast.error("Falha no envio da foto."); } finally { setBusy(false); }
            }} />
          </label>
        </Button>
      </div>
    </div>
  );
}

export function IdentityForm({ settings }: { settings: Settings }) {
  const init = (x: Settings) => ({ ...x, heroImages: x.heroImages.length ? x.heroImages : x.heroImage ? [x.heroImage] : [] });
  const [s, setS] = useState(() => init(settings));
  useEffect(() => setS(init(settings)), [settings]);
  const [heroUrl, setHeroUrl] = useState("");
  const save = useSaveSettings();
  const [newUrl, setNewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="p1">Nome do Noivo(a) 1</Label><Input id="p1" value={s.partner1} onChange={(e) => setS({ ...s, partner1: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="p2">Nome do Noivo(a) 2</Label><Input id="p2" value={s.partner2} onChange={(e) => setS({ ...s, partner2: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="tg">Frase de destaque da capa</Label><Input id="tg" value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="st">Nossa história</Label><Textarea id="st" rows={4} value={s.story} onChange={(e) => setS({ ...s, story: e.target.value })} /></div>
      <div className="grid gap-6 md:max-w-md">
        <PhotoField label="Foto da seção Nossa História" value={s.storyImage} onChange={(v) => setS({ ...s, storyImage: v })} />
      </div>
      <div className="space-y-2">
        <Label>Fotos do carrossel da capa</Label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {s.heroImages.map((g, i) => (
            <div key={i} className="relative"><img src={g} alt="" className="aspect-video w-full rounded object-cover" />
              <button className="absolute right-1 top-1 rounded-full bg-background p-0.5" aria-label="Remover foto da capa" onClick={() => setS({ ...s, heroImages: s.heroImages.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button></div>
          ))}
          {!s.heroImages.length && <p className="col-span-full text-sm text-muted-foreground">Nenhuma foto: a capa usa a foto padrão.</p>}
        </div>
        <div className="flex gap-2">
          <Input placeholder="URL da foto da capa" value={heroUrl} onChange={(e) => setHeroUrl(e.target.value)} />
          <Button variant="outline" disabled={!heroUrl} onClick={() => { setS({ ...s, heroImages: [...s.heroImages, heroUrl] }); setHeroUrl(""); }}>Adicionar</Button>
          <Button asChild variant="outline"><label className="cursor-pointer"><Upload className="h-4 w-4" />Enviar
            <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              try { const urls = await Promise.all(files.map(uploadPhoto)); setS((p) => ({ ...p, heroImages: [...p.heroImages, ...urls] })); } catch { toast.error("Falha no envio."); }
            }} /></label></Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Galeria</Label>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {s.gallery.map((g, i) => (
            <div key={i} className="relative"><img src={g} alt="" className="aspect-square w-full rounded object-cover" />
              <button className="absolute right-1 top-1 rounded-full bg-background p-0.5" aria-label="Remover" onClick={() => setS({ ...s, gallery: s.gallery.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button></div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="URL da foto" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          <Button variant="outline" disabled={!newUrl} onClick={() => { setS({ ...s, gallery: [...s.gallery, newUrl] }); setNewUrl(""); }}>Adicionar</Button>
          <Button asChild variant="outline"><label className="cursor-pointer"><Upload className="h-4 w-4" />Enviar
            <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              try { const urls = await Promise.all(files.map(uploadPhoto)); setS((p) => ({ ...p, gallery: [...p.gallery, ...urls] })); } catch { toast.error("Falha no envio."); }
            }} /></label></Button>
        </div>
      </div>
      <Button disabled={busy} onClick={async () => { setBusy(true); try { await save(s); toast.success("Identidade salva!"); } catch { toast.error("Não foi possível salvar."); } finally { setBusy(false); } }}>Salvar Identidade</Button>
    </Card>
  );
}
