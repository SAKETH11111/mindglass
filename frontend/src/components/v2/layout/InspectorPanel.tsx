import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X,
  ChevronLeft,
  MessageSquare,
  Link2,
  Clock,
  Hash,
  User,
  Sparkles,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mock data for demonstration
const MOCK_NODE = {
  id: "node-1",
  agent: "Analyst",
  agentColor: "#4ECDC4",
  content: "Based on my analysis, there are three key factors to consider when evaluating this proposal. First, the market conditions suggest a favorable environment for growth. Second, the competitive landscape presents both opportunities and challenges...",
  timestamp: "12:34:56",
  tokens: 245,
  sources: [
    { title: "Market Analysis Report 2025", url: "#" },
    { title: "Industry Trends Overview", url: "#" },
  ],
  connections: [
    { id: "node-2", agent: "Optimist", type: "supports" },
    { id: "node-3", agent: "Pessimist", type: "challenges" },
  ],
};

interface InspectorPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedNode?: typeof MOCK_NODE | null;
}

export function InspectorPanel({ 
  isOpen, 
  onToggle,
  selectedNode = MOCK_NODE 
}: InspectorPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (selectedNode?.content) {
      navigator.clipboard.writeText(selectedNode.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      {/* Toggle button (always visible) */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={`
                h-8 w-6 rounded-l-lg rounded-r-none
                bg-[var(--color-bg-secondary)] border border-r-0 border-[var(--color-border)]
                text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]
                hover:bg-[var(--color-bg-raised)]
                ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
              `}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="bg-[var(--color-bg-raised)] border-[var(--color-border)]">
            <p className="text-xs">Open inspector</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="h-full border-l border-[var(--color-border)] bg-[var(--color-bg-primary)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--color-border)] shrink-0">
              <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Inspector
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-6 w-6 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            {selectedNode ? (
              <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="h-9 w-full justify-start gap-1 px-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] rounded-none shrink-0">
                  <TabsTrigger 
                    value="details" 
                    className="h-7 px-2 text-xs data-[state=active]:bg-[var(--color-bg-raised)] data-[state=active]:text-[var(--color-text-primary)]"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sources" 
                    className="h-7 px-2 text-xs data-[state=active]:bg-[var(--color-bg-raised)] data-[state=active]:text-[var(--color-text-primary)]"
                  >
                    Sources
                  </TabsTrigger>
                  <TabsTrigger 
                    value="connections" 
                    className="h-7 px-2 text-xs data-[state=active]:bg-[var(--color-bg-raised)] data-[state=active]:text-[var(--color-text-primary)]"
                  >
                    Links
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  {/* Details Tab */}
                  <TabsContent value="details" className="mt-0 p-3 space-y-4">
                    {/* Agent info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selectedNode.agentColor }}
                        />
                        <span 
                          className="text-sm font-medium"
                          style={{ color: selectedNode.agentColor }}
                        >
                          {selectedNode.agent}
                        </span>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {selectedNode.timestamp}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {selectedNode.tokens} tokens
                        </span>
                      </div>
                    </div>

                    <Separator className="bg-[var(--color-border)]" />

                    {/* Content */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                          Content
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopy}
                          className="h-6 w-6 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        >
                          {copied ? (
                            <Check className="h-3 w-3 text-[var(--color-green)]" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                        {selectedNode.content}
                      </p>
                    </div>

                    <Separator className="bg-[var(--color-border)]" />

                    {/* Actions */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                        Actions
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-raised)]"
                        >
                          <MessageSquare className="h-3 w-3 mr-1.5" />
                          Follow up
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-raised)]"
                        >
                          <Sparkles className="h-3 w-3 mr-1.5" />
                          Expand
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Sources Tab */}
                  <TabsContent value="sources" className="mt-0 p-3 space-y-3">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                      Referenced Sources
                    </span>
                    {selectedNode.sources.map((source, i) => (
                      <div 
                        key={i}
                        className="p-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {source.title}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0 text-[var(--color-text-muted)]"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  {/* Connections Tab */}
                  <TabsContent value="connections" className="mt-0 p-3 space-y-3">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                      Connected Nodes
                    </span>
                    {selectedNode.connections.map((conn, i) => (
                      <div 
                        key={i}
                        className="p-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Link2 className="h-3 w-3 text-[var(--color-text-muted)]" />
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              {conn.agent}
                            </span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`
                              h-5 text-[9px] px-1.5
                              ${conn.type === 'supports' 
                                ? 'border-[var(--color-green)]/30 text-[var(--color-green)]' 
                                : 'border-[var(--color-mandarin)]/30 text-[var(--color-mandarin)]'
                              }
                            `}
                          >
                            {conn.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            ) : (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center">
                    <User className="h-6 w-6 text-[var(--color-text-muted)]" />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Select a node to view details
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
