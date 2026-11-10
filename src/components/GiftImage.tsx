import sprite from "@/assets/gifts.jpg";
// gifts.jpg is a 3x2 grid of vignettes; index picks a cell.
export function GiftImage({ index, className = "" }: { index: number; className?: string }) {
  const x = (index % 3) * 50, y = Math.floor(index / 3) * 100;
  return <div role="img" className={className} style={{ backgroundImage: `url(${sprite})`, backgroundSize: "330% 220%", backgroundPosition: `${x}% ${y}%` }} />;
}
