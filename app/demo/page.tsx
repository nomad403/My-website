import type { Metadata } from "next"
import DemoPageClient from "@/components/demo/DemoPageClient"
import {
  parseDemoLang,
  parseDemoScope,
} from "@/lib/demo/parse-params"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "NOMAD403 — Demo",
  description: "Mode présentation du portfolio Nomad403.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "https://www.nomad403.com/demo",
  },
}

type DemoPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<
    string,
    string | string[] | undefined
  >
}

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const params = await Promise.resolve(searchParams ?? {})
  const scope = parseDemoScope(firstParam(params.page))
  const lang = parseDemoLang(firstParam(params.lang))

  return <DemoPageClient initialScope={scope} initialLang={lang} />
}
