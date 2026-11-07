/**
 * All personal content lives here. Add entries to `projects` or `achievements`
 * to replace that section's “Coming soon” state. Optional links may be omitted.
 * Keep factual claims and contact details accurate when editing this file.
 */
export interface PortfolioEntry {
  title: string;
  description: string;
  url?: string;
  tags?: string[];
}

export const sections = [
  { id: "introduction", title: "Introduction", icon: "user" },
  { id: "about", title: "About Me", icon: "fingerprint" },
  { id: "achievements", title: "Achievements", icon: "award" },
  { id: "projects", title: "Projects", icon: "layers" },
  { id: "learning", title: "Currently Learning", icon: "shield" },
  { id: "contact", title: "Contact", icon: "mail" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export const siteConfig = {
  name: "Mohammed Siraj uddin",
  wordmark: "SIRAJ.",
  title: "Siraj — Personal Portfolio",
  description:
    "The personal portfolio of Mohammed Siraj uddin. Explore what Siraj is learning, creating, and achieving in coding and cybersecurity.",
  accentColor: "#8B5CF6",
  introduction:
    "Hi everyone, I’m Siraj! I’m a vibecoder who started coding out of personal interest and got into turning ideas into websites. I enjoy experimenting, figuring things out, and learning as I build. I game on the side, and I’m interested in making money and turning my skills into opportunities. This portfolio is where I’ll share what I’m learning, creating, and achieving along the way.",
  aboutMe:
    "My interests include coding, gaming, and exploring cybersecurity. I enjoy learning by doing and finding ways to turn ideas into something useful.",
  learningHeading: "Exploring the foundations of cybersecurity.",
  learningTopics: [
    {
      title: "Networking Fundamentals",
      description:
        "Learning how devices connect and communicate, including IP addresses, DNS, ports, and common protocols.",
    },
    {
      title: "Linux Fundamentals",
      description:
        "Exploring the terminal, file systems, permissions, and basic system commands.",
    },
    {
      title: "Web Security",
      description:
        "Learning about authentication, common web vulnerabilities, and ways to protect websites.",
    },
  ],
  social: {
    email: "sirajhamza491@gmail.com",
    instagram: {
      handle: "@wv.sir4j",
      url: "https://www.instagram.com/wv.sir4j/",
    },
  },
  emptyState: "Coming soon",
  projects: [] as PortfolioEntry[],
  achievements: [] as PortfolioEntry[],
};
