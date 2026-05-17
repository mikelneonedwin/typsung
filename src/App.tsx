import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, RotateCcw, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import audioUrl from "./assets/Hold On - Justin Bieber.m4a";
import timestampsData from "./assets/tmestamps.json";

const parsedTimestamps = (timestampsData as string[])
  .map((str) => {
    const [min, sec] = str.split(":");
    return parseInt(min, 10) * 60 + parseFloat(sec);
  })
  .sort((a, b) => a - b);

type Bubble = {
  id: number;
  char: string;
  col: number;
  spawnTime: number;
};

export default function App() {
  const { theme, setTheme } = useTheme();
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">(
    "start",
  );
  const [mistakes, setMistakes] = useState(0);
  const [timeLasted, setTimeLasted] = useState("00:00");
  const [activeBubbles, setActiveBubbles] = useState<Bubble[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const nextSpawnIndex = useRef(0);
  const bubblesRef = useRef<Bubble[]>([]);
  const mistakesRef = useRef(0);
  const isPlaying = useRef(false);
  const lastColRef = useRef(-1);

  const formatTime = (timeInSeconds: number) => {
    const m = Math.floor(timeInSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(timeInSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleGameOver = useCallback((time: number) => {
    isPlaying.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setTimeLasted(formatTime(time));
    setGameState("gameover");
  }, []);

  const loop = useCallback(
    function tick() {
      if (!isPlaying.current || !audioRef.current) return;
      const time = audioRef.current.currentTime;

      let updatedBubbles = false;

      // Spawn new bubbles
      while (
        nextSpawnIndex.current < parsedTimestamps.length &&
        time >= parsedTimestamps[nextSpawnIndex.current]
      ) {
        let col = Math.floor(Math.random() * 6);
        if (col === lastColRef.current) {
          col = (col + 1) % 6;
        }
        lastColRef.current = col;

        const bubble: Bubble = {
          id: Math.random(),
          char: String.fromCharCode(65 + Math.floor(Math.random() * 26)), // A-Z
          col,
          spawnTime: parsedTimestamps[nextSpawnIndex.current],
        };
        bubblesRef.current.push(bubble);
        nextSpawnIndex.current++;
        updatedBubbles = true;
      }

      // Move and check escapes
      const survivingBubbles: Bubble[] = [];
      for (let i = 0; i < bubblesRef.current.length; i++) {
        const b = bubblesRef.current[i];
        const age = time - b.spawnTime;
        if (age >= 3) {
          // Bubble floated away completely
          mistakesRef.current++;
          setMistakes(mistakesRef.current);
          updatedBubbles = true;

          if (mistakesRef.current >= 10) {
            handleGameOver(time);
            return; // Halt loop
          }
        } else {
          survivingBubbles.push(b);
          // Direct DOM manipulation for fast position updates
          const el = document.getElementById(`bubble-${b.id}`);
          if (el) {
            const progress = age / 3;
            el.style.bottom = `${progress * 100}%`;
          }
        }
      }

      if (bubblesRef.current.length !== survivingBubbles.length) {
        bubblesRef.current = survivingBubbles;
        updatedBubbles = true;
      }

      if (updatedBubbles) {
        setActiveBubbles([...bubblesRef.current]);
      }

      if (isPlaying.current) {
        frameRef.current = requestAnimationFrame(tick);
      }
    },
    [handleGameOver],
  );

  const startGame = () => {
    setGameState("playing");
    setMistakes(0);
    bubblesRef.current = [];
    setActiveBubbles([]);
    nextSpawnIndex.current = 0;
    mistakesRef.current = 0;
    isPlaying.current = true;
    lastColRef.current = -1;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((e) => console.error("Audio play failed", e));
    }
    frameRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if ((e.ctrlKey || e.metaKey) && key === "D") {
        e.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
        return;
      }
      if (!isPlaying.current) return;
      if (/^[A-Z]$/.test(key)) {
        const matchIndex = bubblesRef.current.findIndex((b) => b.char === key);
        if (matchIndex !== -1) {
          bubblesRef.current.splice(matchIndex, 1);
          setActiveBubbles([...bubblesRef.current]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [theme, setTheme]);

  const handleBubbleClick = (id: number) => {
    if (!isPlaying.current) return;
    const matchIndex = bubblesRef.current.findIndex((b) => b.id === id);
    if (matchIndex !== -1) {
      bubblesRef.current.splice(matchIndex, 1);
      setActiveBubbles([...bubblesRef.current]);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background flex flex-col items-center justify-center font-sans">
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => {
          if (isPlaying.current)
            handleGameOver(audioRef.current?.duration || 0);
        }}
      />

      {/* Theme Toggle */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-6 left-6 z-50 rounded-full bg-background/50 backdrop-blur"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </Button>

      {/* Start Screen */}
      {gameState === "start" && (
        <Card className="w-[90%] max-w-md z-50 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center text-3xl font-black italic tracking-tighter">
              TYPSUNG
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <p className="text-center text-muted-foreground">
              Type the letters or tap the bubbles before they float away! You
              are allowed 9 mistakes.
            </p>
            <Button
              onClick={startGame}
              size="lg"
              className="w-full text-lg h-14 rounded-full"
            >
              <Play className="mr-2" size={24} /> Play Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Game Over Screen */}
      {gameState === "gameover" && (
        <Card className="w-[90%] max-w-md z-50 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center text-3xl font-black text-destructive">
              Game Over!
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-2">You lasted</p>
              <p className="text-5xl font-mono font-bold text-primary">
                {timeLasted}
              </p>
            </div>
            <Button
              onClick={startGame}
              size="lg"
              className="w-full text-lg h-14 rounded-full"
            >
              <RotateCcw className="mr-2" size={24} /> Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Playing UI */}
      {gameState === "playing" && (
        <>
          <div className="absolute top-6 right-6 z-50 bg-background/90 backdrop-blur border px-4 py-2 rounded-xl shadow-sm">
            <p className="text-lg font-bold text-foreground">
              Mistakes:{" "}
              <span className={mistakes >= 7 ? "text-destructive" : ""}>
                {mistakes} / 9
              </span>
            </p>
          </div>

          {/* Bubbles Container */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            {activeBubbles.map((bubble) => (
              <button
                key={bubble.id}
                id={`bubble-${bubble.id}`}
                onClick={(e) => {
                  // Prevent focus to keep keyboard events working easily
                  e.preventDefault();
                  handleBubbleClick(bubble.id);
                }}
                className="absolute flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-lg transition-transform hover:scale-110 active:scale-95 pointer-events-auto"
                style={{
                  left: `${(bubble.col + 0.5) * (100 / 6)}%`,
                  transform: "translateX(-50%)",
                  width: "4.5rem",
                  height: "4.5rem",
                  bottom: "0%", // Updated via JS
                  fontSize: "2rem",
                }}
              >
                {bubble.char}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
