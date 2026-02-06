/**
 * Tech/SE-friendly categories for the blog.
 * value: used in URLs and API; label: shown in UI.
 */
export const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "devops", label: "DevOps & Cloud" },
  { value: "ai", label: "AI/ML" },
  { value: "web3", label: "Web3" },
  { value: "databases", label: "Databases" },
  { value: "architecture", label: "Architecture & Design" },
  { value: "tools", label: "Tools & Workflow" },
  { value: "career", label: "Career & Learning" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

const LEGACY_LABELS: Record<string, string> = {
  "web-design": "Web Design",
  development: "Development",
  databases: "Databases",
  seo: "Search Engines",
  marketing: "Marketing",
};

export function getCategoryLabel(value: string): string {
  const found = CATEGORIES.find((c) => c.value === value);
  if (found) return found.label;
  return LEGACY_LABELS[value] ?? value;
}
