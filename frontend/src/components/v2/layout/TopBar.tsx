import { motion } from "framer-motion";
import { 
  Github, 
  Settings,
  Share2,
  Download,
  Wifi,
  WifiOff,
  ChevronDown,
  Layers,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TopBarProps {
  isConnected?: boolean;
  workspaceName?: string;
  onShare?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
}

export function TopBar({ 
  isConnected = true, 
  workspaceName = "Untitled Debate",
  onShare,
  onExport,
  onSettings,
}: TopBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <header className="h-12 flex items-center justify-between px-3 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/95 backdrop-blur-xl shrink-0 relative z-50">
        {/* Orange accent line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-cerebras-orange)]/60 to-transparent" />

        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <img 
              src="/cerebras-logo.svg" 
              alt="Cerebras" 
              className="h-6 w-6"
            />
            <span className="text-sm font-semibold gradient-text hidden sm:inline">
              Prism
            </span>
          </motion.div>

          <Separator orientation="vertical" className="h-5 bg-[var(--color-border)]" />

          {/* Workspace dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 px-2 gap-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
              >
                <Layers className="h-3.5 w-3.5 text-[var(--color-cerebras-orange)]" />
                <span className="max-w-[120px] truncate text-xs font-medium">
                  {workspaceName}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="w-56 bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
            >
              <DropdownMenuLabel className="text-[var(--color-text-muted)] text-xs">
                Workspace
              </DropdownMenuLabel>
              <DropdownMenuItem className="text-[var(--color-text-secondary)] focus:bg-[var(--color-bg-raised)]">
                <Sparkles className="mr-2 h-4 w-4 text-[var(--color-cerebras-orange)]" />
                New Debate
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--color-border)]" />
              <DropdownMenuItem className="text-[var(--color-text-secondary)] focus:bg-[var(--color-bg-raised)]">
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--color-text-secondary)] focus:bg-[var(--color-bg-raised)]">
                Duplicate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center: Connection status */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`
              h-6 gap-1.5 px-2 text-[10px] font-medium border transition-all
              ${isConnected 
                ? 'border-[var(--color-green)]/30 text-[var(--color-green)] bg-[var(--color-green)]/5' 
                : 'border-red-500/30 text-red-400 bg-red-500/5'
              }
            `}
          >
            <motion.div
              animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
            </motion.div>
            <span className="hidden sm:inline">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </Badge>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Share */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onShare}
                className="h-8 w-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
              <p className="text-xs">Share</p>
            </TooltipContent>
          </Tooltip>

          {/* Export */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onExport}
                className="h-8 w-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
              <p className="text-xs">Export</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-5 bg-[var(--color-border)]" />

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onSettings}
                className="h-8 w-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
              <p className="text-xs">Settings</p>
            </TooltipContent>
          </Tooltip>

          {/* GitHub */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                asChild
                className="h-8 w-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
              >
                <a href="https://github.com/cerebras" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
              <p className="text-xs">GitHub</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
