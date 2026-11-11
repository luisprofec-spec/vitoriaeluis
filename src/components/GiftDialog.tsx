import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, CreditCard, QrCode, Heart, FileText, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Postcard, PostcardThumb } from "@/components/Postcard";
import { CARD_STYLES, brl, coupleNames, submitGift, useCart, useSettings, type CardStyle, type PaymentMethod } from "@/lib/wedding";
import { useQueryClient } from "@tanstack/react-query";

export function CheckoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  const { items, total, clear } = useCart();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [text, setText] = useState("");
  const [card, setCard] = useState<CardStyle>("floral");
  const [method, setMethod] = useState<PaymentMethod>("Pix");
  const [busy, setBusy] = useState(false);

  const close = () => { setStep(1); onClose(); };
  const copy = async () => { await navigator.clipboard.writeText(s.pixKey); toast.success("Chave Pix copiada com sucesso!"); };
  const finish = async () => {
    setBusy(true);
    try {
      await submitGift({ guest: name, contact, text, cardStyle: card, method, items });
      const list = items.map((i) => i.title).join(", ");
      const via = method === "Pix" ? "transferi via Pix" : `gostaria de pagar via ${method === "Cartão" ? "cartão de crédito" : "boleto"}`;
      const msg = `Olá! Acabei de presentear vocês com ${list} no valor de ${brl(total)} e ${via}. Mal posso esperar pelo casamento!`;
      if (s.whatsapp) window.open(`https://wa.me/${s.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
      toast.success("Obrigado! Seu cartão foi enviado aos noivos.");
      clear(); setName(""); setContact(""); setText("");
      qc.invalidateQueries({ queryKey: ["messages"] });
      close();
    } catch (e) {
      toast.error("Não foi possível enviar. Confira os dados e tente novamente.");
      console.error(e);
    } finally { setBusy(false); }
  };
  const extLink = method === "Cartão" ? s.cardLink : method === "Boleto" ? s.boletoLink : "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <p className="eyebrow">Passo {step} de 3</p>
          <DialogTitle className="font-serif text-2xl">{["Seus dados", "Cartão postal", "Pagamento"][step - 1]}</DialogTitle>
          <DialogDescription>{items.length} {items.length === 1 ? "presente" : "presentes"} · {brl(total)}</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="n">Seu nome</Label><Input id="n" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="c">WhatsApp ou e-mail</Label><Input id="c" maxLength={160} value={contact} onChange={(e) => setContact(e.target.value)} /></div>
            <Button className="w-full" disabled={!name.trim() || contact.trim().length < 3} onClick={() => setStep(2)}>Continuar</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {CARD_STYLES.map((c) => (
                <button key={c.id} onClick={() => setCard(c.id)} className={`rounded-md border-2 p-1 text-center text-[11px] transition ${card === c.id ? "border-primary" : "border-transparent"}`}>
                  <PostcardThumb style={c.id} /><span className="mt-1 block leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="space-y-1.5"><Label htmlFor="t">Sua mensagem de felicitação</Label><Textarea id="t" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} /></div>
            <Postcard style={card} text={text} from={name} to={coupleNames(s)} />
            <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button><Button className="flex-1" disabled={!text.trim()} onClick={() => setStep(3)}>Continuar para pagamento</Button></div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <ul className="space-y-1 rounded-md bg-muted p-3 text-sm">
              {items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.title}</span><span>{brl(i.price)}</span></li>)}
              <li className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{brl(total)}</span></li>
            </ul>
            <button onClick={() => setMethod("Pix")} className={`w-full rounded-lg border-2 p-4 text-left transition ${method === "Pix" ? "border-primary bg-secondary" : "border-border"}`}>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-medium"><QrCode className="h-4 w-4" /> Pix</span><Badge className="bg-success text-primary-foreground">Taxa 0%</Badge></div>
              <p className="mt-1 text-sm text-muted-foreground">O valor vai direto para os noivos.</p>
            </button>
            {method === "Pix" && (
              s.pixKey ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-4">
                  <QRCodeSVG value={s.pixKey} size={140} />
                  <p className="text-xs text-muted-foreground">Chave Pix ({s.pixType})</p>
                  <code className="rounded bg-muted px-3 py-1 text-sm">{s.pixKey}</code>
                  <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4" /> Copiar Chave Pix</Button>
                </div>
              ) : <p className="text-sm text-muted-foreground">Os noivos ainda não cadastraram a chave Pix.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {(["Cartão", "Boleto"] as const).map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={`rounded-lg border-2 p-3 text-left text-sm transition ${method === m ? "border-primary bg-secondary" : "border-border"}`}>
                  <span className="flex items-center gap-2 font-medium">{m === "Cartão" ? <CreditCard className="h-4 w-4" /> : <FileText className="h-4 w-4" />}{m === "Cartão" ? "Cartão de crédito" : "Boleto"}</span>
                </button>
              ))}
            </div>
            {method !== "Pix" && (extLink
              ? <Button asChild variant="outline" className="w-full"><a href={extLink} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Abrir link de pagamento</a></Button>
              : <p className="text-sm text-muted-foreground">O link de pagamento será enviado pelo WhatsApp.</p>)}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button>
              <Button className="flex-1" disabled={busy} onClick={finish}><Heart className="h-4 w-4" /> Confirmar e Enviar Cartão</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
