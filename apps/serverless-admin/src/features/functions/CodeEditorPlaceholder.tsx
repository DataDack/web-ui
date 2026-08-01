import { Code2, FileCode2, FileJson, FileText, Rocket, Search } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * The Code tab before inline editing exists: a dimmed, inert mock of the editor
 * behind a "coming soon" card, so the tab reads as a feature being built rather
 * than an empty panel.
 *
 * Everything below the overlay is decoration — no data, no interactivity — and
 * is hidden from assistive tech. The overlay carries the only real message.
 */
export function CodeEditorPlaceholder({
  functionName,
  className,
}: Readonly<{ functionName: string; className?: string }>) {
  return (
    <div
      className={cn(
        'glass-2 animate-content-enter relative overflow-hidden rounded-xl',
        'ring-border/60 ring-1',
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none select-none blur-[2px]">
        <EditorChrome functionName={functionName} />
      </div>

      {/* Sits above the mock and supplies the accessible copy. */}
      <div className="from-background/40 via-background/70 to-background/85 absolute inset-0 flex items-center justify-center bg-gradient-to-b px-6 backdrop-blur-[3px]">
        <div className="glass-3 ring-border/70 max-w-sm rounded-xl px-6 py-5 text-center shadow-lg ring-1">
          <div className="glass-1 mx-auto mb-3 flex size-11 items-center justify-center rounded-xl">
            <Code2 className="text-brand-gold size-5" />
          </div>
          <h3 className="text-sm font-semibold">Coming soon</h3>
          <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
            Inline code editing isn’t available yet. Deploy updates through the API or CLI in the
            meantime.
          </p>
        </div>
      </div>
    </div>
  )
}

function EditorChrome({ functionName }: Readonly<{ functionName: string }>) {
  return (
    <div className="opacity-70">
      <header className="border-border/60 flex items-center gap-2.5 border-b px-4 py-2.5">
        <FileCode2 className="text-muted-foreground size-3.5" />
        <span className="font-mono text-[13px] font-medium">{functionName}</span>
        <span className="text-muted-foreground font-mono text-[11px]">
          nodejs20.x · 4.2 KB · v3
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="border-border/70 text-muted-foreground rounded-md border px-2 py-1 font-mono text-[10px]">
            Discard
          </span>
          <span className="bg-brand-gold/85 text-brand-gold-foreground flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] font-medium">
            <Rocket className="size-3" />
            Deploy
          </span>
        </div>
      </header>

      <div className="flex min-h-75">
        <aside className="border-border/60 hidden w-52 shrink-0 border-r p-3 sm:block">
          <div className="border-border/60 text-muted-foreground/70 mb-3 flex items-center gap-1.5 rounded-md border px-2 py-1.5">
            <Search className="size-3" />
            <span className="text-[11px]">Search files</span>
          </div>
          <ul className="space-y-0.5">
            {FILES.map((file) => (
              <li
                key={file.name}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[11px]',
                  file.active ? 'bg-accent/70 text-foreground' : 'text-muted-foreground',
                  file.depth === 1 && 'ml-3',
                )}
              >
                <file.icon className="size-3 shrink-0" />
                {file.name}
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden py-3">
          <pre className="font-mono text-[12.5px] leading-[1.7]">
            {CODE.map((tokens, index) => (
              // Static, ordered decoration — the index is the only stable key.
              <div key={index} className="flex px-2">
                <span className="text-muted-foreground/45 w-9 shrink-0 pr-3 text-right tabular-nums">
                  {index + 1}
                </span>
                <code className="whitespace-pre">
                  {tokens.map((token, position) => (
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

const FILES = [
  { name: 'handler.js', icon: FileCode2, active: true, depth: 0 },
  { name: 'lib/', icon: FileText, active: false, depth: 0 },
  { name: 'transform.js', icon: FileCode2, active: false, depth: 1 },
  { name: 'client.js', icon: FileCode2, active: false, depth: 1 },
  { name: 'package.json', icon: FileJson, active: false, depth: 0 },
  { name: 'README.md', icon: FileText, active: false, depth: 0 },
]

interface Token {
  text: string
  className?: string
}

/* Token colours reuse the chart palette so the mock stays theme-correct. */
const kw = (text: string): Token => ({ text, className: 'text-chart-2' })
const str = (text: string): Token => ({ text, className: 'text-chart-3' })
const fnName = (text: string): Token => ({ text, className: 'text-chart-1' })
const com = (text: string): Token => ({ text, className: 'text-muted-foreground/60 italic' })
const punc = (text: string): Token => ({ text, className: 'text-muted-foreground' })
const txt = (text: string): Token => ({ text, className: 'text-foreground/75' })

const CODE: Token[][] = [
  [com('// handler.js — invoked once per request')],
  [],
  [kw('import'), txt(' { transform } '), kw('from'), str(" './lib/transform.js'")],
  [],
  [kw('export async function '), fnName('handler'), punc('('), txt('event, context'), punc(') {')],
  [
    txt('  '),
    kw('const'),
    txt(' body = '),
    fnName('JSON.parse'),
    punc('('),
    txt('event.body ?? '),
    str("'{}'"),
    punc(')'),
  ],
  [txt('  '), kw('const'), txt(' items = body.items ?? '), punc('[]')],
  [],
  [
    txt('  '),
    kw('const'),
    txt(' result = '),
    kw('await'),
    txt(' Promise.'),
    fnName('all'),
    punc('('),
  ],
  [
    txt('    items.'),
    fnName('map'),
    punc('(('),
    txt('item'),
    punc(') => '),
    fnName('transform'),
    punc('('),
    txt('item'),
    punc(')),'),
  ],
  [txt('  '), punc(')')],
  [],
  [txt('  '), kw('return'), txt(' '), punc('{')],
  [txt('    statusCode: '), fnName('200'), punc(',')],
  [
    txt('    body: '),
    fnName('JSON.stringify'),
    punc('({'),
    txt(' ok: '),
    kw('true'),
    txt(', result '),
    punc('}),'),
  ],
  [txt('  '), punc('}')],
  [punc('}')],
]
