# SafeReached – Smart Emergency Safety & Assistance Platform 🛡️🚨

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https.mit-license.org)
[![Python](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python-blue.svg)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20JS-orange.svg)](https://developer.mozilla.org)
[![Maps](https://img.shields.io/badge/Maps-Leaflet.js%20%7C%20OpenStreetMap-brightgreen.svg)](https://leafletjs.com)

**SafeReached** is a modern, responsive, production-grade emergency safety web application designed to assist individuals during critical emergencies. It enables users to trigger instant SOS alerts with live GPS tracking, share real-time location links, locate nearby emergency resources within a 5 km radius, dispatch secure emergency medical profiles to nearby trauma centers, dial verified helplines, and access emergency safety guidelines.

---

## ✨ Key Features

- 🚨 **Instant SOS Alert System**: Prominent SOS button featuring a 5-second safety countdown, multi-ring animated radar beacon, custom emergency message editor, and automated SMS alert dispatch via Twilio API to all active emergency contacts.
- 📍 **Real-Time GPS Location Sharing**: High-accuracy browser geolocation detector paired with Leaflet.js interactive maps, generating instant shareable Google Maps links via Web Share API & WhatsApp.
- 🏥 **5 km Nearby Resource Finder**: Powered by OpenStreetMap Overpass API for real-time radius discovery across 10 resource categories:
  - Hospitals & Trauma Centers 🏥
  - Police Precincts 🚓
  - Fire Stations 🚒
  - 24/7 Pharmacies 💊
  - Petrol & Fuel Pumps ⛽
  - Public Restrooms 🚻
  - Blood Banks & Donor Centers 🩸
  - ATMs & Banking Outposts 🏧
  - Emergency Lodging & Shelters 🏨
  - EV Fast Charging Stations 🔌
- 🩺 **Emergency Medical Profile & Hospital Dispatch**: Secure medical data vault (blood group, allergies, chronic conditions, medications, primary doctor) featuring user consent-gated pre-arrival dispatch to nearby hospital trauma desks.
- 📞 **1-Tap Emergency Helpline Directory**: Official verified public helplines for India (112 National Emergency, 100 Police, 102 Ambulance, 101 Fire, 181 Women Safety, 1098 Childline, 1930 Cyber Crime, 1078 NDRF Disaster).
- 🌐 **Global Google Translate Integration**: Prominent language dropdown widget providing dynamic dynamic interface translation across all 9 dashboard modules.
- 🤖 **AI Emergency Assistance Assistant**: Floating interactive helper trained on emergency protocols, first aid procedures, and platform navigation.
- 🎨 **Modern Design System**: Sleek glassmorphism aesthetic built using a curated HSL color palette (`#98AA9B`, `#B3C9D6`, `#F2EFE2`, `#2D2536`, `#697C70`), dark mode toggle, and micro-animations.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.9+, FastAPI, Uvicorn, Pydantic
- **Database**: SQLite (SQLAlchemy ORM) / MongoDB
- **Frontend**: HTML5, Modern CSS3 (Vanilla Design System), JavaScript (ES6+)
- **Mapping & Geolocation**: Leaflet.js, OpenStreetMap Overpass API, Browser Geolocation API
- **SMS & Alerts**: Twilio REST API integration
- **Authentication**: Passlib (PBKDF2:SHA256 password hashing), PyJWT (HS256 Session Tokens)

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
Ensure you have **Python 3.9+** and **pip** installed.

### 2. Clone Repository
```bash
git clone https://github.com/your-username/safereached.git
cd safereached
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Variables (`.env`)
Create a `.env` file in the root directory:
```env
SECRET_KEY=safereached-super-secret-key-2026
DATABASE_URL=sqlite:///safereached.db

# Optional: Production Twilio SMS Credentials
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 5. Run Server
```bash
python server.py
```

Open your browser and navigate to **`http://localhost:8000`**.

---

## 📂 Project Structure

```
safereached/
├── server.py                   # FastAPI main application server & static file mounts
├── database.py                 # SQLAlchemy database connection & session setup
├── models.py                   # ORM Database Models (Users, Contacts, SOSAlerts, MedicalProfiles)
├── routes_api.py               # REST API endpoints for Auth, SOS, Location, Resources, Medical
├── auth.py                     # Password hashing & JWT token security
├── requirements.txt            # Python package dependencies
├── .env.example                # Sample environment configuration
├── public/                     # Frontend static assets
│   ├── index.html              # Single Page Application HTML frame
│   ├── banner.jpg              # AI Hero Graphic Banner
│   ├── sos_banner.jpg          # SOS Alert Banner Graphic
│   ├── medical_banner.jpg      # Medical Profile Banner Graphic
│   ├── css/
│   │   └── style.css           # Modern design system & animated FX
│   └── js/
│       ├── app.js              # SPA module router & UI controller
│       ├── chatbot_data.js     # AI assistant knowledge base
│       ├── helplines_data.js   # Official helplines database
│       └── safety_tips_data.js # Categorized safety guidance data
└── README.md                   # Project Documentation
```

---

## 🌐 Production Deployment

### Deploy on Render / Railway / Heroku
1. Push your repository to GitHub.
2. Connect your GitHub repository to **Render** or **Railway**.
3. Set Build Command: `pip install -r requirements.txt`
4. Set Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Configure Environment Variables (`SECRET_KEY`, `TWILIO_ACCOUNT_SID`, etc.).

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👨‍💻 Author

Developed with ❤️ for public safety and emergency assistance.
