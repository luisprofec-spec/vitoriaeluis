import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, CreditCard, QrCode, Heart, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Postcard, PostcardThumb } from "@/components/Postcard";
import { GuestGate } from "@/components/GuestGate";
import { useEffect } from "react";
import { CARD_STYLES, useGuest, brl, coupleNames, pixPayload, submitGift, useCart, useSettings, type CardStyle, type PaymentMethod } from "@/lib/wedding";
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
  const [proof, setProof] = useState("");
  const guest = useGuest();
  useEffect(() => { if (guest) setName(guest.full_name); }, [guest]);

  const [done, setDone] = useState<{ msg: string } | null>(null);
  const pixCode = useMemo(() => s.pixKey ? pixPayload({ key: s.pixKey, type: s.pixType, name: coupleNames(s), city: s.pixCity, amount: total }) : "", [s, total]);

  const close = () => { setStep(1); setDone(null); onClose(); };
  const copy = async () => { await navigator.clipboard.writeText(pixCode); toast.success("Código Pix copiado! Cole no app do seu banco."); };
  const finish = async () => {
    setBusy(true);
    try {
      await submitGift({ guest: name, contact, text, cardStyle: card, method, items, guestId: guest?.id ?? "", proof });
      const list = items.map((i) => i.title).join(", ");
      const via = method === "Pix" ? "via Pix" : method === "Cartão" ? "com cartão de crédito" : "via boleto";
      setDone({ msg: `Olá! Aqui é ${name}. Acabei de presentear vocês com ${list} no valor de ${brl(total)} ${via}. Segue o comprovante! 💌\n\nMeu recado: "${text}"` });
      toast.success("Obrigado! Os noivos vão conferir o pagamento.");
      clear(); setContact(""); setText(""); setProof("");
      qc.invalidateQueries({ queryKey: ["messages"] });
    } catch (e) {
      toast.error("Não foi possível enviar. Confira os dados e tente novamente.");
      console.error(e);
    } finally { setBusy(false); }
  };
  const extLinks = [s.cardLink && { label: s.boletoLink && s.boletoLink !== s.cardLink ? "Pagar com Cartão" : "Pagar com Cartão / Boleto", url: s.cardLink, m: "Cartão" as const },
    s.boletoLink && s.boletoLink !== s.cardLink && { label: s.cardLink ? "Pagar com Boleto" : "Pagar com Cartão / Boleto", url: s.boletoLink, m: "Boleto" as const }].filter(Boolean) as { label: string; url: string; m: PaymentMethod }[];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <p className="eyebrow">Passo {step} de 3</p>
          <DialogTitle className="font-serif text-2xl">{done ? "Obrigado!" : ["Seus dados", "Cartão postal", "Pagamento"][step - 1]}</DialogTitle>
          <DialogDescription>{done ? "Seu carinho chegou aos noivos." : <>{items.length} {items.length === 1 ? "presente" : "presentes"} · {brl(total)}</>}</DialogDescription>
        </DialogHeader>

        {step === 1 && !guest && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">A lista de presentes é exclusiva para convidados. Identifique-se para continuar.</p>
            <GuestGate />
          </div>
        )}
        {step === 1 && guest && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm">Presenteando como <strong>{guest.full_name}</strong></div>
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

        {step === 3 && done && (
          <div className="space-y-4 text-center">
            <Heart className="mx-auto h-10 w-10 text-terracotta" />
            <p className="text-muted-foreground">Recebemos seu aviso! O presente fica <strong>aguardando conferência</strong> até os noivos confirmarem o pagamento. Se quiser, envie o comprovante e seu recado direto aos noivos.</p>
            {s.whatsapp && <Button asChild className="w-full"><a href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(done.msg)}`} target="_blank" rel="noreferrer">Enviar Comprovante e Recado aos Noivos pelo WhatsApp</a></Button>}
            <Button variant="ghost" className="w-full" onClick={close}>Fechar</Button>
          </div>
        )}

        {step === 3 && !done && (
          <div className="space-y-4">
            <ul className="space-y-1 rounded-md bg-muted p-3 text-sm">
              {items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.title}</span><span>{brl(i.price)}</span></li>)}
              <li className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{brl(total)}</span></li>
            </ul>
            <div className={`rounded-lg border-2 p-4 ${method === "Pix" ? "border-primary bg-secondary" : "border-border"}`}>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-medium"><QrCode className="h-4 w-4" /> Pix · {brl(total)}</span><Badge className="bg-success text-primary-foreground">Taxa 0%</Badge></div>
              {pixCode ? (
                <div className="mt-3 flex flex-col items-center gap-3">
                  <div className="rounded-md bg-card p-3"><QRCodeSVG value={pixCode} size={180} /></div>
                  <p className="text-xs text-muted-foreground">Escaneie no app do banco ou use o Pix Copia e Cola</p>
                  <code className="max-h-20 w-full overflow-y-auto break-all rounded bg-muted px-3 py-2 text-[11px]">{pixCode}</code>
                  <Button className="w-full" onClick={() => { setMethod("Pix"); copy(); }}><Copy className="h-4 w-4" /> Copiar Código Pix</Button>
                </div>
              ) : <p className="mt-2 text-sm text-muted-foreground">Os noivos ainda não cadastraram a chave Pix.</p>}
            </div>
            {extLinks.length > 0 && (
              <div className="space-y-2">
                <p className="text-center text-xs text-muted-foreground">ou pague no checkout seguro</p>
                {extLinks.map((l) => (
                  <Button key={l.url} asChild variant={method === l.m ? "default" : "outline"} className="w-full" onClick={() => setMethod(l.m)}>
                    <a href={l.url} target="_blank" rel="noreferrer"><CreditCard className="h-4 w-4" /> {l.label} <ExternalLink className="h-3 w-3" /></a>
                  </Button>
                ))}
              </div>
            )}
            <div className="space-y-1.5 border-t pt-4">
              <Label htmlFor="proof">ID da transação ou observação do comprovante (opcional)</Label>
              <Input id="proof" maxLength={300} placeholder="Ex.: E1234567890…" value={proof} onChange={(e) => setProof(e.target.value)} />
              <p className="text-xs text-muted-foreground">O presente só é registrado depois que você clicar abaixo.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button>
              <Button className="flex-1" disabled={busy || !guest} onClick={finish}><Heart className="h-4 w-4" /> Já realizei o pagamento</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
