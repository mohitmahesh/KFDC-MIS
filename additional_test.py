#!/usr/bin/env python3
"""
KFDC iFMS Additional Testing - 3-Tier APO Approval and Works Endpoint
"""

import requests
import json

BASE_URL = "https://ifms-apo-wizard.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "RO": {"email": "ro.dharwad@kfdc.in", "password": "pass123"},
    "DM": {"email": "dm.dharwad@kfdc.in", "password": "pass123"},
    "ADMIN": {"email": "admin@kfdc.in", "password": "pass123"}
}

def authenticate_and_get_token(role):
    """Get auth token for a role"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=TEST_CREDENTIALS[role], timeout=30)
        if response.status_code == 200:
            return response.json().get("token")
    except Exception as e:
        print(f"❌ Auth failed for {role}: {str(e)}")
    return None

def make_request(method, endpoint, token, data=None):
    """Make authenticated request"""
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.request(method, f"{BASE_URL}{endpoint}", json=data, headers=headers, timeout=30)
        
        if response.status_code < 400:
            return response.json() if response.text else {}
        else:
            print(f"❌ API Error - {method} {endpoint}: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return None

def test_additional_features():
    """Test additional multi-plantation features"""
    print("🔍 ADDITIONAL MULTI-PLANTATION APO TESTING")
    print("=" * 60)
    
    # Get tokens
    ro_token = authenticate_and_get_token("RO")
    dm_token = authenticate_and_get_token("DM")
    admin_token = authenticate_and_get_token("ADMIN")
    
    if not all([ro_token, dm_token, admin_token]):
        print("❌ Authentication failed for one or more users")
        return
    
    print("✅ All users authenticated successfully")
    
    # Test 1: Get specific APO details to understand structure
    print("\n🔍 Testing APO List Structure:")
    apo_list = make_request("GET", "/apo", ro_token)
    if apo_list and len(apo_list) > 0:
        latest_apo = apo_list[0]  # Get most recent APO
        apo_id = latest_apo.get("id")
        print(f"✅ Found APO: {latest_apo.get('title', 'No Title')} (Status: {latest_apo.get('status', 'Unknown')})")
        
        if apo_id and latest_apo.get("status") in ["DRAFT", "PENDING_DM_APPROVAL"]:
            # Test proper 3-tier approval flow
            print(f"\n🔄 Testing 3-Tier Approval Flow for APO: {apo_id}")
            
            # Step 1: If DRAFT, submit to DM
            if latest_apo.get("status") == "DRAFT":
                submit_response = make_request("PATCH", f"/apo/{apo_id}/status", ro_token, {"status": "PENDING_DM_APPROVAL"})
                if submit_response:
                    print("✅ RO successfully submitted APO to DM")
                else:
                    print("❌ RO failed to submit APO")
                    return
            
            # Step 2: DM forwards to HO
            forward_response = make_request("PATCH", f"/apo/{apo_id}/status", dm_token, {"status": "PENDING_HO_APPROVAL"})
            if forward_response:
                print("✅ DM successfully forwarded APO to HO")
                
                # Step 3: ADMIN (HO) sanctions
                sanction_response = make_request("PATCH", f"/apo/{apo_id}/status", admin_token, {"status": "SANCTIONED"})
                if sanction_response:
                    print("✅ ADMIN (HO) successfully sanctioned APO")
                    print("🎉 3-Tier Approval Flow Working Correctly!")
                else:
                    print("❌ ADMIN failed to sanction APO")
            else:
                print("❌ DM failed to forward APO")
    
    # Test 2: Works endpoints (if implemented)
    print("\n🔍 Testing Works Endpoints:")
    works_response = make_request("GET", "/works", ro_token)
    if works_response is not None:
        print("✅ Works endpoint available")
    else:
        print("ℹ️ Works endpoint not implemented or different structure")
    
    # Test 3: Create a simple single-plantation APO to verify baseline functionality
    print("\n🔍 Testing Single Plantation APO Creation:")
    draft_response = make_request("POST", "/apo/generate-draft", ro_token, {
        "plantation_id": "plt-d01",
        "financial_year": "2026-27"
    })
    
    if draft_response:
        items = draft_response.get("items", [])[:1]  # Take just 1 item
        simple_apo_data = {
            "plantation_id": "plt-d01",
            "financial_year": "2026-27",
            "title": "Single Plantation Test APO",
            "status": "DRAFT",
            "items": [{
                "activity_id": item["activity_id"],
                "activity_name": item["activity_name"],
                "sanctioned_qty": item["suggested_qty"],
                "sanctioned_rate": item["sanctioned_rate"],
                "unit": item["unit"]
            } for item in items]
        }
        
        single_apo_response = make_request("POST", "/apo", ro_token, simple_apo_data)
        if single_apo_response:
            single_apo_id = single_apo_response.get("id")
            print(f"✅ Single plantation APO created: {single_apo_id}")
        else:
            print("❌ Single plantation APO creation failed")
    
    print("\n" + "=" * 60)
    print("🏁 ADDITIONAL TESTING COMPLETED")

if __name__ == "__main__":
    test_additional_features()