export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "lengsukq的tools站",
  description: "各种实用工具集合，提供便捷的在线工具服务。",
  navItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Docs",
      href: "/docs",
    },
    {
      label: "Pricing",
      href: "/pricing",
    },
    {
      label: "Blog",
      href: "/blog",
    },
    {
      label: "About",
      href: "/about",
    },
    {
      label: "Domain Checker",
      href: "/domain-checker",
    },
    {
      label: "电费计算器",
      href: "/electricity-calculator",
    },
    {
      label: "流量消耗器",
      href: "/traffic-consumer",
    },
    {
      label: "HTML预览",
      href: "/html-preview",
    },
  ],
  navMenuItems: [
    {
      label: "Profile",
      href: "/profile",
    },
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      label: "Projects",
      href: "/projects",
    },
    {
      label: "Team",
      href: "/team",
    },
    {
      label: "Calendar",
      href: "/calendar",
    },
    {
      label: "Settings",
      href: "/settings",
    },
    {
      label: "Help & Feedback",
      href: "/help-feedback",
    },
    {
      label: "Logout",
      href: "/logout",
    },
    {
      label: "HTML预览",
      href: "/html-preview",
    },
  ],
  links: {
    github: "https://github.com/lengsukq/lengsukq-tools",
    twitter: "https://twitter.com/hero_ui",
    docs: "https://heroui.com",
    discord: "https://discord.gg/9b6yyZKmH4",
    sponsor: "https://patreon.com/jrgarciadev",
  },
};
