<div align="center">
  <h1>🛸 Ground Station Telemetry Dashboard</h1>
  <p>A high-performance, interactive Ground Control Station (GCS) built to visualize underwater robotic vehicle telemetry data, synchronized camera feeds, and 3D trajectory profiles.</p>
  
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  </p>
</div>

<br />

## ✨ Features (V2)

- **📊 Mission Summary**: Instantly calculates and displays total distance, average speed, max speed, and mission duration.
- **📡 Communication Health**: Analyzes sequence gaps and packet loss to provide real-time communication health status.
- **🗺️ Interactive 2D Trajectory Map**: Visualizes the vehicle's path using Leaflet. The trajectory is interactive—click any point to view telemetry for that specific moment.
- **🌊 3D Depth Trajectory (Bonus)**: A fully interactive 3D scatter plot (powered by Plotly) visualizing the vehicle's Lat, Lon, and Depth profile.
- **🎥 Camera Synchronization**: Automatically associates camera images with the nearest telemetry record based on timestamps.
- **⏱️ Mission Playback & Time Filtering (Bonus)**: Features a robust playback controller. Hit "Play" to watch the mission unfold at 10x speed, or scrub the timeline to jump to any specific moment.
- **🎨 Premium GCS Aesthetic**: Designed with a custom glassmorphism dark-mode interface for maximum visibility in operational environments.

---

## 📸 Dashboard Preview

*(Add your screenshot here)*
```markdown
![Dashboard Preview](./docs/screenshot.png)
```

---

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite (TypeScript)
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid, Glassmorphism)
- **2D Map Engine**: Leaflet (`react-leaflet`)
- **3D Visualization**: Plotly (`react-plotly.js`)
- **Data Parsing**: PapaParse (Robust CSV Parsing)
- **Icons**: Lucide React
- **Date Handling**: date-fns

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 2. Clone & Install Dependencies
```bash
# Navigate to the project folder
cd telemetry-dashboard

# Install packages
npm install
```

### 3. Add the Mission Dataset (CRITICAL)
Place the actual assignment dataset directly into the `public/` directory:
- `public/telemetry.csv` (Telemetry dataset)
- `public/image_timestamps.csv` (Image timestamp mapping)
- `public/frames/` (Directory containing `frame_001.jpg` to `frame_010.jpg`)

*Note: If you don't have the dataset yet, run `node generate_mock.mjs` in the parent directory to generate simulated mock data to test the dashboard.*

### 4. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧠 Architecture & Optimizations

To handle potentially massive telemetry arrays smoothly during high-speed playback, the application utilizes advanced React patterns:
- **`React.memo`**: Wraps the complex 3D Plot and Playback Controller to prevent unnecessary re-renders when the selected point changes.
- **`useMemo`**: Telemetry arrays (like the X, Y, Z axes for the 3D plot) are memoized, avoiding expensive recalculations on every frame.
- **`useCallback`**: Function references are stabilized to maintain the integrity of memoized children components.

## 📝 Assignment Deliverables Addressed

| Task | Description | Status | Component/File |
|------|-------------|--------|----------------|
| **Task 1** | Telemetry Processing | ✅ Done | `src/utils/dataProcessing.ts` |
| **Task 2** | Camera-Telemetry Sync | ✅ Done | `src/utils/dataProcessing.ts` |
| **Task 3** | Ground Station Dashboard | ✅ Done | `src/App.tsx` & `src/components/` |
| **Bonus** | 3D Trajectory Visualization | ✅ Done | `src/components/ThreeDTrajectory.tsx` |
| **Bonus** | Mission Playback & Time Filter | ✅ Done | `src/components/PlaybackController.tsx` |

---
<div align="center">
  <sub>Built for the Software Intern Assignment</sub>
</div>
