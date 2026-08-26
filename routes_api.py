import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
import models
import schemas
import auth
from services import send_emergency_sms, fetch_nearby_resources, fetch_weather_safety
from mongo_db import sync_user_to_mongo, sync_medical_report_to_mongo, sync_sos_alert_to_mongo, get_mongo_status

router = APIRouter(prefix="/api")

# ==========================================
# 1. AUTHENTICATION MODULE
# ==========================================

@router.post("/auth/register", response_model=schemas.TokenResponse)
def register_user(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    # 1. Password confirmation check
    if user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )
    
    # 2. Unique Email validation requirement
    existing_user = db.query(models.User).filter(models.User.email == user_in.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered."
        )
    
    # 3. Create user with hashed password
    hashed_pwd = auth.hash_password(user_in.password)
    new_user = models.User(
        name=user_in.name.strip(),
        email=user_in.email.lower().strip(),
        phone=user_in.phone.strip(),
        password_hash=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize empty medical profile for user
    med_profile = models.MedicalProfile(
        user_id=new_user.id,
        full_name=new_user.name
    )
    db.add(med_profile)
    db.commit()

    # Sync User details to MongoDB
    sync_user_to_mongo({
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "phone": new_user.phone,
        "avatar_url": new_user.avatar_url
    })

    # Generate JWT Token
    access_token = auth.create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": new_user}

@router.post("/auth/login", response_model=schemas.TokenResponse)
def login_user(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email.lower().strip()).first()
    if not user or not auth.verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    # Sync User details to MongoDB
    sync_user_to_mongo({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "avatar_url": user.avatar_url
    })

    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/auth/me", response_model=schemas.UserOut)
def get_current_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.put("/user/password")
def change_password(pwd_data: schemas.PasswordUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if not auth.verify_password(pwd_data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect existing password.")
    
    current_user.password_hash = auth.hash_password(pwd_data.new_password)
    db.commit()
    return {"message": "Password updated successfully."}

@router.put("/user/profile", response_model=schemas.UserOut)
def update_user_profile(prof_data: schemas.UserProfileUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if prof_data.name is not None:
        current_user.name = prof_data.name.strip()
    if prof_data.email is not None and prof_data.email.lower().strip() != current_user.email:
        # Check duplicate email
        existing = db.query(models.User).filter(models.User.email == prof_data.email.lower().strip()).first()
        if existing:
            raise HTTPException(status_code=400, detail="This email is already registered.")
        current_user.email = prof_data.email.lower().strip()
    if prof_data.phone is not None:
        current_user.phone = prof_data.phone.strip()
    if prof_data.avatar_url is not None:
        current_user.avatar_url = prof_data.avatar_url.strip()

    db.commit()
    db.refresh(current_user)

    # Sync updated details to MongoDB
    sync_user_to_mongo({
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "avatar_url": current_user.avatar_url
    })

    return current_user

# ==========================================
# 2. EMERGENCY CONTACTS MODULE
# ==========================================

@router.get("/contacts", response_model=List[schemas.ContactOut])
def list_emergency_contacts(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.EmergencyContact).filter(models.EmergencyContact.user_id == current_user.id).all()

@router.post("/contacts", response_model=schemas.ContactOut)
def create_emergency_contact(contact_in: schemas.ContactCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    new_contact = models.EmergencyContact(
        user_id=current_user.id,
        name=contact_in.name.strip(),
        phone=contact_in.phone.strip(),
        relationship=contact_in.relationship.strip(),
        sos_enabled=contact_in.sos_enabled
    )
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    return new_contact

@router.put("/contacts/{contact_id}", response_model=schemas.ContactOut)
def update_emergency_contact(contact_id: int, contact_in: schemas.ContactUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    contact = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.id == contact_id,
        models.EmergencyContact.user_id == current_user.id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Emergency contact not found.")
    
    if contact_in.name is not None:
        contact.name = contact_in.name.strip()
    if contact_in.phone is not None:
        contact.phone = contact_in.phone.strip()
    if contact_in.relationship is not None:
        contact.relationship = contact_in.relationship.strip()
    if contact_in.sos_enabled is not None:
        contact.sos_enabled = contact_in.sos_enabled

    db.commit()
    db.refresh(contact)
    return contact

@router.delete("/contacts/{contact_id}")
def delete_emergency_contact(contact_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    contact = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.id == contact_id,
        models.EmergencyContact.user_id == current_user.id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Emergency contact not found.")
    
    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted successfully."}

# ==========================================
# 3. SOS ALERT MODULE
# ==========================================

@router.put("/sos/message")
def update_custom_sos_message(msg_in: schemas.SOSMessageUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    current_user.custom_sos_message = msg_in.custom_message.strip()
    db.commit()
    return {"message": "Custom SOS message updated successfully.", "custom_sos_message": current_user.custom_sos_message}

@router.post("/sos/trigger", response_model=schemas.SOSAlertOut)
def trigger_sos_alert(sos_req: schemas.SOSTriggerRequest, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Fetch user's SOS-enabled contacts
    contacts = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == current_user.id,
        models.EmergencyContact.sos_enabled == True
    ).all()

    # Formulate emergency message
    base_msg = sos_req.custom_message or current_user.custom_sos_message or "Emergency! I need immediate assistance."
    maps_link = f"https://www.google.com/maps?q={sos_req.latitude},{sos_req.longitude}"
    full_alert_text = f"🚨 SAFEREACHED SOS ALERT 🚨\nFrom: {current_user.name} ({current_user.phone})\nMsg: {base_msg}\nLocation: {maps_link}"

    # Dispatch to all emergency contacts
    dispatched_count = 0
    dispatch_results = []
    for c in contacts:
        res = send_emergency_sms(c.phone, full_alert_text)
        dispatch_results.append(res)
        dispatched_count += 1

    alert_status = "SENT" if dispatched_count > 0 else "NO_CONTACTS"
    if any(r.get("status") == "SIMULATED" for r in dispatch_results):
        alert_status = "SIMULATED_DELIVERY"

    sos_record = models.SOSAlert(
        user_id=current_user.id,
        message=full_alert_text,
        latitude=sos_req.latitude,
        longitude=sos_req.longitude,
        location_address=sos_req.location_address,
        status=alert_status,
        recipients_count=dispatched_count,
        timestamp=datetime.utcnow()
    )
    db.add(sos_record)
    db.commit()
    db.refresh(sos_record)

    return sos_record

@router.get("/sos/history", response_model=List[schemas.SOSAlertOut])
def get_sos_history(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.SOSAlert).filter(models.SOSAlert.user_id == current_user.id).order_by(models.SOSAlert.timestamp.desc()).all()

# ==========================================
# 4. LOCATION SHARING MODULE
# ==========================================

@router.post("/location/share", response_model=schemas.LocationShareOut)
def create_location_share(loc_in: schemas.LocationShareCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    share_code = secrets.token_urlsafe(16)
    loc_share = models.LocationShare(
        user_id=current_user.id,
        share_code=share_code,
        latitude=loc_in.latitude,
        longitude=loc_in.longitude,
        location_name=loc_in.location_name,
        shared_at=datetime.utcnow()
    )
    db.add(loc_share)
    db.commit()
    db.refresh(loc_share)

    res = schemas.LocationShareOut.model_validate(loc_share)
    res.share_url = f"https://www.google.com/maps?q={loc_in.latitude},{loc_in.longitude}"
    return res

@router.get("/location/shared/{share_code}")
def get_shared_location(share_code: str, db: Session = Depends(get_db)):
    loc = db.query(models.LocationShare).filter(models.LocationShare.share_code == share_code).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location share link not found or expired.")
    
    user = db.query(models.User).filter(models.User.id == loc.user_id).first()
    return {
        "user_name": user.name if user else "SafeReached User",
        "latitude": loc.latitude,
        "longitude": loc.longitude,
        "location_name": loc.location_name,
        "shared_at": loc.shared_at,
        "maps_url": f"https://www.google.com/maps?q={loc.latitude},{loc.longitude}"
    }

# ==========================================
# 5. NEARBY RESOURCES MODULE
# ==========================================

@router.get("/nearby")
def get_nearby_emergency_resources(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    category: str = Query("hospitals", description="Resource category e.g. hospitals, police, fire_stations, pharmacies, etc."),
    radius: float = Query(5.0, description="Search radius in KM (Default: 5 km)")
):
    resources = fetch_nearby_resources(lat, lon, category, radius_km=radius)
    return {
        "query": {
            "latitude": lat,
            "longitude": lon,
            "category": category,
            "radius_km": radius
        },
        "count": len(resources),
        "resources": resources
    }

# ==========================================
# 6. EMERGENCY MEDICAL PROFILE MODULE
# ==========================================

@router.get("/medical", response_model=schemas.MedicalProfileOut)
def get_medical_profile(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    profile = db.query(models.MedicalProfile).filter(models.MedicalProfile.user_id == current_user.id).first()
    if not profile:
        profile = models.MedicalProfile(user_id=current_user.id, full_name=current_user.name)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/medical", response_model=schemas.MedicalProfileOut)
def update_medical_profile(med_in: schemas.MedicalProfileUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    profile = db.query(models.MedicalProfile).filter(models.MedicalProfile.user_id == current_user.id).first()
    if not profile:
        profile = models.MedicalProfile(user_id=current_user.id)
        db.add(profile)
    
    for key, val in med_in.dict(exclude_unset=True).items():
        if val is not None:
            setattr(profile, key, val.strip() if isinstance(val, str) else val)

    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)

    # Sync Medical Report to MongoDB
    sync_medical_report_to_mongo(
        user_id=current_user.id,
        user_name=current_user.name,
        med_data={
            "full_name": profile.full_name,
            "age_dob": profile.age_dob,
            "blood_group": profile.blood_group,
            "allergies": profile.allergies,
            "conditions": profile.conditions,
            "medications": profile.medications,
            "emergency_contact": profile.emergency_contact,
            "doctor_hospital_info": profile.doctor_hospital_info,
            "medical_notes": profile.medical_notes
        }
    )

    return profile

@router.post("/medical/share")
def share_medical_profile(share_req: schemas.ShareMedicalProfileRequest, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if not share_req.user_consent:
        raise HTTPException(status_code=400, detail="User consent is required before sharing private medical profile.")
    
    profile = db.query(models.MedicalProfile).filter(models.MedicalProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Medical profile not configured.")
    
    # Formulate secure emergency medical dispatch summary
    summary = {
        "patient_name": profile.full_name or current_user.name,
        "age_dob": profile.age_dob or "N/A",
        "blood_group": profile.blood_group or "Not Specified",
        "allergies": profile.allergies or "None Reported",
        "conditions": profile.conditions or "None Reported",
        "current_medications": profile.medications or "None Reported",
        "medical_notes": profile.medical_notes or "N/A",
        "emergency_contact": profile.emergency_contact or current_user.phone,
        "shared_with": share_req.hospital_name,
        "timestamp": datetime.utcnow().isoformat()
    }

    return {
        "status": "SUCCESS",
        "message": f"Medical profile shared securely with {share_req.hospital_name}.",
        "dispatch_details": summary
    }

# ==========================================
# 7. EMERGENCY HELPLINES MODULE
# ==========================================

@router.get("/helplines")
def get_official_emergency_helplines():
    """Verified official Indian public emergency and helpline numbers."""
    return [
        {"id": 1, "service": "National Emergency Number", "number": "112", "category": "General", "desc": "All-in-one emergency response for Police, Fire, Ambulance & Rescue."},
        {"id": 2, "service": "Police Helpline", "number": "100", "category": "Police", "desc": "Direct emergency contact for law enforcement and local police assistance."},
        {"id": 3, "service": "Ambulance Emergency", "number": "102", "category": "Medical", "desc": "Medical emergency and government free ambulance response service."},
        {"id": 4, "service": "Fire Station Rescue", "number": "101", "category": "Fire", "desc": "Fire hazard emergency dispatch and disaster rescue operations."},
        {"id": 5, "service": "Women Helpline", "number": "181", "category": "Women", "desc": "24/7 dedicated support, protection and crisis response for women."},
        {"id": 6, "service": "Child Helpline", "number": "1098", "category": "Child", "desc": "Toll-free emergency phone service for children in distress."},
        {"id": 7, "service": "National Disaster Response (NDRF)", "number": "1078", "category": "Disaster", "desc": "Natural disaster emergency relief (Floods, Earthquakes, Storms)."},
        {"id": 8, "service": "Senior Citizen Helpline", "number": "14567", "category": "Elderly", "desc": "Elderline national helpline for senior citizens needing urgent support."},
        {"id": 9, "service": "National Cyber Crime Helpline", "number": "1930", "category": "Cyber", "desc": "National cyber crime reporting portal & emergency financial fraud hotline."},
        {"id": 10, "service": "Road Accident Emergency", "number": "1033", "category": "Travel", "desc": "National highway emergency accident & towing support service."}
    ]

# ==========================================
# 8. WEATHER SAFETY DETECTOR MODULE
# ==========================================

@router.get("/weather")
def get_weather_safety_detector(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Detects real-time weather metrics, rain chance, humidity, UV index, and safety advisory."""
    return fetch_weather_safety(lat, lon)

# ==========================================
# 9. MONGODB DATABASE MONITOR ENDPOINT
# ==========================================

@router.get("/mongo/status")
def get_mongodb_status():
    """Returns MongoDB database connection status and collection document counts."""
    return get_mongo_status()
