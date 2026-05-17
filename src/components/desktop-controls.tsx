import { FileAudio, Keyboard, Moon, Sun, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DesktopControlsProps {
  isParsing: boolean
  onOpenShortcuts: () => void
}

export function DesktopControls({ isParsing, onOpenShortcuts }: DesktopControlsProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-2 rounded-full border bg-background/80 p-1.5 shadow-sm backdrop-blur">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            disabled={isParsing}
            onClick={() => document.getElementById("audio-upload")?.click()}
          >
            {isParsing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileAudio className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Select Audio <kbd className="ml-2 text-xs opacity-50">Ctrl+O</kbd></p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle Theme <kbd className="ml-2 text-xs opacity-50">Ctrl+D</kbd></p>
        </TooltipContent>
      </Tooltip>

      <div className="mx-1 h-4 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={onOpenShortcuts}
          >
            <Keyboard className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Shortcuts <kbd className="ml-2 text-xs opacity-50">?</kbd></p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
