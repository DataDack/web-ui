import { css, cx } from "@emotion/css"
import { Code2, FileCode2, FileJson, FileText, Rocket, Search, type LucideIcon } from "lucide-react"

import { formatBytes } from "../lib/cn"
import { contentEnter, fontMono, glass1, glass2, glass3, media, mix } from "../lib/styles"

const root = css`
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 0 1px ${mix("--border", 60)};
`

const mock = css`
  pointer-events: none;
  user-select: none;
  filter: blur(2px);
`

const overlay = css`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  background: linear-gradient(
    to bottom,
    ${mix("--background", 40)},
    ${mix("--background", 70)},
    ${mix("--background", 85)}
  );
  backdrop-filter: blur(3px);
`

const card = css`
  max-width: 24rem;
  padding: 20px 24px;
  text-align: center;
  box-shadow:
    0 0 0 1px ${mix("--border", 70)},
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
`

const cardIconTile = css`
  margin: 0 auto 12px;
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
`

const cardIcon = css`
  color: var(--brand-gold);
  width: 20px;
  height: 20px;
`

const cardTitle = css`
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
`

const cardBlurb = css`
  color: var(--muted-foreground);
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.625;
`

export interface CodeEditorPlaceholderProps {
  functionName: string
  /** Real function metadata for the mock's header line; mock values otherwise. */
  runtime?: string
  sizeBytes?: number
  version?: string | number
  /** Overlay copy overrides, for consoles with a different deploy story. */
  title?: string
  message?: string
  className?: string
}

/**
 * The Code tab before inline editing exists: a dimmed, inert mock of the editor
 * behind a "coming soon" card, so the tab reads as a feature being built rather
 * than an empty panel.
 *
 * Pass the function's real `runtime` / `sizeBytes` / `version` and the mock
 * header renders them; anything omitted falls back to plausible mock values.
 * Everything below the overlay is decoration — no data, no interactivity — and
 * is hidden from assistive tech. The overlay carries the only real message.
 */
export function CodeEditorPlaceholder({
  functionName,
  runtime,
  sizeBytes,
  version,
  title,
  message,
  className,
}: Readonly<CodeEditorPlaceholderProps>) {
  return (
    <div className={cx(glass2, contentEnter, root, className)}>
      <div aria-hidden className={mock}>
        <EditorChrome
          functionName={functionName}
          runtime={runtime}
          sizeBytes={sizeBytes}
          version={version}
        />
      </div>

      {/* Sits above the mock and supplies the accessible copy. */}
      <div className={overlay}>
        <div className={cx(glass3, card)}>
          <div className={cx(glass1, cardIconTile)}>
            <Code2 className={cardIcon} />
          </div>
          <h3 className={cardTitle}>{title ?? "Coming soon"}</h3>
          <p className={cardBlurb}>
            {message ??
              "Inline code editing isn’t available yet. Deploy updates through the API or CLI in the meantime."}
          </p>
        </div>
      </div>
    </div>
  )
}

const chrome = css`
  opacity: 0.7;
`

const chromeHeader = css`
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid ${mix("--border", 60)};
  padding: 10px 16px;
`

const fileIcon = css`
  color: var(--muted-foreground);
  width: 14px;
  height: 14px;
`

const fileName = css`
  font-family: ${fontMono};
  font-size: 13px;
  font-weight: 500;
`

const fileMeta = css`
  color: var(--muted-foreground);
  font-family: ${fontMono};
  font-size: 11px;
`

const headerActions = css`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
`

const discardChip = css`
  border: 1px solid ${mix("--border", 70)};
  color: var(--muted-foreground);
  border-radius: 0.375rem;
  padding: 4px 8px;
  font-family: ${fontMono};
  font-size: 10px;
`

const deployChip = css`
  background: ${mix("--brand-gold", 85)};
  color: var(--brand-gold-foreground);
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 0.375rem;
  padding: 4px 10px;
  font-family: ${fontMono};
  font-size: 10px;
  font-weight: 500;
`

const deployIcon = css`
  width: 12px;
  height: 12px;
`

const chromeBody = css`
  display: flex;
  min-height: 300px;
`

const sidebar = css`
  display: none;
  width: 208px;
  flex-shrink: 0;
  border-right: 1px solid ${mix("--border", 60)};
  padding: 12px;

  ${media.sm} {
    display: block;
  }
`

const searchBox = css`
  border: 1px solid ${mix("--border", 60)};
  color: ${mix("--muted-foreground", 70)};
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 0.375rem;
  padding: 6px 8px;
`

const searchIcon = css`
  width: 12px;
  height: 12px;
`

const searchLabel = css`
  font-size: 11px;
`

const fileList = css`
  & > * + * {
    margin-top: 2px;
  }
`

const fileRow = css`
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 0.375rem;
  padding: 6px 8px;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--muted-foreground);
`

const fileRowActive = css`
  background: ${mix("--accent", 70)};
  color: var(--foreground);
`

const fileRowNested = css`
  margin-left: 12px;
`

const fileRowIcon = css`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
`

const codePane = css`
  min-width: 0;
  flex: 1;
  overflow: hidden;
  padding: 12px 0;
`

const codeBlock = css`
  font-family: ${fontMono};
  font-size: 12.5px;
  line-height: 1.7;
`

const codeLine = css`
  display: flex;
  padding: 0 8px;
`

const lineNumber = css`
  color: ${mix("--muted-foreground", 45)};
  width: 36px;
  flex-shrink: 0;
  padding-right: 12px;
  text-align: right;
  font-variant-numeric: tabular-nums;
`

const lineCode = css`
  white-space: pre;
`

function EditorChrome({
  functionName,
  runtime,
  sizeBytes,
  version,
}: Readonly<
  Pick<CodeEditorPlaceholderProps, "functionName" | "runtime" | "sizeBytes" | "version">
>) {
  const meta = [
    runtime ?? "nodejs20.x",
    sizeBytes === undefined ? "4.2 KB" : formatBytes(sizeBytes),
    version === undefined ? "v3" : `v${String(version)}`,
  ].join(" · ")

  return (
    <div className={chrome}>
      <header className={chromeHeader}>
        <FileCode2 className={fileIcon} />
        <span className={fileName}>{functionName}</span>
        <span className={fileMeta}>{meta}</span>
        <div className={headerActions}>
          <span className={discardChip}>Discard</span>
          <span className={deployChip}>
            <Rocket className={deployIcon} />
            Deploy
          </span>
        </div>
      </header>

      <div className={chromeBody}>
        <aside className={sidebar}>
          <div className={searchBox}>
            <Search className={searchIcon} />
            <span className={searchLabel}>Search files</span>
          </div>
          <ul className={fileList}>
            {FILES.map((file) => (
              <li
                key={file.name}
                className={cx(
                  fileRow,
                  file.active && fileRowActive,
                  file.depth === 1 && fileRowNested,
                )}
              >
                <file.icon className={fileRowIcon} />
                {file.name}
              </li>
            ))}
          </ul>
        </aside>

        <div className={codePane}>
          <pre className={codeBlock}>
            {CODE.map((tokens, index) => (
              // Static, ordered decoration — the index is the only stable key.
              // eslint-disable-next-line react/no-array-index-key
              <div key={index} className={codeLine}>
                <span className={lineNumber}>{index + 1}</span>
                <code className={lineCode}>
                  {tokens.map((token, position) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <span key={position} className={token.className}>
                      {token.text}
                    </span>
                  ))}
                </code>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  )
}

interface MockFile {
  name: string
  icon: LucideIcon
  active: boolean
  depth: 0 | 1
}

const FILES: MockFile[] = [
  { name: "handler.js", icon: FileCode2, active: true, depth: 0 },
  { name: "lib/", icon: FileText, active: false, depth: 0 },
  { name: "transform.js", icon: FileCode2, active: false, depth: 1 },
  { name: "client.js", icon: FileCode2, active: false, depth: 1 },
  { name: "package.json", icon: FileJson, active: false, depth: 0 },
  { name: "README.md", icon: FileText, active: false, depth: 0 },
]

interface Token {
  text: string
  className?: string
}

/* Token colours reuse the chart palette so the mock stays theme-correct. */
const kwStyle = css`
  color: var(--chart-2);
`
const strStyle = css`
  color: var(--chart-3);
`
const fnStyle = css`
  color: var(--chart-1);
`
const comStyle = css`
  color: ${mix("--muted-foreground", 60)};
  font-style: italic;
`
const puncStyle = css`
  color: var(--muted-foreground);
`
const txtStyle = css`
  color: ${mix("--foreground", 75)};
`

const kw = (text: string): Token => ({ text, className: kwStyle })
const str = (text: string): Token => ({ text, className: strStyle })
const fnName = (text: string): Token => ({ text, className: fnStyle })
const com = (text: string): Token => ({ text, className: comStyle })
const punc = (text: string): Token => ({ text, className: puncStyle })
const txt = (text: string): Token => ({ text, className: txtStyle })

const CODE: Token[][] = [
  [com("// handler.js — invoked once per request")],
  [],
  [kw("import"), txt(" { transform } "), kw("from"), str(" './lib/transform.js'")],
  [],
  [kw("export async function "), fnName("handler"), punc("("), txt("event, context"), punc(") {")],
  [
    txt("  "),
    kw("const"),
    txt(" body = "),
    fnName("JSON.parse"),
    punc("("),
    txt("event.body ?? "),
    str("'{}'"),
    punc(")"),
  ],
  [txt("  "), kw("const"), txt(" items = body.items ?? "), punc("[]")],
  [],
  [
    txt("  "),
    kw("const"),
    txt(" result = "),
    kw("await"),
    txt(" Promise."),
    fnName("all"),
    punc("("),
  ],
  [
    txt("    items."),
    fnName("map"),
    punc("(("),
    txt("item"),
    punc(") => "),
    fnName("transform"),
    punc("("),
    txt("item"),
    punc(")),"),
  ],
  [txt("  "), punc(")")],
  [],
  [txt("  "), kw("return"), txt(" "), punc("{")],
  [txt("    statusCode: "), fnName("200"), punc(",")],
  [
    txt("    body: "),
    fnName("JSON.stringify"),
    punc("({"),
    txt(" ok: "),
    kw("true"),
    txt(", result "),
    punc("}),"),
  ],
  [txt("  "), punc("}")],
  [punc("}")],
]
