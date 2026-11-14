import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, CreditCard, QrCode, Heart, ExternalLink, CheckCircle, Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Postcard, PostcardThumb } from "@/components/Postcard";
import { CARD_STYLES, brl, coupleNames, pixPayload, submitGift, useCart, useSettings, type CardStyle, type PaymentMethod } from "@/lib/wedding";
import { safeExternalUrl } from "@/lib/wedding-rules";
import { supabase } from "@/integrations/supabase/client";
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
  const [proof, setProof] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [done, setDone] = useState<{ msg: string } | null>(null);
  const pixCode = useMemo(() => s.pixKey ? pixPayload({ key: s.pixKey, type: s.pixType, name: coupleNames(s), city: s.pixCity, amount: total }) : "", [s, total]);
  const close = () => { if (busy) return; setStep(1); setDone(null); setProof(null); setTransactionId(""); setName(""); setContact(""); setText(""); onClose(); };
  const copy = async () => { try { await navigator.clipboard.writeText(pixCode); setMethod("Pix"); toast.success("Código Pix copiado!"); } catch { toast.error("Não foi possível copiar. Selecione o código Pix."); } };
  const finish = async () => {
    if (busy || !name.trim() || !items.length) return;
    setBusy(true);
    try {
      const id = crypto.randomUUID();
      let path: string | undefined;
      if (proof) {
        const extensions: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
        const extension = extensions[proof.type];
        if (!extension || proof.size > 5 * 1024 * 1024) throw new Error("Comprovante inválido.");
        path = `${id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("payment-proofs").upload(path, proof, { contentType: proof.type });
        if (error) throw error;
      }
      await submitGift({ id, guest: name, contact, text, cardStyle: card, method, items, proof: path, transactionId, paid: true });
      const list = items.map(i => i.title).join(", ");
      setDone({ msg: `Olá! Aqui é ${name}. Realizei o pagamento de ${brl(total)} por ${method} pelos presentes: ${list}.${transactionId ? ` Identificador: ${transactionId}.` : ""}${text ? `\n\nMeu recado: ${text}` : ""}` });
      toast.success("Pagamento registrado. Aguardando confirmação dos noivos.");
      clear();
      await Promise.all([qc.invalidateQueries({ queryKey: ["messages"] }), qc.invalidateQueries({ queryKey: ["gifts"] })]);
    } catch {
      toast.error("Não foi possível registrar. Confira se os presentes ainda estão disponíveis e tente novamente.");
      void qc.invalidateQueries({ queryKey: ["gifts"] });
    } finally { setBusy(false); }
  };
  const extLinks: { label: string; url: string; m: PaymentMethod }[] = [];
  if (safeExternalUrl(s.cardLink)) extLinks.push({ label: s.boletoLink && s.boletoLink !== s.cardLink ? "Pagar com Cartão" : "Pagar com Cartão / Boleto", url: safeExternalUrl(s.cardLink), m: "Cartão" });
  if (s.boletoLink !== s.cardLink && safeExternalUrl(s.boletoLink)) extLinks.push({ label: s.cardLink ? "Pagar com Boleto" : "Pagar com Cartão / Boleto", url: safeExternalUrl(s.boletoLink), m: "Boleto" });
  return <Dialog open={open} onOpenChange={value => { if (!value) close(); }}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg"><DialogHeader><p className="eyebrow">{done ? "Seu presente" : `Passo ${step} de 2`}</p><DialogTitle className="font-serif text-2xl">{done ? "Aguardando Confirmação" : step === 1 ? "Identificação e Pagamento" : "Confirmar pagamento"}</DialogTitle><DialogDescription>{done ? "Os noivos vão conferir o recebimento." : `${items.length} ${items.length === 1 ? "presente" : "presentes"} · ${brl(total)}`}</DialogDescription></DialogHeader>
    {done ? <div className="space-y-5 text-center"><Heart className="mx-auto h-10 w-10 text-terracotta" /><p className="text-muted-foreground">Obrigado pelo carinho!</p>{s.whatsapp && <Button asChild className="h-auto w-full whitespace-normal py-3"><a href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(done.msg)}`} target="_blank" rel="noreferrer">Enviar Comprovante e Recado aos Noivos pelo WhatsApp</a></Button>}<Button variant="ghost" className="w-full" onClick={close}>Fechar</Button></div> : step === 1 ? <div className="space-y-4">
      <div className="space-y-2"><Label htmlFor="gift-name">Nome de quem está presenteando</Label><Input id="gift-name" maxLength={120} value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></div><div className="space-y-2"><Label htmlFor="gift-contact">WhatsApp ou e-mail (opcional)</Label><Input id="gift-contact" maxLength={160} value={contact} onChange={e => setContact(e.target.value)} /></div>
      {name.trim() && <><ul className="space-y-2 border-y py-3 text-sm">{items.map(i => <li key={i.id} className="flex justify-between gap-3"><span className="break-words">{i.title}</span><span className="shrink-0">{brl(i.price)}</span></li>)}<li className="flex justify-between font-semibold"><span>Total</span><span>{brl(total)}</span></li></ul><div className="space-y-3"><div className="flex items-center justify-between"><span className="flex items-center gap-2 font-medium"><QrCode className="h-4 w-4" />Pix · {brl(total)}</span><Badge className="bg-success text-primary-foreground">Taxa 0%</Badge></div>{pixCode ? <div className="flex flex-col items-center gap-3"><div className="rounded-md bg-card p-3"><QRCodeSVG title="QR Code Pix" value={pixCode} size={180} /></div><Label htmlFor="pix-code">Pix Copia e Cola</Label><Textarea id="pix-code" readOnly value={pixCode} rows={3} className="break-all text-xs" /><Button className="w-full" onClick={copy}><Copy className="h-4 w-4" />Copiar Código Pix</Button></div> : <p className="text-sm text-muted-foreground">Os noivos ainda não cadastraram a chave Pix.</p>}</div>{extLinks.map(link => <Button key={link.url} asChild variant="outline" className="w-full" onClick={() => setMethod(link.m)}><a href={link.url} target="_blank" rel="noreferrer"><CreditCard className="h-4 w-4" />{link.label}<ExternalLink className="h-3 w-3" /></a></Button>)}<Button variant="secondary" className="w-full" onClick={() => setStep(2)}>Continuar para confirmação</Button></>}
    </div> : <div className="space-y-4"><div className="flex justify-between gap-3 border-b pb-3"><span className="break-words">{name}</span><span className="shrink-0 font-semibold">{brl(total)}</span></div><Select value={method} onValueChange={value => setMethod(value as PaymentMethod)}><SelectTrigger aria-label="Forma de pagamento utilizada"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Cartão">Cartão</SelectItem><SelectItem value="Boleto">Boleto</SelectItem></SelectContent></Select><div className="space-y-2"><Label htmlFor="gift-message">Mensagem aos noivos (opcional)</Label><Textarea id="gift-message" rows={3} maxLength={1000} value={text} onChange={e => setText(e.target.value)} /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{CARD_STYLES.map(style => <Button key={style.id} type="button" variant="ghost" aria-pressed={card === style.id} className={`h-auto flex-col whitespace-normal border-2 p-1 text-[11px] ${card === style.id ? "border-primary" : "border-transparent"}`} onClick={() => setCard(style.id)}><PostcardThumb style={style.id} /><span className="mt-1 block min-h-8 leading-tight">{style.label}</span></Button>)}</div>{text.trim() && <Postcard style={card} text={text} from={name} to={coupleNames(s)} />}<div className="space-y-2"><Label htmlFor="gift-transaction">Identificador da transação (opcional)</Label><Input id="gift-transaction" maxLength={200} value={transactionId} onChange={e => setTransactionId(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="gift-proof" className="flex items-center gap-2"><Paperclip className="h-4 w-4" />Comprovante (opcional · PDF ou imagem, até 5 MB)</Label><Input id="gift-proof" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0] ?? null; if (file && (file.size > 5 * 1024 * 1024 || !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type))) { toast.error("Envie PDF, PNG, JPG ou WebP de até 5 MB."); e.target.value = ""; setProof(null); return; } setProof(file); }} /></div><Button className="w-full" disabled={busy} onClick={finish}><CheckCircle className="h-4 w-4" />{busy ? "Registrando…" : "Já realizei o pagamento"}</Button><Button variant="ghost" className="w-full" disabled={busy} onClick={() => setStep(1)}>Voltar aos dados de pagamento</Button></div>}
  </DialogContent></Dialog>;
}
