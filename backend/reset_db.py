"""
Reset Database Script
=====================
Drops all tables and recreates them. Run from the backend directory.

Usage:
    python reset_db.py
    
Or with a custom DATABASE_URL:
    DATABASE_URL="postgresql://..." python reset_db.py
"""

import sys

# Add the backend directory to path so imports work
sys.path.insert(0, ".")

from streampage.db.engine import get_engine
from streampage.db.models import Base

def reset_database():
    print("⚠️  WARNING: This will DELETE ALL DATA in the database!")
    confirm = input("Type 'yes' to confirm: ")
    
    if confirm.lower() != "yes":
        print("Aborted.")
        return
    
    engine = get_engine()
    
    print("\n🗑️  Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("🔨 Recreating all tables...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database reset complete!")

if __name__ == "__main__":
    reset_database()

