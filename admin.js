/**
 * Admin dashboard.
 *
 * There is no password in this file and no client-side auth check. The
 * passphrase is verified inside the Apps Script proxy; the dashboard appears
 * only because the server chose to return data.
 */
document.addEventListener("DOMContentLoaded", () => {
  const loginSection = document.getElementById("admin-login-section");
  const dashboardSection = document.getElementById("admin-dashboard-section");
  const loginForm = document.getElementById("admin-login-form");
  const passwordInput = document.getElementById("admin-password");
  const loginError = document.getElementById("admin-login-error");

  const summaryAttending = document.getElementById("summary-attending");
  const summaryNotAttending = document.getElementById("summary-not-attending");
  const summaryNoResponse = document.getElementById("summary-no-response");

  const guestsTableBody = document.querySelector("#admin-guests-table tbody");

  const STORAGE_KEY = "wedding_admin_passphrase";
  let guests = [];

  // Left over from the client-side auth this replaced; anyone could set it.
  window.localStorage.removeItem("wedding_admin_authenticated");

  function showDashboard() {
    if (loginSection) loginSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "";
  }

  function errorFor(res) {
    if (res.error === "throttled") {
      const mins = Math.ceil((res.retryAfter || 900) / 60);
      return `Too many attempts. Try again in about ${mins} minutes.`;
    }
    if (res.error === "network") return "Could not reach the server. Check your connection.";
    if (res.error === "not_configured") return "The dashboard is not configured yet.";
    // The proxy really does return these; reporting them as a typo sends the
    // admin hunting the wrong problem during an outage.
    if (res.error === "server_error" || res.error === "bad_request") {
      return "The server had a problem. Try again in a moment.";
    }
    return "Incorrect passphrase.";
  }

  async function loadData(passphrase) {
    const res = await WeddingApi.adminList(passphrase);
    if (!res.ok) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      if (loginError) loginError.textContent = errorFor(res);
      return false;
    }
    guests = res.guests || [];
    window.sessionStorage.setItem(STORAGE_KEY, passphrase);
    if (loginError) loginError.textContent = "";
    showDashboard();
    updateSummary();
    renderResponded();
    return true;
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const value = passwordInput ? passwordInput.value : "";
      if (!value) return;
      if (loginError) loginError.textContent = "Checking…";
      await loadData(value);
    });
  }

  function updateSummary() {
    let attending = 0;
    let notAttending = 0;

    guests.forEach((g) => {
      if (g.attending === "yes") attending += 1;
      else if (g.attending === "no") notAttending += 1;
    });

    const noResponse = Math.max(guests.length - attending - notAttending, 0);

    if (summaryAttending) summaryAttending.textContent = String(attending);
    if (summaryNotAttending) summaryNotAttending.textContent = String(notAttending);
    if (summaryNoResponse) summaryNoResponse.textContent = String(noResponse);
  }

  function renderResponded() {
    if (!guestsTableBody) return;
    guestsTableBody.innerHTML = "";

    const responded = guests.filter((g) => g.attending === "yes" || g.attending === "no");
    responded.sort((a, b) => (a.attending === "yes" ? 0 : 1) - (b.attending === "yes" ? 0 : 1));

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
      [
        g.name || "",
        g.side || "",
        g.phone || "",
        g.groupId || "",
        g.attending === "yes" ? "Yes" : "No",
        g.allergies || "",
      ].forEach((val) => {
        const cell = document.createElement("td");
        cell.style.padding = "0.35rem 0.5rem";
        cell.textContent = val;
        row.appendChild(cell);
      });
      guestsTableBody.appendChild(row);
    });
  }

  const saved = window.sessionStorage.getItem(STORAGE_KEY);
  if (saved) loadData(saved);
});
