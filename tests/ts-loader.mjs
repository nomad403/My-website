import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import ts from "typescript"

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    try {
      return await nextResolve(specifier, context)
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ERR_MODULE_NOT_FOUND" && !specifier.endsWith(".ts")) {
        return nextResolve(`${specifier}.ts`, context)
      }
      throw error
    }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts")) {
    const source = await readFile(fileURLToPath(url), "utf8")
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: true,
      },
    }).outputText
    return { format: "module", source: output, shortCircuit: true }
  }
  return nextLoad(url, context)
}
