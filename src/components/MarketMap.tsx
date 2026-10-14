import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  getListingColor,
  isFeaturedActive,
  type ListingsByKey,
} from "../data/listings"

type ViewBox = {
  x: number

  y: number

  width: number

  height: number
}

type Point = {
  x: number

  y: number
}

type MarketMapProps = {
  selectedKeys: string[]
  listings: ListingsByKey
  onStallSelect: (key: string) => void
  onFeatureSelect: (feature: string) => void

  ariaLabel: string

  loadErrorLabel: string

  retryLabel: string
}

export type MarketMapHandle = {
  zoomIn: () => void

  zoomOut: () => void

  reset: () => void

  focusStalls: (keys: string[]) => void

  focusFeatures: (ids: string[]) => void
}

const FULL_VIEW: ViewBox = { x: 0, y: 0, width: 1044, height: 1507 }

const MIN_WIDTH = FULL_VIEW.width / 6

const MAP_RATIO = FULL_VIEW.height / FULL_VIEW.width

function clampView(view: ViewBox): ViewBox {
  const width = Math.min(FULL_VIEW.width, Math.max(MIN_WIDTH, view.width))

  const height = width * MAP_RATIO

  const x = Math.min(FULL_VIEW.width - width, Math.max(0, view.x))

  const y = Math.min(FULL_VIEW.height - height, Math.max(0, view.y))

  return { x, y, width, height }
}

const MarketMap = forwardRef<MarketMapHandle, MarketMapProps>(
  function MarketMap(
    {
      selectedKeys,
      listings,
      onStallSelect,
      onFeatureSelect,
      ariaLabel,
      loadErrorLabel,
      retryLabel,
    },

    ref,
  ) {
    const viewportRef = useRef<HTMLDivElement>(null)

    const viewRef = useRef<ViewBox>(FULL_VIEW)

    const pointersRef = useRef(new Map<number, Point>())

    const pointerTargetRef = useRef<{
      stallKey: string | null
      feature: string | null
    } | null>(null)

    const dragOriginRef = useRef<Point | null>(null)

    const viewOriginRef = useRef<ViewBox>(FULL_VIEW)

    const pinchDistanceRef = useRef<number | null>(null)

    const movedRef = useRef(false)

    const pendingFocusRef = useRef<string[] | null>(null)

    const [mapMarkup, setMapMarkup] = useState("")

    const [view, setView] = useState<ViewBox>(FULL_VIEW)

    const [loadError, setLoadError] = useState(false)

    const [loadAttempt, setLoadAttempt] = useState(0)

    useEffect(() => {
      let active = true

      setLoadError(false)

      fetch(`${import.meta.env.BASE_URL}pretoria-boeremark-map.svg`)

        .then((response) => {
          if (!response.ok) throw new Error("Unable to load the market map")

          return response.text()
        })

        .then((markup) => {
          if (active) setMapMarkup(markup)
        })

        .catch((error: unknown) => {
          console.error("Unable to load market map", error)

          if (active) setLoadError(true)
        })

      return () => {
        active = false
      }
    }, [loadAttempt])

    useEffect(() => {
      const svg = getSvg()
      if (!svg) return

      svg
        .querySelectorAll<SVGElement>("[data-feature-key]")
        .forEach((feature) => {
          feature.removeAttribute("href")
          feature.removeAttributeNS("http://www.w3.org/1999/xlink", "href")
          feature.setAttribute("role", "button")
          feature.setAttribute("tabindex", "0")
        })

      svg.querySelectorAll<SVGElement>(".toilet-marker").forEach((marker) => {
        marker.setAttribute(
          "aria-label",
          "Men's and women's toilets / Mans- en damestoilette",
        )
        marker
          .querySelector("title")
          ?.replaceChildren(
            document.createTextNode(
              "Men's and women's toilets / Mans- en damestoilette",
            ),
          )
        marker.querySelector("text")?.remove()

        const markerCircle = marker.querySelector("circle")
        if (!markerCircle) return

        const centerX = Number(markerCircle.getAttribute("cx"))
        const centerY = Number(markerCircle.getAttribute("cy"))
        const image = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "image",
        )
        image.setAttribute("class", "toilet-sign-image")
        image.setAttribute("x", String(centerX - 17))
        image.setAttribute("y", String(centerY - 12))
        image.setAttribute("width", "34")
        image.setAttribute("height", "24")
        image.setAttribute("preserveAspectRatio", "xMidYMid meet")
        image.setAttribute("href", `${import.meta.env.BASE_URL}Toilet.png`)
        marker.append(image)
      })

      svg.querySelectorAll<SVGElement>("[data-stall-key]").forEach((stall) => {
        stall.removeAttribute("href")
        stall.removeAttributeNS("http://www.w3.org/1999/xlink", "href")
        stall.setAttribute("role", "button")
        stall.setAttribute("tabindex", "0")
      })
    }, [mapMarkup])

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

    const focusElements = (elements: SVGGraphicsElement[]) => {
      const boxes = elements.map((element) => element.getBBox())
      if (boxes.length === 0) return

      const minX = Math.min(...boxes.map((box) => box.x))

      const minY = Math.min(...boxes.map((box) => box.y))

      const maxX = Math.max(...boxes.map((box) => box.x + box.width))

      const maxY = Math.max(...boxes.map((box) => box.y + box.height))

      const contentWidth = Math.max(90, maxX - minX + 80)

      const contentHeight = Math.max(135, maxY - minY + 120)

      const width = Math.max(contentWidth, contentHeight / MAP_RATIO)

      const height = width * MAP_RATIO

      updateView({
        x: (minX + maxX) / 2 - width / 2,

        y: (minY + maxY) / 2 - height / 2,

        width,

        height,
      })
    }

    const focusStalls = (keys: string[]) => {
      const svg = getSvg()

      if (keys.length === 0) return

      if (!svg) {
        pendingFocusRef.current = keys

        return
      }

      const elements = keys.flatMap((key) => {
        const element = svg.querySelector<SVGGraphicsElement>(
          `[data-stall-key="${CSS.escape(key)}"]`,
        )

        return element ? [element] : []
      })

      if (elements.length === 0) return

      const boxes = elements.map((element) => element.getBBox())
      const centerX =
        boxes.reduce((sum, box) => sum + box.x + box.width / 2, 0) /
        boxes.length
      const centerY =
        boxes.reduce((sum, box) => sum + box.y + box.height / 2, 0) /
        boxes.length
      const current = viewRef.current

      updateView({
        ...current,
        x: centerX - current.width / 2,
        y: centerY - current.height / 2,
      })
    }

    const focusFeatures = (ids: string[]) => {
      const svg = getSvg()
      if (!svg) return

      const elements = ids.flatMap((id) => {
        const element = svg.querySelector<SVGGraphicsElement>(
          `#${CSS.escape(id)}`,
        )

        return element ? [element] : []
      })

      if (elements.length === 0) return

      const boxes = elements.map((element) => element.getBBox())
      const centerX =
        boxes.reduce((sum, box) => sum + box.x + box.width / 2, 0) /
        boxes.length
      const centerY =
        boxes.reduce((sum, box) => sum + box.y + box.height / 2, 0) /
        boxes.length
      const current = viewRef.current

      updateView({
        ...current,
        x: centerX - current.width / 2,
        y: centerY - current.height / 2,
      })
    }

    useEffect(() => {
      const pendingKeys = pendingFocusRef.current

      if (!pendingKeys || !mapMarkup) return

      pendingFocusRef.current = null

      focusStalls(pendingKeys)
    }, [mapMarkup])

    useImperativeHandle(ref, () => ({
      zoomIn: () => zoomAt(0.72),

      zoomOut: () => zoomAt(1 / 0.72),

      reset,

      focusStalls,

      focusFeatures,
    }))

    useEffect(() => {
      const svg = getSvg()

      if (!svg) return

      svg.setAttribute(
        "viewBox",

        `${view.x} ${view.y} ${view.width} ${view.height}`,
      )

      svg.setAttribute("preserveAspectRatio", "xMidYMid meet")
    }, [mapMarkup, view])

    useEffect(() => {
      const svg = getSvg()

      if (!svg) return

      const selected = new Set(selectedKeys)

      svg.querySelectorAll<SVGElement>("[data-stall-key]").forEach((stall) => {
        const isSelected = selected.has(stall.dataset.stallKey ?? "")
        const listing = listings[stall.dataset.stallKey ?? ""]
        stall.classList.toggle("is-selected", isSelected)
        if (listing) {
          stall.classList.toggle("is-featured", isFeaturedActive(listing))
          stall.classList.toggle(
            "has-special-today",
            listing.specialToday && Boolean(listing.special.trim()),
          )
          stall.dataset.categoryColor = getListingColor(listing.category)
        }

        if (isSelected) {
          stall.setAttribute("aria-current", "true")
        } else {
          stall.removeAttribute("aria-current")
        }
      })
    }, [listings, mapMarkup, selectedKeys])

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault()

      const pointerTarget = pointerTargetRef.current
      pointerTargetRef.current = null

      if (movedRef.current) {
        movedRef.current = false

        return
      }

      const target = (event.target as Element).closest<SVGElement>(
        "[data-stall-key]",
      )

      const key = pointerTarget?.stallKey ?? target?.dataset.stallKey

      if (key) onStallSelect(key)
      const feature =
        pointerTarget?.feature ??
        (event.target as Element)
          .closest<SVGElement>("[data-feature-key]")
          ?.getAttribute("data-feature-key")
      if (feature) onFeatureSelect(feature)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return

      const element = event.target as Element
      const target = element.closest<SVGElement>("[data-stall-key]")
      const key = target?.dataset.stallKey
      if (key) {
        event.preventDefault()
        onStallSelect(key)
        return
      }

      const featureKey = element
        .closest<SVGElement>("[data-feature-key]")
        ?.getAttribute("data-feature-key")
      if (!featureKey) return

      event.preventDefault()
      onFeatureSelect(featureKey)
    }

    useEffect(() => {
      const viewport = viewportRef.current
      if (!viewport) return
      const handleWheel = (event: WheelEvent) => {
        event.preventDefault()
        const point = clientToSvg(event.clientX, event.clientY)
        zoomAt(event.deltaY > 0 ? 1.14 : 0.88, point)
      }
      viewport.addEventListener("wheel", handleWheel, { passive: false })
      return () => viewport.removeEventListener("wheel", handleWheel)
    }, [])

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest("[data-stall-key], [data-feature-key]")) {
        event.preventDefault()
      }

      pointerTargetRef.current = target
        ? {
            stallKey:
              target
                .closest<SVGElement>("[data-stall-key]")
                ?.getAttribute("data-stall-key") ?? null,
            feature:
              target
                .closest<SVGElement>("[data-feature-key]")
                ?.getAttribute("data-feature-key") ?? null,
          }
        : null

      event.currentTarget.setPointerCapture(event.pointerId)

      pointersRef.current.set(event.pointerId, {
        x: event.clientX,

        y: event.clientY,
      })

      movedRef.current = false

      dragOriginRef.current = { x: event.clientX, y: event.clientY }

      viewOriginRef.current = viewRef.current

      if (pointersRef.current.size === 2) {
        const [first, second] = [...pointersRef.current.values()]

        pinchDistanceRef.current = Math.hypot(
          second.x - first.x,

          second.y - first.y,
        )
      }
    }

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) return

      pointersRef.current.set(event.pointerId, {
        x: event.clientX,

        y: event.clientY,
      })

      if (pointersRef.current.size === 2) {
        const [first, second] = [...pointersRef.current.values()]

        const distance = Math.hypot(second.x - first.x, second.y - first.y)

        const previousDistance = pinchDistanceRef.current

        if (previousDistance && distance > 0) {
          const midpoint = clientToSvg(
            (first.x + second.x) / 2,

            (first.y + second.y) / 2,
          )

          zoomAt(previousDistance / distance, midpoint)

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

      if (event.type === "pointercancel") pointerTargetRef.current = null

      pinchDistanceRef.current = null

      dragOriginRef.current = null

      if (pointersRef.current.size === 1) {
        const [remaining] = [...pointersRef.current.values()]

        dragOriginRef.current = remaining

        viewOriginRef.current = viewRef.current
      }
    }

    return (
      <>
        <div
          ref={viewportRef}
          className="map-viewport"
          role="application"
          aria-label={ariaLabel}
          aria-busy={!mapMarkup && !loadError}
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          dangerouslySetInnerHTML={{ __html: mapMarkup }}
        />
        {loadError && (
          <div className="map-load-error" role="alert">
            <p>{loadErrorLabel}</p>
            <button
              type="button"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            >
              {retryLabel}
            </button>
          </div>
        )}
      </>
    )
  },
)

export default MarketMap
