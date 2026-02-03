import { 
  Brain,
  MessageSquare,
  History,
  Bookmark,
  Settings,
  HelpCircle,
  Zap,
  Layers,
  ChevronRight,
  Sparkles
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Agent configuration matching backend
const agents = [
  { id: "analyst", name: "Analyst", color: "#4ECDC4", icon: "🔍" },
  { id: "optimist", name: "Optimist", color: "#92E849", icon: "✨" },
  { id: "pessimist", name: "Pessimist", color: "#FF985D", icon: "⚠️" },
  { id: "critic", name: "Critic", color: "#FF6B6B", icon: "🎯" },
  { id: "strategist", name: "Strategist", color: "#A876E8", icon: "♟️" },
  { id: "finance", name: "Finance", color: "#7AC4D9", icon: "💰" },
  { id: "risk", name: "Risk", color: "#4D1210", icon: "🛡️" },
  { id: "synthesizer", name: "Synthesizer", color: "#FFFFFF", icon: "🔮" },
];

const mainNavItems = [
  {
    title: "New Debate",
    icon: MessageSquare,
    isActive: true,
    badge: null,
  },
  {
    title: "History",
    icon: History,
    isActive: false,
    badge: "12",
  },
  {
    title: "Saved",
    icon: Bookmark,
    isActive: false,
    badge: null,
  },
];

export function AppSidebar() {
  return (
    <Sidebar 
      variant="sidebar" 
      collapsible="icon"
      className="border-r border-[var(--color-border)] bg-[var(--color-bg-primary)]"
    >
      {/* Header with logo */}
      <SidebarHeader className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg" 
              className="group-data-[collapsible=icon]:!p-2"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-cerebras-orange)] to-[var(--color-mandarin)]">
                <Brain className="size-4 text-white" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold gradient-text">
                  Prism
                </span>
                <span className="truncate text-xs text-[var(--color-text-muted)]">
                  Multi-Agent Debate
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="bg-[var(--color-bg-primary)]">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={item.isActive}
                    className={`
                      text-[var(--color-text-secondary)] 
                      hover:text-[var(--color-text-primary)] 
                      hover:bg-[var(--color-bg-secondary)]
                      data-[active=true]:bg-[var(--color-bg-secondary)]
                      data-[active=true]:text-[var(--color-cerebras-orange)]
                      data-[active=true]:border-l-2
                      data-[active=true]:border-[var(--color-cerebras-orange)]
                      data-[active=true]:rounded-l-none
                    `}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <SidebarMenuBadge className="bg-[var(--color-bg-raised)] text-[var(--color-text-muted)]">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Agents Panel */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[var(--color-text-muted)] text-xs uppercase tracking-wider flex items-center gap-2">
            <Layers className="size-3" />
            Agents
            <Badge 
              variant="secondary" 
              className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-[var(--color-bg-raised)] text-[var(--color-text-muted)]"
            >
              8
            </Badge>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agents.map((agent) => (
                <SidebarMenuItem key={agent.id}>
                  <SidebarMenuButton 
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
                  >
                    <div 
                      className="size-2 rounded-full shrink-0" 
                      style={{ backgroundColor: agent.color }}
                    />
                    <span className="truncate">{agent.name}</span>
                    <ChevronRight className="ml-auto size-3 opacity-0 group-hover/menu-button:opacity-50 transition-opacity" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]">
                  <Zap className="size-4 text-[var(--color-cerebras-orange)]" />
                  <span>Quick Debate</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]">
                  <Sparkles className="size-4 text-[var(--color-purple)]" />
                  <span>Templates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-[var(--color-border)] bg-[var(--color-bg-primary)]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]">
              <HelpCircle className="size-4" />
              <span>Help & Support</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]">
              <Settings className="size-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User section */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg"
              className="hover:bg-[var(--color-bg-secondary)]"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-[var(--color-cerebras-orange)] to-[var(--color-mandarin)] text-white text-xs">
                  U
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-[var(--color-text-primary)]">
                  Guest User
                </span>
                <span className="truncate text-xs text-[var(--color-text-muted)]">
                  Free tier
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
