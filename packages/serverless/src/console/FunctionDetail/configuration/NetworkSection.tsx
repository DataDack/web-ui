import { Boxes, Info, Network, Router, Server, Waypoints } from "lucide-react"

import { Button, css, cx, fontMono, glass2, media, mix } from "@datadack/common-ui"

import type { FunctionEntity } from "../../../data/types"

const layout = css`
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr);

  ${media.lg} {
    grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  }
`

const panel = css`
  min-width: 0;
  border-radius: 0.75rem;
  padding: 20px;
`

const configuration = css`
  display: flex;
  min-height: 440px;
  flex-direction: column;
`

const panelHead = css`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
`

const titleRow = css`
  display: flex;
  align-items: center;
  gap: 10px;
`

const icon = css`
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  color: var(--brand-gold);
`

const heading = css`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--foreground);
`

const description = css`
  margin: 6px 0 0 27px;
  max-width: 42rem;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--muted-foreground);
`

const soon = css`
  flex-shrink: 0;
  border: 1px solid ${mix("--brand-gold", 32)};
  border-radius: 9999px;
  background: ${mix("--brand-gold", 10)};
  padding: 3px 9px;
  font-family: ${fontMono};
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--brand-gold);
`

const fields = css`
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const field = css`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const label = css`
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-foreground);
`

const labelHint = css`
  margin-left: 6px;
  font-size: 10.5px;
  font-weight: 400;
  color: ${mix("--muted-foreground", 72)};
`

const control = css`
  width: 100%;
  min-height: 42px;
  border: 1px solid ${mix("--border", 75)};
  border-radius: 0.5rem;
  background: ${mix("--background", 65)};
  padding: 0 12px;
  font-family: ${fontMono};
  font-size: 12px;
  color: var(--muted-foreground);
  opacity: 1;
`

const multiControl = css`
  display: flex;
  min-height: 76px;
  align-items: center;
`

const actions = css`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: auto;
  border-top: 1px solid ${mix("--border", 45)};
  padding-top: 18px;
`

const interfaces = css`
  display: flex;
  min-height: 440px;
  flex-direction: column;
`

const empty = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed ${mix("--border", 68)};
  border-radius: 0.5rem;
  padding: 24px;
  text-align: center;
`

const emptyIcon = css`
  width: 26px;
  height: 26px;
  color: ${mix("--muted-foreground", 72)};
`

const emptyTitle = css`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--foreground);
`

const emptyCopy = css`
  margin: 0;
  max-width: 18rem;
  font-size: 11.5px;
  line-height: 1.55;
  color: var(--muted-foreground);
`

const note = css`
  display: flex;
  gap: 9px;
  margin-top: 14px;
  border-radius: 0.5rem;
  background: ${mix("--foreground", 5)};
  padding: 12px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted-foreground);
`

const topology = css`
  grid-column: 1 / -1;
`

const diagram = css`
  display: grid;
  min-height: 190px;
  align-items: center;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr);
  border: 1px dashed ${mix("--border", 68)};
  border-radius: 0.5rem;
  padding: 16px;

  ${media.sm} {
    gap: 20px;
    grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1fr);
    padding: 24px;
  }
`

const node = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  font-family: ${fontMono};
  font-size: 11px;
  text-align: center;
  color: var(--muted-foreground);
`

const nodeTile = css`
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border: 1px solid ${mix("--brand-gold", 35)};
  border-radius: 0.625rem;
  background: ${mix("--brand-gold", 8)};
  color: var(--brand-gold);
`

const route = css`
  height: 1px;
  background: ${mix("--border", 70)};
`

export function NetworkSection({ fn }: Readonly<{ fn: FunctionEntity }>) {
  return (
    <div className={layout}>
      <section className={cx(glass2, panel, configuration)} aria-labelledby="vpc-config-title">
        <header className={panelHead}>
          <div>
            <div className={titleRow}>
              <Network className={icon} aria-hidden />
              <h3 className={heading} id="vpc-config-title">
                VPC attachment configuration
              </h3>
            </div>
            <p className={description}>
              Connect this function to private services without exposing traffic to the public
              internet.
            </p>
          </div>
          <span className={soon}>Coming soon</span>
        </header>

        <fieldset className={fields} disabled>
          <div className={field}>
            <label className={label} htmlFor="fn-vpc">
              Virtual private cloud
            </label>
            <select className={control} id="fn-vpc" defaultValue="">
              <option value="">No VPC attached</option>
            </select>
          </div>
          <div className={field}>
            <label className={label} htmlFor="fn-subnets">
              Execution subnets{" "}
              <span className={labelHint}>Select at least two for high availability</span>
            </label>
            <div className={cx(control, multiControl)} id="fn-subnets">
              Subnets will appear after a VPC is selected
            </div>
          </div>
          <div className={field}>
            <label className={label} htmlFor="fn-security-groups">
              Security groups
            </label>
            <div className={cx(control, multiControl)} id="fn-security-groups">
              Security groups will appear after a VPC is selected
            </div>
          </div>
        </fieldset>

        <footer className={actions}>
          <Button variant="ghost" size="sm" disabled>
            Discard
          </Button>
          <Button variant="gold" size="sm" disabled>
            Save configuration
          </Button>
        </footer>
      </section>

      <aside className={cx(glass2, panel, interfaces)} aria-labelledby="eni-title">
        <header className={panelHead}>
          <div className={titleRow}>
            <Server className={icon} aria-hidden />
            <h3 className={heading} id="eni-title">
              Network interfaces
            </h3>
          </div>
        </header>
        <div className={empty}>
          <Router className={emptyIcon} aria-hidden />
          <p className={emptyTitle}>No interfaces allocated</p>
          <p className={emptyCopy}>
            Managed interfaces will appear here after this function is attached to a VPC.
          </p>
        </div>
        <div className={note}>
          <Info size={15} aria-hidden /> Interface capacity will scale automatically with function
          concurrency.
        </div>
      </aside>

      <section className={cx(glass2, panel, topology)} aria-labelledby="topology-title">
        <header className={panelHead}>
          <div className={titleRow}>
            <Waypoints className={icon} aria-hidden />
            <h3 className={heading} id="topology-title">
              Topology
            </h3>
          </div>
        </header>
        <div className={diagram}>
          <div className={node}>
            <span className={nodeTile}>
              <Boxes size={22} />
            </span>
            <span>{fn.name}</span>
          </div>
          <div className={route} aria-hidden />
          <div className={node}>
            <span className={nodeTile}>
              <Network size={22} />
            </span>
            <span>No VPC attached</span>
          </div>
        </div>
      </section>
    </div>
  )
}
