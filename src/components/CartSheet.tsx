import { ShoppingBag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { GiftPhoto } from "@/components/GiftImage";
import { brl, useCart, useGifts } from "@/lib/wedding";

export function CartSheet({ open, onOpenChange, onCheckout }: { open: boolean; onOpenChange: (o: boolean) => void; onCheckout: () => void }) {
  const { items, total, remove } = useCart();
  const gifts = useGifts();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="icon" className="relative rounded-full shadow-md" aria-label="Abrir sacola">
          <ShoppingBag className="h-5 w-5" />
          {items.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{items.length}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader><SheetTitle className="font-serif text-2xl">Sua sacola</SheetTitle></SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {items.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nenhum presente escolhido ainda.</p>}
          {items.map((i) => {
            const g = gifts.find((x) => x.id === i.id);
            return (
              <div key={i.id} className="flex items-center gap-3 rounded-md border p-2">
                {g && <GiftPhoto gift={g} className="h-14 w-16 shrink-0 rounded" />}
                <div className="flex-1"><p className="text-sm font-medium">{i.title}</p><p className="text-sm text-muted-foreground">{brl(i.price)}</p></div>
                <Button variant="ghost" size="icon" aria-label={`Remover ${i.title}`} onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
        </div>
        <div className="border-t p-4">
          <div className="mb-3 flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{brl(total)}</span></div>
          <Button className="w-full" disabled={!items.length} onClick={onCheckout}>Finalizar Presente</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
