import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, Gift, LogOut, MessageSquare, Target, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Postcard } from "@/components/Postcard";
import { IdentityForm } from "@/components/admin/IdentityForm";
import { GiftsManager } from "@/components/admin/GiftsManager";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { GuestsManager } from "@/components/admin/GuestsManager";
import { MenusManager } from "@/components/admin/MenusManager";
import { PaymentsManager } from "@/components/admin/PaymentsManager";
import { WeddingLoading } from "@/components/WeddingLoading";
import { confirmedTotal, isPendingPayment } from "@/lib/wedding-rules";
import { brl, coupleNames, fmtDate, useMessages, useSettingsQuery, type Settings, type Contribution } from "@/lib/wedding";

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
    const claimed = await supabase.rpc("claim_admin_invite");
    if (claimed.error) throw claimed.error;
    const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (error) throw error;
    return !!data;
  }, refetchInterval: 30000 });
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
  const query = useSettingsQuery();
  if (query.isPending) return <WeddingLoading />;
  if (query.isError) return <div className="p-10 text-center"><p>Não foi possível carregar as configurações.</p><Button className="mt-4" onClick={() => query.refetch()}>Tentar novamente</Button></div>;
  return <ReadyDashboard onSignOut={onSignOut} settings={query.data} />;
}

function ReadyDashboard({ onSignOut, settings }: { onSignOut: () => void; settings: Settings }) {
  const qc = useQueryClient();
  const messages = useMessages();
  const contributionQuery = useQuery({ queryKey: ["contributions"], queryFn: async () => {
    const { data, error } = await supabase.from("contributions").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Contribution[];
  } });
  const contributions = contributionQuery.data ?? [];
  const toggleMsg = async (id: string, visible: boolean) => {
    await supabase.from("messages").update({ visible: !visible }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["messages"] });
  };
  const total = confirmedTotal(contributions);
  const pendingRows = contributions.filter(c => isPendingPayment(c.status));
  const pending = pendingRows.reduce((s, c) => s + Number(c.total), 0);
  const goal = settings.goal || 1;
  const stats = [
    { icon: Wallet, label: "Total arrecadado", value: brl(total), sub: `${brl(pending)} pendente` },
    { icon: Target, label: "Meta", value: brl(settings.goal), sub: `${Math.round((total / goal) * 100)}% alcançado`, progress: Math.min(100, (total / goal) * 100) },
    { icon: Gift, label: "Presentes recebidos", value: contributions.filter(c => c.status !== "cancelled").length },
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
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="presentes">Presentes{pendingRows.length > 0 && <Badge variant="secondary" className="ml-1">{pendingRows.length}</Badge>}</TabsTrigger><TabsTrigger value="mensagens">Mensagens</TabsTrigger><TabsTrigger value="catalogo">Gerenciar Presentes</TabsTrigger>
            <TabsTrigger value="identidade">Identidade do Casal & Fotos</TabsTrigger><TabsTrigger value="config">Configurações</TabsTrigger>
            <TabsTrigger value="convidados">Lista de Convidados</TabsTrigger><TabsTrigger value="menus">Menus Informativos</TabsTrigger>
          </TabsList>
          <TabsContent value="presentes">
            {contributionQuery.isError ? <p role="alert" className="text-destructive">Não foi possível carregar os pagamentos.</p> : contributionQuery.isPending ? <p className="py-8 text-center text-muted-foreground">Carregando pagamentos…</p> : <PaymentsManager contributions={contributions} settings={settings} />}
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
          <TabsContent value="convidados"><GuestsManager /></TabsContent>
          <TabsContent value="menus"><MenusManager /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
