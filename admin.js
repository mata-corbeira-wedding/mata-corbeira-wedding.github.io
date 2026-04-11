const ADMIN_PASSWORD = "BuddyBupsters";

// Published Google Sheets CSV URL — Guest List tab (gid=698292239)
// Columns: Nombre, Bride or Groom, Phone #, Group ID, RVSP, Allergies
const GUESTS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpZYFkAej3ho8qCNzumNvLpIk4_3BYv_VHqWTmOtKpajYVQycLzuoW-dD6P-dymmGifDi7QC-HoUcO/pub?gid=698292239&single=true&output=csv";

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] || "").trim();
    });
    return obj;
  });
}

async function fetchCsv(url) {
  if (!url || url.startsWith("YOUR_")) return [];
  const res = await fetch(url);
  if (!res.ok) return [];
  const text = await res.text();
  return parseCsv(text);
}

document.addEventListener("DOMContentLoaded", async () => {
  const loginSection = document.getElementById("admin-login-section");
  const dashboardSection = document.getElementById("admin-dashboard-section");
  const loginForm = document.getElementById("admin-login-form");
  const passwordInput = document.getElementById("admin-password");
  const loginError = document.getElementById("admin-login-error");

  const summaryAttending = document.getElementById("summary-attending");
  const summaryNotAttending = document.getElementById("summary-not-attending");
  const summaryNoResponse = document.getElementById("summary-no-response");

  const guestsTableBody = document.querySelector("#admin-guests-table tbody");

  let guests = [];

  function showDashboard() {
    if (loginSection) loginSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "";
  }

  const stored = window.localStorage.getItem("wedding_admin_authenticated");
  if (stored === "true") {
    showDashboard();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (passwordInput.value === ADMIN_PASSWORD) {
        window.localStorage.setItem("wedding_admin_authenticated", "true");
        loginError.textContent = "";
        showDashboard();
        loadData();
      } else {
        loginError.textContent = "Incorrect password.";
      }
    });
  }

  async function loadData() {
    try {
      guests = await fetchCsv(GUESTS_CSV_URL);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Error loading CSV data", e);
    }
    updateSummary();
    renderResponded();
  }

  function getRsvp(g) {
    return String(g.RVSP || g.RSVP || "").trim();
  }

  function isYes(att) {
    const v = att.toLowerCase();
    return v === "yes" || v === "sí" || v === "si";
  }

  function isNo(att) {
    return att.toLowerCase() === "no";
  }

  function updateSummary() {
    let attending = 0;
    let notAttending = 0;
    let responded = 0;

    guests.forEach((g) => {
      const att = getRsvp(g);
      if (!att || (!isYes(att) && !isNo(att))) return;
      responded += 1;
      if (isYes(att)) attending += 1;
      else notAttending += 1;
    });

    const noResponse = Math.max(guests.length - responded, 0);

    if (summaryAttending) summaryAttending.textContent = String(attending);
    if (summaryNotAttending) summaryNotAttending.textContent = String(notAttending);
    if (summaryNoResponse) summaryNoResponse.textContent = String(noResponse);
  }

  function renderResponded() {
    if (!guestsTableBody) return;
    guestsTableBody.innerHTML = "";

    // Only guests with a Yes or No response
    const responded = guests.filter((g) => {
      const att = getRsvp(g);
      return isYes(att) || isNo(att);
    });

    // Sort: Yes first, then No
    responded.sort((a, b) => {
      const aYes = isYes(getRsvp(a)) ? 0 : 1;
      const bYes = isYes(getRsvp(b)) ? 0 : 1;
      return aYes - bYes;
    });

    if (responded.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.style.padding = "0.75rem 0.5rem";
      cell.style.color = "#888";
      cell.textContent = "No responses yet.";
      row.appendChild(cell);
      guestsTableBody.appendChild(row);
      return;
    }

    responded.forEach((g) => {
      const row = document.createElement("tr");
      const att = getRsvp(g);
      const allergies = String(g.Allergies || "").trim();
      const food = allergies.toLowerCase() === "no allergies" ? "" : allergies;

      [
        g.Nombre || "",
        g["Bride or Groom"] || "",
        g["Phone #"] || "",
        g["Group ID"] || "",
        att,
        food,
      ].forEach((val) => {
        const cell = document.createElement("td");
        cell.style.padding = "0.35rem 0.5rem";
        cell.textContent = val;
        row.appendChild(cell);
      });

      guestsTableBody.appendChild(row);
    });
  }

  if (stored === "true") {
    loadData();
  }
});
