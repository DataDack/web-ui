import { useEffect, useRef } from "react"

import createGlobe, { type Arc, type Globe, type Marker } from "cobe"

import { css, fontMono, mix } from "@datadack/common-ui"

const GOLD: [number, number, number] = [0.96, 0.68, 0.16]
const PLANNED: [number, number, number] = [0.4, 0.42, 0.46]
const BACKGROUND_TOKEN = "--background"

const LOCATIONS: Record<string, [number, number]> = {
  "ap-south-1": [19.076, 72.8777],
  "ap-south-2": [17.385, 78.4867],
  "us-east-1": [39.0438, -77.4874],
  "us-west-1": [37.7749, -122.4194],
  "eu-west-1": [53.3498, -6.2603],
  "eu-central-1": [50.1109, 8.6821],
}

const US_EDGE: [number, number] = [39.0438, -77.4874]
const EU_EDGE: [number, number] = [50.1109, 8.6821]

const stage = css`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  cursor: grab;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  &::after {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(to bottom, transparent 66%, ${mix(BACKGROUND_TOKEN, 80)} 100%),
      radial-gradient(circle at 50% 48%, transparent 42%, ${mix(BACKGROUND_TOKEN, 34)} 76%);
    content: "";
    pointer-events: none;
  }
`

const canvas = css`
  position: absolute;
  top: 50%;
  left: 50%;
  display: block;
  width: min(92%, 600px);
  aspect-ratio: 1;
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: opacity 240ms ease-out;

  &[data-ready="true"] {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const legend = css`
  position: absolute;
  z-index: 2;
  right: 14px;
  bottom: 13px;
  left: 14px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  pointer-events: none;
`

const legendItem = css`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: ${fontMono};
  font-size: 9px;
  letter-spacing: 0.025em;
  color: var(--muted-foreground);
`

const legendDot = css`
  width: 7px;
  height: 7px;
  border: 1px solid ${mix(BACKGROUND_TOKEN, 88)};
  border-radius: 50%;
  background: var(--brand-gold);
  box-shadow: 0 0 0 4px ${mix("--brand-gold", 14)};
`

const plannedDot = css`
  width: 6px;
  height: 6px;
  border: 1px solid ${mix("--muted-foreground", 72)};
  border-radius: 50%;
  background: ${mix(BACKGROUND_TOKEN, 90)};
`

const hint = css`
  position: absolute;
  z-index: 2;
  top: 13px;
  right: 14px;
  border: 1px solid ${mix("--border", 54)};
  border-radius: 999px;
  background: ${mix(BACKGROUND_TOKEN, 76)};
  padding: 5px 8px;
  font-family: ${fontMono};
  font-size: 8.5px;
  letter-spacing: 0.04em;
  color: ${mix("--muted-foreground", 80)};
  pointer-events: none;
  backdrop-filter: blur(8px);
`

function locationFor(region: string): [number, number] {
  return LOCATIONS[region.toLowerCase()] ?? [19.076, 72.8777]
}

export function EdgeGlobe({ region }: Readonly<{ region: string }>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) return

    const origin = locationFor(region)
    const markers: Marker[] = [
      { location: origin, size: 0.075, color: GOLD, id: "origin" },
      { location: US_EDGE, size: 0.035, color: PLANNED, id: "us-edge" },
      { location: EU_EDGE, size: 0.035, color: PLANNED, id: "eu-edge" },
    ]
    const arcs: Arc[] = [
      { from: origin, to: US_EDGE, color: PLANNED },
      { from: origin, to: EU_EDGE, color: GOLD },
    ]

    let frame = 0
    let phi = -origin[1] * (Math.PI / 180)
    let pointerStart: number | null = null
    let dragStart = 0
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    const bounds = canvasElement.getBoundingClientRect()
    const size = Math.max(1, Math.round(Math.min(bounds.width, bounds.height)))
    const globe: Globe = createGlobe(canvasElement, {
      width: size,
      height: size,
      devicePixelRatio: Math.min(window.devicePixelRatio, 2),
      phi,
      theta: -0.16,
      dark: 1,
      diffuse: 1.35,
      scale: 1.06,
      mapSamples: 18000,
      mapBrightness: 2.3,
      mapBaseBrightness: 0.018,
      baseColor: [0.15, 0.155, 0.17],
      markerColor: GOLD,
      glowColor: [0.14, 0.105, 0.035],
      opacity: 0.96,
      markers,
      arcs,
      arcColor: GOLD,
      arcWidth: 0.7,
      arcHeight: 0.22,
      markerElevation: 0.025,
    })

    const resize = () => {
      const nextBounds = canvasElement.getBoundingClientRect()
      const nextSize = Math.max(1, Math.round(Math.min(nextBounds.width, nextBounds.height)))
      globe.update({ width: nextSize, height: nextSize, phi })
    }

    const animate = () => {
      if (!reducedMotion.matches && pointerStart === null) phi += 0.0016
      globe.update({ phi })
      frame = window.requestAnimationFrame(animate)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvasElement)
    canvasElement.dataset.ready = "true"
    frame = window.requestAnimationFrame(animate)

    const onPointerDown = (event: PointerEvent) => {
      pointerStart = event.clientX
      dragStart = phi
      canvasElement.setPointerCapture(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (pointerStart === null) return
      phi = dragStart + (event.clientX - pointerStart) / 180
      globe.update({ phi })
    }
    const onPointerUp = (event: PointerEvent) => {
      pointerStart = null
      if (canvasElement.hasPointerCapture(event.pointerId)) {
        canvasElement.releasePointerCapture(event.pointerId)
      }
    }

    canvasElement.addEventListener("pointerdown", onPointerDown)
    canvasElement.addEventListener("pointermove", onPointerMove)
    canvasElement.addEventListener("pointerup", onPointerUp)
    canvasElement.addEventListener("pointercancel", onPointerUp)

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      canvasElement.removeEventListener("pointerdown", onPointerDown)
      canvasElement.removeEventListener("pointermove", onPointerMove)
      canvasElement.removeEventListener("pointerup", onPointerUp)
      canvasElement.removeEventListener("pointercancel", onPointerUp)
      globe.destroy()
      delete canvasElement.dataset.ready
    }
  }, [region])

  return (
    <>
      <div className={stage} aria-hidden="true">
        <canvas className={canvas} ref={canvasRef} />
      </div>
      <span className={hint}>Drag to rotate</span>
      <div className={legend} aria-label="Network locations">
        <span className={legendItem}>
          <span className={legendDot} />
          Origin · {region}
        </span>
        <span className={legendItem}>
          <span className={plannedDot} />
          US edge · planned
        </span>
        <span className={legendItem}>
          <span className={plannedDot} />
          EU edge · planned
        </span>
      </div>
    </>
  )
}
