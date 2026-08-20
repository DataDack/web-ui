import { Activity, Globe2, Link2 } from "lucide-react"

import { css, cx, fontMono, glass2, media, mix } from "@datadack/common-ui"

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
  min-height: 400px;
  overflow: hidden;
  border: 1px solid ${mix("--border", 65)};
  border-radius: 0.5rem;
  background:
    radial-gradient(circle at 50% 46%, ${mix("--brand-gold", 9)}, transparent 48%),
    linear-gradient(135deg, ${mix("--foreground", 3)}, transparent 45%), ${mix("--background", 78)};

  @media (max-width: 520px) {
    min-height: 350px;
  }
`

const globe = css`
  position: absolute;
  inset: 10px 4px 38px;
  width: calc(100% - 8px);
  height: calc(100% - 48px);
`

const marker = css`
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  transform: translate(-7px, -50%);
`

const hubLabel = css`
  max-width: min(190px, 40vw);
  border-radius: 0.25rem;
  background: ${mix("--background", 94)};
  padding: 4px 7px;
  font-family: ${fontMono};
  font-size: 10px;
  line-height: 1.3;
  color: var(--foreground);
  overflow-wrap: anywhere;
`

const markerDot = css`
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border: 2px solid ${mix("--background", 90)};
  border-radius: 50%;
  background: var(--brand-gold);
  box-shadow: 0 0 0 5px ${mix("--brand-gold", 18)};
`

const originMarker = css`
  top: 50%;
  left: 58%;
`

const usMarker = css`
  top: 39%;
  left: 25%;
`

const euMarker = css`
  top: 32%;
  left: 50%;
`

const plannedDot = css`
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border: 1px solid ${mix("--muted-foreground", 72)};
  border-radius: 50%;
  background: ${mix("--background", 92)};
`

const mapNote = css`
  position: absolute;
  right: 14px;
  bottom: 12px;
  margin: 0;
  font-size: 10px;
  color: ${mix("--muted-foreground", 75)};
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
          <svg
            className={globe}
            viewBox="0 0 700 390"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <radialGradient id="edge-ocean" cx="34%" cy="28%" r="72%">
                <stop offset="0" stopColor="var(--foreground)" stopOpacity="0.13" />
                <stop offset="0.55" stopColor="var(--muted-foreground)" stopOpacity="0.07" />
                <stop offset="1" stopColor="var(--background)" stopOpacity="0.96" />
              </radialGradient>
              <linearGradient id="edge-land" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="var(--muted-foreground)" stopOpacity="0.38" />
                <stop offset="1" stopColor="var(--muted-foreground)" stopOpacity="0.13" />
              </linearGradient>
              <clipPath id="edge-sphere">
                <circle cx="350" cy="190" r="158" />
              </clipPath>
              <filter id="edge-depth" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow
                  dx="0"
                  dy="14"
                  stdDeviation="15"
                  floodColor="var(--foreground)"
                  floodOpacity="0.13"
                />
              </filter>
            </defs>
            <circle
              cx="350"
              cy="190"
              r="158"
              fill="url(#edge-ocean)"
              stroke="var(--border)"
              strokeWidth="1.5"
              filter="url(#edge-depth)"
            />
            <g
              clipPath="url(#edge-sphere)"
              fill="none"
              stroke="var(--muted-foreground)"
              strokeOpacity="0.2"
              strokeWidth="1"
            >
              <ellipse cx="350" cy="190" rx="112" ry="158" />
              <ellipse cx="350" cy="190" rx="55" ry="158" />
              <path d="M192 190h316M205 130c82 30 208 30 290 0M205 250c82-30 208-30 290 0" />
              <ellipse cx="350" cy="190" rx="158" ry="83" />
            </g>
            <g
              clipPath="url(#edge-sphere)"
              fill="url(#edge-land)"
              stroke="var(--muted-foreground)"
              strokeOpacity="0.25"
              strokeWidth="0.8"
            >
              <path d="M205 111l18-20 35-11 36 7 17 20-16 12-9 22-20 8-5 27-22 4-13-20-18-10-13-23z" />
              <path d="M271 181l24 7 12 22-8 32-17 39-15 12-8-35-18-30 8-31z" />
              <path d="M336 96l22-17 46-4 29 15 39 8 25 23-12 16-36-4-18 15-25-8-19 13-19-11-31 6-17-17 8-18z" />
              <path d="M373 156l34-7 34 17 14 29-10 35-28 39-22-7-7-35-20-26-9-27z" />
              <path d="M468 239l30 4 18 23-18 19-34-8-9-20z" />
              <path d="M330 292c49 12 91 12 132-2l-22 28-76 10z" />
            </g>
            <path
              d="M224 262c62 70 205 91 288 14"
              fill="none"
              stroke="var(--brand-gold)"
              strokeOpacity="0.22"
              strokeWidth="1.5"
              strokeDasharray="4 7"
            />
            <ellipse
              cx="326"
              cy="155"
              rx="130"
              ry="151"
              fill="none"
              stroke="var(--foreground)"
              strokeOpacity="0.06"
              strokeWidth="13"
            />
          </svg>
          <span className={cx(marker, originMarker)}>
            <span className={markerDot} />
            <span className={hubLabel}>Origin · {region}</span>
          </span>
          <span className={cx(marker, usMarker)}>
            <span className={plannedDot} />
            <span className={hubLabel}>US edge · planned</span>
          </span>
          <span className={cx(marker, euMarker)}>
            <span className={plannedDot} />
            <span className={hubLabel}>EU edge · planned</span>
          </span>
          <p className={mapNote}>Edge distribution is not enabled for this function.</p>
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
