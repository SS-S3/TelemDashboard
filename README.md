# Telemetry Dashboard (Codebase)

<div align="center">
  <h1>Ground Station Telemetry Dashboard</h1>
  <p>A professional ground-control style telemetry viewer for mission playback, map tracking, synchronized camera frames, and 3D trajectory analysis.</p>
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  </p>
</div>

## Overview

This application ingests mission telemetry CSV data and image timestamp mappings, then renders an operator-friendly dashboard that combines:

1. Mission-level metrics such as duration, distance, speed, and communication health.
2. A live-linked current status card for the selected telemetry record.
3. An interactive 2D path map and a 3D trajectory profile.
4. A synchronized camera panel that displays the image nearest to the current telemetry timestamp.
5. A playback controller that allows the mission to be scrubbed or replayed sequentially.

The codebase is designed as a small but complete data-visualization pipeline: CSV files are fetched from `public/`, normalized into typed objects, derived metrics are computed, and the resulting state is distributed into focused UI panels.

## Key Features

- Mission summary with total distance, average speed, max speed, and duration.
- Communication summary based on packet sequence continuity and packet loss.
- Interactive 2D route visualization with selection syncing.
- 3D trajectory rendering using Plotly for latitude, longitude, and depth.
- Timestamp-based camera frame synchronization.
- Time slider and playback controls for mission replay.
- Responsive dark operational UI with compact, data-dense panels.

## Tech Stack

- React 19
- TypeScript
- Vite
- Leaflet via `react-leaflet`
- Plotly via `react-plotly.js`
- PapaParse for CSV parsing
- date-fns for timestamp and duration handling
- Lucide React for iconography

## Project Structure

```text
telemetry-dashboard/
  public/
    telemetry.csv
    image_timestamps.csv
    frames/
  src/
    App.tsx
    main.tsx
    types.ts
    utils/
      dataProcessing.ts
    components/
      SummaryPanel.tsx
      CurrentStatusPanel.tsx
      MapPanel.tsx
      CameraViewPanel.tsx
      PlaybackController.tsx
      ThreeDTrajectory.tsx
    App.css
    index.css
```

### File responsibilities

- [src/App.tsx](src/App.tsx) orchestrates application state, data loading, layout, and selection sharing.
- [src/utils/dataProcessing.ts](src/utils/dataProcessing.ts) loads CSV files and converts raw records into dashboard-ready data.
- [src/types.ts](src/types.ts) defines the shared data model used across the UI.
- [src/components/SummaryPanel.tsx](src/components/SummaryPanel.tsx) renders mission and communication KPIs.
- [src/components/CurrentStatusPanel.tsx](src/components/CurrentStatusPanel.tsx) shows the currently selected telemetry record.
- [src/components/MapPanel.tsx](src/components/MapPanel.tsx) renders the 2D mission path and handles point selection.
- [src/components/ThreeDTrajectory.tsx](src/components/ThreeDTrajectory.tsx) renders the 3D path with Plotly.
- [src/components/CameraViewPanel.tsx](src/components/CameraViewPanel.tsx) displays the synchronized image for the current selection.
- [src/components/PlaybackController.tsx](src/components/PlaybackController.tsx) manages scrubbing, skipping, and autoplay.

## Data Flow

The application follows a simple but deliberate flow:

1. `App.tsx` calls `fetchAndProcessData()` on startup and whenever the user clicks Reload CSV.
2. `dataProcessing.ts` fetches `telemetry.csv` and `image_timestamps.csv` from `public/`.
3. Raw rows are parsed with PapaParse and normalized into the typed structures from `types.ts`.
4. Mission summary metrics are calculated from the telemetry sequence.
5. Each camera timestamp is matched to the nearest telemetry record.
6. The resulting `DashboardData` object is stored in React state.
7. The current selection is shared across all visual panels so map, status, camera, and playback stay synchronized.

The important implementation detail is that the dashboard is not just visualizing raw CSV rows. It also derives mission-level metadata and then binds all UI panels to a single selected index so the display behaves like one coordinated control surface.

## Core Logic Explained

### 1. Telemetry loading and normalization

The loader reads the CSV files with a timestamp query string to avoid stale browser caching. Telemetry rows are mapped into a normalized object shape with consistent field names:

- `Timestamp`
- `Latitude`
- `Longitude`
- `Depth`
- `Speed`
- `Battery`
- `SignalStrength`
- `Sequence`
- mock operational fields for `CpuUsage`, `MemoryUsage`, and `InternalTemp`

Rows are filtered so only records with valid timestamps and coordinates survive. This ensures downstream map and trajectory logic always receives usable points.

### 2. Mission summary calculation

The summary card is derived from the telemetry array rather than being stored separately.

Distance is computed with the Haversine formula, which estimates the great-circle distance between successive latitude and longitude pairs on Earth. Each point is compared to the previous point and the distances are accumulated into a total mission distance.

Duration is computed by taking the first and last telemetry timestamps from `telemetry.csv`, subtracting them in **milliseconds**, then converting to **whole seconds** and formatting as `HH:MM:SS`.

This avoids rounding/parsing edge-cases and uses consistent timestamp parsing across the dashboard.

Speed statistics are straightforward:

- `maxSpeed` tracks the highest observed speed.
- `averageSpeed` is the mean of all parsed speed values.

Communication health is inferred from sequence continuity. The code compares the received packet count with the expected count derived from the first and last sequence numbers. Missing packets are converted into a packet-loss percentage, which is then mapped to a status label:

- `GOOD` for low loss
- `WARNING` for moderate loss
- `POOR` for high loss

### 3. Camera synchronization

The image map in `image_timestamps.csv` is loaded separately from telemetry. For every image timestamp, the loader searches the telemetry array for the nearest timestamp in time and associates the image with that nearest telemetry record (`SyncedImage`).

To prevent timestamp parsing mismatches across the app, all timestamp parsing for both telemetry and camera timestamps uses `new Date(timestamp).getTime()` with `NaN` guards. This ensures:

- Mission duration stays valid.
- Camera frames reliably sync to the currently selected telemetry point.
- The camera timestamp overlay renders consistently.

### 4. Selection model

The dashboard uses a single `selectedIndex` state in `App.tsx`.

- Clicking the 2D route selects the nearest telemetry point.
- Clicking a 3D point selects the corresponding telemetry record.
- Moving the playback slider jumps to a specific record.
- Playback advances the selected index automatically.

Because every major panel reads from the same selected index, the map, current status, and camera view always stay aligned.

### 5. 2D map behavior

`MapPanel.tsx` renders the mission path as a Leaflet polyline. The component also adds markers for:

- the start point
- the end point
- the current selection

When the route is clicked, the component finds the closest telemetry point to the click location and emits that index back to the parent. A small map controller also recenters the view when the selected point changes.

### 6. 3D trajectory behavior

`ThreeDTrajectory.tsx` builds three arrays for Plotly:

- longitude for the x-axis
- latitude for the y-axis
- negative depth for the z-axis

The negative depth conversion is important because deeper values should visually move downward in the 3D scene. The component highlights the active selection by changing the marker color of that point.

The 3D plot is layered above a Leaflet underlay so the user gets both geographic context and spatial depth representation in the same panel.

### 7. Playback controller

`PlaybackController.tsx` provides the mission time slider and transport controls. When playback is enabled, an interval advances the selection every 100 ms. Given the telemetry is typically sampled at 1 Hz, this produces a 10x playback rate.

The controller stops playback automatically when the last record is reached. Skip-back and skip-forward buttons jump directly to the start or end of the mission.

## Component Guide

### [src/App.tsx](src/App.tsx)

This is the composition root of the dashboard. It owns:

- the loaded `DashboardData`
- loading and error states
- the active selection
- playback state
- the 2D/3D view toggle

It also coordinates data reloads and passes the relevant slices of state into each child panel.

### [src/utils/dataProcessing.ts](src/utils/dataProcessing.ts)

This file is the data engine of the application. It handles:

- CSV fetching
- parsing and normalization
- metric calculation
- packet loss estimation
- camera-to-telemetry matching

The rest of the dashboard assumes this module has already converted raw CSV rows into a ready-to-render model.

### [src/components/SummaryPanel.tsx](src/components/SummaryPanel.tsx)

Renders a compact KPI dashboard with mission metrics and communication status.

### [src/components/CurrentStatusPanel.tsx](src/components/CurrentStatusPanel.tsx)

Shows the currently selected telemetry record, including position, speed, battery, signal, CPU, memory, and temperature fields.

### [src/components/MapPanel.tsx](src/components/MapPanel.tsx)

Displays the 2D mission route and synchronizes map interaction with the rest of the dashboard.

### [src/components/ThreeDTrajectory.tsx](src/components/ThreeDTrajectory.tsx)

Provides an alternate 3D mission view for spatial inspection of the vehicle path and depth profile.

### [src/components/CameraViewPanel.tsx](src/components/CameraViewPanel.tsx)

Loads the synchronized frame from `/frames/` and displays the filename and timestamp overlay.

### [src/components/PlaybackController.tsx](src/components/PlaybackController.tsx)

Provides sequential playback, scrubbing, and mission navigation controls.

## Data Contract

The dashboard expects the following files in `public/`:

### `public/telemetry.csv`

Must contain telemetry records with fields similar to:

- `timestamp`
- `lat`
- `lon`
- `altitude` or `Depth`
- `speed`
- `battery`
- `signal_strength`
- `packet_id`

The parser supports either lowercase or capitalized column names for the supported fields.

### `public/image_timestamps.csv`

Must contain image metadata with fields similar to:

- `image_name`
- `timestamp`

### `public/frames/`

Contains the actual camera images referenced by the CSV mapping.

The UI loads images with the pattern `/frames/<ImageName>`, so the file names in the mapping must match the files in this directory.

## Installation and Run Instructions

### Prerequisites

- Node.js installed locally
- npm available in your shell

### Install dependencies

```bash
cd telemetry-dashboard
npm install
```

### Add mission data

Place the required CSV files and camera frames into the `public/` directory.

If you are using generated sample data, ensure the generated files follow the same naming and field layout expected by the app.

### Start the development server

```bash
npm run dev
```

Open the Vite development URL shown in the terminal, usually http://localhost:5173.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

### Lint the codebase

```bash
npm run lint
```

## Implementation Notes

- The app uses `useMemo` and `useCallback` to reduce unnecessary re-renders when the selection changes.
- The `PlaybackController` is wrapped in `React.memo` because it is updated frequently during playback.
- Leaflet marker icons are patched manually so the icons resolve correctly in the Vite build environment.
- Plotly is loaded through the ESM compatibility wrapper required by `react-plotly.js`.
- Telemetry-derived CPU, memory, and temperature values are present as lightweight operational indicators and may be mocked or replaced by real inputs depending on the dataset.

## Design and UX Notes

- The interface is intentionally dense and operational, similar to a control-room dashboard.
- The dark theme improves contrast for charts, map traces, and selection markers.
- The layout keeps the mission summary, current state, map/3D visualization, camera feed, and playback controls visible at the same time so operators do not need to switch screens.

## Limitations and Assumptions

- Mission distance assumes telemetry points are ordered in time.
- Packet loss is inferred from sequence continuity and may not reflect every transport-layer edge case.
- Camera synchronization is timestamp-nearest rather than frame-exact.
- The 3D view uses depth as a negative z-axis value to visualize sub-surface movement more naturally.

## Troubleshooting

- If the dashboard shows no data, verify that the CSV files are in `public/` and that the file names match exactly.
- If camera images fail to load, confirm that the filenames in `image_timestamps.csv` match the files inside `public/frames/`.
- If Leaflet markers appear broken in development, make sure the app is being run through Vite and not from a static file open directly from disk.
- If the mission summary looks incorrect, inspect the CSV column names and timestamp formatting first.

## Codebase Summary

| Area            | Purpose                                            | Primary Files                                                                                                                  |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Data ingestion  | Fetch and normalize CSV input                      | [src/utils/dataProcessing.ts](src/utils/dataProcessing.ts), [src/types.ts](src/types.ts)                                       |
| Mission summary | Compute duration, distance, speed, and packet loss | [src/utils/dataProcessing.ts](src/utils/dataProcessing.ts), [src/components/SummaryPanel.tsx](src/components/SummaryPanel.tsx) |
| Selection state | Keep map, camera, and status aligned               | [src/App.tsx](src/App.tsx)                                                                                                     |
| 2D trajectory   | Render clickable route path                        | [src/components/MapPanel.tsx](src/components/MapPanel.tsx)                                                                     |
| 3D trajectory   | Render spatial depth profile                       | [src/components/ThreeDTrajectory.tsx](src/components/ThreeDTrajectory.tsx)                                                     |
| Camera sync     | Show nearest matching frame                        | [src/components/CameraViewPanel.tsx](src/components/CameraViewPanel.tsx)                                                       |
| Playback        | Scrub or autoplay the mission timeline             | [src/components/PlaybackController.tsx](src/components/PlaybackController.tsx)                                                 |

## Assignment Coverage

| Task  | Description                              | Implementation                                                                 |
| ----- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| Core  | Telemetry parsing and normalization      | [src/utils/dataProcessing.ts](src/utils/dataProcessing.ts)                     |
| Core  | Mission metrics and communication health | [src/utils/dataProcessing.ts](src/utils/dataProcessing.ts)                     |
| Core  | Dashboard orchestration                  | [src/App.tsx](src/App.tsx) and [src/components/](src/components)               |
| Bonus | 3D trajectory visualization              | [src/components/ThreeDTrajectory.tsx](src/components/ThreeDTrajectory.tsx)     |
| Bonus | Playback and time filtering              | [src/components/PlaybackController.tsx](src/components/PlaybackController.tsx) |

## Summary

This repository implements a complete telemetry visualization workflow: data is fetched from CSV files, transformed into a mission model, and projected into multiple coordinated views for operational analysis. The architecture is intentionally simple at the data layer and strongly separated at the UI layer, which keeps the behavior easy to reason about and easy to extend.
