// Shared per-platform limits and metadata. Used by both UI counters and server-side validators.

export type Platform = "linkedin" | "twitter" | "instagram";

export const PLATFORMS: Platform[] = ["linkedin", "twitter", "instagram"];

export interface PlatformMeta {
  id: Platform;
  label: string;
  charLimit: number;
  colorVar: string;
  requiresMedia: boolean;
  hashtagHint: string;
}

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    charLimit: 3000,
    colorVar: "var(--brand-linkedin)",
    requiresMedia: false,
    hashtagHint: "3–5 hashtags at the bottom",
  },
  twitter: {
    id: "twitter",
    label: "X (Twitter)",
    charLimit: 280,
    colorVar: "var(--brand-twitter)",
    requiresMedia: false,
    hashtagHint: "1–3 hashtags inline",
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    charLimit: 2200,
    colorVar: "var(--brand-instagram)",
    requiresMedia: true,
    hashtagHint: "hashtags at bottom or in first comment; image required",
  },
};
