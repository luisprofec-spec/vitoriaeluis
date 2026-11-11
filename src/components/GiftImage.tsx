import sprite from "@/assets/gifts.jpg";
import type { Gift } from "@/lib/wedding";
// gifts.jpg is a 3x2 grid of vignettes with cream margins; index picks a cell.
const SX = 3.45, SY = 2.3;
const COLS = [0.036, 0.356, 0.677], ROWS = [0.034, 0.513];
export function GiftImage({ index, className = "" }: { index: number; className?: string }) {
  const x = ((COLS[index % 3] ?? 0) * SX) / (SX - 1) * 100;
  const y = ((ROWS[Math.floor(index / 3)] ?? 0) * SY) / (SY - 1) * 100;
  return <div role="img" className={className} style={{ backgroundImage: `url(${sprite})`, backgroundSize: `${SX * 100}% ${SY * 100}%`, backgroundPosition: `${x}% ${y}%` }} />;
}
export function GiftPhoto({ gift, className = "" }: { gift: Pick<Gift, "image_url" | "sprite_index" | "title">; className?: string }) {
  if (gift.image_url) return <div className={`overflow-hidden ${className}`}><img src={gift.image_url} alt={gift.title} loading="lazy" className="h-full w-full object-cover" /></div>;
  if (gift.sprite_index != null) return <GiftImage index={gift.sprite_index} className={className} />;
  return <div className={`bg-secondary ${className}`} />;
}
