const CHATBOT_KNOWLEDGE_BASE = [
  {
    keywords: ["sos", "emergency alert", "help button", "trigger sos", "danger"],
    response: "🚨 **SafeReached SOS Alert**: Pressing the big SOS button triggers a 5-second safety countdown. Once completed, your predefined custom message and real-time Google Maps GPS location link are sent to all your saved emergency contacts."
  },
  {
    keywords: ["location", "share location", "gps", "track", "map link"],
    response: "📍 **Location Sharing**: Go to the 'Share Location' module in the sidebar. SafeReached detects your exact GPS coordinates and generates a live Google Maps link that you can copy or share directly via WhatsApp or SMS."
  },
  {
    keywords: ["hospital", "police", "pharmacy", "petrol", "atm", "nearby", "washroom", "ev"],
    response: "🏥 **Nearby Resources**: Use the 'Nearby Resources' module to search within a 5 km radius for hospitals, police stations, fire stations, pharmacies, petrol pumps, ATMs, blood banks, and EV charging stations. You can get instant turn-by-turn directions!"
  },
  {
    keywords: ["helpline", "numbers", "call", "police number", "ambulance number", "fire number"],
    response: "📞 **Emergency Helplines**: Go to 'Emergency Helplines'. Key official Indian numbers include:\n• **112**: Unified National Emergency\n• **100**: Police\n• **102**: Ambulance\n• **101**: Fire\n• **181**: Women Helpline\n• **1098**: Child Helpline"
  },
  {
    keywords: ["medical", "medical profile", "allergies", "blood group", "doctor"],
    response: "🩺 **Emergency Medical Profile**: Fill in your blood group, allergies, conditions, and medications in the 'Medical Profile' module. In an emergency, you can securely share this profile with nearby hospitals with explicit consent."
  },
  {
    keywords: ["weather", "rain", "uv", "humidity", "temp", "temperature", "storm"],
    response: "⛅ **Weather Safety Detector**: Access the 'Weather Safety' module or check your Dashboard. SafeReached monitors real-time temperature, rain probability, humidity, and UV Index to issue personalized safety warnings for your trip."
  },
  {
    keywords: ["safety tips", "precautions", "travel safety", "night safety", "cpr"],
    response: "🛡️ **Safety Guidance**: Visit the 'Safety Tips' module for expert guidelines on Emergency Preparedness, Road & Travel Safety, First-Aid/CPR, Fire Evacuation, Night Travel Precautions, and Natural Disaster Response."
  },
  {
    keywords: ["safereached", "project", "about", "what is this", "features"],
    response: "🛡️ **SafeReached Platform**: SafeReached is a modern emergency safety and assistance platform. Key features: SOS Alerts, Live Location Sharing, 5km Nearby Resource Discovery, Emergency Helplines, Medical Profile Sharing, Real-Time Weather Safety, and Google Translate support."
  }
];

function getBotResponse(userQuery) {
  const query = userQuery.toLowerCase().trim();
  
  // Search knowledge base
  for (const kb of CHATBOT_KNOWLEDGE_BASE) {
    if (kb.keywords.some(keyword => query.includes(keyword))) {
      return kb.response;
    }
  }

  // Greeting responses
  if (query.includes("hi") || query.includes("hello") || query.includes("hey") || query.includes("namaste")) {
    return "Hello! I am your **SafeReached Assistant** 🛡️. How can I assist you with emergency safety, SOS alerts, location sharing, or nearby emergency resources?";
  }

  // Default response
  return "I'm here to help with all SafeReached safety features! You can ask me about:\n• How SOS alerts work\n• Sharing live GPS location\n• Finding nearby hospitals/police\n• Emergency helpline numbers\n• Weather safety warnings\n• Managing your Medical Profile";
}
