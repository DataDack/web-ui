import {
  ChevronRight,
  Circle,
  CircleDot,
  Code2,
  FileCode2,
  FileJson,
  FileText,
  GitBranch,
  Rocket,
  Search,
  X,
  type LucideIcon,
} from "lucide-react"

import {
  caretBlink,
  contentEnter,
  css,
  cx,
  fontMono,
  formatBytes,
  glass1,
  glass2,
  glass3,
  media,
  mix,
} from "@datadack/common-ui"

const root = css`
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  box-shadow: 0 0 0 1px ${mix("--border", 60)};
`

const mock = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
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
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  opacity: 0.7;
`

const titleBar = css`
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid ${mix("--border", 60)};
  padding: 8px 12px;
`

const trafficLights = css`
  display: none;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  ${media.sm} {
    display: flex;
  }
`

const trafficLight = css`
  width: 10px;
  height: 10px;
  border-radius: 9999px;
`

const trafficLightRed = css`
  background: ${mix("--destructive", 60)};
`

const trafficLightYellow = css`
  background: ${mix("--status-warning", 60)};
`

const trafficLightGreen = css`
  background: ${mix("--status-success", 60)};
`

const fileMeta = css`
  color: var(--muted-foreground);
  font-family: ${fontMono};
  font-size: 11px;
  white-space: nowrap;
`

const headerActions = css`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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

const tabStrip = css`
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  border-bottom: 1px solid ${mix("--border", 60)};
`

const tabItem = css`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  border-right: 1px solid ${mix("--border", 50)};
  padding: 7px 10px;
  font-family: ${fontMono};
  font-size: 11.5px;
  color: var(--muted-foreground);
`

const tabItemActive = css`
  background: ${mix("--accent", 55)};
  color: var(--foreground);
  box-shadow: inset 0 -2px 0 0 var(--brand-gold);
`

const tabItemIcon = css`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
`

const tabItemDot = css`
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  color: ${mix("--muted-foreground", 70)};
`

const tabItemClose = css`
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  color: ${mix("--muted-foreground", 70)};
`

const breadcrumb = css`
  display: none;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid ${mix("--border", 50)};
  padding: 6px 12px;
  font-family: ${fontMono};
  font-size: 11px;
  color: ${mix("--muted-foreground", 80)};

  ${media.sm} {
    display: flex;
  }
`

const breadcrumbSep = css`
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  color: ${mix("--muted-foreground", 50)};
`

const breadcrumbCurrent = css`
  color: var(--foreground);
`

const chromeBody = css`
  display: flex;
  flex: 1;
  min-height: 260px;
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

const fileRowGap = css`
  flex: 1;
`

const fileRowLines = css`
  flex-shrink: 0;
  color: ${mix("--muted-foreground", 55)};
  font-size: 10px;
`

const codeArea = css`
  display: flex;
  min-width: 0;
  flex: 1;
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

const cursor = css`
  display: inline-block;
  width: 1.5px;
  height: 13px;
  margin-left: 1px;
  vertical-align: -2px;
  background: var(--foreground);
`

const minimap = css`
  display: none;
  width: 64px;
  flex-shrink: 0;
  border-left: 1px solid ${mix("--border", 50)};
  padding: 12px 10px;

  ${media.lg} {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
`

const minimapLine = css`
  height: 2px;
  border-radius: 9999px;
  background: ${mix("--muted-foreground", 30)};
`

const statusBar = css`
  display: flex;
  align-items: center;
  gap: 14px;
  border-top: 1px solid ${mix("--border", 60)};
  padding: 5px 12px;
  font-family: ${fontMono};
  font-size: 10.5px;
  color: ${mix("--muted-foreground", 85)};
`

const statusItem = css`
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
`

const statusIcon = css`
  width: 11px;
  height: 11px;
`

const statusGap = css`
  flex: 1;
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
      <div className={titleBar}>
        <div className={trafficLights}>
          <span className={cx(trafficLight, trafficLightRed)} />
          <span className={cx(trafficLight, trafficLightYellow)} />
          <span className={cx(trafficLight, trafficLightGreen)} />
        </div>
        <span className={fileMeta}>{meta}</span>
        <div className={headerActions}>
          <span className={discardChip}>Discard</span>
          <span className={deployChip}>
            <Rocket className={deployIcon} />
            Deploy
          </span>
        </div>
      </div>

      <div className={tabStrip}>
        {TABS.map((tabFile) => (
          <div
            key={tabFile.name}
            className={cx(tabItem, tabFile.active && tabItemActive)}
          >
            <tabFile.icon className={tabItemIcon} />
            {tabFile.name}
            {tabFile.active ? (
              <X className={tabItemClose} />
            ) : (
              <CircleDot className={tabItemDot} />
            )}
          </div>
        ))}
      </div>

      <div className={breadcrumb}>
        <span>{functionName}</span>
        <ChevronRight className={breadcrumbSep} />
        <span className={breadcrumbCurrent}>handler.js</span>
      </div>

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
                <span className={fileRowGap} />
                {file.lines !== undefined && (
                  <span className={fileRowLines}>{file.lines}</span>
                )}
              </li>
            ))}
          </ul>
        </aside>

        <div className={codeArea}>
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
                    {index === CURSOR_LINE && <span className={cx(cursor, caretBlink)} />}
                  </code>
                </div>
              ))}
            </pre>
          </div>

          <div className={minimap} aria-hidden>
            {MINIMAP_WIDTHS.map((width, index) => (
              // Decorative density lines — order is the only identity they have.
              // eslint-disable-next-line react/no-array-index-key
              <span key={index} className={minimapLine} style={{ width: `${width}%` }} />
            ))}
          </div>
        </div>
      </div>

      <div className={statusBar}>
        <span className={statusItem}>
          <GitBranch className={statusIcon} />
          main
        </span>
        <span className={statusItem}>
          <Circle className={statusIcon} />0 problems
        </span>
        <span className={statusGap} />
        <span className={statusItem}>Ln {CURSOR_LINE + 1}, Col 3</span>
        <span className={statusItem}>UTF-8</span>
        <span className={statusItem}>JavaScript</span>
      </div>
    </div>
  )
}

interface MockFile {
  name: string
  icon: LucideIcon
  active: boolean
  depth: 0 | 1
  lines?: number
}

const FILES: MockFile[] = [
  { name: "handler.js", icon: FileCode2, active: true, depth: 0, lines: 18 },
  { name: "lib/", icon: FileText, active: false, depth: 0 },
  { name: "transform.js", icon: FileCode2, active: false, depth: 1, lines: 24 },
  { name: "client.js", icon: FileCode2, active: false, depth: 1, lines: 12 },
  { name: "package.json", icon: FileJson, active: false, depth: 0, lines: 15 },
  { name: "README.md", icon: FileText, active: false, depth: 0, lines: 8 },
]

interface MockTab {
  name: string
  icon: LucideIcon
  active: boolean
}

const TABS: MockTab[] = [
  { name: "handler.js", icon: FileCode2, active: true },
  { name: "transform.js", icon: FileCode2, active: false },
  { name: "package.json", icon: FileJson, active: false },
]

const MINIMAP_WIDTHS = [40, 65, 25, 80, 50, 0, 70, 90, 35, 60, 20, 0, 55, 45, 30, 75, 15, 0]

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

/** Where the fake blinking cursor sits — the closing brace of the return block. */
const CURSOR_LINE = CODE.length - 1
