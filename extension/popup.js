// ApplyPilot popup — reads stored token, shows profile, triggers autofill

async function getStored(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

async function setStored(data) {
  return new Promise(resolve => chrome.storage.local.set(data, resolve));
}

async function clearStored() {
  return new Promise(resolve => chrome.storage.local.remove(["ap_token", "ap_api", "ap_user"], resolve));
}

// Auto-detect API URL: check stored value first, then scan open tabs for the app
async function resolveApiUrl() {
  const { ap_api } = await getStored(["ap_api"]);
  if (ap_api) return ap_api;
  try {
    const tabs = await chrome.tabs.query({});
    const appPaths = ["/dashboard", "/profile", "/tracker", "/kit/", "/auth"];
    for (const tab of tabs) {
      if (!tab.url) continue;
      try {
        const u = new URL(tab.url);
        if (appPaths.some(p => u.pathname.startsWith(p))) {
          const base = `${u.protocol}//${u.host}`;
          await setStored({ ap_api: base });
          return base;
        }
      } catch { /* skip */ }
    }
  } catch { /* scripting permission issue */ }
  return null;
}

async function fetchProfile(token, apiUrl) {
  const res = await fetch(`${apiUrl}/api/extension/profile`, {
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
  // Check URL query params first — catches ATS embedded on company career sites
  try {
    const u = new URL(url);
    if (u.searchParams.has("gh_jid") || u.searchParams.has("gh_src")) return { name: "Greenhouse", key: "greenhouse" };
    if (u.searchParams.has("lever-origin") || u.searchParams.has("lever_source")) return { name: "Lever", key: "lever" };
  } catch { /* ignore */ }

  if (/greenhouse\.io/.test(url)) return { name: "Greenhouse", key: "greenhouse" };
  if (/lever\.co/.test(url)) return { name: "Lever", key: "lever" };
  if (/myworkdayjobs\.com/.test(url)) return { name: "Workday", key: "workday" };
  if (/linkedin\.com\/jobs/.test(url)) return { name: "LinkedIn Easy Apply", key: "linkedin" };
  if (/smartrecruiters\.com/.test(url)) return { name: "SmartRecruiters", key: "smartrecruiters" };
  if (/bamboohr\.com/.test(url)) return { name: "BambooHR", key: "bamboohr" };
  if (/workable\.com/.test(url)) return { name: "Workable", key: "workable" };
  if (/jobvite\.com/.test(url)) return { name: "Jobvite", key: "jobvite" };
  if (/icims\.com/.test(url)) return { name: "iCIMS", key: "icims" };
  if (/ashbyhq\.com/.test(url)) return { name: "Ashby", key: "ashby" };
  if (/taleo\.net/.test(url)) return { name: "Taleo", key: "taleo" };
  if (/recruitee\.com/.test(url)) return { name: "Recruitee", key: "recruitee" };
  if (/breezy\.hr/.test(url)) return { name: "Breezy HR", key: "breezy" };
  if (/amazon\.jobs/.test(url)) return { name: "Amazon Jobs", key: "amazon" };
  if (/metacareers\.com/.test(url)) return { name: "Meta Careers", key: "meta" };
  if (/pinpointhq\.com/.test(url)) return { name: "Pinpoint", key: "pinpoint" };
  if (/rippling\.com/.test(url)) return { name: "Rippling", key: "rippling" };
  return { name: "Unknown portal", key: "default" };
}

function buildFieldsPreview(profile) {
  return [
    ["First name", profile.name?.split(" ")[0]],
    ["Last name", profile.name?.split(" ").slice(1).join(" ")],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["LinkedIn", profile.linkedin],
    ["Location", profile.target_location],
    ["Work auth.", profile.work_authorization],
    ["Seniority", profile.seniority],
  ].filter(([, v]) => v);
}

async function init() {
  const { ap_token: token } = await getStored(["ap_token"]);
  const setupView = document.getElementById("setupView");
  const connectedView = document.getElementById("connectedView");
  const badge = document.getElementById("connectionBadge");
  const apiRow = document.getElementById("apiRow");
  const apiInput = document.getElementById("apiInput");

  const apiUrl = await resolveApiUrl();

  if (!token) {
    setupView.style.display = "block";
    connectedView.style.display = "none";
    if (apiUrl) {
      apiInput.value = apiUrl;
      apiRow.style.display = "none";
    } else {
      apiRow.style.display = "block";
    }
    return;
  }

  if (!apiUrl) {
    setupView.style.display = "block";
    connectedView.style.display = "none";
    apiRow.style.display = "block";
    showStatus(document.getElementById("setupStatus"),
      "Open your ApplyPilot app in a tab, or enter the URL below.", "info");
    return;
  }

  try {
    const data = await fetchProfile(token, apiUrl);
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
    const isDefault = portal.key === "default";
    pb.textContent = isDefault ? "Generic fill (portal not detected)" : "Ready to fill";
    if (!isDefault) pb.className = "portal-badge detected";

    // Fields preview
    const fields = buildFieldsPreview(user);
    if (fields.length) {
      const list = document.getElementById("fieldsList");
      list.innerHTML = fields
        .map(([k, v]) => `<div class="field-preview"><span>${k}</span><span class="val">${v}</span></div>`)
        .join("");
      document.getElementById("fieldsPreview").style.display = "block";
    }

    const fillBtn = document.getElementById("fillBtn");
    fillBtn.textContent = isDefault ? "Fill form (generic)" : `Fill ${portal.name} form`;
    fillBtn.disabled = false;
    fillBtn.onclick = () => triggerFill(tab, user, portal.key);

  } catch {
    await clearStored();
    setupView.style.display = "block";
    connectedView.style.display = "none";
    showStatus(document.getElementById("setupStatus"), "Session expired — please reconnect.", "error");
  }
}

async function triggerFill(tab, user, portalKey) {
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

// Runs INSIDE the job application tab via chrome.scripting.executeScript
function fillForm(portalKey, user) {
  const firstName = user.name?.split(" ")[0] ?? "";
  const lastName = user.name?.split(" ").slice(1).join(" ") ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  // DOM-based portal detection fallback (runs inside the page)
  if (portalKey === "default" || !portalKey) {
    if (document.querySelector('input[name="first_name"], input[id="first_name"]')) portalKey = "greenhouse";
    else if (document.querySelector('input[name="name"][autocomplete]') && document.querySelector('[class*="lever"], [data-qa*="lever"]')) portalKey = "lever";
    else if (document.querySelector('[data-automation-id*="firstName"]')) portalKey = "workday";
    else if (document.querySelector('input[id*="jv-firstName"]')) portalKey = "jobvite";
    else if (document.querySelector('input[name="ftFirstName"]')) portalKey = "taleo";
    else if (document.querySelector('[class*="ashby"], [data-testid*="ashby"]')) portalKey = "ashby";
    else portalKey = "default";
  }

  // Common extra fields appended to every portal map
  const COMMON_EXTRA = [
    { selectors: ['input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]', 'input[id*="linkedin" i]', 'input[label*="linkedin" i]'], value: user.linkedin },
    { selectors: ['input[name*="location" i]', 'input[placeholder*="city" i]', 'input[placeholder*="location" i]', 'input[id*="location" i]', 'input[id*="city" i]'], value: user.target_location },
    { selectors: ['input[name*="work_auth" i]', 'input[placeholder*="authorization" i]', 'input[id*="work_auth" i]'], value: user.work_authorization },
    { selectors: ['input[name*="portfolio" i]', 'input[placeholder*="portfolio" i]', 'input[name*="website" i]', 'input[placeholder*="website" i]'], value: user.linkedin },
  ];

  const PORTAL_MAPS = {
    greenhouse: [
      { selectors: ['input[id="first_name"]', 'input[name="first_name"]'], value: firstName },
      { selectors: ['input[id="last_name"]', 'input[name="last_name"]'], value: lastName },
      { selectors: ['input[id="email"]', 'input[name="email"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[id="phone"]', 'input[name="phone"]', 'input[type="tel"]'], value: user.phone },
      { selectors: ['input[placeholder*="linkedin" i]', 'input[id*="linkedin" i]'], value: user.linkedin },
      { selectors: ['input[id="location"]', 'input[name="location"]'], value: user.target_location },
    ],
    lever: [
      { selectors: ['input[name="name"]', 'input[placeholder*="Full name" i]'], value: fullName },
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
    linkedin: [
      { selectors: ['input[id$="-firstName"]', 'input[aria-label*="First name" i]'], value: firstName },
      { selectors: ['input[id$="-lastName"]', 'input[aria-label*="Last name" i]'], value: lastName },
      { selectors: ['input[id$="-phoneNumber"]', 'input[aria-label*="Phone" i]', 'input[type="tel"]'], value: user.phone },
      { selectors: ['input[id$="-email"]', 'input[type="email"]'], value: user.email },
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
      { selectors: ['input[name="linkedin"]', 'input[placeholder*="linkedin" i]'], value: user.linkedin },
    ],
    jobvite: [
      { selectors: ['input[id="jv-firstName"]', 'input[name="firstName"]'], value: firstName },
      { selectors: ['input[id="jv-lastName"]', 'input[name="lastName"]'], value: lastName },
      { selectors: ['input[id="jv-email"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[id="jv-phone"]', 'input[type="tel"]'], value: user.phone },
    ],
    icims: [
      { selectors: ['input[name*="firstname" i]', 'input[id*="firstname" i]'], value: firstName },
      { selectors: ['input[name*="lastname" i]', 'input[id*="lastname" i]'], value: lastName },
      { selectors: ['input[type="email"]', 'input[name*="email" i]'], value: user.email },
      { selectors: ['input[type="tel"]', 'input[name*="phone" i]'], value: user.phone },
    ],
    ashby: [
      { selectors: ['input[name="name"]', 'input[placeholder*="Full name" i]'], value: fullName },
      { selectors: ['input[name="email"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[name="phone"]', 'input[type="tel"]'], value: user.phone },
      { selectors: ['input[name="linkedin"]', 'input[placeholder*="linkedin" i]'], value: user.linkedin },
      { selectors: ['input[name="location"]', 'input[placeholder*="location" i]'], value: user.target_location },
    ],
    taleo: [
      { selectors: ['input[name="ftFirstName"]', 'input[id*="firstName"]'], value: firstName },
      { selectors: ['input[name="ftLastName"]', 'input[id*="lastName"]'], value: lastName },
      { selectors: ['input[name="ftEmail"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[name="ftPhone"]', 'input[type="tel"]'], value: user.phone },
    ],
    recruitee: [
      { selectors: ['input[name="first_name"]', 'input[id*="first_name"]'], value: firstName },
      { selectors: ['input[name="last_name"]', 'input[id*="last_name"]'], value: lastName },
      { selectors: ['input[type="email"]', 'input[name="email"]'], value: user.email },
      { selectors: ['input[type="tel"]', 'input[name="phone"]'], value: user.phone },
    ],
    breezy: [
      { selectors: ['input[name="name"]', 'input[placeholder*="name" i]'], value: fullName },
      { selectors: ['input[name="email"]', 'input[type="email"]'], value: user.email },
      { selectors: ['input[name="phone"]', 'input[type="tel"]'], value: user.phone },
    ],
    amazon: [
      { selectors: ['input[name="firstName"]', 'input[id*="firstName"]'], value: firstName },
      { selectors: ['input[name="lastName"]', 'input[id*="lastName"]'], value: lastName },
      { selectors: ['input[type="email"]', 'input[name="email"]'], value: user.email },
      { selectors: ['input[type="tel"]', 'input[name="phone"]'], value: user.phone },
    ],
    meta: [
      { selectors: ['input[name="first_name"]', 'input[placeholder*="First" i]'], value: firstName },
      { selectors: ['input[name="last_name"]', 'input[placeholder*="Last" i]'], value: lastName },
      { selectors: ['input[type="email"]', 'input[name*="email" i]'], value: user.email },
      { selectors: ['input[type="tel"]', 'input[name*="phone" i]'], value: user.phone },
    ],
    pinpoint: [
      { selectors: ['input[name="first_name"]', 'input[id*="first_name"]'], value: firstName },
      { selectors: ['input[name="last_name"]', 'input[id*="last_name"]'], value: lastName },
      { selectors: ['input[type="email"]'], value: user.email },
      { selectors: ['input[type="tel"]'], value: user.phone },
    ],
    rippling: [
      { selectors: ['input[name="firstName"]', 'input[placeholder*="First" i]'], value: firstName },
      { selectors: ['input[name="lastName"]', 'input[placeholder*="Last" i]'], value: lastName },
      { selectors: ['input[type="email"]'], value: user.email },
      { selectors: ['input[type="tel"]'], value: user.phone },
    ],
    default: [
      { selectors: ['input[name*="first" i][type="text"]', 'input[id*="first" i][type="text"]', 'input[placeholder*="First name" i]'], value: firstName },
      { selectors: ['input[name*="last" i][type="text"]', 'input[id*="last" i][type="text"]', 'input[placeholder*="Last name" i]'], value: lastName },
      { selectors: ['input[type="email"]', 'input[name*="email" i]'], value: user.email },
      { selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]'], value: user.phone },
      { selectors: ['input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]', 'input[id*="linkedin" i]'], value: user.linkedin },
    ],
  };

  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillField({ selectors, value }) {
    if (!value) return false;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && !el.value) {
        setNativeValue(el, value);
        return true;
      }
    }
    return false;
  }

  const fieldMap = [...(PORTAL_MAPS[portalKey] ?? PORTAL_MAPS.default), ...COMMON_EXTRA];
  let filled = 0;

  for (const entry of fieldMap) {
    if (fillField(entry)) filled++;
  }

  // Handle select dropdowns for work authorization
  if (user.work_authorization) {
    const selects = document.querySelectorAll('select[name*="auth" i], select[id*="auth" i], select[name*="eligible" i], select[name*="sponsor" i]');
    for (const sel of selects) {
      if (sel.value) continue;
      const opts = Array.from(sel.options);
      const match = opts.find(o => o.text.toLowerCase().includes("yes") || o.text.toLowerCase().includes("authorized") || o.text.toLowerCase().includes("citizen"));
      if (match) { sel.value = match.value; sel.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
    }
  }

  return { filled, portal: portalKey };
}

// --- Connect flow ---
document.getElementById("connectBtn").addEventListener("click", async () => {
  const tokenInput = document.getElementById("tokenInput");
  const apiInput = document.getElementById("apiInput");
  const status = document.getElementById("setupStatus");
  const token = tokenInput.value.trim();
  if (!token) { showStatus(status, "Paste your access token first.", "error"); return; }

  let apiUrl = apiInput.value.trim().replace(/\/$/, "");
  if (!apiUrl) apiUrl = await resolveApiUrl() ?? "";
  if (!apiUrl) { showStatus(status, "Enter your ApplyPilot app URL (e.g. https://yourapp.vercel.app).", "error"); return; }

  try {
    showStatus(status, "Verifying...", "info");
    const data = await fetchProfile(token, apiUrl);
    if (!data.user) throw new Error("No user returned");
    await setStored({ ap_token: token, ap_api: apiUrl });
    showStatus(status, "Connected! Reloading...", "success");
    setTimeout(() => init(), 800);
  } catch (e) {
    showStatus(status, e.message ?? "Connection failed", "error");
  }
});

document.getElementById("disconnectBtn")?.addEventListener("click", async () => {
  await clearStored();
  init();
});

init();
