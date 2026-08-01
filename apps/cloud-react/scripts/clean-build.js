#!/usr/bin/env node
import fs from "fs"
import path from "path"

const distDir = path.resolve("dist")
const assetsDir = path.join(distDir, "assets")

if (!fs.existsSync(assetsDir)) {
    console.error("❌ dist/assets directory not found.")
    process.exit(1)
}

const jsFile = fs.readdirSync(assetsDir).find((f) => /^index-.*\.js$/.test(f))

const cssFile = fs.readdirSync(assetsDir).find((f) => /^(index|style)-.*\.css$/.test(f))

function copyAndRename(sourceFile, targetName) {
    if (!sourceFile) {
        console.warn(`⚠️ No file found for ${targetName}`)
        return
    }

    const sourcePath = path.join(assetsDir, sourceFile)
    const targetPath = path.join(distDir, targetName)

    fs.copyFileSync(sourcePath, targetPath)

    console.log(`✅ Copied ${sourceFile} → dist/${targetName}`)
}

copyAndRename(jsFile, "app.js")
copyAndRename(cssFile, "app.css")

console.log("🎉 Build cleanup complete.")
