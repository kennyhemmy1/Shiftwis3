let state = {
  user: null,
  shifts: [],
  isPremium: false
};

async function init() {
  const res = await fetch("/api/user-status");
  state = await res.json();
  render();
}

async function addShift() {
  const hours = Number(document.getElementById("hours").value);
  const rate = Number(document.getElementById("rate").value);

  await fetch("/api/add-shift", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hours, rate })
  });

  init();
}

async function exportPDF() {
  const res = await fetch("/api/export-pdf");

  if (res.status === 403) {
    alert("Upgrade required");
    return;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "shiftwise-report.pdf";
  a.click();
}

async function upgrade() {
  const res = await fetch("/api/create-checkout", {
    method: "POST"
  });

  const { url } = await res.json();
  window.location.href = url;
}

function render() {
  document.getElementById("status").innerText =
    state.isPremium ? "PRO USER" : "FREE USER";

  document.getElementById("shifts").innerHTML =
    (state.shifts || []).map(s =>
      `<div>${s.date} | ${s.hours}h | $${s.rate}</div>`
    ).join("");
}

init();
