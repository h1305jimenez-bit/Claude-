// ApplyPilot popup — reads stored token, shows profile, triggers autofill

const APPLYPILOT_API = "https://claude-2z15-g6gg5itpg-h1305jimenez-1454s-projects.vercel.app";

async function getStoredToken() {
  return new Promise(resolve => {
    chrome.storage.local.get(["ap_token"], r => resolve(r.ap_token ?? null));
  });
}

async function storeToken(token) {
  return new Promise(resolve => chrome.storage.local.set({ ap_token: token }, resolve));
}

async function clearToken() {
  return new Promise(resolve => chrome.storage.local.remove(["ap_token", "ap_user"], resolve));
}

async function fetchProfile(token) {
  const res = await fetch(`${APPLYPILOT_API}/api/extension/profile`, {
    headers: { "x-access-token": token },
  });
  if (!res.ok) throw new Error("Invalid token or session expired");
  return res.json();
}

function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = `status ${type}`;
}

function detectPortal(url) {
  if (/greenhouse\.io/.test(url)) return { name: "Greenhouse", key: "greenhouse" };
  if (/lever\.co/.test(url)) return { name: "Lever", key: "lever" };
  if (/myworkdayjobs\.com/.test(url)) return { name: "Workday", key: "workday" };
  if (/linkedin\.com\/jobs/.test(url)) return { name: "LinkedIn Easy Apply", key: "linkedin" };
  if (/smartrecruiters\.com/.test(url)) return { name: "SmartRecruiters", key: "smartrecruiters" };
  if (/bamboohr\.com/.test(url)) return { name: "BambooHR", key: "bamboohr" };
  if (/workable\.com/.test(url)) return { name: "Workable", key: "workable" };
  if (/jobvite\.com/.test(url)) return { name: "Jobvite", key: "jobvite" };
  if (/icims\.com/.test(url)) return { name: "iCIMS", key: "icims" };
  return { name: "Unknown portal", key: null };
}

function buildFieldsPreview(profile) {
  const fields = [
    ["First name", profile.name?.split(" ")[0]],
    ["Last name", profile.name?.split(" ").slice(1).join(" ")],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["LinkedIn", profile.linkedin],
  ].filter(([, v]) => v);
  return fields;
}

async function init() {
  const token = await getStoredToken();
  const setupView = document.getElementById("setupView");
  const connectedView = document.getElementById("connectedView");
  const badge = document.getElementById("connectionBadge");

  if (!token) {
    setupView.style.display = "block";
    connectedView.style.display = "none";
    return;
  }

  try {
    const data = await fetchProfile(token);
    const { user } = data;

    setupView.style.display = "none";
    connectedView.style.display = "block";
    badge.textContent = "Connected";
    badge.className = "badge connected";

    document.getElementById("userName").textContent = user.name || "Your profile";
    document.getElementById("userEmail").textContent = user.email || "";

    // Detect portal from active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const portal = detectPortal(tab?.url ?? "");
    document.getElementById("portalName").textContent = portal.name;
    const pb = document.getElementById("portalBadge");
    pb.textContent = portal.key ? `Ready to fill` : "Open a job application page";
    if (portal.key) pb.className = "portal-badge detected";

    // Show fields preview
    const fields = buildFieldsPreview(user);
    if (fields.length) {
      const list = document.getElementById("fieldsList");
      list.innerHTML = fields
        .map(([k, v]) => `<div class="field-preview"><span>${k}</span><span class="val">${v}</span></div>`)
        .join("");
      document.getElementById("fieldsPreview").style.display = "block";
    }

    const fillBtn = document.getElementById("fillBtn");
    if (portal.key) {
      fillBtn.textContent = `Fill ${portal.name} form`;
      fillBtn.disabled = false;
      fillBtn.onclick = () => triggerFill(tab, token, user, portal.key);
    } else {
      fillBtn.textContent = "Navigate to a job application";
      fillBtn.disabled = true;
    }

  } catch {
    await clearToken();
    setupView.style.display = "block";
    connectedView.style.display = "none";
    showStatus(document.getElementById("setupStatus"), "Session expired — please reconnect.", "error");
  }
}

async function triggerFill(tab, token, user, portalKey) {
  const fillBtn = document.getElementById("fillBtn");
  const fillStatus = document.getElementById("fillStatus");
  fillBtn.disabled = true;
  fillBtn.textContent = "Filling...";

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillForm,
      args: [portalKey, user],
    });

    const result = results?.[0]?.result;
    if (result?.filled > 0) {
      showStatus(fillStatus, `Filled ${result.filled} field${result.filled !== 1 ? "s" : ""}. Review before submitting.`, "success");
    } else {
      showStatus(fillStatus, "No fillable fields found on this page.", "info");
    }
  } catch (e) {
    showStatus(fillStatus, `Error: ${e.message}`, "error");
  } finally {
    fillBtn.disabled = false;
    fillBtn.textContent = "Fill form again";
  }
}

// This function runs INSIDE the job application tab
function fillForm(portalKey, user) {
  const firstName = user.name?.split(" ")[0] ?? "";
  const lastName = user.name?.split(" ").slice(1).join(" ") ?? "";

  // Field mapping per portal
  const PORTAL_MAPS = {
    greenhouse: [
      { selectors: ['input[id="first_name"]', 'input[name="first_name"]'], value: firstName },
      { selectors: ['input[id="last_name"]', 'input[name="last_name"]'], value: lastName },
      { selectors: ['input[id="email"]', 'input[name="email"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[id="phone"]', 'input[name="phone"]', 'input[type="tel"]'], value: user.phone },
      { selectors: ['input[id="job_application_answers_attributes_0_text_value"]'], value: user.linkedin },
    ],
    lever: [
      { selectors: ['input[name="name"]', 'input[placeholder*="name" i]'], value: `${firstName} ${lastName}`.trim() },
      { selectors: ['input[name="email"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[name="phone"]', 'input[type="tel"]'], value: user.phone },
      { selectors: ['input[name="urls[LinkedIn]"]', 'input[placeholder*="linkedin" i]'], value: user.linkedin },
      { selectors: ['input[name="org"]', 'input[placeholder*="company" i]'], value: "" },
    ],
    workday: [
      { selectors: ['input[data-automation-id="legalNameSection_firstName"]', 'input[id*="firstName"]'], value: firstName },
      { selectors: ['input[data-automation-id="legalNameSection_lastName"]', 'input[id*="lastName"]'], value: lastName },
      { selectors: ['input[data-automation-id="email"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[data-automation-id="phone-number"]', 'input[type="tel"]'], value: user.phone },
    ],
    smartrecruiters: [
      { selectors: ['input[name="firstName"]', 'input[id="firstName"]'], value: firstName },
      { selectors: ['input[name="lastName"]', 'input[id="lastName"]'], value: lastName },
      { selectors: ['input[name="email"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[name="phoneNumber"]', 'input[type="tel"]'], value: user.phone },
    ],
    bamboohr: [
      { selectors: ['input[id="firstName"]', 'input[name="firstName"]'], value: firstName },
      { selectors: ['input[id="lastName"]', 'input[name="lastName"]'], value: lastName },
      { selectors: ['input[id="email"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[id="phone"]', 'input[type="tel"]'], value: user.phone },
    ],
    workable: [
      { selectors: ['input[name="firstname"]', 'input[placeholder*="First" i]'], value: firstName },
      { selectors: ['input[name="lastname"]', 'input[placeholder*="Last" i]'], value: lastName },
      { selectors: ['input[name="email"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[name="phone"]', 'input[type="tel"]'], value: user.phone },
    ],
    jobvite: [
      { selectors: ['input[id="jv-firstName"]', 'input[name="firstName"]'], value: firstName },
      { selectors: ['input[id="jv-lastName"]', 'input[name="lastName"]'], value: lastName },
      { selectors: ['input[id="jv-email"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[id="jv-phone"]', 'input[type="tel"]'], value: user.phone },
    ],
    // Generic fallback
    default: [
      { selectors: ['input[name*="first" i][type="text"]', 'input[id*="first" i][type="text"]', 'input[placeholder*="First name" i]'], value: firstName },
      { selectors: ['input[name*="last" i][type="text"]', 'input[id*="last" i][type="text"]', 'input[placeholder*="Last name" i]'], value: lastName },
      { selectors: ['input[type="email"]', 'input[name*="email" i]'], value: user.email },
      { selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]'], value: user.phone },
      { selectors: ['input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]', 'input[id*="linkedin" i]'], value: user.linkedin },
    ],
  };

  const fieldMap = PORTAL_MAPS[portalKey] ?? PORTAL_MAPS.default;
  let filled = 0;

  function setNativeValue(el, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      ?? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    nativeInputValueSetter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  for (const { selectors, value } of fieldMap) {
    if (!value) continue;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && !el.value) {
        setNativeValue(el, value);
        filled++;
        break;
      }
    }
  }

  return { filled };
}

// --- Connect flow ---
document.getElementById("connectBtn").addEventListener("click", async () => {
  const tokenInput = document.getElementById("tokenInput");
  const status = document.getElementById("setupStatus");
  const token = tokenInput.value.trim();
  if (!token) { showStatus(status, "Paste your access token first.", "error"); return; }

  try {
    showStatus(status, "Verifying...", "info");
    const data = await fetchProfile(token);
    if (!data.user) throw new Error("No user returned");
    await storeToken(token);
    showStatus(status, "Connected! Reloading...", "success");
    setTimeout(() => init(), 800);
  } catch (e) {
    showStatus(status, e.message ?? "Connection failed", "error");
  }
});

document.getElementById("disconnectBtn")?.addEventListener("click", async () => {
  await clearToken();
  init();
});

init();
