from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20)
    password: str = Field(..., min_length=6)
    confirm_password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: str
    custom_sos_message: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Emergency Contact Schemas ---
class ContactCreate(BaseModel):
    name: str
    phone: str
    relationship: str
    sos_enabled: bool = True

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship: Optional[str] = None
    sos_enabled: Optional[bool] = None

class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    phone: str
    relationship: str
    sos_enabled: bool
    created_at: datetime

# --- SOS Alert Schemas ---
class SOSTriggerRequest(BaseModel):
    latitude: float
    longitude: float
    custom_message: Optional[str] = None
    location_address: Optional[str] = None

class SOSAlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    message: str
    latitude: float
    longitude: float
    location_address: Optional[str] = None
    status: str
    recipients_count: int
    timestamp: datetime

class SOSMessageUpdate(BaseModel):
    custom_message: str

# --- Location Share Schemas ---
class LocationShareCreate(BaseModel):
    latitude: float
    longitude: float
    location_name: Optional[str] = None

class LocationShareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    share_code: str
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    shared_at: datetime
    share_url: Optional[str] = None

# --- Medical Profile Schemas ---
class MedicalProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    age_dob: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    conditions: Optional[str] = None
    medications: Optional[str] = None
    medical_notes: Optional[str] = None
    emergency_contact: Optional[str] = None
    doctor_hospital_info: Optional[str] = None

class MedicalProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    full_name: Optional[str] = None
    age_dob: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    conditions: Optional[str] = None
    medications: Optional[str] = None
    medical_notes: Optional[str] = None
    emergency_contact: Optional[str] = None
    doctor_hospital_info: Optional[str] = None
    updated_at: datetime

class ShareMedicalProfileRequest(BaseModel):
    hospital_name: str
    hospital_contact: Optional[str] = None
    user_consent: bool

# --- Password Update Schema ---
class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str
