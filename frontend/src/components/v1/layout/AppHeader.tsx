import { motion } from "framer-motion";
import { 
  Github, 
  Command,
  Settings,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

interface AppHeaderProps {
  onCommandOpen?: () => void;
}

export function AppHeader({ onCommandOpen }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/80 backdrop-blur-xl">
      {/* Orange top accent line - Cerebras brand */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-cerebras-orange)] to-transparent opacity-80" />
      
      <div className="flex w-full items-center justify-between gap-2 px-4">
        {/* Left section: Sidebar trigger + breadcrumb */}
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]" />
          
          <Separator orientation="vertical" className="mx-1 h-4 bg-[var(--color-border)]" />
          
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
                  <Sparkles className="h-4 w-4 text-[var(--color-cerebras-orange)]" />
                  Prism
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Center section: Logo/Brand */}
        <motion.div 
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <img 
            src="/cerebras-logo.svg" 
            alt="Cerebras" 
            className="h-7 w-7"
          />
          <div className="hidden sm:block">
            <span className="text-base font-semibold tracking-tight gradient-text">
              Cerebras
            </span>
            <span className="text-base font-light text-[var(--color-text-secondary)] ml-1">
              Prism
            </span>
          </div>
        </motion.div>

        {/* Right section: Actions */}
        <div className="flex items-center gap-1">
          {/* Command palette trigger */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCommandOpen}
            className="hidden sm:flex items-center gap-2 h-8 px-3 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
          >
            <Command className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Command</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <Separator orientation="vertical" className="mx-1 h-4 bg-[var(--color-border)] hidden sm:block" />

          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-48 bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
            >
              <DropdownMenuItem className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:bg-[var(--color-bg-raised)]">
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--color-border)]" />
              <DropdownMenuItem className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:bg-[var(--color-bg-raised)]">
                <span className="mr-2">🎨</span>
                Theme
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* GitHub link */}
          <Button 
            variant="ghost" 
            size="icon" 
            asChild
            className="h-8 w-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
          >
            <a 
              href="https://github.com/cerebras" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              <span className="sr-only">GitHub</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
