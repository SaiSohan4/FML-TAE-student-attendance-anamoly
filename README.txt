# Student Attendance Anomaly Detection — Frontend

## Files
- `index.html` — dashboard structure
- `style.css` — styling and responsive layout
- `script.js` — CSV upload, attendance summaries, charts, filtering, and CSV export

## Run in VS Code
1. Keep all three files in the same folder.
2. Open the folder in VS Code.
3. Install the **Live Server** extension.
4. Right-click `index.html` and select **Open with Live Server**.
5. Click **Load Demo Data**, or upload `student_attendance.csv`.

## CSV columns
The uploaded CSV must contain:
- `Student_ID`
- `Classes_Held`
- `Classes_Attended`

The supplied sample dataset also contains `Date` and `Attendance_Percentage`; the frontend calculates attendance from classes held and attended.

## Important
This is a frontend prototype. It flags attendance using simple thresholds and does not execute the trained Isolation Forest model from Google Colab. A Python backend/API is needed to use that model in the website.
Chart.js is loaded from a CDN, so an internet connection is needed for the charts.
