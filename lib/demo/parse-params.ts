import type { PageId } from "@/lib/home/page-config"
import type { DemoLang, DemoScope } from "@/lib/demo/script"

const PAGES: PageId[] = ["home", "projects", "specialist", "contact"]

export function parseDemoScope(raw: string | null | undefined): DemoScope {
  if (!raw || raw === "all" || raw === "full") return "all"
  if (PAGES.includes(raw as PageId)) return raw as PageId
  return "all"
}

export function parseDemoLang(raw: string | null | undefined): DemoLang {
  if (raw === "en" || raw === "fr") return raw
  return "fr"
}

export function demoScopeToInitialPage(scope: DemoScope): PageId {
  return scope === "all" ? "home" : scope
}

export function buildDemoHref(scope: DemoScope, lang: DemoLang): string {
  const params = new URLSearchParams()
  if (scope !== "all") params.set("page", scope)
  if (lang !== "fr") params.set("lang", lang)
  const q = params.toString()
  return q ? `/demo?${q}` : "/demo"
}
