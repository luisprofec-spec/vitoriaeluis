import { Heart } from "lucide-react";

export function WeddingLoading() {
  return <div role="status" aria-label="Carregando casamento" className="flex min-h-screen items-center justify-center bg-background"><Heart aria-hidden="true" className="h-7 w-7 text-gold motion-safe:animate-pulse" /></div>;
}