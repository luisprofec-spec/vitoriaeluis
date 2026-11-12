import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Eye, EyeOff, Gift, LogOut, MessageCircle, MessageSquare, Target, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Postcard } from "@/components/Postcard";
import { IdentityForm } from "@/components/admin/IdentityForm";
import { GiftsManager } from "@/components/admin/GiftsManager";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { brl, contactLink, coupleNames, fmtDate, thankYouMessage, useMessages, useSettings, type Contribution } from "@/lib/wedding";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Painel dos Noivos" }, { name: "description", content: "Acompanhe presentes, mensagens e personalize o site do casamento." },
    { property: "og:title", content: "Painel dos Noivos" }, { property: "og:description", content: "Gestão do site do casamento." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: Admin,
});

function Admin() {
  const { user } = Route.useRouteContext();
  const nav = useNavigate();
  const qc = useQueryClient();
  const role = useQuery({ queryKey: ["is-admin", user.id], queryFn: async () => {
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    return !!data;
  } });
  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); nav({ to: "/auth", replace: true }); };
  if (role.isLoading) return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;
  if (!role.data) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p>Esta conta não tem acesso ao painel dos noivos.</p><Button variant="outline" onClick={signOut}>Sair</Button>
    </div>
  );
  return <Dashboard onSignOut={signOut} />;
}

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const qc = useQueryClient();
  const settings = useSettings();
  const messages = useMessages();
  const contributions = useQuery({ queryKey: ["contributions"], queryFn: async () => {
    const { data, error } = await supabase.from("contributions").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Contribution[];
  } }).data ?? [];
  const toggleStatus = async (c: Contribution) => {
    await supabase.from("contributions").update({ status: c.status === "Confirmado" ? "Pendente" : "Confirmado" }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["contributions"] });
  };
  const toggleMsg = async (id: string, visible: boolean) => {
    await supabase.from("messages").update({ visible: !visible }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["messages"] });
  };
  const total = contributions.filter((c) => c.status === "Confirmado").reduce((s, c) => s + Number(c.total), 0);
  const pending = contributions.filter((c) => c.status === "Pendente").reduce((s, c) => s + Number(c.total), 0);
  const goal = settings.goal || 1;
  const stats = [
    { icon: Wallet, label: "Total arrecadado", value: brl(total), sub: `${brl(pending)} pendente` },
    { icon: Target, label: "Meta", value: brl(settings.goal), sub: `${Math.round((total / goal) * 100)}% alcançado`, progress: Math.min(100, (total / goal) * 100) },
    { icon: Gift, label: "Presentes recebidos", value: contributions.length },
    { icon: MessageSquare, label: "Mensagens", value: messages.length },
  ];
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex justify-between">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Ver o site</Link>
          <Button variant="ghost" size="sm" onClick={onSignOut}><LogOut className="h-4 w-4" /> Sair</Button>
        </div>
        <p className="eyebrow mt-6">Painel dos noivos</p>
        <h1 className="mt-2 text-4xl">{coupleNames(settings)}</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><s.icon className="h-4 w-4 text-gold" />{s.label}</div>
              <div className="mt-2 font-serif text-3xl">{s.value}</div>
              {s.progress !== undefined && <Progress value={s.progress} className="mt-3 h-1.5" />}
              {s.sub && <p className="mt-2 text-xs text-muted-foreground">{s.sub}</p>}
            </Card>
          ))}
        </div>
        <Tabs defaultValue="presentes" className="mt-10">
          <TabsList className="flex-wrap">
            <TabsTrigger value="presentes">Presentes</TabsTrigger><TabsTrigger value="mensagens">Mensagens</TabsTrigger><TabsTrigger value="catalogo">Gerenciar Presentes</TabsTrigger>
            <TabsTrigger value="identidade">Identidade do Casal & Fotos</TabsTrigger><TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="presentes">
            <Card className="overflow-x-auto p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Convidado</TableHead><TableHead>Presentes</TableHead><TableHead>Valor</TableHead><TableHead>Pagamento</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {contributions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{fmtDate(c.created_at)}</TableCell>
                      <TableCell><div className="font-medium">{c.guest}</div><div className="text-xs text-muted-foreground">{c.contact}</div></TableCell>
                      <TableCell className="max-w-56">{c.items.map((i) => i.title).join(", ")}</TableCell>
                      <TableCell>{brl(Number(c.total))}</TableCell>
                      <TableCell>{c.method}</TableCell>
                      <TableCell><Badge variant={c.status === "Confirmado" ? "default" : "secondary"} className={c.status === "Confirmado" ? "bg-success" : ""}>{c.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <a href={contactLink(c.contact, thankYouMessage(c.guest, c.items.map((i) => i.title), settings))} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Agradecer no WhatsApp</a>
                          </Button>
                          <Button size="sm" variant={c.status === "Confirmado" ? "ghost" : "default"} onClick={() => toggleStatus(c)}>
                            {c.status === "Confirmado" ? "Desfazer" : <><CheckCircle className="h-4 w-4" /> Confirmar pagamento</>}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
          <TabsContent value="mensagens" className="grid gap-4 md:grid-cols-2">
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <Postcard compact style={m.card_style} text={m.text} from={m.guest} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{fmtDate(m.created_at)}{m.gifts ? ` · ${m.gifts}` : ""}</span>
                  <Button size="sm" variant={m.visible ? "outline" : "secondary"} onClick={() => toggleMsg(m.id, m.visible)}>
                    {m.visible ? <><Eye className="h-4 w-4" /> Exibindo no Mural</> : <><EyeOff className="h-4 w-4" /> Oculta</>}
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="catalogo"><GiftsManager /></TabsContent>
          <TabsContent value="identidade"><IdentityForm settings={settings} /></TabsContent>
          <TabsContent value="config"><SettingsForm settings={settings} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
