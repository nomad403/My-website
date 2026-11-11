export function sqlStatements(source: string): string[] {
  return source
    .split(/;\s*(?:\r?\n|$)/)
    .map((part) => part.trim())
    .filter((part) =>
      part.split("\n").some((line) => {
        const trimmed = line.trim()
        return trimmed.length > 0 && !trimmed.startsWith("--")
      }),
    )
}
