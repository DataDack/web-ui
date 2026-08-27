import path from "node:path"
import { defineConfig, type Options } from "tsup"
const options:Options={entry:["src/index.ts"],format:["esm","cjs"],dts:true,sourcemap:true,clean:true,external:["react","react-dom","react/jsx-runtime","react-router-dom","@tanstack/react-query","lucide-react","react-icons","react-icons/si"],esbuildOptions(options){options.alias={...(options.alias??{}),"@":path.resolve(import.meta.dirname,"src")}}}
export default defineConfig(options)
