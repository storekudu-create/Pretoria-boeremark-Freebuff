# Pretoria Boeremark Interactive Stall Map

## Objective

Build a responsive, interactive schematic map of Pretoria Boeremark from the supplied labelled floor plan and aerial photograph.

The implementation will deliver:

1. A standalone SVG in which every visible numbered stall is its own identifiable, selectable block.
2. A React demonstration page that renders that same SVG, supports pan/zoom, and shows the selected stall number.
3. A data-ready interaction layer that can later accept vendor/category/details data without redrawing the map.

The labelled floor plan is the authority for stall IDs, roads, and named landmarks. The aerial image is a secondary reference for relative footprint, orientation, and site context. The result is a clear visitor-navigation schematic, not a survey-grade or cadastral map.

## Confirmed Product Decisions

- Deliver both the standalone SVG and an interactive React demo.
- Include useful non-stall context: roads, major kraals/green spaces, play areas, amenities, office, go-karts, and the river/site edge.
- Split every printed stall ID into its own clickable SVG block, including IDs currently printed inside a shared physical footprint.
- Make selection number-first and structure the data/API for later vendor metadata.
- Support mouse, trackpad, touch, and visible pan/zoom controls.
- Provide an Afrikaans/English UI toggle.
- Preserve official map labels and road names in Afrikaans; the toggle changes the surrounding interface and explanatory copy rather than renaming official site features.

## Repository Findings

- The repository is a clean React 19 + Vite 8 + TypeScript + Tailwind CSS v4 scaffold.
- `src/App.tsx` is currently an empty centered container.
- `src/index.css` only imports Tailwind.
- There is no existing design system, router, component library, map package, icon package, or application data model to preserve.
- No new runtime dependency is required; SVG interaction can be implemented with React state and pointer/wheel events.
- The existing supervised development server must be used; no additional development server should be started.

## Source-of-Truth and File Structure

Use a single checked-in SVG as the source of truth for all traced geometry:

- `src/assets/pretoria-boeremark-map.svg`
  - Standalone, valid SVG with a portrait `viewBox`.
  - Contains all stall shapes, labels, roads, landmarks, and embedded SVG styles.
  - Usable directly outside React.
- `src/data/stalls.ts`
  - Typed metadata keyed to the SVG’s `data-stall-key` values.
  - Starts with display number and optional future-facing fields.
- `src/components/MarketMap.tsx`
  - Imports the canonical SVG as raw text through Vite’s `?raw` support.
  - Injects the trusted local SVG into a controlled map viewport.
  - Owns delegated stall interaction and viewBox-based pan/zoom behavior.
- `src/App.tsx`
  - Builds the bilingual demo shell, lookup, controls, and selected-stall panel.
- `src/index.css`
  - Adds global palette/type defaults and interaction styling not suitable for utility classes.

Do not duplicate the stall geometry in JSX or in a second generated SVG. The React demo and standalone deliverable must consume the same asset.

## SVG Construction

### Coordinate system and visual organization

- Use a stable portrait coordinate system close to the reference plan’s proportions (approximately 2:3).
- Trace the labelled plan into simplified vector geometry rather than attempting pixel-perfect image autotracing.
- Organize the SVG into named top-level groups in back-to-front order:
  1. site boundary/background
  2. river and exterior context
  3. roads/walkways
  4. kraals, play areas, and other open spaces
  5. buildings/amenities
  6. stalls
  7. road and landmark labels
- Keep paths economical and readable. Rectangles, polygons, and simple paths are preferred over high-node-count tracing.
- Do not embed either supplied JPEG in the finished SVG.

### Stall contract

Each individually selectable stall will be represented by an SVG anchor/group with:

- A unique DOM `id`, for example `stall-101`.
- `data-stall-key`, used as the stable React/data key.
- `data-stall-number`, containing the visitor-facing printed number.
- A semantic label via `<title>` such as `Stall 101 / Stalletjie 101`.
- One stall footprint shape and a separate text label within the same group.
- A consistent class for default, hover/focus, selected, and dimmed states.

For a source footprint containing multiple numbers, divide the footprint into visually plausible adjacent sub-blocks so each printed ID has an independent hit area.

If the source appears to repeat a printed number in more than one place, retain the printed number but assign unique internal keys such as `510-a` and `510-b`. Selection copy continues to show `510`; the internal suffix prevents duplicate DOM IDs and allows later data cleanup.

If a label is genuinely unreadable, do not invent a number. Mark the geometry in a trace-audit note during implementation and omit it from selectable inventory until it can be resolved from the source. All clearly readable numbered blocks in the supplied plan are in scope.

### Standalone behavior

- Stall anchors use internal fragment links so the SVG remains selectable when opened directly.
- Embedded SVG CSS supplies hover, keyboard-focus, and `:target` selection states.
- The SVG should remain legible in a browser without the React application.
- Include a descriptive root `<title>` and `<desc>`.

### Context and styling

Retain the orientation and major hierarchy of the supplied floor plan, including:

- Wilgerlaan and internal named lanes.
- Klein Kraal and Groot Kraal.
- Play areas.
- Pretoria Boeremark Office.
- Go-Karts for Kids.
- Restrooms and other clearly shown amenity markers.
- The Tshwane watercourse/site edge.

Use a restrained market-oriented palette:

- warm off-white site background
- muted sand/taupe stall blocks
- deep green selected/primary state
- lighter greens for kraals/open spaces
- desaturated blue for water
- charcoal labels

Stall labels remain high-contrast at useful zoom levels. Important context should support navigation without competing with the numbers.

## Typed Data Model

Define a small future-facing type:

```ts
type Stall = {
  key: string;
  number: string;
  vendorName?: string;
  category?: string;
  description?: string;
};
```

Populate one record for every selectable SVG stall. The `key` must match `data-stall-key`; `number` must match the printed visitor-facing label.

Provide lookup helpers/maps by stable key and by printed number. A printed number may map to more than one key if the source repeats it.

Keep geometry in SVG and business metadata in TypeScript. Do not put path coordinates into the TypeScript data model.

## React Demo Experience

### Page layout

- Use a polished full-page responsive layout with a compact header and an emphasized map workspace.
- Header content:
  - Pretoria Boeremark title
  - short bilingual-aware instruction
  - Afrikaans/English segmented toggle
- Main content:
  - map viewport as the dominant surface
  - compact number lookup
  - visible zoom in, zoom out, and reset controls
  - selected-stall information card
- On wider screens, place the information/lookup panel beside the map.
- On mobile, keep the map first and place controls/details in a compact stacked or bottom-panel arrangement.

### Bilingual copy

Use a small in-component translation dictionary with `af` and `en` keys for:

- page instruction
- stall-number lookup label and action
- selected-stall heading
- empty selection prompt
- zoom/reset accessible labels
- “vendor details coming soon” placeholder

Default to Afrikaans. The toggle changes UI copy immediately and does not require routing or persistence.

### Selection

- Clicking/tapping a stall sets its stable key as the selected state.
- React applies a selected class to the matching SVG group and clears it from the previous selection.
- The information card prominently shows `Stalletjie {number}` or `Stall {number}`.
- Until vendor data exists, show a localized neutral placeholder rather than fabricated vendor content.
- Expose an `onStallSelect(stall)` boundary inside `MarketMap` so future website integration can replace or extend the demo card.
- Selection must not accidentally trigger standalone fragment navigation inside the React page.

### Number lookup

- Provide a compact input/select experience that accepts the exact printed stall identifier, including suffixes such as `129A`.
- Normalize user input by trimming whitespace and comparing case-insensitively.
- On a match, select the stall and animate/adjust the viewport so the shape is comfortably visible.
- If a printed number maps to multiple source blocks, select/highlight all matching geometries and frame their combined bounds; the details panel still presents the shared printed number.
- Show a localized inline “not found” state without clearing the current selection.

### Pan and zoom

Implement pan/zoom by updating the SVG `viewBox`; do not scale the surrounding DOM.

- Wheel/trackpad zoom toward the pointer position.
- Pointer drag pans the map.
- Two-pointer pinch zooms on touch devices.
- Visible `+`, `−`, and reset buttons support non-gesture use.
- Clamp zoom to a practical range (approximately 1× to 6×) and constrain panning so the site cannot be lost completely off-screen.
- Reset returns to the complete-map view.
- Selecting through number lookup frames the matching stall with padding, without exceeding the maximum zoom.
- Distinguish a click from a drag using a small movement threshold so panning does not select a stall accidentally.
- Respect `prefers-reduced-motion` by avoiding animated view transitions when requested.

## Accessibility

- Use semantic HTML for the surrounding page, controls, language switch, lookup, and selected result.
- All icon-only controls require localized accessible labels and visible focus styles; use simple inline SVG icons rather than emoji.
- Make the map viewport keyboard focusable and give it bilingual instructions.
- Stall anchors supply native keyboard focus in the standalone SVG.
- The number lookup provides a practical keyboard-accessible route to every stall without requiring traversal through hundreds of SVG elements.
- Announce selection changes through an `aria-live="polite"` region in the details card.
- Do not rely on color alone: selected stalls also receive a stronger outline, and hover/focus receives a distinct border treatment.
- Maintain readable contrast for numbers, controls, and helper text.

## Responsive and Interaction Edge Cases

- Preserve the full portrait map’s aspect ratio at every viewport size.
- Prevent browser page scrolling only while an active map drag/pinch gesture is underway; normal page scrolling must continue otherwise.
- Handle pointer cancellation and pointer leaving the viewport without leaving drag state stuck.
- Keep control hit targets comfortably touchable.
- Allow alphanumeric IDs and source suffixes such as `A`, `B`, etc.
- Use unique internal keys for duplicate printed labels.
- Ignore clicks on contextual labels/landmarks; only elements carrying `data-stall-key` select.
- If SVG metadata and `stalls.ts` diverge, fail safely by ignoring unknown keys and report the mismatch in development.

## Implementation Sequence

1. Create the canonical standalone SVG and establish its groups, palette, labels, and semantic stall element contract.
2. Trace all clearly readable numbered stalls from the labelled floor plan, splitting combined footprints and validating orientation against the aerial image.
3. Build `stalls.ts` from the completed SVG inventory and audit one-to-one key coverage.
4. Implement `MarketMap.tsx` with trusted raw SVG injection, delegated selection, viewBox state, pan/zoom, bounds calculations, and lookup framing.
5. Replace the blank `App.tsx` with the responsive bilingual demo and selected-stall panel.
6. Add global visual/accessibility styles in `index.css`, keeping Tailwind utilities in JSX for layout.
7. Audit mobile layout, touch behavior, keyboard access, source-number coverage, and standalone SVG behavior.

## Verification

### Automated/static checks

- Run the repository formatter through the defined script: `pnpm format`.
- Run the broad compile/build check because this is a multi-file structural UI change: `pnpm build`.
- Parse/audit the SVG inventory with a small one-off script or test command to verify:
  - every selectable SVG stall has a unique `data-stall-key`
  - every SVG key exists in `stalls.ts`
  - every data record has corresponding SVG geometry
  - no duplicate DOM IDs exist
  - every stall has a title and display number

### Visual/manual checks using the existing supervised server

- Desktop: full-map view, sidebar/panel balance, hover, wheel zoom, drag pan, lookup, reset, and repeated-label behavior.
- Mobile portrait: map-first layout, touch drag, pinch zoom, control reachability, no unintended horizontal overflow, and normal page scrolling outside gestures.
- Keyboard: language toggle, lookup, map focus, zoom controls, visible focus, and live selection announcement.
- Standalone asset: open the SVG independently and confirm labels render and stall hover/focus/fragment selection work.
- Reference audit: compare each map sector against the supplied labelled plan, then use the aerial photo to catch major footprint/orientation mistakes.

## Acceptance Criteria

- Every clearly readable numbered stall on the source floor plan is an independent SVG target.
- Shared source footprints are split into separately selectable numbered blocks.
- The checked-in SVG works as a standalone visual/interactive artifact and is also the React demo’s sole geometry source.
- Clicking or looking up a stall highlights it and shows its number.
- The map supports bounded desktop and touch pan/zoom plus visible zoom/reset controls.
- Afrikaans and English interface copy can be toggled; official Afrikaans map labels remain intact.
- The map includes enough roads, landmarks, open spaces, and amenities for visitors to orient themselves.
- The implementation is ready for later vendor/category metadata without changing SVG geometry.
- The page is responsive, keyboard-usable, and does not rely on color alone for selection.
- Formatting and production build complete successfully.
