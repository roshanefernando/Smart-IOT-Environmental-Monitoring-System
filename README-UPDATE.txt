SMART IOT - DASHBOARD V4 | INSTALLATION NOTES
=============================================

WHAT CHANGED
* Same working MQTT -> FastAPI -> PostgreSQL pipeline (no backend changes).
* Fixed stale browser cache by renaming assets to /app-v4.js and /styles-v4.css.
* Improved mobile layouts, history buttons, status reliability and API timeouts.
* Added Export CSV for the latest 200 stored readings.
* Sensor chart data is chronologically sorted regardless of backend response order.

INSTALL (WINDOWS / VS CODE)
1. In VS Code, open F:\IOT\Smart_IOT and STOP nothing on the ESP32.
2. BACK UP your current dashboard directory first.
3. Extract this ZIP. Copy only index.html, styles.css, app.js, nginx.conf,
   and Dockerfile into your EXISTING F:\IOT\Smart_IOT\dashboard folder,
   replacing those five dashboard files. DO NOT replace backend/ or firmware/.
4. Open a terminal in the folder containing your existing compose.yaml or
   docker-compose.yml. Run:
       docker compose up -d --build
   This rebuilds the dashboard image and leaves your project source in place.
   The Dockerfile copies styles.css => styles-v4.css and app.js => app-v4.js.
5. Open http://localhost:8080 and hard refresh with Ctrl+Shift+R.
6. Check Overview, Reading history, Export CSV, and System status.

IF THE WEBSITE DOES NOT UPDATE
* Run: docker compose ps
* Inspect the dashboard service logs: docker compose logs --tail=50 dashboard
  (If the service is named differently, use its name from docker compose ps.)
* Verify backend at http://localhost:8001/health

This frontend update does not require new hardware or resistors.
