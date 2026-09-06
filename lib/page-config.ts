import type { AsciiMode } from "@/lib/performance"

export type PageId = "home" | "projects" | "specialist" | "contact"

export type PageBackground = "day" | "night"

export interface PageAsciiConfig {
  visible: boolean
  mode: AsciiMode
  invert: boolean
  opacity: number
  color: string
  fontPx: number
}

export interface PageConfigEntry {
  sphere: { scale: number }
  background: PageBackground
  ascii: PageAsciiConfig
}

export const PAGE_CONFIG: Record<PageId, PageConfigEntry> = {
  home: {
    sphere: { scale: 1 },
    background: "day",
    ascii: {
      visible: true,
      mode: "sobel",
      invert: false,
      opacity: 0.8,
      color: "#ff0000",
      fontPx: 7,
    },
  },
  projects: {
    sphere: { scale: 3.5 },
    background: "day",
    ascii: {
      visible: true,
      mode: "sobel",
      invert: false,
      opacity: 0.4,
      color: "#ff00f1",
      fontPx: 7,
    },
  },
  specialist: {
    sphere: { scale: 1 },
    background: "day",
    ascii: {
      visible: true,
      mode: "sobel",
      invert: false,
      opacity: 0.5,
      color: "#00ffc8",
      fontPx: 7,
    },
  },
  contact: {
    sphere: { scale: 0 },
    background: "day",
    ascii: {
      visible: true,
      mode: "sobel",
      invert: false,
      opacity: 0.7,
      color: "#ffcc00",
      fontPx: 7,
    },
  },
}

export function getPageConfig(page: string): PageConfigEntry {
  if (page in PAGE_CONFIG) {
    return PAGE_CONFIG[page as PageId]
  }
  return PAGE_CONFIG.home
}

export function pathToPageId(pathname: string): PageId {
  if (pathname === "/projects") return "projects"
  if (pathname === "/specialist") return "specialist"
  if (pathname === "/contact") return "contact"
  return "home"
}

export function pageIdToPath(page: string): string {
  return page === "home" ? "/" : `/${page}`
}
