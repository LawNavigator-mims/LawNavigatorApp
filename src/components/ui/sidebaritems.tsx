export interface SidebarItem {
  title: string;
  link: string;
}

export const sidebarItems: SidebarItem[] = [
  { title: "How To Use Law Navigator", link: "/how-to-use" },
  { title: "Legal Topics Overview", link: "/legal-topics-overview" },
  {
    title: "What are the legal requirements for writing a will?",
    link: "/writing-will",
  },
  {
    title: "Where can I find a template for a rental agreement?",
    link: "/rental-template",
  },
  { title: "How do I legally change my name?", link: "/change-name" },
  {
    title: "How do I file a discrimination complaint?",
    link: "/file-discrimination",
  },
  {
    title: "What should I do if I am falsely accused of a crime?",
    link: "/false-accusations",
  },
  { title: "How do I find a public defender?", link: "/public-defender" },
];
