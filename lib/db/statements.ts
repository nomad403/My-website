/** Split migrations without splitting quoted strings, comments or PL/pgSQL bodies. */
export function sqlStatements(source: string): string[] {
  const result: string[] = []
  let start = 0
  let quote = ""
  let dollar = ""
  let comment = ""
  for (let i = 0; i < source.length; i++) {
    const pair = source.slice(i, i + 2)
    if (comment === "--") { if (source[i] === "\n") comment = ""; continue }
    if (comment === "/*") { if (pair === "*/") { comment = ""; i++ }; continue }
    if (dollar) { if (source.startsWith(dollar, i)) { i += dollar.length - 1; dollar = "" }; continue }
    if (quote) {
      if (source[i] === quote) {
        if (source[i + 1] === quote) i++
        else quote = ""
      }
      continue
    }
    if (pair === "--" || pair === "/*") { comment = pair; i++; continue }
    if (source[i] === "'" || source[i] === '"') { quote = source[i]; continue }
    if (source[i] === "$") {
      const tag = source.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0]
      if (tag) { dollar = tag; i += tag.length - 1; continue }
    }
    if (source[i] === ";") {
      const statement = source.slice(start, i).trim()
      if (statement.replace(/--[^\n]*/g, "").trim()) result.push(statement)
      start = i + 1
    }
  }
  if (quote || dollar || comment === "/*") throw new Error("Unterminated SQL migration")
  const tail = source.slice(start).trim()
  if (tail.replace(/--[^\n]*/g, "").trim()) result.push(tail)
  return result
}
