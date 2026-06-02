const menuBtn = document.getElementById("menuBtn");
const navMenu = document.getElementById("navMenu");

if (menuBtn && navMenu) {
  menuBtn.addEventListener("click", () => {
    const expanded = menuBtn.getAttribute("aria-expanded") === "true";
    menuBtn.setAttribute("aria-expanded", String(!expanded));
    navMenu.classList.toggle("show");
  });
}

const currentPage = document.documentElement.dataset.page;
if (currentPage) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === currentPage) link.classList.add("active");
  });
}

const heroMockup = document.getElementById("heroMockup");
if (heroMockup) {
  heroMockup.addEventListener("error", () => {
    heroMockup.style.display = "none";
  });
}

const PRESETS = {
  "General Business": {
    greeting: "Hi! I'm AskVeyza. How can I help your customers today?",
    quick: ["Check pricing", "Book appointment", "Business hours", "Talk to owner"],
    summary: "Balanced demo flow for service and local business websites.",
    responses: {
      pricing: "I can share starting pricing and route exact quote requests to your team.",
      hours: "Business hours are available, and I can guide visitors to contact options anytime.",
      location: "I can share your location or service area and next steps.",
      booking: "I can guide visitors to booking and capture appointment details.",
      urgent: "I can escalate urgent requests to the owner right away.",
      contact: "I can provide direct phone or callback options.",
      fallback: "I can help with pricing, hours, booking, location, and owner follow-up.",
    },
  },
  "Nail Salon": {
    greeting: "Hi 👋 I can help with nail pricing, service details, and booking.",
    quick: ["Do you have availability this week?", "What services do you offer?", "Can I book an appointment?", "Do you take walk-ins?"],
    summary: "Great for appointment-heavy salons handling frequent service and availability questions.",
    responses: {
      pricing: "Acrylic full sets start at $55 and fills start at $40. Gel manicure starts at $35.",
      hours: "Open Mon-Fri 9am-7pm and Sat 10am-5pm.",
      location: "We can share exact location and parking details when needed.",
      booking: "Yes. I can capture your preferred service and appointment time now.",
      urgent: "I can route urgent same-day requests to the owner immediately.",
      contact: "I can share phone and callback options right here.",
      fallback: "I can help with services, pricing, hours, location, and booking requests.",
    },
  },
  "Hair Salon": {
    greeting: "Hi 👋 I can help with cuts, color services, pricing, and appointments.",
    quick: ["How much is a women's haircut?", "Do you do balayage?", "Any openings today?", "What are your hours?"],
    summary: "Built for stylist availability, consultation requests, and service-menu questions.",
    responses: {
      pricing: "Haircuts start at $45, color services start at $95, and balayage starts at $165.",
      hours: "Open Tue-Sat 9am-6pm.",
      location: "Location details are available with booking instructions.",
      booking: "Absolutely. I can capture your preferred stylist and time.",
      urgent: "For urgent requests, I can send an owner alert now.",
      contact: "I can provide call, text, or callback options.",
      fallback: "I can help with services, pricing, stylist availability, and booking.",
    },
  },
  "Med Spa": {
    greeting: "Hi 👋 I can help with treatment questions, consultation booking, and pricing guidance.",
    quick: ["Do you offer Botox?", "How much is laser treatment?", "Can I book a consultation?", "What are your hours?"],
    summary: "Useful for consultation conversion and treatment inquiry handling.",
    responses: {
      pricing: "Most treatments range from $150 to $450 depending on your plan.",
      hours: "Open Mon-Sat 10am-6pm.",
      location: "Location and directions can be shared in chat.",
      booking: "Yes. I can submit your consultation request now.",
      urgent: "I can escalate urgent care-related requests to the owner immediately.",
      contact: "I can route this to call, text, or callback.",
      fallback: "I can help with treatment info, consultation booking, and office details.",
    },
  },
  Dentist: {
    greeting: "Hi 👋 I can help with new patient questions, dental services, and scheduling.",
    quick: ["Do you accept new patients?", "What are your hours?", "Do you do teeth whitening?", "How can I book?"],
    summary: "Supports patient intake and appointment-focused questions.",
    responses: {
      pricing: "Whitening starts around $199. Exam pricing depends on insurance and visit type.",
      hours: "Open Mon-Thu 8am-5pm and Fri 8am-1pm.",
      location: "I can provide office location and access details.",
      booking: "Yes. I can capture your details for a patient appointment request.",
      urgent: "If this is urgent, I can route you to immediate call support.",
      contact: "I can send phone and callback options now.",
      fallback: "I can help with patient info, procedures, scheduling, and office details.",
    },
  },
  Lawyer: {
    greeting: "Hi 👋 I can help with consultation requests, office info, and contact routing.",
    quick: ["Do you offer consultations?", "What cases do you handle?", "How do I contact your office?", "What are your hours?"],
    summary: "Designed for legal intake and consultation follow-up.",
    responses: {
      pricing: "Consultation fees vary by case type. I can route your request for exact pricing.",
      hours: "Office hours are Mon-Fri 8:30am-5:30pm.",
      location: "I can share office location and parking details.",
      booking: "Yes. I can submit your consultation request to intake.",
      urgent: "For urgent matters, I can escalate to immediate call follow-up.",
      contact: "I can provide direct office contact options.",
      fallback: "I can help with consultation intake, practice areas, and contact details.",
    },
  },
  HVAC: {
    greeting: "Hi 👋 I can help with repairs, service area, and same-day requests.",
    quick: ["Do you offer same-day service?", "What areas do you serve?", "Do you repair AC units?", "Can I get a quote?"],
    summary: "Strong for urgent home-service inquiries and quote capture.",
    responses: {
      pricing: "Diagnostics typically start near $89. Final pricing depends on repair scope.",
      hours: "Available Mon-Sat 7am-8pm with emergency options.",
      location: "I can confirm service area coverage in chat.",
      booking: "Yes. I can capture your address and preferred service window.",
      urgent: "For no-cooling emergencies, I can route this to priority owner follow-up.",
      contact: "I can provide call, text, or callback options.",
      fallback: "I can help with HVAC service area, diagnostics, and scheduling.",
    },
  },
  Plumbing: {
    greeting: "Hi 👋 I can help with emergency plumbing questions, estimates, and scheduling.",
    quick: ["Do you handle emergency leaks?", "What areas do you serve?", "Can I get an estimate?", "How soon can you come?"],
    summary: "Built for high-urgency requests and dispatch-ready lead capture.",
    responses: {
      pricing: "Service calls often start near $95. Estimate depends on issue severity.",
      hours: "Available daily with emergency coverage.",
      location: "I can confirm if your address is in service range.",
      booking: "Yes. I can capture your issue and preferred arrival time.",
      urgent: "If there is active water damage, I can escalate now for priority response.",
      contact: "I can share direct call/text options right away.",
      fallback: "I can help with plumbing emergencies, service area, estimates, and booking.",
    },
  },
  "Cleaning Service": {
    greeting: "Hi 👋 I can help with cleaning packages, pricing, and scheduling.",
    quick: ["Do you offer deep cleaning?", "How much is a cleaning?", "Can I book weekly service?", "What areas do you cover?"],
    summary: "Good for recurring service leads and package inquiries.",
    responses: {
      pricing: "Standard cleanings often start around $120; deep cleaning varies by home size.",
      hours: "Teams are available Mon-Sat 8am-6pm.",
      location: "I can confirm service coverage area.",
      booking: "Yes. I can collect home size and schedule preference.",
      urgent: "For urgent cleanup requests, I can escalate for same-day follow-up.",
      contact: "I can provide call, text, or callback options.",
      fallback: "I can help with package details, service area, and scheduling.",
    },
  },
  "Auto Repair": {
    greeting: "Hi 👋 I can help with diagnostics, repair estimates, and appointment requests.",
    quick: ["Do you do same-day diagnostics?", "How much is brake service?", "What are your hours?", "Can I book an appointment?"],
    summary: "Useful for service estimate questions and repair appointment intake.",
    responses: {
      pricing: "Diagnostics often begin around $95. Repair totals vary by vehicle and issue.",
      hours: "Open Mon-Fri 8am-6pm and Sat 9am-3pm.",
      location: "I can share shop location and drop-off info.",
      booking: "Yes. I can capture your vehicle details and preferred time.",
      urgent: "If your vehicle is unsafe, I can route this for immediate owner callback.",
      contact: "I can provide direct shop contact options.",
      fallback: "I can help with diagnostics, service estimates, and scheduling.",
    },
  },
  "Real Estate": {
    greeting: "Hi 👋 I can help with consultation requests, service area, and buyer/seller questions.",
    quick: ["Do you work with first-time buyers?", "Can I schedule a consultation?", "What areas do you cover?", "How do I contact an agent?"],
    summary: "Focused on consultation capture and inquiry routing.",
    responses: {
      pricing: "Commission structure depends on transaction type; I can route a consultation request.",
      hours: "Available Mon-Sat 9am-7pm.",
      location: "I can share the neighborhoods and service regions covered.",
      booking: "Yes. I can submit your consultation request to an agent.",
      urgent: "For urgent listing support, I can escalate to immediate owner follow-up.",
      contact: "I can provide direct agent contact options.",
      fallback: "I can help with buyer/seller consultations, service area, and contact routing.",
    },
  },
  "Restaurant / Cafe": {
    greeting: "Hi 👋 I can help with menu, reservations, hours, and location questions.",
    quick: ["What are your hours?", "Do you take reservations?", "Do you have vegan options?", "Where are you located?"],
    summary: "Useful for reservation flow and common customer inquiries.",
    responses: {
      pricing: "Menu pricing varies by item category. I can share highlights.",
      hours: "Open daily 7am-9pm.",
      location: "I can provide location and parking details.",
      booking: "Yes. I can route your reservation request.",
      urgent: "For immediate large-party support, I can escalate to owner follow-up.",
      contact: "I can share direct reservation contact options.",
      fallback: "I can help with menu, location, hours, and reservation support.",
    },
  },
  "Retail Store": {
    greeting: "Hi 👋 I can help with store hours, product questions, and contact support.",
    quick: ["What are your store hours?", "Do you have this item in stock?", "Where is your store?", "How do I contact support?"],
    summary: "Built for product inquiries and storefront support.",
    responses: {
      pricing: "Pricing depends on product category; I can route exact item requests.",
      hours: "Open Mon-Sat 10am-8pm and Sun 11am-6pm.",
      location: "I can share location and in-store pickup info.",
      booking: "I can submit your product inquiry or personal shopping request.",
      urgent: "For urgent order issues, I can escalate to owner support immediately.",
      contact: "I can provide direct support contact options.",
      fallback: "I can help with store info, product questions, and support routing.",
    },
  },
};

const genericKeywords = {
  urgent: ["urgent", "emergency", "call now", "help", "same day", "asap", "problem"],
  pricing: ["price", "cost", "how much", "quote", "fee", "estimate"],
  hours: ["hours", "open", "close", "time"],
  location: ["where", "location", "address", "area", "serve"],
  booking: ["book", "appointment", "schedule", "reserve", "consultation"],
  contact: ["contact", "phone", "call", "text", "reach"],
};

const MODE_QUICK_ACTIONS = {
  website: ["Check pricing", "Book appointment", "Business hours", "Talk to owner"],
  booking: ["View booking options", "Do you have availability?", "Service area", "Talk to owner"],
};

const categorySelect = document.getElementById("categorySelect");
const businessNameInput = document.getElementById("businessNameInput");
const brandColorInput = document.getElementById("brandColorInput");
const ownerPhoneInput = document.getElementById("ownerPhoneInput");
const alertModeSelect = document.getElementById("alertModeSelect");
const alertPreviewReason = document.getElementById("alertPreviewReason");
const alertPreviewFollowup = document.getElementById("alertPreviewFollowup");
const alertPreviewSummary = document.getElementById("alertPreviewSummary");
const ownerAlertsToggle = document.getElementById("ownerAlertsToggle");
const ownerQuestionInput = document.getElementById("ownerQuestionInput");
const sendOwnerQuestionBtn = document.getElementById("sendOwnerQuestionBtn");
const ownerSendStatus = document.getElementById("ownerSendStatus");
const visitorNameInput = document.getElementById("visitorNameInput");
const leadScoreBadge = document.getElementById("leadScoreBadge");
const memoryName = document.getElementById("memoryName");
const memoryService = document.getElementById("memoryService");
const memoryLastVisit = document.getElementById("memoryLastVisit");
const memoryIntent = document.getElementById("memoryIntent");
const demoModeTabs = Array.from(document.querySelectorAll(".demo-mode-tab"));
const modeBenefitsTitle = document.getElementById("modeBenefitsTitle");
const modeBenefitsList = document.getElementById("modeBenefitsList");
const leadRescueCard = document.getElementById("leadRescueCard");
const memorySnapshot = document.getElementById("memorySnapshot");
const visitorNameRow = document.getElementById("visitorNameRow");
const bookingLinkInput = document.getElementById("bookingLinkInput");

const demoCard = document.getElementById("demoCard");
const demoBusinessTitle = document.getElementById("demoBusinessTitle");
const demoMessages = document.getElementById("demoMessages");
const demoQuickBar = document.getElementById("demoQuickBar");
const demoForm = document.getElementById("demoForm");
const demoInput = document.getElementById("demoInput");
const demoTyping = document.getElementById("demoTyping");

const demoState = {
  category: "General Business",
  businessName: "",
  visitorName: "",
  color: "#2f759b",
  leads: [],
  ownerPhone: "",
  alertMode: "text",
  alertsEnabled: true,
  mode: "website",
  conversationLog: [],
};
const memoryStoreKey = "ask-veyza-memory";

function getAlertModeLabel(mode) {
  if (mode === "call") return "Call owner";
  if (mode === "both") return "Text + call owner";
  return "Text owner";
}

function getActiveBusinessName() {
  return demoState.businessName.trim() || "Live Chat Demo";
}

function getGreeting() {
  const base = PRESETS[demoState.category].greeting;
  const businessName = demoState.businessName.trim();
  return businessName ? `Hi! I'm AskVeyza for ${businessName}. How can I help your customers today?` : base;
}

function addAlertPreview({ reason, recommendation, summary }) {
  if (alertPreviewReason) alertPreviewReason.textContent = `Visitor request: ${reason}`;
  if (alertPreviewFollowup) alertPreviewFollowup.textContent = `Recommended action: ${recommendation}`;
  if (alertPreviewSummary) alertPreviewSummary.textContent = `Transcript preview: ${summary}`;
}

function getConversationSnippet() {
  return demoState.conversationLog
    .slice(-4)
    .map((line) => `${line.role}: ${line.text}`)
    .join(" | ");
}

function updateLeadScore(score = "high") {
  if (!leadScoreBadge) return;
  leadScoreBadge.textContent = `${score.toUpperCase()} INTENT LEAD`;
  leadScoreBadge.className = `score-badge ${score}`;
}

function createEscalationRecord(question, reason, recommendation, score = "high") {
  const name = demoState.businessName.trim() || "This business";
  const summary = `${name}: customer asked "${question}".`;
  const record = {
    type: "owner-escalation",
    businessName: name,
    visitorName: demoState.visitorName || "Visitor",
    category: demoState.category,
    question,
    reason,
    recommendation,
    score,
    transcript: getConversationSnippet() || "Conversation just started.",
    ownerPhone: demoState.ownerPhone,
    alertMode: demoState.alertMode,
    summary,
    createdAt: new Date().toISOString(),
  };
  demoState.leads.push(record);
  void saveDemoLead(record);
  addAlertPreview({
    reason,
    recommendation,
    summary: `${summary} Transcript: ${record.transcript}`,
  });
  updateLeadScore(score);
  return record;
}

function updateDemoColor(color) {
  if (demoCard) demoCard.style.setProperty("--demo-color", color);
}

function addMessage(text, type = "bot") {
  if (!demoMessages) return;
  const node = document.createElement("div");
  node.className = `message ${type}`;
  node.textContent = text;
  demoMessages.appendChild(node);
  demoMessages.scrollTop = demoMessages.scrollHeight;
  demoState.conversationLog.push({
    role: type === "user" ? "Visitor" : type === "system" ? "System" : "AskVeyza",
    text,
  });
}

function addActionPrompt(question, reason, score = "high") {
  if (!demoMessages) return;

  const wrapper = document.createElement("div");
  wrapper.className = "message bot";
  wrapper.innerHTML = `
    <div class="action-row">
      <button type="button" class="action-yes">Yes, notify owner</button>
      <button type="button" class="action-no">Continue with AskVeyza</button>
    </div>
  `;
  demoMessages.appendChild(wrapper);
  demoMessages.scrollTop = demoMessages.scrollHeight;

  wrapper.querySelector(".action-yes").addEventListener("click", () => {
    escalateToOwner(question, reason, score);
    wrapper.remove();
  });
  wrapper.querySelector(".action-no").addEventListener("click", () => {
    addMessage("No problem. I’ll keep helping here.");
    wrapper.remove();
  });
}

function addSystemMessage(text) {
  if (!demoMessages) return;
  const node = document.createElement("div");
  node.className = "message system";
  node.textContent = text;
  demoMessages.appendChild(node);
  demoMessages.scrollTop = demoMessages.scrollHeight;
}

function clearMessages() {
  if (demoMessages) demoMessages.innerHTML = "";
  demoState.conversationLog = [];
}

function resetConversation() {
  clearMessages();
  addMessage(getGreeting());
}

function renderQuickActions() {
  const preset = PRESETS[demoState.category];
  const allQuick = demoState.mode === "booking"
    ? MODE_QUICK_ACTIONS.booking
    : preset.quick?.length
      ? preset.quick
      : MODE_QUICK_ACTIONS.website;

  const chips = allQuick
    .map(
      (question) =>
        `<button class="quick-chip" data-question="${question.replace(/"/g, "&quot;")}" type="button">${question}</button>`
    )
    .join("");

  if (demoQuickBar) demoQuickBar.innerHTML = chips;
}

function updateBusinessTitle() {
  if (!demoBusinessTitle) return;
  demoBusinessTitle.textContent = getActiveBusinessName();
}

function getMemoryStore() {
  try {
    return JSON.parse(window.localStorage.getItem(memoryStoreKey) || "{}");
  } catch {
    return {};
  }
}

function saveMemoryStore(store) {
  window.localStorage.setItem(memoryStoreKey, JSON.stringify(store));
}

function inferServiceInterest(question) {
  const q = question.toLowerCase();
  if (q.includes("balayage")) return "Balayage";
  if (q.includes("knotless")) return "Knotless braids";
  if (q.includes("gel")) return "Gel manicure";
  if (q.includes("whitening")) return "Teeth whitening";
  if (q.includes("repair")) return "Repair service";
  if (q.includes("consult")) return "Consultation";
  return "General service inquiry";
}

function getLeadScore(intent, question) {
  const q = question.toLowerCase();
  if (intent === "urgent" || intent === "booking" || q.includes("tomorrow") || q.includes("same-day")) return "high";
  if (intent === "pricing" || intent === "contact") return "medium";
  return "low";
}

function upsertVisitorMemory(question, intent) {
  if (!demoState.visitorName) return;
  const store = getMemoryStore();
  const key = demoState.visitorName.toLowerCase();
  const existing = store[key] || {
    name: demoState.visitorName,
    serviceInterest: inferServiceInterest(question),
    previousQuestions: [],
    lastVisitAt: new Date().toISOString(),
    intentLevel: "low",
  };
  const score = getLeadScore(intent, question);
  existing.serviceInterest = inferServiceInterest(question);
  existing.previousQuestions = [...existing.previousQuestions.slice(-3), question];
  existing.lastVisitAt = new Date().toISOString();
  existing.intentLevel = score;
  store[key] = existing;
  saveMemoryStore(store);
  renderMemoryCard(existing);
}

function formatRelativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function renderMemoryCard(memory) {
  if (!memoryName || !memoryService || !memoryLastVisit || !memoryIntent) return;
  const fallback = {
    name: "Returning visitor",
    serviceInterest: "General service inquiry",
    lastVisitAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    intentLevel: "high",
  };
  const data = memory || fallback;
  memoryName.textContent = data.name;
  memoryService.textContent = data.serviceInterest;
  memoryLastVisit.textContent = formatRelativeTime(data.lastVisitAt);
  memoryIntent.textContent = data.intentLevel.toUpperCase();
}

function applyPreset() {
  const preset = PRESETS[demoState.category];
  if (!preset) return;

  updateBusinessTitle();
  renderQuickActions();
  resetConversation();
}

function renderModeSupport() {
  if (!modeBenefitsTitle || !modeBenefitsList) return;

  if (demoState.mode === "booking") {
    modeBenefitsTitle.textContent = "For booking-first businesses";
    modeBenefitsList.innerHTML = `
      <li>Captures questions before a customer leaves</li>
      <li>Guides visitors to the right booking action</li>
      <li>Escalates special requests to the owner</li>
      <li>Setup: add business details and booking link</li>
    `;
    if (memorySnapshot) memorySnapshot.hidden = true;
    if (visitorNameRow) visitorNameRow.hidden = true;
    if (leadRescueCard) leadRescueCard.hidden = false;
  } else {
    modeBenefitsTitle.textContent = "Website Business Support";
    modeBenefitsList.innerHTML = `
      <li>Captures leads while visitors browse services</li>
      <li>Handles questions outside business hours</li>
      <li>Escalates high-intent conversations quickly</li>
    `;
    if (memorySnapshot) memorySnapshot.hidden = false;
    if (visitorNameRow) visitorNameRow.hidden = false;
    if (leadRescueCard) leadRescueCard.hidden = true;
  }
}

function detectIntent(question) {
  const lower = question.toLowerCase();
  if (genericKeywords.urgent.some((word) => lower.includes(word))) return "urgent";
  if (genericKeywords.booking.some((word) => lower.includes(word))) return "booking";
  if (genericKeywords.pricing.some((word) => lower.includes(word))) return "pricing";
  if (genericKeywords.hours.some((word) => lower.includes(word))) return "hours";
  if (genericKeywords.location.some((word) => lower.includes(word))) return "location";
  if (genericKeywords.contact.some((word) => lower.includes(word))) return "contact";
  return "fallback";
}

function renderCallbackForm() {
  if (!demoMessages) return;

  const wrapper = document.createElement("div");
  wrapper.className = "message bot";
  wrapper.innerHTML = `
    <div class="callback-form">
      <input type="text" id="cbName" placeholder="Name" />
      <input type="tel" id="cbPhone" placeholder="Phone number" />
      <textarea id="cbMessage" rows="2" placeholder="Tell us what you need"></textarea>
      <button type="button" id="cbSubmit">Submit callback request</button>
    </div>
  `;
  demoMessages.appendChild(wrapper);
  demoMessages.scrollTop = demoMessages.scrollHeight;

  const submit = wrapper.querySelector("#cbSubmit");
  submit.addEventListener("click", () => {
    const lead = {
      type: "callback",
      category: demoState.category,
      businessName: getActiveBusinessName(),
      name: wrapper.querySelector("#cbName").value.trim(),
      phone: wrapper.querySelector("#cbPhone").value.trim(),
      message: wrapper.querySelector("#cbMessage").value.trim(),
      createdAt: new Date().toISOString(),
    };
    demoState.leads.push(lead);
    void saveDemoLead(lead);
    addMessage("Thanks. Callback request was captured.");
    wrapper.remove();
  });
}

function renderLeadForm() {
  if (!demoMessages) return;

  const wrapper = document.createElement("div");
  wrapper.className = "message bot";
  wrapper.innerHTML = `
    <div class="callback-form">
      <input type="text" id="leadName" placeholder="Name" />
      <input type="tel" id="leadPhone" placeholder="Phone" />
      <input type="email" id="leadEmail" placeholder="Email" />
      <input type="text" id="leadService" placeholder="Service requested" />
      <input type="text" id="leadTime" placeholder="Preferred appointment time" />
      <button type="button" id="leadSubmit">Submit lead</button>
    </div>
  `;
  demoMessages.appendChild(wrapper);
  demoMessages.scrollTop = demoMessages.scrollHeight;

  const submit = wrapper.querySelector("#leadSubmit");
  submit.addEventListener("click", () => {
    const lead = {
      type: "booking-lead",
      category: demoState.category,
      businessName: getActiveBusinessName(),
      name: wrapper.querySelector("#leadName").value.trim(),
      phone: wrapper.querySelector("#leadPhone").value.trim(),
      email: wrapper.querySelector("#leadEmail").value.trim(),
      service: wrapper.querySelector("#leadService").value.trim(),
      preferredTime: wrapper.querySelector("#leadTime").value.trim(),
      createdAt: new Date().toISOString(),
    };
    demoState.leads.push(lead);
    void saveDemoLead(lead);
    addMessage("Lead captured and queued for follow-up.");
    wrapper.remove();
  });
}

function handleUrgentFlow() {
  addSystemMessage("Urgent intent detected.");

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  if (isMobile) {
    addMessage(`Use one of these now: Call ${demoState.ownerPhone}, Text ${demoState.ownerPhone}, or submit callback form.`);
  } else {
    addMessage("For urgent support, use call now or request immediate callback below.");
  }

  renderCallbackForm();
  if (!demoState.alertsEnabled) {
    addMessage("Owner alerts are currently turned off in setup.");
    return;
  }
  addMessage("I may need to check with the owner for that. Would you like me to notify them?");
  addActionPrompt("Urgent support request", "Urgent intent detected", "high");
}

function escalateToOwner(question, reason = "Visitor requested a real person", score = "high") {
  if (!demoState.alertsEnabled) {
    addMessage("Owner alerts are disabled right now. You can enable them in setup.");
    return;
  }
  const recommendation = `${getAlertModeLabel(demoState.alertMode)} with booking or callback options`;
  const record = createEscalationRecord(question, reason, recommendation, score);
  addMessage("I shared this with the owner and included a short summary.");
  addSystemMessage(`Owner alert queued -> ${record.ownerPhone} (${record.alertMode.toUpperCase()})`);
}

async function simulateResponse(question) {
  try {
    const result = await fetchChatReply(question);
    updateLeadScore(result.score || "medium");
    upsertVisitorMemory(question, result.intent || "fallback");

    if (result.systemMessage) addSystemMessage(result.systemMessage);
    (result.messages || []).forEach((message) => addMessage(message));

    if (result.showCallbackForm) renderCallbackForm();
    if (result.showLeadForm) renderLeadForm();

    if (result.shouldEscalate) {
      escalateToOwner(question, result.escalationReason || "Visitor requested human support", result.score || "high");
      return;
    }

    if (result.actionPrompt) {
      addActionPrompt(
        result.actionPrompt.question || question,
        result.actionPrompt.reason || "Owner follow-up suggested",
        result.actionPrompt.score || result.score || "medium"
      );
    }
  } catch (error) {
    console.error(error);
    addMessage("I ran into a server issue just now. Please try again.");
  }
}

function processQuestion(question) {
  addMessage(question, "user");
  if (demoTyping) demoTyping.hidden = false;
  window.setTimeout(async () => {
    if (demoTyping) demoTyping.hidden = true;
    await simulateResponse(question);
  }, 360);
}

function wireQuickChips(container) {
  if (!container) return;
  container.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const question = target.dataset.question || target.textContent.trim();
    if (!question) return;
    processQuestion(question);
  });
}


async function saveDemoLead(lead) {
  try {
    await fetch("/api/demo-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
  } catch (error) {
    console.warn("Unable to save demo lead.", error);
  }
}

async function fetchChatReply(question) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: question,
      category: demoState.category,
      businessName: getActiveBusinessName(),
      mode: demoState.mode,
      bookingLink: bookingLinkInput?.value?.trim() || "",
      ownerPhone: demoState.ownerPhone || ownerPhoneInput?.value?.trim() || "",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Unable to process chat request.");
  }
  return data;
}

let stripeConfigPromise;

function getCheckoutErrorNode() {
  let node = document.getElementById("checkoutError");
  if (node) return node;

  node = document.createElement("p");
  node.id = "checkoutError";
  node.className = "checkout-error checkout-floating";
  node.style.display = "none";
  document.body.appendChild(node);
  return node;
}

function showCheckoutError(message) {
  const node = getCheckoutErrorNode();
  node.textContent = message;
  node.style.display = message ? "block" : "none";
}

function setCheckoutLoading(button, loading) {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = "Starting checkout...";
    button.classList.add("checkout-loading");
    button.setAttribute("aria-disabled", "true");
    button.style.pointerEvents = "none";
  } else {
    if (button.dataset.originalText) button.textContent = button.dataset.originalText;
    button.classList.remove("checkout-loading");
    button.removeAttribute("aria-disabled");
    button.style.pointerEvents = "";
  }
}

async function loadStripeJs() {
  if (window.Stripe) return;

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Unable to load Stripe.js"));
    document.head.appendChild(script);
  });
}

async function getStripeConfig() {
  if (!stripeConfigPromise) {
    stripeConfigPromise = fetch("/api/config").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load checkout config.");
      return data;
    });
  }
  return stripeConfigPromise;
}

async function startCheckout(plan, source) {
  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, source }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to create checkout session.");
  return data.sessionId;
}

async function handleCheckoutClick(event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;

  event.preventDefault();
  showCheckoutError("");

  const plan = target.dataset.checkoutPlan;
  const source = target.dataset.checkoutSource || window.location.pathname;

  if (!plan) {
    showCheckoutError("Missing plan selection.");
    return;
  }

  try {
    setCheckoutLoading(target, true);
    await loadStripeJs();

    const config = await getStripeConfig();
    if (!config.publishableKey) {
      throw new Error("Missing Stripe publishable key. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env");
    }

    const stripe = window.Stripe(config.publishableKey);
    const sessionId = await startCheckout(plan, source);
    const result = await stripe.redirectToCheckout({ sessionId });
    if (result?.error) throw new Error(result.error.message || "Checkout redirect failed.");
  } catch (error) {
    showCheckoutError(error.message || "Unable to start checkout.");
    setCheckoutLoading(target, false);
  }
}

function initCheckoutButtons() {
  const checkoutButtons = document.querySelectorAll("[data-checkout-plan]");
  checkoutButtons.forEach((button) => {
    button.addEventListener("click", handleCheckoutClick);
  });
}

function initShowcaseTabs() {
  const tabs = Array.from(document.querySelectorAll(".showcase-tab"));
  const panels = Array.from(document.querySelectorAll(".showcase-panel"));
  if (!tabs.length || !panels.length) return;

  const activate = (targetTab) => {
    const tabKey = targetTab.dataset.tab;
    tabs.forEach((tab) => {
      const active = tab === targetTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.setAttribute("tabindex", active ? "0" : "-1");
    });

    panels.forEach((panel) => {
      const active = panel.dataset.panel === tabKey;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab));
    tab.addEventListener("keydown", (event) => {
      const currentIndex = tabs.indexOf(tab);
      if (event.key === "ArrowRight") {
        event.preventDefault();
        const next = tabs[(currentIndex + 1) % tabs.length];
        next.focus();
        activate(next);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const prev = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
        prev.focus();
        activate(prev);
      }
    });
  });
}

function initWaitlistForms() {
  const waitlistForm = document.getElementById("waitlistForm");
  const waitlistSuccess = document.getElementById("waitlistSuccess");
  const waitlistError = document.getElementById("waitlistError");
  const referralForm = document.getElementById("referralForm");
  const referralSuccess = document.getElementById("referralSuccess");
  const referralError = document.getElementById("referralError");
  const waitlistState = { isSubmitting: false, isSuccess: false, isError: false };
  const referralState = { isSubmitting: false, isSuccess: false, isError: false };

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const readApiResponse = async (response, fallbackMessage) => {
    const raw = await response.text();
    const rawLower = raw.toLowerCase();
    const bodyHasOkTrue =
      rawLower.includes('"ok":true') ||
      rawLower.includes('"ok": true') ||
      rawLower.trim() === "success";

    try {
      const parsed = JSON.parse(raw);
      const parsedOk = parsed && parsed.ok === true;
      return {
        ok: response.status === 200 || parsedOk || bodyHasOkTrue,
        error: parsed?.error || "",
        message: parsed?.message || fallbackMessage,
      };
    } catch {
      const looksLikeGoogleDriveHtml =
        rawLower.includes("<!doctype html") ||
        rawLower.includes("<html") ||
        rawLower.includes("google drive") ||
        rawLower.includes("page not found") ||
        rawLower.includes("unable to open the file at this time");
      if (looksLikeGoogleDriveHtml) {
        throw new Error("Wrong Apps Script endpoint or deployment access issue");
      }

      if (response.status === 200 || bodyHasOkTrue) {
        return {
          ok: true,
          error: "",
          message: fallbackMessage,
        };
      }

      throw new Error("Please try again.");
    }
  };

  const postToLocalApi = async (apiEndpoint, payload, successMessage, logLabel) => {
    console.log(`[${logLabel}] Endpoint URL:`, apiEndpoint);
    console.log(`[${logLabel}] Payload:`, payload);

    let response;
    try {
      response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.log(`[${logLabel}] Fetch error object:`, error);
      throw error;
    }

    const responseText = await response.clone().text();
    console.log(`[${logLabel}] Response status:`, response.status);
    console.log(`[${logLabel}] Response text:`, responseText);

    return readApiResponse(response, successMessage);
  };

  const setLoading = (button, isLoading, loadingText) => {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
      button.disabled = true;
      button.classList.add("checkout-loading");
    } else {
      if (button.dataset.originalText) button.textContent = button.dataset.originalText;
      button.disabled = false;
      button.classList.remove("checkout-loading");
    }
  };

  const applyFormState = (state, successEl, errorEl, next) => {
    state.isSubmitting = Boolean(next.isSubmitting);
    state.isSuccess = Boolean(next.isSuccess);
    state.isError = Boolean(next.isError);

    if (successEl) {
      successEl.textContent = next.successText || "";
      successEl.hidden = !state.isSuccess;
    }
    if (errorEl) {
      errorEl.textContent = next.errorText || "";
      errorEl.hidden = !state.isError;
    }
  };

  if (waitlistForm && waitlistSuccess && waitlistError) {
    waitlistForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (waitlistState.isSubmitting) return;

      const submitBtn = waitlistForm.querySelector('button[type="submit"]');
      applyFormState(waitlistState, waitlistSuccess, waitlistError, {
        isSubmitting: true,
        isSuccess: false,
        isError: false,
      });
      setLoading(submitBtn, true, "Joining...");

      const nameInput = waitlistForm.querySelector('input[name="name"]');
      const emailInput = waitlistForm.querySelector('input[name="email"]');
      const businessInput = waitlistForm.querySelector('input[name="business"]');
      const businessTypeInput = waitlistForm.querySelector('select[name="businessType"]');
      const websiteInput = waitlistForm.querySelector('input[name="website"]');

      const name = String(nameInput?.value || "").trim();
      const email = String(emailInput?.value || "").trim();
      const business = String(businessInput?.value || "").trim();
      const businessType = String(businessTypeInput?.value || "").trim();
      const website = String(websiteInput?.value || "").trim();

      console.log("[Waitlist Debug] Selected input elements:", {
        nameInput,
        emailInput,
        businessInput,
        businessTypeInput,
        websiteInput,
      });
      console.log("[Waitlist Debug] Resolved form values:", {
        name,
        email,
        business,
        businessType,
        website,
      });

      if (!name || !email || !business || !businessType) {
        applyFormState(waitlistState, waitlistSuccess, waitlistError, {
          isSubmitting: false,
          isSuccess: false,
          isError: true,
          errorText: "Please complete all required fields.",
        });
        setLoading(submitBtn, false, "Joining...");
        return;
      }
      if (!isValidEmail(email)) {
        applyFormState(waitlistState, waitlistSuccess, waitlistError, {
          isSubmitting: false,
          isSuccess: false,
          isError: true,
          errorText: "Please enter a valid email address.",
        });
        setLoading(submitBtn, false, "Joining...");
        return;
      }

      try {
        const waitlistPayload = {
          name,
          email,
          business,
          businessType,
          website,
          source: "Waitlist",
        };
        console.log("[Waitlist Debug] Payload:", waitlistPayload);
        const data = await postToLocalApi(
          "/api/waitlist",
          waitlistPayload,
          "You're on the list. We'll keep you updated.",
          "Waitlist Debug"
        );
        if (!data.ok) throw new Error(data.error || "Please try again.");

        applyFormState(waitlistState, waitlistSuccess, waitlistError, {
          isSubmitting: false,
          isSuccess: true,
          isError: false,
          successText: data.message || "You're on the list. We'll keep you updated.",
        });
        waitlistForm.reset();
      } catch (error) {
        applyFormState(waitlistState, waitlistSuccess, waitlistError, {
          isSubmitting: false,
          isSuccess: false,
          isError: true,
          errorText: error.message === "Failed to fetch" ? "Unable to connect. Make sure the AskVeyza server is running." : (error.message || "Please try again."),
        });
      } finally {
        setLoading(submitBtn, false, "Joining...");
      }
    });
  }

  if (referralForm && referralSuccess && referralError) {
    referralForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (referralState.isSubmitting) return;

      const submitBtn = referralForm.querySelector('button[type="submit"]');
      applyFormState(referralState, referralSuccess, referralError, {
        isSubmitting: true,
        isSuccess: false,
        isError: false,
      });
      setLoading(submitBtn, true, "Submitting...");

      const referrerNameInput = referralForm.querySelector('input[name="referrerName"]');
      const referrerEmailInput = referralForm.querySelector('input[name="referrerEmail"]');
      const referredNameInput = referralForm.querySelector('input[name="referredName"]');
      const referredEmailInput = referralForm.querySelector('input[name="referredEmail"]');

      console.log("[Referral Debug] Selected input elements:", {
        referrerNameInput,
        referrerEmailInput,
        referredNameInput,
        referredEmailInput,
      });

      if (!referrerNameInput || !referrerEmailInput || !referredNameInput || !referredEmailInput) {
        applyFormState(referralState, referralSuccess, referralError, {
          isSubmitting: false,
          isSuccess: false,
          isError: true,
          errorText: "Please try again.",
        });
        setLoading(submitBtn, false, "Submitting...");
        return;
      }

      const referrerName = String(referrerNameInput.value || "").trim();
      const referrerEmail = String(referrerEmailInput.value || "").trim();
      const referredName = String(referredNameInput.value || "").trim();
      const referredEmail = String(referredEmailInput.value || "").trim();

      console.log("referral values", {
        referrerName,
        referrerEmail,
        referredName,
        referredEmail,
      });

      if (!referrerName || !referrerEmail || !referredName || !referredEmail) {
        applyFormState(referralState, referralSuccess, referralError, {
          isSubmitting: false,
          isSuccess: false,
          isError: true,
          errorText: "Please complete all referral fields.",
        });
        setLoading(submitBtn, false, "Submitting...");
        return;
      }
      if (!isValidEmail(referrerEmail) || !isValidEmail(referredEmail)) {
        applyFormState(referralState, referralSuccess, referralError, {
          isSubmitting: false,
          isSuccess: false,
          isError: true,
          errorText: "Please enter valid email addresses.",
        });
        setLoading(submitBtn, false, "Submitting...");
        return;
      }

      try {
        const referralPayload = {
          referrerName,
          referrerEmail,
          referredName,
          referredEmail,
          source: "Referral",
        };
        console.log("[Referral Debug] Resolved form values:", {
          referrerName,
          referrerEmail,
          referredName,
          referredEmail,
        });
        const data = await postToLocalApi(
          "/api/referral",
          referralPayload,
          "Thanks! Your referral has been submitted.",
          "Referral Debug"
        );
        if (!data.ok) throw new Error(data.error || "Please try again.");

        applyFormState(referralState, referralSuccess, referralError, {
          isSubmitting: false,
          isSuccess: true,
          isError: false,
          successText: data.message || "Thanks! Your referral has been submitted.",
        });
        referralForm.reset();
      } catch (error) {
        applyFormState(referralState, referralSuccess, referralError, {
          isSubmitting: false,
          isSuccess: false,
          isError: true,
          errorText: error.message === "Failed to fetch" ? "Unable to connect. Make sure the AskVeyza server is running." : (error.message || "Please try again."),
        });
      } finally {
        setLoading(submitBtn, false, "Submitting...");
      }
    });
  }
}

function initDemoModeTabs() {
  if (!demoModeTabs.length) return;
  const activate = (target) => {
    demoState.mode = target.dataset.demoMode || "website";
    demoModeTabs.forEach((tab) => {
      const active = tab === target;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    renderModeSupport();
    renderQuickActions();
    resetConversation();
    if (demoState.mode === "booking" && bookingLinkInput?.value) {
      addMessage(`I can also guide visitors directly to your booking link: ${bookingLinkInput.value}`);
    }
  };

  demoModeTabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab));
  });

  const activeTab = demoModeTabs.find((tab) => tab.classList.contains("active")) || demoModeTabs[0];
  if (activeTab) activate(activeTab);
}

if (demoMessages) {
  if (categorySelect) {
    categorySelect.addEventListener("change", () => {
      demoState.category = categorySelect.value;
      applyPreset();
    });
  }

  if (businessNameInput) {
    businessNameInput.addEventListener("input", () => {
      demoState.businessName = businessNameInput.value.trim();
      updateBusinessTitle();
    });
  }

  if (visitorNameInput) {
    visitorNameInput.addEventListener("input", () => {
      demoState.visitorName = visitorNameInput.value.trim();
      const key = demoState.visitorName.toLowerCase();
      const store = getMemoryStore();
      if (demoState.visitorName && store[key]) {
        const prior = store[key];
        renderMemoryCard(prior);
        addMessage(
          `Welcome back! Last time you asked about ${prior.serviceInterest}. Would you like details again or to book now?`
        );
      } else {
        renderMemoryCard(null);
      }
    });
  }

  if (brandColorInput) {
    brandColorInput.addEventListener("input", () => {
      demoState.color = brandColorInput.value;
      updateDemoColor(demoState.color);
    });
  }

  if (ownerPhoneInput) {
    ownerPhoneInput.addEventListener("input", () => {
      demoState.ownerPhone = ownerPhoneInput.value.trim();
    });
  }

  if (alertModeSelect) {
    alertModeSelect.addEventListener("change", () => {
      demoState.alertMode = alertModeSelect.value;
    });
  }

  if (ownerAlertsToggle) {
    ownerAlertsToggle.addEventListener("change", () => {
      demoState.alertsEnabled = ownerAlertsToggle.checked;
    });
  }

  if (demoForm && demoInput) {
    demoForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const question = demoInput.value.trim();
      if (!question) return;
      demoInput.value = "";
      processQuestion(question);
    });
  }

  wireQuickChips(demoQuickBar);

  if (sendOwnerQuestionBtn && ownerQuestionInput) {
    sendOwnerQuestionBtn.addEventListener("click", () => {
      const question = ownerQuestionInput.value.trim();
      if (!question) {
        if (ownerSendStatus) ownerSendStatus.textContent = "Add a question before sending.";
        return;
      }
      addMessage(question, "user");
      escalateToOwner(question, "Manual escalation requested by visitor", "high");
      ownerQuestionInput.value = "";
      if (ownerSendStatus) ownerSendStatus.textContent = "Sent. The owner can follow up by text or call.";
    });
  }

  updateDemoColor(demoState.color);
  updateBusinessTitle();
  renderMemoryCard(null);
  updateLeadScore("high");
  renderModeSupport();
  applyPreset();
}

initCheckoutButtons();
initShowcaseTabs();
initDemoModeTabs();
initWaitlistForms();


// Premium homepage scroll reveal + free scan demo
const revealEls = document.querySelectorAll(".reveal");
if (revealEls.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.15 }
  );

  revealEls.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index * 45, 260)}ms`;
    observer.observe(el);
  });
}

const scanForm = document.querySelector(".scan-form");
if (scanForm) {
  scanForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = scanForm.querySelector("input");
    const value = input?.value?.trim();

    if (!value) {
      alert("Add your website URL first.");
      return;
    }

    
    let scanUrl = value;
    if (!/^https?:\/\//i.test(scanUrl)) {
      scanUrl = "https://" + scanUrl;
    }
    window.location.href = "scanner-report.html?url=" + encodeURIComponent(scanUrl);
  });
}
