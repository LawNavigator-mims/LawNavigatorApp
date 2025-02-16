import * as React from "react";
import {
  ChevronUp,
  GalleryVerticalEnd,
  Minus,
  Plus,
  Scale3DIcon,
  ScaleIcon,
  User2,
} from "lucide-react";

import { SearchForm } from "@/components/search-form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "./button";
import LegalDisclaimer from "../disclaimer";

// This is sample data.
const data = {
  navMain: [
    {
      title: "Getting Started",
      url: "#",
      items: [
        {
          title: "How To Use Law Navigator",
          url: "#",
        },
        {
          title: "Legal Topics Overview",
          url: "#",
        },
      ],
    },
    {
      title: "Previous Queries",
      url: "#",
      items: [
        {
          title: "What are the legal requirements for writing a will?",
          url: "#",
        },
        {
          title: "Where can I find a template for a rental agreement?",
          url: "#",
        },
        {
          title: "How do I legally change my name?",
          url: "#",
        },
        {
          title: "How do I file a discrimination complaint?",
          url: "#",
        },
        {
          title: "What should I do if I am falsely accused of a crime?",
          url: "#",
        },
        {
          title: "How do I find a public defender?",
          url: "#",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ScaleIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-lg">Law Navigator</span>
                </div>
              </a>
              {/* <Image src="/public/logo.png" width={40} height={40} alt="Logo" /> */}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {data.navMain.map((item, index) => (
              <Collapsible
                key={item.title}
                defaultOpen={index === 1}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      {item.title}{" "}
                      <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                      <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {item.items?.length ? (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((item) => (
                          <SidebarMenuSubItem
                            key={item.title}
                            className="truncate"
                          >
                            <SidebarMenuSubButton asChild>
                              <span>{item.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  ) : null}
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="mx-2 border border-border rounded-md px-4 py-2 bg-muted">
              <div className="font-bold text-lg">Legal Disclaimer</div>
              <div className="text-sm text-muted-foreground mt-2">
                By using this tool, you acknowledge the terms of service
              </div>
              <div className="mt-4">
                <LegalDisclaimer />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
