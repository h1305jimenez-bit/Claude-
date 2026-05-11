// Applyjobs popup — reads stored token, shows profile, triggers autofill

async function getStored(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

async function setStored(data) {
  return new Promise(resolve => chrome.storage.local.set(data, resolve));
}

async function clearStored() {
  return new Promise(resolve => chrome.storage.local.remove(["ap_token", "ap_api", "ap_user"], resolve));
}

// Only clear the token, keep the API URL so reconnection doesn't need to re-detect
async function clearToken() {
  return new Promise(resolve => chrome.storage.local.remove(["ap_token"], resolve));
}

// Decode JWT expiry — returns true if the token is expired
function isTokenExpired(token) {
  try {
    const [, raw] = token.split(".");
    const padded = raw + "=".repeat((4 - raw.length % 4) % 4);
    const payload = JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp && payload.exp < Math.floor(Date.now() / 1000);
  } catch { return false; }
}

// Auto-detect API URL: scan open tabs first (to pick up new deployments),
// fall back to the stored value only when no matching tab is found.
async function resolveApiUrl() {
  try {
    const tabs = await chrome.tabs.query({});
    const appPaths = ["/dashboard", "/profile", "/tracker", "/kit/", "/auth", "/onboarding"];
    for (const tab of tabs) {
      if (!tab.url) continue;
      try {
        const u = new URL(tab.url);
        if (appPaths.some(p => u.pathname.startsWith(p))) {
          const base = `${u.protocol}//${u.host}`;
          await setStored({ ap_api: base }); // always refresh the stored URL
          return base;
        }
      } catch { /* skip */ }
    }
  } catch { /* scripting permission unavailable */ }
  // No matching tab open — fall back to stored value
  const { ap_api } = await getStored(["ap_api"]);
  return ap_api ?? null;
}

async function fetchProfile(token, apiUrl) {
  let res;
  try {
    res = await fetch(`${apiUrl}/api/extension/profile`, {
      headers: { "x-access-token": token },
    });
  } catch {
    throw new Error(`Cannot reach ${apiUrl} — make sure the app is open in a tab and try again.`);
  }

  // If the response is not JSON (e.g. a Vercel HTML 404), the URL is stale
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    await clearStored(); // wipe stale URL so it gets re-detected
    throw new Error("App URL has changed. Open Applyjobs in a tab, then click Connect again.");
  }

  if (res.status === 401) {
    throw new Error("Token rejected. Go to Profile → Copy extension token and paste a fresh one.");
  }
  if (res.status === 404) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Account not found. Open Applyjobs, log in, then try again.");
  }
  if (!res.ok) throw new Error(`Server error (${res.status}). Try again in a moment.`);
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

// Parse CV text to extract current company, title, summary, responsibilities
function parseCvText(cvText) {
  if (!cvText || cvText.length < 50) return {};

  const result = {};

  // Summary: look for an explicit summary/about/profile section first
  const summaryMatch = cvText.match(
    /(?:SUMMARY|PROFILE|OBJECTIVE|ABOUT ME|PROFESSIONAL SUMMARY)[:\s]*\n+([\s\S]{50,600}?)(?=\n[A-Z][A-Z\s]{2,}\n|\n(?:EXPERIENCE|EDUCATION|SKILLS|EMPLOYMENT)\b|$)/i
  );
  if (summaryMatch) {
    result.summary = summaryMatch[1].replace(/\s+/g, " ").trim().slice(0, 500);
  } else {
    // Fall back to the first meaningful paragraph before any section header
    const firstHeader = cvText.search(/\n[A-Z][A-Z\s]{3,}\n|\n(?:EXPERIENCE|EDUCATION|SKILLS|EMPLOYMENT|SUMMARY)\b/i);
    if (firstHeader > 80) {
      result.summary = cvText.slice(0, firstHeader).replace(/\s+/g, " ").trim().slice(0, 400);
    }
  }

  // Work experience section
  const expMatch = cvText.match(
    /(?:EXPERIENCE|EMPLOYMENT HISTORY|WORK HISTORY|PROFESSIONAL EXPERIENCE|WORK EXPERIENCE)[:\s]*\n([\s\S]{0,3000}?)(?=\n[A-Z][A-Z\s]{3,}\n|\n(?:EDUCATION|SKILLS|CERTIFICATIONS|LANGUAGES|PROJECTS)\b|$)/i
  );
  if (expMatch) {
    const expSection = expMatch[1];
    const lines = expSection.split("\n").map(l => l.trim()).filter(Boolean);

    // Try "Title at Company" pattern
    const atMatch = lines[0] && lines[0].match(/^(.+?)\s+at\s+(.+?)(?:[,|\s]\s*\d{4})?$/i);
    if (atMatch) {
      result.currentTitle = atMatch[1].trim();
      result.currentCompany = atMatch[2].trim();
    }

    // Try "Company | Title" or "Title | Company"
    if (!result.currentCompany) {
      const pipeMatch = lines[0] && lines[0].match(/^(.+?)\s*[|–—]\s*(.+?)(?:\s*[|–—]\s*[\d\s\-–—]+)?$/);
      if (pipeMatch) {
        result.currentCompany = pipeMatch[1].trim();
        const second = pipeMatch[2].trim();
        result.currentTitle = /\d{4}/.test(second) ? "" : second;
        if (!result.currentTitle) {
          const titleLine = lines.slice(1).find(l => !l.match(/^\d{4}/) && !l.match(/^[-•]/) && l.length < 80);
          if (titleLine) result.currentTitle = titleLine;
        }
      }
    }

    // Last fallback: line 0 = company, line 1 = title (no dates/bullets)
    if (!result.currentCompany && lines.length >= 2) {
      if (!lines[0].match(/^[-•]/) && !lines[0].match(/^\d{4}/)) result.currentCompany = lines[0];
      if (lines[1] && !lines[1].match(/^[-•]/) && !lines[1].match(/^\d{4}/) && lines[1].length < 80) {
        result.currentTitle = lines[1];
      }
    }

    // Responsibilities: bullet points from the first job entry
    const bullets = lines
      .filter(l => /^[-•*·▪]/.test(l))
      .map(l => l.replace(/^[-•*·▪]\s*/, "").trim())
      .filter(Boolean);
    if (bullets.length > 0) {
      result.responsibilities = bullets.slice(0, 5).join(". ") + ".";
    }
  }

  return result;
}

// Map seniority label to a years-of-experience range string
function seniorityToYears(seniority) {
  if (!seniority) return "";
  const s = seniority.toLowerCase();
  if (s.includes("intern") || s.includes("student")) return "0-1";
  if (s.includes("junior") || s.includes("entry") || s.includes("associate")) return "1-3";
  if (s.includes("mid") || s.includes("intermediate")) return "3-6";
  if (s.includes("senior") || s.includes("sr.")) return "6-10";
  if (s.includes("lead") || s.includes("staff") || s.includes("manager")) return "8-12";
  if (s.includes("principal") || s.includes("director") || s.includes("vp")) return "12+";
  return seniority;
}

function buildFieldsPreview(user) {
  return [
    ["First name", user.name?.split(" ")[0]],
    ["Last name", user.name?.split(" ").slice(1).join(" ")],
    ["Email", user.email],
    ["Phone", user.phone],
    ["LinkedIn", user.linkedin],
    ["Location", user.target_location],
    ["Work auth.", user.work_authorization],
    ["Seniority", user.seniority],
    ["Salary", user.salary_expectation],
    ["Current company", user.currentCompany],
    ["Current title", user.currentTitle],
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

  // Always show the API URL field so the user can see and correct it
  if (apiUrl) apiInput.value = apiUrl;

  if (!token) {
    setupView.style.display = "block";
    connectedView.style.display = "none";
    if (!apiUrl) showStatus(document.getElementById("setupStatus"),
      "Open your Applyjobs app in a tab so the URL is auto-detected.", "info");
    return;
  }

  // Detect expired token before hitting the server
  if (isTokenExpired(token)) {
    await clearToken();
    setupView.style.display = "block";
    connectedView.style.display = "none";
    showStatus(document.getElementById("setupStatus"),
      "Session expired. Go to Profile → Copy extension token, then paste a new one here.", "error");
    return;
  }

  if (!apiUrl) {
    setupView.style.display = "block";
    connectedView.style.display = "none";
    showStatus(document.getElementById("setupStatus"),
      "Open your Applyjobs app in a tab so the URL is auto-detected.", "info");
    return;
  }

  try {
    const data = await fetchProfile(token, apiUrl);
    const user = data.user;

    // Enrich user with parsed CV data and derived fields
    if (user.cv_text) {
      const parsed = parseCvText(user.cv_text);
      user.currentCompany = parsed.currentCompany || "";
      user.currentTitle = parsed.currentTitle || "";
      user.summary = parsed.summary || "";
      user.responsibilities = parsed.responsibilities || "";
    }
    user.yearsExp = seniorityToYears(user.seniority);

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

    // CV download button — opens the stored CV PDF/doc in a new tab
    const dlBtn = document.getElementById("downloadCvBtn");
    if (user.cv_url) {
      dlBtn.style.display = "block";
      dlBtn.onclick = () => chrome.tabs.create({ url: user.cv_url });
    }

  } catch (e) {
    await clearToken();
    setupView.style.display = "block";
    connectedView.style.display = "none";
    showStatus(document.getElementById("setupStatus"),
      e instanceof Error ? e.message : "Connection failed. Go to Profile → Copy extension token.", "error");
  }
}

async function triggerFill(tab, user, portalKey) {
  const fillBtn = document.getElementById("fillBtn");
  const fillStatus = document.getElementById("fillStatus");
  fillBtn.disabled = true;
  fillBtn.textContent = "Filling...";

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: fillForm,
      args: [portalKey, user],
    });

    const totalFilled = (results ?? []).reduce((sum, r) => sum + (r?.result?.filled ?? 0), 0);
    if (totalFilled > 0) {
      showStatus(fillStatus, `Filled ${totalFilled} field${totalFilled !== 1 ? "s" : ""}. Review before submitting.`, "success");
    } else {
      showStatus(fillStatus, "No fillable fields found. The form may use a different structure.", "info");
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

  // Find input/textarea whose label contains any keyword
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
      { s: ['input[name="org"]', 'input[name="company"]'], v: user.currentCompany },
    ],
    workday: [
      { s: ['input[data-automation-id="legalNameSection_firstName"]'], v: firstName },
      { s: ['input[data-automation-id="legalNameSection_lastName"]'], v: lastName },
      { s: ['input[data-automation-id="email"]', 'input[type="email"]'], v: user.email },
      { s: ['input[data-automation-id="phone-number"]', 'input[type="tel"]'], v: user.phone },
      { s: ['input[data-automation-id="addressSection_city"]'], v: user.target_location },
    ],
    smartrecruiters: [
      { s: ['input[name="firstName"]', 'input[id="firstName"]'], v: firstName },
      { s: ['input[name="lastName"]', 'input[id="lastName"]'], v: lastName },
      { s: ['input[name="email"]', 'input[type="email"]'], v: user.email },
      { s: ['input[name="phoneNumber"]', 'input[type="tel"]'], v: user.phone },
      { s: ['input[name="location"]'], v: user.target_location },
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
      { s: ['input[name="summary"]', 'textarea[name="summary"]'], v: user.summary },
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
      { s: ['input[name="company"]', 'input[name="currentCompany"]'], v: user.currentCompany },
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
    // Identity
    { kw: ["first name", "given name", "prénom", "nombre"], v: firstName },
    { kw: ["last name", "family name", "surname", "apellido"], v: lastName },
    { kw: ["full name", "your name", "nombre completo"], v: fullName },
    // Contact
    { kw: ["email", "e-mail", "correo"], v: user.email },
    { kw: ["phone", "mobile", "telephone", "téléphone", "teléfono"], v: user.phone },
    { kw: ["linkedin"], v: user.linkedin },
    // Location & work auth
    { kw: ["location", "city", "where are you based", "ciudad", "ubicación", "ville"], v: user.target_location },
    { kw: ["work authoriz", "work permit", "eligible to work", "right to work", "visa"], v: user.work_authorization },
    // Online presence
    { kw: ["website", "portfolio", "personal site", "github"], v: user.linkedin },
    // Education
    { kw: ["education", "school", "university", "college", "degree", "qualification", "highest level"], v: user.education },
    // Compensation
    { kw: ["salary", "compensation", "expected pay", "desired salary", "expected salary", "pay expectation", "remuneration", "wage", "annual pay"], v: user.salary_expectation },
    // Target role
    { kw: ["desired role", "position applying", "role applying", "desired position", "applying for", "job title (desired)", "what role"], v: user.target_role },
    // Current employment
    { kw: ["current employer", "current company", "most recent employer", "current organization", "employer name", "company name", "where do you work", "present employer"], v: user.currentCompany },
    { kw: ["current title", "current role", "current position", "job title", "your title", "position held", "most recent title", "last title"], v: user.currentTitle },
    // Experience
    { kw: ["years of experience", "years experience", "how many years", "years in the field", "total experience", "years worked"], v: user.yearsExp },
    // Cover letter / motivation (uses summary parsed from CV)
    { kw: ["cover letter", "motivation letter", "why do you want", "tell us about yourself", "about yourself", "tell us why", "why are you interested", "why apply", "additional information", "anything else"], v: user.summary },
    // Responsibilities from CV bullets
    { kw: ["responsibilities", "describe your experience", "key achievements", "what did you do", "describe your role", "previous responsibilities", "main duties"], v: user.responsibilities },
  ];

  for (const { kw, v } of LABEL_FILLS) {
    if (!v) continue;
    const el = findByLabel(kw);
    if (el) { setNativeValue(el, v); filled++; }
  }

  // 3. Selector-based fallback sweeps
  const EXTRA = [
    { s: ['input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]', 'input[id*="linkedin" i]'], v: user.linkedin },
    { s: ['input[id^="job_application_answers_attributes_"][id$="_text_value"]'], v: user.linkedin },
    { s: ['input[name*="location" i]', 'input[placeholder*="city" i]'], v: user.target_location },
    { s: ['input[name*="salary" i]', 'input[placeholder*="salary" i]', 'input[id*="salary" i]'], v: user.salary_expectation },
    { s: ['input[name*="company" i]', 'input[id*="employer" i]', 'input[placeholder*="employer" i]'], v: user.currentCompany },
    { s: ['input[name*="current_title" i]', 'input[name*="currentTitle" i]', 'input[id*="current_title" i]'], v: user.currentTitle },
    { s: ['textarea[name*="cover" i]', 'textarea[id*="cover" i]', 'textarea[placeholder*="cover letter" i]'], v: user.summary },
    { s: ['textarea[name*="summary" i]', 'textarea[id*="summary" i]', 'textarea[placeholder*="about" i]'], v: user.summary },
    { s: ['textarea[name*="responsibilities" i]', 'textarea[id*="responsibilities" i]'], v: user.responsibilities },
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
    if (user.work_authorization && (labelText.includes("country") || labelText.includes("nationality"))) {
      const firstWord = user.work_authorization.toLowerCase().split(" ")[0];
      const match = opts.find(o => o.text.toLowerCase().includes(firstWord));
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
  if (!apiUrl) { showStatus(status, "Enter your Applyjobs app URL (e.g. https://yourapp.vercel.app).", "error"); return; }

  if (isTokenExpired(token)) {
    showStatus(status, "That token has already expired. Go to Profile → Copy extension token for a fresh one.", "error");
    return;
  }

  try {
    showStatus(status, "Verifying...", "info");
    const data = await fetchProfile(token, apiUrl);
    if (!data.user) throw new Error("No user returned");
    await setStored({ ap_token: token, ap_api: apiUrl });
    showStatus(status, "Connected! Reloading...", "success");
    setTimeout(() => init(), 800);
  } catch (e) {
    // Re-detect the API URL on next open in case it changed
    await chrome.storage.local.remove(["ap_api"]);
    showStatus(status, e instanceof Error ? e.message : "Connection failed", "error");
  }
});

document.getElementById("disconnectBtn")?.addEventListener("click", async () => {
  await clearStored();
  init();
});

document.getElementById("resetBtn")?.addEventListener("click", async () => {
  await clearStored();
  const freshUrl = await resolveApiUrl();
  const apiInput = document.getElementById("apiInput");
  if (freshUrl) {
    apiInput.value = freshUrl;
    showStatus(document.getElementById("setupStatus"), `URL updated to ${freshUrl}`, "success");
  } else {
    apiInput.value = "";
    showStatus(document.getElementById("setupStatus"), "Open the Applyjobs app in a tab, then click Reset again.", "info");
  }
});

init();
