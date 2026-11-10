import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, CreditCard, QrCode, ShieldCheck, Heart, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PIX_KEY, WHATSAPP, brl, useWedding, type Gift, type PaymentMethod } from "@/lib/wedding";

export function GiftDialog({ gift, onClose }: { gift: Gift | null; onClose: () => void }) {
  const { addGift } = useWedding();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [text, setText] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Pix");

  const reset = () => { setStep(1); setName(""); setContact(""); setText(""); setMethod("Pix"); onClose(); };
  if (!gift) return null;

  const copy = async () => { await navigator.clipboard.writeText(PIX_KEY); toast.success("Chave Pix copiada com sucesso!"); };
  const finish = () => {
    addGift({ guest: name.trim(), contact: contact.trim(), giftId: gift.id, giftTitle: gift.title, amount: gift.price, method }, text.trim());
    const via = method === "Pix" ? "transferi via Pix" : `gostaria de pagar via ${method === "Cartão" ? "cartão de crédito" : "boleto"}`;
    const msg = `Olá! Acabei de presentear vocês com ${gift.title} no valor de ${brl(gift.price)} e ${via}. Mal posso esperar pelo casamento!`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.success("Obrigado! Sua mensagem foi enviada ao mural.");
    reset();
  };
  const step1Ok = name.trim() && contact.trim() && text.trim();
  const pixPayload = `PIX:${PIX_KEY}|${gift.price.toFixed(2)}|${gift.title}`;

  return (
    <Dialog open onOpenChange={(o) => !o && reset()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <p className="eyebrow">Passo {step} de 2</p>
          <DialogTitle className="font-serif text-2xl">{gift.title}</DialogTitle>
          <DialogDescription>{brl(gift.price)}</DialogDescription>
        </DialogHeader>
        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="n">Seu nome</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="c">WhatsApp ou e-mail</Label><Input id="c" value={contact} onChange={(e) => setContact(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="t">Deixe uma mensagem de carinho para os noivos</Label><Textarea id="t" rows={4} value={text} onChange={(e) => setText(e.target.value)} /></div>
            <Button className="w-full" disabled={!step1Ok} onClick={() => setStep(2)}>Continuar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setMethod("Pix")} className={`w-full rounded-lg border-2 p-4 text-left transition ${method === "Pix" ? "border-primary bg-secondary" : "border-border"}`}>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-medium"><QrCode className="h-4 w-4" /> Pix</span><Badge className="bg-success text-primary-foreground">Taxa 0%</Badge></div>
              <p className="mt-1 text-sm text-muted-foreground">O valor vai direto para os noivos.</p>
            </button>
            {method === "Pix" && (
              <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-4">
                <div className="rounded-md bg-card p-2"><QRCodeSVG value={pixPayload} size={150} /></div>
                <code className="rounded bg-muted px-3 py-1 text-sm">{PIX_KEY}</code>
                <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4" /> Copiar Chave Pix</Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {(["Cartão", "Boleto"] as const).map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={`rounded-lg border-2 p-3 text-left text-sm transition ${method === m ? "border-primary bg-secondary" : "border-border"}`}>
                  <span className="flex items-center gap-2 font-medium">{m === "Cartão" ? <CreditCard className="h-4 w-4" /> : <FileText className="h-4 w-4" />}{m === "Cartão" ? "Cartão de crédito" : "Boleto"}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Link de pagamento enviado pelo WhatsApp.</span>
                </button>
              ))}
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" /> Nenhum dado de pagamento é guardado neste site.</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
              <Button className="flex-1" onClick={finish}><Heart className="h-4 w-4" /> Confirmar Presente e Enviar Mensagem</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
