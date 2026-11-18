import { readdirSync } from "node:fs"
import { verifyPreviewBuildEnvironment } from "./preview-config.mjs"
const files = readdirSync(process.cwd()).filter(p =>
  (/^\.env(?:\.|$)/.test(p) || /^\.dev\.vars/.test(p)) && !p.endsWith(".example"))
if (verifyPreviewBuildEnvironment(process.env, files)) console.log("Preview build: application credentials absent.")
