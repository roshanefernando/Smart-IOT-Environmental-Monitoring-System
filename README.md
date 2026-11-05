# Smart IoT Dashboard — Layout Fix v3

## What was fixed
The v2 dashboard HTML added a hero panel, orbit graphics, and readout components. Some browsers kept the prior /styles.css in cache, causing exactly the screenshot symptom: a normal sidebar but an unstyled, overflowing hero section.

This release forces the browser to load **versioned CSS and JavaScript asset URLs** (`/styles-v3.css`, `/app-v3.js`) and returns `Cache-Control: no-store`. The contents of `dashboard/styles.css` and `dashboard/app.js` remain editable source files. The new Dockerfile copies them under the versioned URLs.

## Installation (Windows CMD)
1. Keep your existing `backend/compose.yaml`, `backend/.env`, and ESP32 files unchanged.
2. Back up your `F:\IOT\Smart_IOT\dashboard` folder.
3. Extract the ZIP at `F:\IOT\Smart_IOT\`, so `F:\IOT\Smart_IOT\dashboard\index.html` is replaced (do **not** create an additional nested dashboard folder).
4. Run:

```cmd
cd /d F:\IOT\Smart_IOT
docker compose --env-file backend\.env -f backend\compose.yaml build --no-cache dashboard
docker compose --env-file backend\.env -f backend\compose.yaml up -d --no-deps dashboard
```

5. Open `http://localhost:8080/#overview` in a new tab and hard-refresh (`Ctrl+Shift+R`). You should see a boxed gradient hero banner with a glowing orbital illustration at the right, four distinct measurement cards below, and correctly laid-out pressure/humidity/light data.

## Quick checks
- `http://localhost:8080/styles-v3.css` must display CSS (not an HTML page).
- `http://localhost:8080/api/readings/latest` must show the live sensor JSON.
- `docker logs --tail 30 smart-iot-dashboard` checks the Nginx container.
- If the previous design remains, inspect the exact extracted folder path and verify that the dashboard Dockerfile says `styles-v3.css`.

No ESP32 firmware, MQTT configuration, FastAPI backend, database, or other Docker containers need modifications.
