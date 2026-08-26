from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship as orm_relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    password_hash = Column(String(255), nullable=False)
    custom_sos_message = Column(Text, nullable=True, default="Emergency! I need help. Please check my current location and contact me as soon as possible.")
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    contacts = orm_relationship("EmergencyContact", back_populates="user", cascade="all, delete-orphan")
    sos_alerts = orm_relationship("SOSAlert", back_populates="user", cascade="all, delete-orphan")
    medical_profile = orm_relationship("MedicalProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    location_shares = orm_relationship("LocationShare", back_populates="user", cascade="all, delete-orphan")

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    relationship = Column(String(50), nullable=False)
    sos_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="contacts")

class SOSAlert(Base):
    __tablename__ = "sos_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_address = Column(String(255), nullable=True)
    status = Column(String(50), default="SENT")  # SENT, DELIVERED, SIMULATED
    recipients_count = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="sos_alerts")

class MedicalProfile(Base):
    __tablename__ = "medical_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    full_name = Column(String(100), nullable=True)
    age_dob = Column(String(50), nullable=True)
    blood_group = Column(String(10), nullable=True)
    allergies = Column(Text, nullable=True)
    conditions = Column(Text, nullable=True)
    medications = Column(Text, nullable=True)
    medical_notes = Column(Text, nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    doctor_hospital_info = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = orm_relationship("User", back_populates="medical_profile")

class LocationShare(Base):
    __tablename__ = "location_shares"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    share_code = Column(String(64), unique=True, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String(255), nullable=True)
    shared_at = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="location_shares")
