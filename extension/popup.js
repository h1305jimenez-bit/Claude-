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

  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Find input whose label contains any keyword
  function findByLabel(keywords) {
    const kw = keywords.map(k => k.toLowerCase());
    for (const label of document.querySelectorAll("label")) {
      const text = label.textContent.toLowerCase().trim();
      if (!kw.some(k => text.includes(k))) continue;
      const forId = label.getAttribute("for");
      if (forId) {
        const el = document.getElementById(forId);
        if (el && !el.disabled && el.type !== "hidden" && el.type !== "file" && el.type !== "checkbox") return el;
      }
      const inner = label.querySelector("input:not([type=hidden]):not([type=file]):not([type=checkbox]), textarea");
      if (inner && !inner.disabled) return inner;
      let sib = label.nextElementSibling;
      for (let i = 0; i < 3 && sib; i++, sib = sib.nextElementSibling) {
        if (sib.tagName === "LABEL") break;
        const inp = sib.matches("input, textarea") ? sib
          : sib.querySelector("input:not([type=hidden]):not([type=file]):not([type=checkbox]), textarea");
        if (inp && !inp.disabled) return inp;
      }
    }
    return null;
  }

  function trySelectors(selectors, value) {
    if (!value) return false;
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && !el.disabled && el.type !== "hidden") { setNativeValue(el, value); return true; }
      } catch { /* bad selector */ }
    }
    return false;
  }

  let filled = 0;

  // 1. Portal-specific selectors for contact fields
  const PORTAL_BASICS = {
    greenhouse: [
      { s: ['input[id="first_name"]', 'input[name="first_name"]'], v: firstName },
      { s: ['input[id="last_name"]', 'input[name="last_name"]'], v: lastName },
      { s: ['input[id="email"]', 'input[name="email"]', 'input[type="email"]'], v: user.email },
      { s: ['input[id="phone"]', 'input[name="phone"]', 'input[type="tel"]'], v: user.phone },
      { s: ['input[id="location"]', 'input[name="location"]'], v: user.target_location },
    ],
    lever: [
      { s: ['input[name="name"]'], v: fullName },
      { s: ['input[name="email"]', 'input[type="email"]'], v: user.email },
      { s: ['input[name="phone"]', 'input[type="tel"]'], v: user.phone },
      { s: ['input[name="urls[LinkedIn]"]'], v: user.linkedin },
    ],
    workday: [
      { s: ['input[data-automation-id="legalNameSection_firstName"]'], v: firstName },
      { s: ['input[data-automation-id="legalNameSection_lastName"]'], v: lastName },
      { s: ['input[data-automation-id="email"]', 'input[type="email"]'], v: user.email },
      { s: ['input[data-automation-id="phone-number"]', 'input[type="tel"]'], v: user.phone },
    ],
    smartrecruiters: [
      { s: ['input[name="firstName"]', 'input[id="firstName"]'], v: firstName },
      { s: ['input[name="lastName"]', 'input[id="lastName"]'], v: lastName },
      { s: ['input[name="email"]', 'input[type="email"]'], v: user.email },
      { s: ['input[name="phoneNumber"]', 'input[type="tel"]'], v: user.phone },
    ],
    bamboohr: [
      { s: ['input[id="firstName"]'], v: firstName },
      { s: ['input[id="lastName"]'], v: lastName },
      { s: ['input[id="email"]', 'input[type="email"]'], v: user.email },
      { s: ['input[id="phone"]', 'input[type="tel"]'], v: user.phone },
    ],
    workable: [
      { s: ['input[name="firstname"]'], v: firstName },
      { s: ['input[name="lastname"]'], v: lastName },
      { s: ['input[name="email"]', 'input[type="email"]'], v: user.email },
      { s: ['input[name="phone"]', 'input[type="tel"]'], v: user.phone },
    ],
    jobvite: [
      { s: ['input[id="jv-firstName"]'], v: firstName },
      { s: ['input[id="jv-lastName"]'], v: lastName },
      { s: ['input[id="jv-email"]', 'input[type="email"]'], v: user.email },
      { s: ['input[id="jv-phone"]', 'input[type="tel"]'], v: user.phone },
    ],
    taleo: [
      { s: ['input[name="ftFirstName"]'], v: firstName },
      { s: ['input[name="ftLastName"]'], v: lastName },
      { s: ['input[name="ftEmail"]', 'input[type="email"]'], v: user.email },
      { s: ['input[name="ftPhone"]', 'input[type="tel"]'], v: user.phone },
    ],
    ashby: [
      { s: ['input[name="name"]'], v: fullName },
      { s: ['input[name="email"]', 'input[type="email"]'], v: user.email },
      { s: ['input[name="phone"]', 'input[type="tel"]'], v: user.phone },
      { s: ['input[name="linkedin"]'], v: user.linkedin },
      { s: ['input[name="location"]'], v: user.target_location },
    ],
    default: [
      { s: ['input[name*="first" i][type="text"]', 'input[id*="first" i][type="text"]', 'input[placeholder*="First name" i]'], v: firstName },
      { s: ['input[name*="last" i][type="text"]', 'input[id*="last" i][type="text"]', 'input[placeholder*="Last name" i]'], v: lastName },
      { s: ['input[type="email"]', 'input[name*="email" i]'], v: user.email },
      { s: ['input[type="tel"]', 'input[name*="phone" i]'], v: user.phone },
    ],
  };

  for (const { s, v } of (PORTAL_BASICS[portalKey] ?? PORTAL_BASICS.default)) {
    if (trySelectors(s, v)) filled++;
  }

  // 2. Label-based fills — catches custom questions on any portal
  const LABEL_FILLS = [
    { kw: ["first name", "given name", "prénom", "nombre"], v: firstName },
    { kw: ["last name", "family name", "surname", "apellido"], v: lastName },
    { kw: ["full name", "your name", "nombre completo"], v: fullName },
    { kw: ["email", "e-mail", "correo"], v: user.email },
    { kw: ["phone", "mobile", "telephone", "téléphone", "teléfono"], v: user.phone },
    { kw: ["linkedin"], v: user.linkedin },
    { kw: ["location", "city", "where are you", "ciudad", "ubicación", "ville"], v: user.target_location },
    { kw: ["work authoriz", "work permit", "eligible to work", "right to work"], v: user.work_authorization },
    { kw: ["website", "portfolio", "personal site"], v: user.linkedin },
    { kw: ["education", "school", "university", "degree"], v: user.education },
  ];

  for (const { kw, v } of LABEL_FILLS) {
    if (!v) continue;
    const el = findByLabel(kw);
    if (el && !el.value) { setNativeValue(el, v); filled++; }
  }

  // 3. Selector-based fallback for fields label detection may miss
  const EXTRA = [
    { s: ['input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]', 'input[id*="linkedin" i]'], v: user.linkedin },
    { s: ['input[id^="job_application_answers_attributes_"][id$="_text_value"]'], v: user.linkedin },
    { s: ['input[name*="location" i]', 'input[placeholder*="city" i]'], v: user.target_location },
  ];
  for (const { s, v } of EXTRA) {
    if (trySelectors(s, v)) filled++;
  }

  // 4. Select/dropdown handling
  for (const sel of document.querySelectorAll("select")) {
    if (sel.value) continue;
    const label = document.querySelector(`label[for="${sel.id}"]`);
    const labelText = (label?.textContent ?? sel.name ?? sel.id ?? "").toLowerCase();
    const opts = Array.from(sel.options);

    if (user.work_authorization && (labelText.includes("auth") || labelText.includes("eligible") || labelText.includes("sponsor") || labelText.includes("visa") || labelText.includes("legally"))) {
      const match = opts.find(o => /yes|authorized|citizen|permit/i.test(o.text));
      if (match) { sel.value = match.value; sel.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
    }
    if (user.seniority && (labelText.includes("senior") || labelText.includes("level") || labelText.includes("years of exp"))) {
      const match = opts.find(o => o.text.toLowerCase().includes(user.seniority.toLowerCase()));
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
