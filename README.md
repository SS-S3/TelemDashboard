# Ground Station Telemetry Dashboard

A modern, interactive Ground Control Station (GCS) dashboard built to visualize underwater robotic vehicle telemetry data and synchronized camera feeds.

## Features

- **Mission Summary**: Calculates and displays total distance, average speed, max speed, and mission duration.
- **Communication Health**: Analyzes telemetry for packet loss and provides a communication health status.
- **Interactive Trajectory Map**: Visualizes the vehicle's path using Leaflet. The trajectory is interactive—click any point to view details for that specific moment.
- **Camera Synchronization**: Automatically associates camera images with the nearest telemetry record based on timestamps.
- **Dark GCS Aesthetic**: Designed with a premium, glassmorphism-inspired dark mode interface for maximum visibility in operational environments.

## Tech Stack

- **Framework**: React + Vite (TypeScript)
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid, Glassmorphism)
- **Map Engine**: Leaflet (`react-leaflet`)
- **Data Parsing**: PapaParse (CSV Parsing)
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Project Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Add Data (Important)**
   Ensure the following files/folders are present in the `public/` directory:
   - `telemetry.csv` (Telemetry dataset)
   - `image_timestamps.csv` (Image timestamp mapping)
   - `frames/` (Directory containing `frame_001.jpg` to `frame_010.jpg`)

   *(Note: A script `generate_mock.mjs` was provided in the repository root to generate mock data if the actual dataset is unavailable).*

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## Tasks Addressed

- **Task 1: Telemetry Processing**: Done via `src/utils/dataProcessing.ts`.
- **Task 2: Camera-Telemetry Synchronization**: Done via nearest-timestamp matching in the data processing utility.
- **Task 3: Ground Station Dashboard**: Implemented across various React components with an interactive Leaflet map.

## Future Improvements (Bonus Scope)
- 3D Trajectory Visualization using depth data and CesiumJS.
- Mission playback with timeline scrubbers.
- Real-time WebSockets integration for live data feeds instead of static CSV parsing.
