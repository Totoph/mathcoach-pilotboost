#!/usr/bin/env python3
"""Test script to debug submit-answer validation error"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.schemas.agent import SubmitAnswerRequest
import json

# Test data matching what frontend sends
test_data = {
    "exercise_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_answer": "42",
    "time_taken_ms": 5000,
    "question": "40 + 2",
    "correct_answer": "42",
    "exercise_type": "addition",
    "difficulty": 1,
    "tip": None
}

print("Testing Pydantic validation with:")
print(json.dumps(test_data, indent=2))
print()

try:
    request = SubmitAnswerRequest(**test_data)
    print("✓ Validation PASSED")
    print(f"Parsed: {request.model_dump()}")
except Exception as e:
    print(f"✗ Validation FAILED: {e}")
    import traceback
    traceback.print_exc()
