import { useEffect, useCallback } from "react";
import { 
  MessageSquare, 
  History, 
  Bookmark, 
  Settings, 
  Zap, 
  Brain,
  Sparkles,
  Sun,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const runCommand = useCallback((command: () => void) => {
    onOpenChange(false);
    command();
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Type a command or search..." 
        className="border-none focus:ring-0"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => console.log("New debate"))}
            className="cursor-pointer"
          >
            <MessageSquare className="mr-2 h-4 w-4 text-[var(--color-cerebras-orange)]" />
            <span>New Debate</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => console.log("Quick debate"))}
            className="cursor-pointer"
          >
            <Zap className="mr-2 h-4 w-4 text-[var(--color-mandarin)]" />
            <span>Quick Debate</span>
            <CommandShortcut>⌘⇧N</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => console.log("Templates"))}
            className="cursor-pointer"
          >
            <Sparkles className="mr-2 h-4 w-4 text-[var(--color-purple)]" />
            <span>Browse Templates</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => console.log("History"))}
            className="cursor-pointer"
          >
            <History className="mr-2 h-4 w-4" />
            <span>History</span>
            <CommandShortcut>⌘H</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => console.log("Saved"))}
            className="cursor-pointer"
          >
            <Bookmark className="mr-2 h-4 w-4" />
            <span>Saved Debates</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Agents">
          <CommandItem
            onSelect={() => runCommand(() => console.log("Agents"))}
            className="cursor-pointer"
          >
            <Brain className="mr-2 h-4 w-4 text-[var(--color-cerebras-teal)]" />
            <span>Configure Agents</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Settings">
          <CommandItem
            onSelect={() => runCommand(() => console.log("Settings"))}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Preferences</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => console.log("Theme toggle"))}
            className="cursor-pointer"
          >
            <Sun className="mr-2 h-4 w-4" />
            <span>Toggle Theme</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Help">
          <CommandItem
            onSelect={() => runCommand(() => console.log("Help"))}
            className="cursor-pointer"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Support</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => window.open("https://cerebras.ai", "_blank"))}
            className="cursor-pointer"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>Cerebras Website</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
