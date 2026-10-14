import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react"
import compressedMap from "../assets/pretoria-boeremark-map.svg.gz.b64?raw"

type ViewBox = { x: number; y: number; width: number; height: number }
type Point = { x: number; y: number }

type MarketMapProps = {
  selectedKeys: string[]
  onStallSelect: (key: string) => void
  ariaLabel: string
}

export type MarketMapHandle = {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  focusStalls: (keys: string[]) => void
}

const FULL_VIEW: ViewBox = { x: 0, y: 0, width: 1000, height: 1500 }
const MIN_WIDTH = FULL_VIEW.width / 6

function clampView(view: ViewBox): ViewBox {
  const width = Math.min(FULL_VIEW.width, Math.max(MIN_WIDTH, view.width))
  const height = width * 1.5
  const x = Math.min(FULL_VIEW.width - width, Math.max(0, view.x))
  const y = Math.min(FULL_VIEW.height - height, Math.max(0, view.y))
  return { x, y, width, height }
}

async function inflateMap(base64: string): Promise<string> {
  const clean = base64.trim()
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))
  return await new Response(stream).text()
}

const MarketMap = forwardRef<MarketMapHandle, MarketMapProps>(
  function MarketMap({ selectedKeys, onStallSelect, ariaLabel }, ref) {
    const viewportRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<ViewBox>(FULL_VIEW)
    const pointersRef = useRef(new Map<number, Point>())
    const dragOriginRef = useRef<Point | null>(null)
    const viewOriginRef = useRef<ViewBox>(FULL_VIEW)
    const pinchDistanceRef = useRef<number | null>(null)
    const movedRef = useRef(false)
    const [view, setView] = useState<ViewBox>(FULL_VIEW)
    const [mapMarkup, setMapMarkup] = useState("")

    useEffect(() => {
      let active = true
      inflateMap(compressedMap)
        .then((svg) => {
          if (active) setMapMarkup(svg)
        })
        .catch((error) => console.error("Unable to load market map", error))
      return () => {
        active = false
      }
    }, [])

    const updateView = (next: ViewBox) => {
      const clamped = clampView(next)
      viewRef.current = clamped
      setView(clamped)
    }

    const getSvg = () => viewportRef.current?.querySelector("svg") ?? null

    const clientToSvg = (clientX: number, clientY: number): Point | null => {
      const svg = getSvg()
      const matrix = svg?.getScreenCTM()
      if (!svg || !matrix) return null
      const point = svg.createSVGPoint()
      point.x = clientX
      point.y = clientY
      const transformed = point.matrixTransform(matrix.inverse())
      return { x: transformed.x, y: transformed.y }
    }

    const zoomAt = (factor: number, point?: Point | null) => {
      const current = viewRef.current
      const anchor = point ?? {
        x: current.x + current.width / 2,
        y: current.y + current.height / 2,
      }
      updateView({
        x: anchor.x - (anchor.x - current.x) * factor,
        y: anchor.y - (anchor.y - current.y) * factor,
        width: current.width * factor,
        height: current.height * factor,
      })
    }

    const reset = () => updateView(FULL_VIEW)

    const focusStalls = (keys: string[]) => {
      const svg = getSvg()
      if (!svg || keys.length === 0) return
      const boxes = keys.flatMap((key) => {
        const element = svg.querySelector<SVGGraphicsElement>(
          `[data-stall-key="${CSS.escape(key)}"]`,
        )
        return element ? [element.getBBox()] : []
      })
      if (boxes.length === 0) return
      const minX = Math.min(...boxes.map((box) => box.x))
      const minY = Math.min(...boxes.map((box) => box.y))
      const maxX = Math.max(...boxes.map((box) => box.x + box.width))
      const maxY = Math.max(...boxes.map((box) => box.y + box.height))
      const contentWidth = Math.max(90, maxX - minX + 80)
      const contentHeight = Math.max(135, maxY - minY + 120)
      const width = Math.max(contentWidth, contentHeight / 1.5)
      const height = width * 1.5
      updateView({
        x: (minX + maxX) / 2 - width / 2,
        y: (minY + maxY) / 2 - height / 2,
        width,
        height,
      })
    }

    useImperativeHandle(ref, () => ({
      zoomIn: () => zoomAt(0.72),
      zoomOut: () => zoomAt(1 / 0.72),
      reset,
      focusStalls,
    }))

    useEffect(() => {
      const svg = getSvg()
      if (!svg) return
      svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.width} ${view.height}`)
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet")
    }, [view, mapMarkup])

    useEffect(() => {
      const svg = getSvg()
      if (!svg) return
      const selected = new Set(selectedKeys)
      svg.querySelectorAll<SVGElement>("[data-stall-key]").forEach((stall) => {
        const isSelected = selected.has(stall.dataset.stallKey ?? "")
        stall.classList.toggle("is-selected", isSelected)
        if (isSelected) stall.setAttribute("aria-current", "true")
        else stall.removeAttribute("aria-current")
      })
    }, [selectedKeys, mapMarkup])

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (movedRef.current) {
        movedRef.current = false
        return
      }
      const target = (event.target as Element).closest<SVGElement>("[data-stall-key]")
      const key = target?.dataset.stallKey
      if (key) onStallSelect(key)
    }

    const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault()
      zoomAt(event.deltaY > 0 ? 1.14 : 0.88, clientToSvg(event.clientX, event.clientY))
    }

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      movedRef.current = false
      dragOriginRef.current = { x: event.clientX, y: event.clientY }
      viewOriginRef.current = viewRef.current
      if (pointersRef.current.size === 2) {
        const [first, second] = [...pointersRef.current.values()]
        pinchDistanceRef.current = Math.hypot(second.x - first.x, second.y - first.y)
      }
    }

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) return
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointersRef.current.size === 2) {
        const [first, second] = [...pointersRef.current.values()]
        const distance = Math.hypot(second.x - first.x, second.y - first.y)
        const previousDistance = pinchDistanceRef.current
        if (previousDistance && distance > 0) {
          zoomAt(
            previousDistance / distance,
            clientToSvg((first.x + second.x) / 2, (first.y + second.y) / 2),
          )
          movedRef.current = true
        }
        pinchDistanceRef.current = distance
        return
      }
      const origin = dragOriginRef.current
      const rect = getSvg()?.getBoundingClientRect()
      if (!origin || !rect) return
      const dx = event.clientX - origin.x
      const dy = event.clientY - origin.y
      if (Math.hypot(dx, dy) > 5) movedRef.current = true
      const start = viewOriginRef.current
      updateView({
        ...start,
        x: start.x - (dx / rect.width) * start.width,
        y: start.y - (dy / rect.height) * start.height,
      })
    }

    const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
      pointersRef.current.delete(event.pointerId)
      pinchDistanceRef.current = null
      dragOriginRef.current = null
      if (pointersRef.current.size === 1) {
        const [remaining] = [...pointersRef.current.values()]
        dragOriginRef.current = remaining
        viewOriginRef.current = viewRef.current
      }
    }

    return (
      <div
        ref={viewportRef}
        className="map-viewport"
        role="application"
        aria-label={ariaLabel}
        tabIndex={0}
        onClick={handleClick}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        dangerouslySetInnerHTML={{ __html: mapMarkup }}
      />
    )
  },
)

export default MarketMap
