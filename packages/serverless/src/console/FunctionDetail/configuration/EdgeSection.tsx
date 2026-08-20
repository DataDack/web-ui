import { Activity, Globe2, Link2 } from "lucide-react"

import { css, cx, fontMono, glass2, media, mix } from "@datadack/common-ui"

import { EdgeGlobe } from "./EdgeGlobe"
import type { FunctionEntity } from "../../../data/types"

const layout = css`
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr);

  ${media.lg} {
    grid-template-columns: minmax(0, 2fr) minmax(280px, 0.9fr);
  }
`

const panel = css`
  min-width: 0;
  border-radius: 0.75rem;
  padding: 18px;
`

const topology = css`
  min-height: 480px;
`

const side = css`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const head = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`

const title = css`
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  font-family: ${fontMono};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--foreground);
`

const accentIcon = css`
  width: 15px;
  height: 15px;
  color: var(--brand-gold);
`

const status = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ${fontMono};
  font-size: 10px;
  color: var(--muted-foreground);
`

const dot = css`
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  background: var(--brand-gold);
`

const map = css`
  position: relative;
  min-height: 430px;
  overflow: hidden;
  border: 1px solid ${mix("--border", 65)};
  border-radius: 0.5rem;
  background:
    radial-gradient(circle at 50% 48%, ${mix("--brand-gold", 7)}, transparent 43%),
    linear-gradient(${mix("--border", 20)} 1px, transparent 1px),
    linear-gradient(90deg, ${mix("--border", 20)} 1px, transparent 1px), ${mix("--background", 86)};
  background-size:
    auto,
    32px 32px,
    32px 32px,
    auto;

  @media (max-width: 520px) {
    min-height: 380px;
  }
`

const endpoint = css`
  display: flex;
  min-height: 210px;
  flex-direction: column;
`

const empty = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px dashed ${mix("--border", 68)};
  border-radius: 0.5rem;
  padding: 22px;
  text-align: center;
`

const emptyTitle = css`
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--foreground);
`

const emptyCopy = css`
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted-foreground);
`

const table = css`
  width: 100%;
  border-collapse: collapse;
  font-family: ${fontMono};
  font-size: 10.5px;

  th,
  td {
    border-top: 1px solid ${mix("--border", 45)};
    padding: 11px 4px;
    text-align: left;
  }

  th {
    font-size: 9px;
    font-weight: 500;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }
`

const local = css`
  color: var(--brand-gold);
`

export function EdgeSection({ fn }: Readonly<{ fn: FunctionEntity }>) {
  const region = fn.region ?? "Current region"

  return (
    <div className={layout}>
      <section className={cx(glass2, panel, topology)} aria-labelledby="edge-topology-title">
        <header className={head}>
          <h3 className={title} id="edge-topology-title">
            <Globe2 className={accentIcon} />
            Network topology
          </h3>
          <span className={status}>
            <span className={dot} />
            Origin region: {region}
          </span>
        </header>
        <div className={map}>
          <EdgeGlobe region={region} />
        </div>
      </section>

      <div className={side}>
        <section className={cx(glass2, panel, endpoint)} aria-labelledby="edge-url-title">
          <header className={head}>
            <h3 className={title} id="edge-url-title">
              <Link2 className={accentIcon} />
              Edge URL configuration
            </h3>
            <span className={status}>Coming soon</span>
          </header>
          <div className={empty}>
            <Link2 className={accentIcon} aria-hidden />
            <p className={emptyTitle}>No global endpoint</p>
            <p className={emptyCopy}>
              A global URL and route mapping will appear here when edge distribution becomes
              available.
            </p>
          </div>
        </section>

        <section className={cx(glass2, panel)} aria-labelledby="edge-latency-title">
          <header className={head}>
            <h3 className={title} id="edge-latency-title">
              <Activity className={accentIcon} />
              Regional latency
            </h3>
          </header>
          <table className={table}>
            <thead>
              <tr>
                <th>Region hub</th>
                <th>Latency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{region}</td>
                <td>—</td>
                <td className={local}>Origin</td>
              </tr>
              <tr>
                <td>Global edges</td>
                <td>—</td>
                <td>Pending</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
