let students = [];
let attendanceChart = null;
let anomalyChart = null;

const $ = id => document.getElementById(id);

function analyzeRows(rows) {
  const groups = {};

  rows.forEach(row => {
    const id = (row.Student_ID || "").trim();
    const held = Number(row.Classes_Held);
    const attended = Number(row.Classes_Attended);

    if (!id || !Number.isFinite(held) || !Number.isFinite(attended)
        || held <= 0 || attended < 0 || attended > held) {
      return;
    }

    if (!groups[id]) {
      groups[id] = {
        id, records: 0, held: 0, attended: 0,
        absences: 0, lowDays: 0, dailyRates: []
      };
    }

    const s = groups[id];
    const rate = attended / held * 100;

    s.records++;
    s.held += held;
    s.attended += attended;
    s.absences += held - attended;
    s.dailyRates.push(rate);

    if (rate < 40) s.lowDays++;
  });

  students = Object.values(groups).map(s => {
    const avg = s.held ? s.attended / s.held * 100 : 0;
    const flagged = avg < 60 || s.lowDays >= 3;

    return {
      id: s.id,
      average: avg,
      absences: s.absences,
      lowDays: s.lowDays,
      status: flagged ? "Anomaly" : "Normal"
    };
  });

  if (students.length === 0) {
    $("message").textContent = "No valid student records found. Check your CSV columns and values.";
    render();
    return;
  }

  $("message").textContent =
    `Analysis complete: ${students.length} students processed. ` +
    "Flags are based on simple thresholds, not the trained ML model.";

  render();
}

function render() {
  const total = students.length;
  const avg = total
    ? students.reduce((sum, s) => sum + s.average, 0) / total
    : 0;

  const anomalies = students.filter(s => s.status === "Anomaly").length;
  const low = students.filter(s => s.average < 75).length;

  $("totalStudents").textContent = total;
  $("averageAttendance").textContent = avg.toFixed(1) + "%";
  $("anomalyCount").textContent = anomalies;
  $("lowCount").textContent = low;

  renderTable();
  renderCharts();
}

function renderTable() {
  const query = $("searchInput").value.toLowerCase();

  const filtered = students.filter(s =>
    s.id.toLowerCase().includes(query)
  );

  $("resultsTable").innerHTML = filtered.length
    ? filtered.map(s => `
      <tr>
        <td>${escapeHTML(s.id)}</td>
        <td>${s.average.toFixed(1)}%</td>
        <td>${s.absences}</td>
        <td>${s.lowDays}</td>
        <td><span class="badge ${s.status === "Anomaly" ? "anomaly" : "normal"}">
          ${s.status}
        </span></td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">No matching students found.</td></tr>';

  $("downloadBtn").disabled = students.length === 0;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function renderCharts() {
  const bins = [0, 0, 0, 0, 0];

  students.forEach(s => {
    if (s.average < 40) bins[0]++;
    else if (s.average < 60) bins[1]++;
    else if (s.average < 75) bins[2]++;
    else if (s.average < 90) bins[3]++;
    else bins[4]++;
  });

  if (attendanceChart) attendanceChart.destroy();
  if (anomalyChart) anomalyChart.destroy();

  attendanceChart = new Chart($("attendanceChart"), {
    type: "bar",
    data: {
      labels: ["0–39%", "40–59%", "60–74%", "75–89%", "90–100%"],
      datasets: [{
        label: "Number of Students",
        data: bins,
        backgroundColor: "#3b82f6"
      }]
    },
    options: { responsive: true }
  });

  anomalyChart = new Chart($("anomalyChart"), {
    type: "doughnut",
    data: {
      labels: ["Normal", "Anomaly"],
      datasets: [{
        data: [
          students.filter(s => s.status === "Normal").length,
          students.filter(s => s.status === "Anomaly").length
        ],
        backgroundColor: ["#22c55e", "#ef4444"]
      }]
    },
    options: { responsive: true }
  });
}

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());

  function parseLine(line) {
    const result = [];
    let value = "", quoted = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];

      if (c === '"' && quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else if (c === '"') {
        quoted = !quoted;
      } else if (c === "," && !quoted) {
        result.push(value.trim());
        value = "";
      } else {
        value += c;
      }
    }

    result.push(value.trim());
    return result;
  }

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

$("csvFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const rows = parseCSV(text);

    if (!rows.length ||
        !["Student_ID", "Classes_Held", "Classes_Attended"]
          .every(key => key in rows[0])) {
      throw new Error("Required columns are missing.");
    }

    analyzeRows(rows);
  } catch (error) {
    $("message").textContent = "Could not read CSV: " + error.message;
  }
});

$("searchInput").addEventListener("input", renderTable);

$("downloadBtn").addEventListener("click", () => {
  const headers = [
    "Student_ID", "Average_Attendance",
    "Total_Absences", "Low_Attendance_Days", "Status"
  ];

  const csv = [
    headers.join(","),
    ...students.map(s => [
      s.id, s.average.toFixed(2), s.absences, s.lowDays, s.status
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "attendance_anomaly_results.csv";
  a.click();

  URL.revokeObjectURL(url);
});

$("sampleBtn").addEventListener("click", () => {
  const demo = [];

  for (let i = 1; i <= 20; i++) {
    for (let day = 1; day <= 10; day++) {
      const held = 5;
      let attended = Math.floor(Math.random() * 2) + 3;

      if (i <= 3) attended = Math.floor(Math.random() * 2);
      if (i === 4 && day > 6) attended = 0;

      demo.push({
        Student_ID: "STU" + String(i).padStart(3, "0"),
        Classes_Held: held,
        Classes_Attended: attended
      });
    }
  }

  analyzeRows(demo);
});

render();
