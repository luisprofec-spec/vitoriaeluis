import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle, Eye, EyeOff, Gift, MessageSquare, Wallet, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COUPLE, GOAL, brl, fmtDate, useWedding } from "@/lib/wedding";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: `Painel dos Noivos · ${COUPLE.names}` },
      { name: "description", content: "Acompanhe presentes, contribuições e mensagens do casamento." },
      { property: "og:title", content: `Painel dos Noivos · ${COUPLE.names}` },
      { property: "og:description", content: "Acompanhe presentes e mensagens do casamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

// Demo-only gate (not real security). Code: 2028
function Admin() {
  const [ok, setOk] = useState(false);
  const [code, setCode] = useState("");
  if (!ok)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="w-full max-w-sm p-8 text-center">
          <p className="eyebrow">Painel dos noivos</p>
          <h1 className="mt-2 text-3xl">{COUPLE.names}</h1>
          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); if (code === "2028") setOk(true); }}>
            <Input type="password" placeholder="Código de acesso" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button className="w-full" type="submit">Entrar</Button>
            <p className="text-xs text-muted-foreground">Demonstração: use o código 2028</p>
          </form>
        </Card>
      </div>
    );
  return <Dashboard />;
}

function Dashboard() {
  const { contributions, messages, confirm, toggleMsg } = useWedding();
  const total = contributions.filter((c) => c.status === "Confirmado").reduce((s, c) => s + c.amount, 0);
  const pending = contributions.filter((c) => c.status === "Pendente").reduce((s, c) => s + c.amount, 0);
  const stats = [
    { icon: Wallet, label: "Total arrecadado", value: brl(total), sub: `${brl(pending)} pendente` },
    { icon: Target, label: "Meta", value: brl(GOAL), sub: `${Math.round((total / GOAL) * 100)}% alcançado`, progress: (total / GOAL) * 100 },
    { icon: Gift, label: "Presentes recebidos", value: contributions.length },
    { icon: MessageSquare, label: "Mensagens no mural", value: messages.length },
  ];
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar ao site</Link>
        <p className="eyebrow mt-6">Painel dos noivos</p>
        <h1 className="mt-2 text-4xl">{COUPLE.names}</h1>
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
          <TabsList><TabsTrigger value="presentes">Presentes</TabsTrigger><TabsTrigger value="mensagens">Mensagens</TabsTrigger></TabsList>
          <TabsContent value="presentes">
            <Card className="overflow-x-auto p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Convidado</TableHead><TableHead>Presente</TableHead><TableHead>Valor</TableHead><TableHead>Pagamento</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {contributions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{fmtDate(c.date)}</TableCell>
                      <TableCell><div className="font-medium">{c.guest}</div><div className="text-xs text-muted-foreground">{c.contact}</div></TableCell>
                      <TableCell>{c.giftTitle}</TableCell>
                      <TableCell>{brl(c.amount)}</TableCell>
                      <TableCell>{c.method}</TableCell>
                      <TableCell><Badge variant={c.status === "Confirmado" ? "default" : "secondary"} className={c.status === "Confirmado" ? "bg-success" : ""}>{c.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={c.status === "Confirmado" ? "ghost" : "outline"} onClick={() => confirm(c.id)}>
                          {c.status === "Confirmado" ? "Desfazer" : <><CheckCircle className="h-4 w-4" /> Pagamento Confirmado no Banco</>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
          <TabsContent value="mensagens" className="space-y-3">
            {messages.map((m) => (
              <Card key={m.id} className="flex items-start justify-between gap-4 p-5">
                <div><p className="font-serif italic">“{m.text}”</p><p className="mt-2 text-sm">{m.guest} · <span className="text-muted-foreground">{fmtDate(m.date)}</span></p></div>
                <Button size="sm" variant={m.visible ? "outline" : "secondary"} onClick={() => toggleMsg(m.id)}>
                  {m.visible ? <><Eye className="h-4 w-4" /> Exibindo no Mural</> : <><EyeOff className="h-4 w-4" /> Oculta</>}
                </Button>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
