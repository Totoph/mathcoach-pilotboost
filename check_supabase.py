from supabase import create_client
import os

url = "https://qlsobngjwvhnnbikkrcz.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsc29ibmdqd3Zobm5iaWtrcmN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQxOTc5MSwiZXhwIjoyMDg3OTk1NzkxfQ.Rnli02JeheDK6jwzbvA7M2wIB78Z855SzhKd6IVV6ds"

supabase = create_client(url, key)

# Vérifier si les tables existent
tables = ["agent_instances", "agent_conversations", "exercise_performances"]

for table in tables:
    try:
        result = supabase.table(table).select("*").limit(1).execute()
        print(f"✅ Table '{table}' existe")
    except Exception as e:
        print(f"❌ Table '{table}' manquante: {e}")
