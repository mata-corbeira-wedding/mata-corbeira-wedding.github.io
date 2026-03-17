const ADMIN_PASSWORD = "BuddyBupsters";

// Published Google Sheets CSV URLs
// Guests: main list with Nombre, Apellido, Bride or Groom, Phone #, Group ID, RSVP, Area Code, Country...
// RSVPs: responses with Phone Number, Attending, Food restriction, Timestamp, Notes
const GUESTS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpZYFkAej3ho8qCNzumNvLpIk4_3BYv_VHqWTmOtKpajYVQycLzuoW-dD6P-dymmGifDi7QC-HoUcO/pub?gid=698292239&single=true&output=csv";
const RSVPS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRpZYFkAej3ho8qCNzumNvLpIk4_3BYv_VHqWTmOtKpajYVQycLzuoW-dD6P-dymmGifDi7QC-HoUcO/pub?gid=521377647&single=true&output=csv";

const RSVP_PHONE_HEADER = "Phone #";
const RSVP_ATTENDING_HEADER = "Attending";
const RSVP_TIMESTAMP_HEADER = "Timestamp";
const RSVP_FOOD_HEADER = "Food restriction";
const RSVP_NOTES_HEADER = "Notes";

function normalizePhone(raw) {
  if (!raw) return "";
  return String(raw).replace(/[^\d+]/g, "");
}

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

  const searchForm = document.getElementById("admin-search-form");
  const searchPhoneInput = document.getElementById("admin-search-phone");
  const searchMessage = document.getElementById("admin-search-message");
  const guestsTableBody = document.querySelector("#admin-guests-table tbody");

  let guests = [];
  let rsvps = [];
  let guestsByPhone = {};
  let rsvpByPhone = {};

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
      } else {
        loginError.textContent = "Incorrect password.";
      }
    });
  }

  async function loadData() {
    try {
      guests = await fetchCsv(GUESTS_CSV_URL);
      rsvps = await fetchCsv(RSVPS_CSV_URL);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Error loading CSV data", e);
    }

    guestsByPhone = {};
    guests.forEach((g) => {
      const phoneNorm = normalizePhone(g["Phone #"] || g.Phone || g[RSVP_PHONE_HEADER]);
      if (!phoneNorm) return;
      guestsByPhone[phoneNorm] = g;
    });

    rsvpByPhone = {};
    rsvps.forEach((r) => {
      const phoneNorm = normalizePhone(r[RSVP_PHONE_HEADER]);
      if (!phoneNorm) return;
      rsvpByPhone[phoneNorm] = r;
    });

    updateSummary();
  }

  function getGuestGroup(guest) {
    return guest["Group ID"] || guest.GroupNumber || guest.group || guest.Group || "";
  }

  function getGuestSide(guest) {
    return guest["Bride or Groom"] || guest.PartySide || guest.Side || "";
  }

  function updateSummary() {
    let attending = 0;
    let notAttending = 0;
    let responded = 0;

    guests.forEach((g) => {
      const phoneNorm = normalizePhone(g["Phone #"] || g.Phone || g[RSVP_PHONE_HEADER]);
      const r = rsvpByPhone[phoneNorm];
      if (!r) return;
      responded += 1;
      const att = String(r[RSVP_ATTENDING_HEADER] || "").toLowerCase();
      if (att.includes("yes") || att.includes("sí") || att.includes("si")) {
        attending += 1;
      } else if (att.includes("no")) {
        notAttending += 1;
      }
    });

    const totalGuests = guests.length;
    const noResponse = Math.max(totalGuests - responded, 0);

    if (summaryAttending) summaryAttending.textContent = String(attending);
    if (summaryNotAttending) summaryNotAttending.textContent = String(notAttending);
    if (summaryNoResponse) summaryNoResponse.textContent = String(noResponse);
  }

  function renderGroupByPhone(rawPhone) {
    if (!guestsTableBody) return;
    guestsTableBody.innerHTML = "";

    const phoneNorm = normalizePhone(rawPhone);
    if (!phoneNorm) {
      searchMessage.textContent = "Please enter a phone number.";
      return;
    }

    let matchedGuest = guests.find((g) => {
      const gPhone = normalizePhone(g["Phone #"] || g.Phone || g[RSVP_PHONE_HEADER]);
      return gPhone === phoneNorm;
    });

    if (!matchedGuest) {
      searchMessage.textContent = "No guest found with that phone number.";
      return;
    }

    const groupNumber = getGuestGroup(matchedGuest);
    const groupGuests = guests.filter((g) => getGuestGroup(g) === groupNumber);

    searchMessage.textContent = groupNumber
      ? `Showing group ${groupNumber} (${groupGuests.length} guest${groupGuests.length === 1 ? "" : "s"})`
      : `Showing ${groupGuests.length} guest${groupGuests.length === 1 ? "" : "s"}.`;

    groupGuests.forEach((g) => {
      const row = document.createElement("tr");
      const fullName = `${g.Nombre || g.FirstName || ""} ${g.Apellido || g.LastName || ""}`.trim();
      const side = getGuestSide(g);
      const gPhone = g["Phone #"] || g.Phone || "";
      const phoneNormGuest = normalizePhone(g["Phone #"] || g.Phone || g[RSVP_PHONE_HEADER]);
      const r = rsvpByPhone[phoneNormGuest];
      const att = r ? String(r[RSVP_ATTENDING_HEADER] || "").trim() : "No response";
      const ts = r ? String(r[RSVP_TIMESTAMP_HEADER] || "").trim() : "";
      const food = r ? String(r[RSVP_FOOD_HEADER] || "").trim() : "";
      const notes = r ? String(r[RSVP_NOTES_HEADER] || "").trim() : "";

      [fullName, side, getGuestGroup(g), gPhone, att || "No response", ts, food, notes].forEach(
        (val) => {
        const cell = document.createElement("td");
        cell.style.padding = "0.35rem 0.5rem";
        cell.textContent = val || "";
        row.appendChild(cell);
      }
      );

      guestsTableBody.appendChild(row);
    });
  }

  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      renderGroupByPhone(searchPhoneInput.value);
    });
  }

  loadData();
});

