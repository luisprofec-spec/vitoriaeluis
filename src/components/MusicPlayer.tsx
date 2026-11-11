import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { coupleNames, useSettings } from "@/lib/wedding";

export function MusicPlayer() {
  const s = useSettings();
  const ref = useRef<HTMLAudioElement>(null);
  const [welcome, setWelcome] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(60);
  const [open, setOpen] = useState(false);
  const active = s.musicEnabled && !!s.musicUrl;

  useEffect(() => { if (active && !sessionStorage.getItem("music-choice")) setWelcome(true); }, [active]);
  useEffect(() => { if (ref.current) { ref.current.volume = vol / 100; ref.current.muted = muted; } }, [vol, muted]);
  // Fallback: start on first tap anywhere if guest chose music but the browser blocked it.
  useEffect(() => {
    if (!active) return;
    const h = () => { if (sessionStorage.getItem("music-choice") === "on" && ref.current?.paused) play(); };
    window.addEventListener("pointerdown", h, { once: true });
    return () => window.removeEventListener("pointerdown", h);
  }, [active]);

  const play = async () => { try { await ref.current?.play(); setPlaying(true); } catch { setPlaying(false); } };
  const pause = () => { ref.current?.pause(); setPlaying(false); };
  const enter = (withMusic: boolean) => { sessionStorage.setItem("music-choice", withMusic ? "on" : "off"); setWelcome(false); if (withMusic) play(); };

  if (!active) return null;
  return (
    <>
      <audio ref={ref} src={s.musicUrl} loop={s.musicLoop} preload="none" onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      {welcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-card p-8 text-center shadow-xl">
            <p className="eyebrow">Bem-vindo ao casamento de</p>
            <h2 className="mt-3 font-serif text-4xl italic">{coupleNames(s)}</h2>
            <p className="mt-4 text-sm text-muted-foreground">Preparamos uma trilha sonora especial para sua visita.</p>
            <Button className="mt-6 w-full" onClick={() => enter(true)}>Entrar no Site com Música 💖</Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => enter(false)}>Entrar sem som</Button>
          </div>
        </div>
      )}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
        {open && (
          <div className="flex items-center gap-3 rounded-full border bg-card/95 py-2 pl-4 pr-2 shadow-lg backdrop-blur">
            <div className="max-w-40"><p className="truncate text-xs font-medium">{s.musicTitle || "Nossa Trilha Sonora 🎵"}</p></div>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={playing ? "Pausar" : "Tocar"} onClick={playing ? pause : play}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={muted ? "Ativar som" : "Silenciar"} onClick={() => setMuted(!muted)}>{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button>
            <Slider className="w-20" value={[vol]} max={100} step={1} onValueChange={(v) => { setVol(v[0] ?? 0); setMuted(false); }} aria-label="Volume" />
          </div>
        )}
        <button aria-label="Trilha sonora" onClick={() => setOpen(!open)}
          className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-foreground/80 bg-foreground text-primary-foreground shadow-lg ${playing ? "animate-[spin_4s_linear_infinite]" : ""}`}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-terracotta"><Music className="h-3 w-3" /></span>
        </button>
      </div>
    </>
  );
}
