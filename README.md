# Patient Vitals Tracker (Frontend UI)

A dependency-free HTML/CSS/JS prototype that includes:
- Light-theme splash animation inspired by the provided HUD visual
- Doctor login (mock)
- Dashboard listing patients with status indicators
- Patient details with current readings, trend charts (Chart.js via CDN), and alerts
- Simple hash routing and profile page

## Run
Just open `index.html` in a modern browser (Chrome/Edge/Firefox). No build step required.

If you prefer a local server:
- PowerShell: `Start-Process http://localhost:8080; npx http-server -p 8080 .`

## Notes
- Authentication is mocked for demo. Replace with real API calls as needed.
- Thresholds are simple and for demonstration. Adjust in `app.js` (`alertLevel`).
- Charts use Chart.js from CDN; you can switch to ECharts or other libraries easily.
