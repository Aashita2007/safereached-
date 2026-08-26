// ==========================================
// SAFEREACHED CLIENT APPLICATION ENGINE
// ==========================================

let currentUser = null;
let userToken = localStorage.getItem("safereached_token") || null;
let currentCoords = { lat: 28.6139, lon: 77.2090 }; // Default center (New Delhi)
let userHasGPS = false;

// API Base URL (handles VS Code Live Server on 5500/5501, direct file://, and http:// server routing)
const API_BASE = (
  window.location.protocol === 'file:' || 
  window.location.port === '5500' || 
  window.location.port === '5501' || 
  window.location.hostname === '127.0.0.1' || 
  !window.location.origin || 
  window.location.origin === 'null'
) ? 'http://localhost:8000/api' : '/api';

// Maps & Markers
let locationMap = null;
let locationMarker = null;
let nearbyMap = null;
let nearbyMarkersGroup = null;

// Countdown State
let sosCountdownTimer = null;
let sosCountdownSeconds = 5;

// Contacts State
let emergencyContactsList = [];
let activeNearbyCategory = "hospitals";

let currentTheme = localStorage.getItem("safereached_theme") || "light";

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  if (userToken) {
    fetchUserProfile();
  } else {
    showAuthView();
  }

  // Render static data views
  renderHelplines();
  renderSafetyTips();
});

function initTheme() {
  setTheme(currentTheme);
}

function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem("safereached_theme", theme);
  document.documentElement.setAttribute("data-theme", theme);

  const btn = document.getElementById("theme-toggle-btn");
  const label = document.getElementById("current-theme-label");
  const cardLight = document.getElementById("theme-card-light");
  const cardDark = document.getElementById("theme-card-dark");

  if (theme === "dark") {
    if (btn) btn.textContent = "☀️ Light Mode";
    if (label) label.textContent = "Dark Mode (Night Vision)";
    if (cardDark) cardDark.style.borderColor = "var(--color-sage)";
    if (cardLight) cardLight.style.borderColor = "var(--border-light)";
  } else {
    if (btn) btn.textContent = "🌙 Dark Mode";
    if (label) label.textContent = "Light Mode (Parchment)";
    if (cardLight) cardLight.style.borderColor = "var(--color-deep-sage)";
    if (cardDark) cardDark.style.borderColor = "var(--border-light)";
  }
}

function toggleTheme() {
  setTheme(currentTheme === "dark" ? "light" : "dark");
}

// ==========================================
// 1. AUTHENTICATION & NAVIGATION
// ==========================================
function showAuthView() {
  document.getElementById("auth-view").style.display = "flex";
  document.getElementById("app-view").style.display = "none";
}

function showAppView() {
  document.getElementById("auth-view").style.display = "none";
  document.getElementById("app-view").style.display = "flex";

  // Update UI user badges
  if (currentUser) {
    document.getElementById("user-display-name").textContent = currentUser.name;
    document.getElementById("dash-welcome-name").textContent = currentUser.name;
    
    // User Avatar (emoji, custom image URL, or initial letter)
    const avatarEl = document.getElementById("user-avatar");
    const avatarPrev = document.getElementById("profile-avatar-preview");
    if (currentUser.avatar_url && currentUser.avatar_url.startsWith("http")) {
      avatarEl.innerHTML = `<img src="${currentUser.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      if (avatarPrev) avatarPrev.innerHTML = `<img src="${currentUser.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      const icon = currentUser.avatar_url || currentUser.name.charAt(0).toUpperCase();
      avatarEl.textContent = icon;
      if (avatarPrev) avatarPrev.textContent = icon;
    }

    // Settings profile details
    if (document.getElementById("sett-name-input")) document.getElementById("sett-name-input").value = currentUser.name;
    if (document.getElementById("sett-email-input")) document.getElementById("sett-email-input").value = currentUser.email;
    if (document.getElementById("sett-phone-input")) document.getElementById("sett-phone-input").value = currentUser.phone;
    if (document.getElementById("sett-avatar-input")) document.getElementById("sett-avatar-input").value = currentUser.avatar_url || "";
    if (document.getElementById("sett-name-heading")) document.getElementById("sett-name-heading").textContent = currentUser.name;

    // Custom SOS message
    if (currentUser.custom_sos_message) {
      document.getElementById("custom-sos-text").value = currentUser.custom_sos_message;
    }
  }

  // Detect GPS & Load Module
  acquireUserGPSLocation(() => {
    loadContacts();
    loadMedicalProfile();
    loadSOSHistory();
    navigateToModule("dashboard");
  });
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById("login-form");
  const regForm = document.getElementById("register-form");
  const loginBtn = document.getElementById("tab-login-btn");
  const regBtn = document.getElementById("tab-register-btn");
  const alertBox = document.getElementById("auth-alert");

  alertBox.style.display = "none";

  if (tab === "login") {
    loginForm.style.display = "block";
    regForm.style.display = "none";
    loginBtn.classList.add("active");
    regBtn.classList.remove("active");
  } else {
    loginForm.style.display = "none";
    regForm.style.display = "block";
    loginBtn.classList.remove("active");
    regBtn.classList.add("active");
  }
}

function showAuthAlert(msg, type = "error") {
  const alertBox = document.getElementById("auth-alert");
  alertBox.textContent = msg;
  alertBox.className = `alert-box alert-${type}`;
  alertBox.style.display = "flex";
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirmPassword = document.getElementById("reg-confirm-password").value;

  if (password !== confirmPassword) {
    showAuthAlert("Passwords do not match.", "error");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password, confirm_password: confirmPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      // Display explicit error message requirement (e.g. "This email is already registered.")
      showAuthAlert(data.detail || "Registration failed. Please try again.", "error");
      return;
    }

    userToken = data.access_token;
    localStorage.setItem("safereached_token", userToken);
    currentUser = data.user;
    showAppView();
  } catch (err) {
    showAuthAlert("Network connection failure. Please check server.", "error");
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      showAuthAlert(data.detail || "Invalid email or password.", "error");
      return;
    }

    userToken = data.access_token;
    localStorage.setItem("safereached_token", userToken);
    currentUser = data.user;
    showAppView();
  } catch (err) {
    showAuthAlert("Network error occurred during login.", "error");
  }
}

async function fetchUserProfile() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    if (res.ok) {
      currentUser = await res.json();
      showAppView();
    } else {
      handleLogout();
    }
  } catch (err) {
    showAuthView();
  }
}

function handleLogout() {
  userToken = null;
  currentUser = null;
  localStorage.removeItem("safereached_token");
  showAuthView();
}

function navigateToModule(moduleName) {
  // Hide all modules
  document.querySelectorAll(".module-view").forEach(el => el.style.display = "none");
  
  // Show target module
  const target = document.getElementById(`module-${moduleName}`);
  if (target) {
    target.style.display = "block";
  }

  // Highlight navigation item
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-module") === moduleName) {
      item.classList.add("active");
    }
  });

  // Close sidebar on mobile
  document.getElementById("sidebar").classList.remove("open");

  // Module specific initializations
  if (moduleName === "share-location") {
    setTimeout(initLocationMap, 200);
  } else if (moduleName === "nearby-resources") {
    setTimeout(initNearbyMap, 200);
  } else if (moduleName === "weather" || moduleName === "dashboard") {
    loadWeatherDetector();
  }
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// ==========================================
// 2. GPS & LOCATION API
// ==========================================
function acquireUserGPSLocation(callback) {
  const statusEl = document.getElementById("dash-location-status");
  
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentCoords.lat = pos.coords.latitude;
        currentCoords.lon = pos.coords.longitude;
        userHasGPS = true;

        if (statusEl) {
          statusEl.innerHTML = `✅ GPS Active: <strong>Lat ${currentCoords.lat.toFixed(4)}, Lon ${currentCoords.lon.toFixed(4)}</strong>`;
        }

        updateShareLocationReadouts();
        if (callback) callback();
      },
      (err) => {
        let msg = "Location permission is required to find nearby emergency resources. Please enable location access.";
        if (err.code === err.POSITION_UNAVAILABLE) msg = "GPS signal unavailable. Using city center backup.";
        else if (err.code === err.TIMEOUT) msg = "Location request timed out. Using default position.";

        if (statusEl) {
          statusEl.innerHTML = `⚠️ ${msg}`;
        }
        updateShareLocationReadouts();
        if (callback) callback();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    if (statusEl) statusEl.innerHTML = "⚠️ Geolocation not supported by browser.";
    if (callback) callback();
  }
}

function refreshUserLocation() {
  acquireUserGPSLocation(() => {
    if (locationMap) {
      locationMap.setView([currentCoords.lat, currentCoords.lon], 15);
      if (locationMarker) locationMarker.setLatLng([currentCoords.lat, currentCoords.lon]);
    }
    if (nearbyMap) {
      loadNearbyResources(activeNearbyCategory);
    }
    alert("GPS Location Refreshed Successfully!");
  });
}

function updateShareLocationReadouts() {
  const coordsEl = document.getElementById("loc-coords-readout");
  const linkInput = document.getElementById("share-link-input");
  const mapLink = `https://www.google.com/maps?q=${currentCoords.lat.toFixed(6)},${currentCoords.lon.toFixed(6)}`;

  if (coordsEl) {
    coordsEl.textContent = `Latitude: ${currentCoords.lat.toFixed(6)} | Longitude: ${currentCoords.lon.toFixed(6)}`;
  }
  if (linkInput) {
    linkInput.value = mapLink;
  }
}

function initLocationMap() {
  const mapDiv = document.getElementById("location-map");
  if (!mapDiv) return;

  if (!locationMap) {
    locationMap = L.map('location-map').setView([currentCoords.lat, currentCoords.lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(locationMap);

    locationMarker = L.marker([currentCoords.lat, currentCoords.lon]).addTo(locationMap)
      .bindPopup("<b>Your Current GPS Location</b>").openPopup();
  } else {
    locationMap.invalidateSize();
    locationMap.setView([currentCoords.lat, currentCoords.lon], 15);
    locationMarker.setLatLng([currentCoords.lat, currentCoords.lon]);
  }
}

function copyLocationLink() {
  const linkInput = document.getElementById("share-link-input");
  linkInput.select();
  navigator.clipboard.writeText(linkInput.value);
  alert("Location link copied to clipboard!");
}

function shareViaWhatsApp() {
  const mapLink = document.getElementById("share-link-input").value;
  const text = encodeURIComponent(`🚨 SafeReached Emergency Location Share:\nMy current GPS location is: ${mapLink}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

// ==========================================
// 3. SOS ALERT ENGINE
// ==========================================
function startSOSCountdown() {
  sosCountdownSeconds = 5;
  document.getElementById("countdown-timer").textContent = sosCountdownSeconds;
  document.getElementById("sos-countdown-modal").style.display = "flex";

  sosCountdownTimer = setInterval(() => {
    sosCountdownSeconds--;
    document.getElementById("countdown-timer").textContent = sosCountdownSeconds;

    if (sosCountdownSeconds <= 0) {
      clearInterval(sosCountdownTimer);
      document.getElementById("sos-countdown-modal").style.display = "none";
      executeSOSTrigger();
    }
  }, 1000);
}

function cancelSOSCountdown() {
  if (sosCountdownTimer) {
    clearInterval(sosCountdownTimer);
  }
  document.getElementById("sos-countdown-modal").style.display = "none";
  alert("SOS Alert Cancelled.");
}

async function executeSOSTrigger() {
  try {
    const customMessage = document.getElementById("custom-sos-text").value;
    const res = await fetch(`${API_BASE}/sos/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        latitude: currentCoords.lat,
        longitude: currentCoords.lon,
        custom_message: customMessage
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert(`🚨 SOS ALERT DISPATCHED!\nRecipients: ${data.recipients_count} contacts\nStatus: ${data.status}`);
      loadSOSHistory();
    } else {
      alert("Failed to trigger SOS: " + (data.detail || "Server Error"));
    }
  } catch (err) {
    alert("Network error triggering SOS alert.");
  }
}

async function loadContacts() {
  try {
    const res = await fetch(`${API_BASE}/contacts`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    if (res.ok) {
      emergencyContactsList = await res.json();
      renderDashboardContacts();
      renderSOSModuleContacts();
    }
  } catch (err) {}
}

function renderDashboardContacts() {
  const container = document.getElementById("dash-contacts-list");
  if (!container) return;

  if (emergencyContactsList.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No emergency contacts added yet. Click below to add trusted family or friends.</p>`;
    return;
  }

  container.innerHTML = emergencyContactsList.map(c => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid var(--border-light);">
      <div>
        <strong>${c.name}</strong> (${c.relationship})
        <div style="font-size: 0.8rem; color: var(--text-muted);">${c.phone}</div>
      </div>
      <span style="font-size: 0.8rem; padding: 0.2rem 0.5rem; border-radius: 10px; background: ${c.sos_enabled ? '#EAFAF1' : '#FADBD8'}; color: ${c.sos_enabled ? '#27AE60' : '#C0392B'};">
        ${c.sos_enabled ? 'SOS Active' : 'Disabled'}
      </span>
    </div>
  `).join("");
}

function renderSOSModuleContacts() {
  const container = document.getElementById("sos-contacts-container");
  if (!container) return;

  if (emergencyContactsList.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 1.5rem 0;">No contacts configured. Click '+ Add Contact' to set up your safety net.</p>`;
    return;
  }

  container.innerHTML = emergencyContactsList.map(c => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--color-parchment); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
      <div>
        <strong style="font-size: 0.95rem;">${c.name}</strong>
        <span style="font-size: 0.82rem; color: var(--text-muted);">(${c.relationship})</span>
        <div style="font-size: 0.85rem; color: var(--color-charcoal);">${c.phone}</div>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--color-deep-sage);" onclick="deleteContact(${c.id})">Delete</button>
      </div>
    </div>
  `).join("");
}

function openAddContactModal() {
  document.getElementById("modal-contact-name").value = "";
  document.getElementById("modal-contact-phone").value = "";
  document.getElementById("modal-contact-rel").value = "";
  document.getElementById("contact-modal-overlay").style.display = "flex";
}

function closeContactModal() {
  document.getElementById("contact-modal-overlay").style.display = "none";
}

async function handleSaveContactForm(e) {
  e.preventDefault();
  const name = document.getElementById("modal-contact-name").value.trim();
  const phone = document.getElementById("modal-contact-phone").value.trim();
  const relationship = document.getElementById("modal-contact-rel").value.trim();
  const sos_enabled = document.getElementById("modal-contact-enabled").checked;

  try {
    const res = await fetch(`${API_BASE}/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({ name, phone, relationship, sos_enabled })
    });

    if (res.ok) {
      closeContactModal();
      loadContacts();
    } else {
      alert("Failed to save contact.");
    }
  } catch (err) {
    alert("Error connecting to server.");
  }
}

async function deleteContact(contactId) {
  if (!confirm("Are you sure you want to remove this emergency contact?")) return;

  try {
    const res = await fetch(`${API_BASE}/contacts/${contactId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    if (res.ok) {
      loadContacts();
    }
  } catch (err) {}
}

async function handleSaveCustomMessage(e) {
  e.preventDefault();
  const msg = document.getElementById("custom-sos-text").value.trim();

  try {
    const res = await fetch(`${API_BASE}/sos/message`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({ custom_message: msg })
    });

    if (res.ok) {
      alert("Custom SOS message updated!");
    }
  } catch (err) {}
}

async function loadSOSHistory() {
  try {
    const res = await fetch(`${API_BASE}/sos/history`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    if (res.ok) {
      const history = await res.json();
      const container = document.getElementById("sos-history-list");
      if (!container) return;

      if (history.length === 0) {
        container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">No SOS alerts triggered yet.</p>`;
        return;
      }

      container.innerHTML = history.map(item => `
        <div style="font-size: 0.82rem; padding: 0.5rem; background: var(--color-parchment); border-radius: 6px; margin-bottom: 0.4rem;">
          <div style="font-weight: 700; color: var(--color-sos-red);">ALERT DISPATCHED (${new Date(item.timestamp).toLocaleString()})</div>
          <div>Recipients: ${item.recipients_count} | Status: ${item.status}</div>
        </div>
      `).join("");
    }
  } catch (err) {}
}

// ==========================================
// 4. NEARBY EMERGENCY RESOURCES MODULE
// ==========================================
function filterNearbyCategory(category, btnEl) {
  activeNearbyCategory = category;
  document.querySelectorAll(".category-pill").forEach(el => el.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");

  loadNearbyResources(category);
}

function initNearbyMap() {
  const mapDiv = document.getElementById("nearby-map");
  if (!mapDiv) return;

  if (!nearbyMap) {
    nearbyMap = L.map('nearby-map').setView([currentCoords.lat, currentCoords.lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(nearbyMap);

    nearbyMarkersGroup = L.layerGroup().addTo(nearbyMap);
    loadNearbyResources(activeNearbyCategory);
  } else {
    nearbyMap.invalidateSize();
    nearbyMap.setView([currentCoords.lat, currentCoords.lon], 13);
    loadNearbyResources(activeNearbyCategory);
  }
}

async function loadNearbyResources(category) {
  const container = document.getElementById("nearby-results-list");
  if (container) {
    container.innerHTML = `<p style="text-align: center; padding: 2rem; color: var(--text-muted);">🔍 Searching nearby 5 km radius for ${category}...</p>`;
  }

  try {
    const res = await fetch(`${API_BASE}/nearby?lat=${currentCoords.lat}&lon=${currentCoords.lon}&category=${category}&radius=5.0`);
    if (!res.ok) throw new Error("Failed to fetch");

    const data = await res.json();
    renderNearbyResults(data.resources);
  } catch (err) {
    if (container) {
      container.innerHTML = `<p style="color: var(--color-sos-red); text-align: center;">Unable to load nearby resources. Please check your network connection.</p>`;
    }
  }
}

function renderNearbyResults(resources) {
  const container = document.getElementById("nearby-results-list");
  if (!container) return;

  // Clear existing map pins
  if (nearbyMarkersGroup) {
    nearbyMarkersGroup.clearLayers();
    // Add user marker
    L.marker([currentCoords.lat, currentCoords.lon])
      .bindPopup("<b>📍 Your Current Location</b>")
      .addTo(nearbyMarkersGroup);
  }

  if (resources.length === 0) {
    container.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--text-muted);">No resources found within 5 km.</p>`;
    return;
  }

  container.innerHTML = resources.map(r => {
    // Add pin to map
    if (nearbyMarkersGroup) {
      const pin = L.marker([r.lat, r.lon]).addTo(nearbyMarkersGroup);
      pin.bindPopup(`<b>${r.name}</b><br>${r.address}<br>Dist: ${r.distance_km} km`);
    }

    const mapsDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}`;

    return `
      <div class="card" style="margin-bottom: 1rem; padding: 1.1rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h4 style="font-size: 1.05rem; color: var(--color-charcoal);">${r.name}</h4>
            <div style="font-size: 0.85rem; color: var(--color-deep-sage); font-weight: 600;">${r.category_label} • ${r.distance_km} km away</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.3rem;">📍 ${r.address}</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">📞 ${r.phone}</div>
          </div>
          <a href="${mapsDirUrl}" target="_blank" class="btn-primary" style="width: auto; padding: 0.45rem 0.85rem; font-size: 0.82rem; background: var(--color-deep-sage);">
            🗺️ Directions
          </a>
        </div>
      </div>
    `;
  }).join("");
}

function refreshNearbyResources() {
  loadNearbyResources(activeNearbyCategory);
}

// ==========================================
// 5. HELPLINES MODULE
// ==========================================
function renderHelplines() {
  const container = document.getElementById("helplines-grid");
  if (!container || typeof HELPLINES_DATA === "undefined") return;

  container.innerHTML = HELPLINES_DATA.map(h => `
    <div class="helpline-card">
      <div>
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--color-deep-sage); text-transform: uppercase;">${h.category}</div>
        <h4 style="font-size: 1.1rem; margin: 0.2rem 0;">${h.service}</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 320px;">${h.desc}</p>
      </div>
      <div style="text-align: right;">
        <div class="helpline-number">${h.number}</div>
        <a href="tel:${h.number}" class="btn-call" style="margin-top: 0.4rem;">📞 Call Now</a>
      </div>
    </div>
  `).join("");
}

function filterHelplines() {
  const query = document.getElementById("helpline-search-input").value.toLowerCase();
  const container = document.getElementById("helplines-grid");
  if (!container || typeof HELPLINES_DATA === "undefined") return;

  const filtered = HELPLINES_DATA.filter(h => 
    h.service.toLowerCase().includes(query) || 
    h.category.toLowerCase().includes(query) || 
    h.number.includes(query)
  );

  container.innerHTML = filtered.map(h => `
    <div class="helpline-card">
      <div>
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--color-deep-sage); text-transform: uppercase;">${h.category}</div>
        <h4 style="font-size: 1.1rem; margin: 0.2rem 0;">${h.service}</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 320px;">${h.desc}</p>
      </div>
      <div style="text-align: right;">
        <div class="helpline-number">${h.number}</div>
        <a href="tel:${h.number}" class="btn-call" style="margin-top: 0.4rem;">📞 Call Now</a>
      </div>
    </div>
  `).join("");
}

// ==========================================
// 6. EMERGENCY MEDICAL PROFILE MODULE
// ==========================================
async function loadMedicalProfile() {
  try {
    const res = await fetch(`${API_BASE}/medical`, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      document.getElementById("med-full-name").value = data.full_name || "";
      document.getElementById("med-age-dob").value = data.age_dob || "";
      document.getElementById("med-blood-group").value = data.blood_group || "";
      document.getElementById("med-allergies").value = data.allergies || "";
      document.getElementById("med-conditions").value = data.conditions || "";
      document.getElementById("med-medications").value = data.medications || "";
      document.getElementById("med-emergency-contact").value = data.emergency_contact || "";
      document.getElementById("med-doctor-info").value = data.doctor_hospital_info || "";
      document.getElementById("med-notes").value = data.medical_notes || "";
    }
  } catch (err) {}
}

async function handleSaveMedicalProfile(e) {
  e.preventDefault();
  const payload = {
    full_name: document.getElementById("med-full-name").value,
    age_dob: document.getElementById("med-age-dob").value,
    blood_group: document.getElementById("med-blood-group").value,
    allergies: document.getElementById("med-allergies").value,
    conditions: document.getElementById("med-conditions").value,
    medications: document.getElementById("med-medications").value,
    emergency_contact: document.getElementById("med-emergency-contact").value,
    doctor_hospital_info: document.getElementById("med-doctor-info").value,
    medical_notes: document.getElementById("med-notes").value
  };

  try {
    const res = await fetch(`${API_BASE}/medical`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("Emergency Medical Profile saved successfully!");
    } else {
      alert("Failed to save profile.");
    }
  } catch (err) {
    alert("Network error.");
  }
}

function openShareMedicalModal() {
  document.getElementById("share-medical-modal").style.display = "flex";
}

function closeShareMedicalModal() {
  document.getElementById("share-medical-modal").style.display = "none";
}

async function handleExecuteMedicalShare(e) {
  e.preventDefault();
  const hospitalName = document.getElementById("share-hospital-select").value;
  const consentChecked = document.getElementById("medical-consent-check").checked;

  if (!consentChecked) {
    alert("Consent is required to proceed with sharing.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/medical/share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        hospital_name: hospitalName,
        user_consent: true
      })
    });

    const data = await res.json();
    if (res.ok) {
      closeShareMedicalModal();
      alert(`✅ ${data.message}`);
    } else {
      alert("Error: " + (data.detail || "Unable to share profile"));
    }
  } catch (err) {
    alert("Network error sharing profile.");
  }
}

// ==========================================
// 7. SAFETY TIPS MODULE
// ==========================================
function renderSafetyTips() {
  const container = document.getElementById("safety-tips-container");
  if (!container || typeof SAFETY_TIPS_DATA === "undefined") return;

  container.innerHTML = SAFETY_TIPS_DATA.map((cat, idx) => `
    <div class="card" style="margin-bottom: 1.5rem;">
      <h3 style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem;">
        <span>${cat.icon}</span> <span>${cat.category}</span>
      </h3>
      <div class="grid-2">
        ${cat.tips.map(tip => `
          <div style="background: var(--color-parchment); padding: 1rem; border-radius: var(--radius-sm);">
            <h4 style="font-size: 0.95rem; margin-bottom: 0.4rem; color: var(--color-charcoal);">${tip.title}</h4>
            <p style="font-size: 0.88rem; color: var(--text-muted);">${tip.desc}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

// ==========================================
// 8. SETTINGS & PASSWORD CHANGE
// ==========================================
async function handleChangePassword(e) {
  e.preventDefault();
  const old_password = document.getElementById("sett-old-pwd").value;
  const new_password = document.getElementById("sett-new-pwd").value;

  try {
    const res = await fetch(`${API_BASE}/user/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({ old_password, new_password })
    });

    const data = await res.json();
    if (res.ok) {
      alert("Password updated successfully!");
      document.getElementById("sett-old-pwd").value = "";
      document.getElementById("sett-new-pwd").value = "";
    } else {
      alert(data.detail || "Failed to update password.");
    }
  } catch (err) {
    alert("Network error updating password.");
  }
}

// ==========================================
// 9. WEATHER SAFETY DETECTOR & AI CHATBOT
// ==========================================
async function loadWeatherDetector() {
  try {
    const lat = (currentCoords && currentCoords.lat != null) ? currentCoords.lat : 28.6139;
    const lon = (currentCoords && currentCoords.lon != null) ? currentCoords.lon : 77.2090;
    const res = await fetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}`);
    if (!res.ok) return;

    const data = await res.json();
    
    // Dashboard summary widget
    const dIcon = document.getElementById("dash-w-icon");
    const dTemp = document.getElementById("dash-w-temp");
    const dCond = document.getElementById("dash-w-cond");
    const dRain = document.getElementById("dash-w-rain");
    const dHumid = document.getElementById("dash-w-humid");
    const dUv = document.getElementById("dash-w-uv");
    const dMsg = document.getElementById("dash-w-msg");

    if (dIcon) dIcon.textContent = data.icon || "⛅";
    if (dTemp) dTemp.textContent = `${data.temperature}°C`;
    if (dCond) dCond.textContent = data.condition || "Fair";
    if (dRain) dRain.textContent = `${data.rain_probability}%`;
    if (dHumid) dHumid.textContent = `${data.humidity}%`;
    if (dUv) dUv.textContent = `${data.uv_index} (${data.uv_level})`;
    if (dMsg) dMsg.textContent = data.safety_advisory;

    // Full Weather module page
    const fIcon = document.getElementById("full-w-icon");
    const fTemp = document.getElementById("full-w-temp");
    const fCond = document.getElementById("full-w-cond");
    const fRain = document.getElementById("full-w-rain");
    const fRainBar = document.getElementById("full-w-rain-bar");
    const fHumid = document.getElementById("full-w-humid");
    const fUvVal = document.getElementById("full-w-uv-val");
    const fUvBadge = document.getElementById("full-w-uv-badge");
    const fWind = document.getElementById("full-w-wind");
    const fAdvIcon = document.getElementById("weather-adv-icon");
    const fAdvText = document.getElementById("weather-adv-text");

    if (fIcon) fIcon.textContent = data.icon || "⛅";
    if (fTemp) fTemp.textContent = `${data.temperature}°C`;
    if (fCond) fCond.textContent = data.condition || "Fair";
    if (fRain) fRain.textContent = `${data.rain_probability}%`;
    if (fRainBar) fRainBar.style.width = `${Math.min(data.rain_probability, 100)}%`;
    if (fHumid) fHumid.textContent = `${data.humidity}%`;
    if (fUvVal) fUvVal.textContent = data.uv_index;
    if (fUvBadge) fUvBadge.textContent = `${data.uv_level} Risk`;
    if (fWind) fWind.textContent = `${data.wind_speed_kmh} km/h`;
    if (fAdvIcon) fAdvIcon.textContent = data.icon || "⛅";
    if (fAdvText) fAdvText.textContent = data.safety_advisory;

    renderWeatherSafetyPrecautions(data);

  } catch (err) {}
}

function renderWeatherSafetyPrecautions(data) {
  const container = document.getElementById("weather-safety-precautions");
  if (!container) return;

  const precautions = [];

  // Rain / Wet Precautions
  if (data.rain_probability >= 40 || ["Rainy", "Thunderstorm Alert"].includes(data.condition)) {
    precautions.push({
      title: "☔ Wet Surface Driving Precaution",
      desc: "Hydroplaning hazard is elevated. Increase following distance to 4+ seconds and keep windshield defoggers active."
    });
    precautions.push({
      title: "⚡ Lightning & Electrical Safety",
      desc: "Do not stand under isolated trees, metal telephone poles, or high-voltage lines during precipitation."
    });
  }

  // UV Precautions
  if (data.uv_index >= 6.0) {
    precautions.push({
      title: "☀️ High UV Radiation Defense",
      desc: "Wear UV400 protective sunglasses, SPF 30+ broad-spectrum sunscreen, and a wide-brimmed hat."
    });
  }

  // Heat Precautions
  if (data.temperature >= 35.0) {
    precautions.push({
      title: "🔥 Heat Exhaustion Prevention",
      desc: "Drink 500ml water every hour, avoid intense physical activity during peak afternoon hours, and never leave children/pets inside parked cars."
    });
  } else if (data.temperature <= 10.0) {
    precautions.push({
      title: "❄️ Cold Exposure Protection",
      desc: "Layer thermal clothing to trap body heat. Keep windproof outerwear ready when embarking on open travel."
    });
  }

  // Standard Travel Precautions
  precautions.push({
    title: "📱 Emergency Device Power Care",
    desc: "Maintain at least 50% battery charge on your mobile phone and portable power bank for location sharing."
  });

  precautions.push({
    title: "📍 Real-Time GPS Tracking Precaution",
    desc: "Share your live location via SafeReached with family members prior to embarking on journey in adverse weather."
  });

  container.innerHTML = precautions.map(p => `
    <div class="card">
      <h4 style="font-size: 1rem; color: var(--color-charcoal); margin-bottom: 0.4rem;">${p.title}</h4>
      <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.45;">${p.desc}</p>
    </div>
  `).join("");
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const name = document.getElementById("sett-name-input").value.trim();
  const email = document.getElementById("sett-email-input").value.trim();
  const phone = document.getElementById("sett-phone-input").value.trim();
  const avatar_url = document.getElementById("sett-avatar-input").value.trim();

  try {
    const res = await fetch(`${API_BASE}/user/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({ name, email, phone, avatar_url })
    });

    const data = await res.json();
    if (res.ok) {
      currentUser = data;
      showAppView();
      alert("Profile details updated successfully!");
    } else {
      alert(data.detail || "Failed to update profile details.");
    }
  } catch (err) {
    alert("Network error updating profile.");
  }
}

function refreshWeatherDetector() {
  acquireUserGPSLocation(() => {
    loadWeatherDetector();
    alert("Weather Safety Data Refreshed!");
  });
}

// AI CHATBOT ASSISTANT FUNCTIONS
function toggleChatbot() {
  const win = document.getElementById("chatbot-window");
  if (!win) return;
  win.style.display = win.style.display === "none" ? "flex" : "none";
}

function handleSendChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  appendChatMessage(text, "user");
  input.value = "";

  setTimeout(() => {
    const botReply = typeof getBotResponse === "function" ? getBotResponse(text) : "I'm your SafeReached Safety Assistant 🛡️!";
    appendChatMessage(botReply, "bot");
  }, 350);
}

function sendQuickChip(chipText) {
  appendChatMessage(chipText, "user");
  setTimeout(() => {
    const botReply = typeof getBotResponse === "function" ? getBotResponse(chipText) : "How can I assist you further?";
    appendChatMessage(botReply, "bot");
  }, 300);
}

function appendChatMessage(msg, sender) {
  const container = document.getElementById("chatbot-messages");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${sender}`;
  const formatted = msg.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  msgDiv.innerHTML = formatted;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}
