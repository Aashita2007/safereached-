import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("safereached_mongo")

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "safereached_db")

mongo_client = None
mongo_db = None

try:
    import pymongo
    mongo_client = pymongo.MongoClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
    # Ping server to confirm connection
    mongo_client.admin.command('ping')
    mongo_db = mongo_client[MONGODB_DB_NAME]
    logger.info(f"✅ Connected to MongoDB at {MONGODB_URL} (Database: {MONGODB_DB_NAME})")
except Exception as e:
    logger.warning(f"⚠️ MongoDB connection fallback active: {str(e)}")
    mongo_client = None
    mongo_db = None

def sync_user_to_mongo(user_data: Dict[str, Any]):
    """Sync registered user details (id, name, email, phone, avatar) to MongoDB."""
    if mongo_db is None:
        return
    try:
        users_col = mongo_db["users"]
        doc = {
            "register_id": user_data.get("id"),
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "phone": user_data.get("phone"),
            "avatar_url": user_data.get("avatar_url"),
            "updated_at": datetime.utcnow()
        }
        users_col.update_one(
            {"register_id": user_data.get("id")},
            {"$set": doc},
            upsert=True
        )
        logger.info(f"MongoDB: User {user_data.get('email')} synced successfully.")
    except Exception as e:
        logger.error(f"Failed to sync user to MongoDB: {str(e)}")

def sync_medical_report_to_mongo(user_id: int, user_name: str, med_data: Dict[str, Any]):
    """Sync emergency medical report details to MongoDB."""
    if mongo_db is None:
        return
    try:
        med_col = mongo_db["medical_reports"]
        doc = {
            "register_id": user_id,
            "user_name": user_name,
            "full_name": med_data.get("full_name"),
            "age_dob": med_data.get("age_dob"),
            "blood_group": med_data.get("blood_group"),
            "allergies": med_data.get("allergies"),
            "conditions": med_data.get("conditions"),
            "medications": med_data.get("medications"),
            "emergency_contact": med_data.get("emergency_contact"),
            "doctor_hospital_info": med_data.get("doctor_hospital_info"),
            "medical_notes": med_data.get("medical_notes"),
            "updated_at": datetime.utcnow()
        }
        med_col.update_one(
            {"register_id": user_id},
            {"$set": doc},
            upsert=True
        )
        logger.info(f"MongoDB: Medical report for user {user_id} saved successfully.")
    except Exception as e:
        logger.error(f"Failed to sync medical report to MongoDB: {str(e)}")

def sync_sos_alert_to_mongo(alert_data: Dict[str, Any]):
    """Sync emergency SOS alert log to MongoDB."""
    if mongo_db is None:
        return
    try:
        sos_col = mongo_db["sos_alerts"]
        alert_data["timestamp"] = datetime.utcnow()
        sos_col.insert_one(alert_data)
        logger.info(f"MongoDB: SOS alert logged.")
    except Exception as e:
        logger.error(f"Failed to log SOS to MongoDB: {str(e)}")

def get_mongo_status() -> Dict[str, Any]:
    """Check live MongoDB database connection status and collection counts."""
    if mongo_db is None:
        return {"status": "DISCONNECTED", "url": MONGODB_URL, "db_name": MONGODB_DB_NAME}
    
    try:
        user_count = mongo_db["users"].count_documents({})
        medical_count = mongo_db["medical_reports"].count_documents({})
        sos_count = mongo_db["sos_alerts"].count_documents({})
        return {
            "status": "CONNECTED",
            "url": MONGODB_URL,
            "database": MONGODB_DB_NAME,
            "collections": {
                "registered_users": user_count,
                "medical_reports": medical_count,
                "sos_alerts": sos_count
            }
        }
    except Exception as e:
        return {"status": "ERROR", "detail": str(e)}
