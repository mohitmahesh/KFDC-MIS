#!/usr/bin/env python3
"""
Quick verification of the key change: GET /api/apo/estimates WITHOUT plantation_id parameter
"""

import requests
import json
import os

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://kfdc-green-deploy.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

def verify_estimates_endpoint_change():
    """Verify the key change: estimates endpoint no longer requires plantation_id"""
    
    # Login as ECW
    login_data = {'email': 'ecw.dharwad@kfdc.in', 'password': 'pass123'}
    response = requests.post(f"{API_BASE}/auth/login", json=login_data)
    
    if response.status_code != 200:
        print("❌ Failed to login as ECW")
        return False
    
    token = response.json().get('token')
    headers = {'Authorization': f'Bearer {token}'}
    
    print("🔍 Testing key change: GET /api/apo/estimates WITHOUT plantation_id...")
    
    # Call estimates endpoint WITHOUT plantation_id parameter (the key change!)
    response = requests.get(f"{API_BASE}/apo/estimates", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        works = data.get('works', [])
        summary = data.get('summary', {})
        
        print(f"✅ SUCCESS: Retrieved {len(works)} works without plantation_id parameter")
        print(f"📍 Jurisdiction: {summary.get('jurisdiction')} ({summary.get('jurisdiction_type')})")
        print(f"📊 Summary: {summary.get('sanctioned_apo_count')} sanctioned APOs, {summary.get('work_count')} work items")
        print(f"💰 Total Sanctioned: ₹{summary.get('total_sanctioned', 0):,.2f}")
        print(f"💰 Total Revised: ₹{summary.get('total_revised', 0):,.2f}")
        
        # Verify structure
        if works:
            first_work = works[0]
            required_fields = ['id', 'activity_name', 'sanctioned_qty', 'sanctioned_rate', 'plantation_name', 'range_id']
            missing_fields = [field for field in required_fields if field not in first_work]
            
            if not missing_fields:
                print("✅ Work items have all required fields")
            else:
                print(f"⚠️  Missing fields in work items: {missing_fields}")
        
        return True
    else:
        print(f"❌ Failed: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    success = verify_estimates_endpoint_change()
    print(f"\n{'🎉 VERIFICATION PASSED' if success else '❌ VERIFICATION FAILED'}")