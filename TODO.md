# TODO - Map 2D/3D + Camera sync
allow 2d map to show depth vs distance as well and 3d map to show 3 different 2d views of the trajectory along with the 3d trajectory, 
## Step 1: 2D map sizing fix

- [x] Update `src/components/MapPanel.tsx` to ensure Leaflet container gets explicit full-size styling.
- [x] Add CSS helpers to force `.leaflet-container` height/width: 100%.

## Step 2: Add map underlay in 3D view

- [x] Update `src/components/ThreeDTrajectory.tsx` to render a Leaflet map (TileLayer + polyline + markers) in the background.
- [x] Overlay Plotly scatter3d on top of the Leaflet map using absolute positioning.
- [x] Ensure Plotly click selection still calls `onSelectPoint`.

## Step 3: Verify camera feed image loading + timestamp sync

- [x] Confirm `CameraViewPanel.tsx` image `src` resolves to `public/frames/${ImageName}`.
- [x] Validate that `fetchAndProcessData()` chooses the nearest telemetry record by timestamp for each image.

## Step 4: Validate build

- [ ] Run `npm run build` in `telemetry-dashboard` and fix any TS/React/Leaflet/Plotly issues.
