#!/usr/bin/env python3
"""
KFDC iFMS Backend Testing Script
Testing UPDATED real KFDC data with new divisions, ranges, users, plantations, and norms
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "https://forest-apo-hub.preview.emergentagent.com/api"

def log_test(test_name, status, message="", details=None):
    """Log test results"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_icon} {test_name}: {message}")
    if details:
        print(f"    Details: {json.dumps(details, indent=2)}")

def make_request(method, endpoint, headers=None, data=None):
    """Make HTTP request with error handling"""
    try:
        url = f"{BASE_URL}{endpoint}"
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PATCH":
            response = requests.patch(url, headers=headers, json=data)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except Exception as e:
        log_test("REQUEST_ERROR", "FAIL", f"Failed to make {method} request to {endpoint}: {str(e)}")
        return None

def test_step_1_seed():
    """Step 1: Test seeding with real KFDC data"""
    print("\n" + "="*50)
    print("STEP 1: SEED REAL KFDC DATA")
    print("="*50)
    
    response = make_request("POST", "/seed")
    if not response:
        return False
        
    if response.status_code == 200:
        data = response.json()
        expected_counts = {
            "divisions": 4,
            "ranges": 19, 
            "users": 8,
            "activities": 25
        }
        
        counts = data.get("counts", {})
        all_correct = True
        
        for key, expected in expected_counts.items():
            actual = counts.get(key, 0)
            if actual == expected:
                log_test(f"SEED_{key.upper()}", "PASS", f"Expected {expected}, got {actual}")
            else:
                log_test(f"SEED_{key.upper()}", "FAIL", f"Expected {expected}, got {actual}")
                all_correct = False
        
        # Check norms and plantations counts (should be 80+ and 45+ respectively)
        norms_count = counts.get("norms", 0)
        plantations_count = counts.get("plantations", 0)
        
        if norms_count >= 80:
            log_test("SEED_NORMS", "PASS", f"Expected 80+, got {norms_count}")
        else:
            log_test("SEED_NORMS", "FAIL", f"Expected 80+, got {norms_count}")
            all_correct = False
            
        if plantations_count >= 45:
            log_test("SEED_PLANTATIONS", "PASS", f"Expected 45+, got {plantations_count}")
        else:
            log_test("SEED_PLANTATIONS", "FAIL", f"Expected 45+, got {plantations_count}")
            all_correct = False
        
        return all_correct
    else:
        log_test("SEED", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return False

def test_step_2_auth():
    """Step 2: Test authentication with new user emails"""
    print("\n" + "="*50)
    print("STEP 2: AUTHENTICATION WITH NEW EMAILS")
    print("="*50)
    
    test_users = [
        {"email": "ro.dharwad@kfdc.in", "password": "pass123", "role": "RO", "range": "Dharwad"},
        {"email": "ro.svpura@kfdc.in", "password": "pass123", "role": "RO", "range": "S.V. Pura"},
        {"email": "dm.dharwad@kfdc.in", "password": "pass123", "role": "DM", "division": "Dharwad"},
        {"email": "admin@kfdc.in", "password": "pass123", "role": "ADMIN", "scope": "All"}
    ]
    
    tokens = {}
    all_passed = True
    
    for user in test_users:
        response = make_request("POST", "/auth/login", data={"email": user["email"], "password": user["password"]})
        
        if response and response.status_code == 200:
            data = response.json()
            token = data.get("token")
            user_data = data.get("user", {})
            
            if token and user_data.get("role") == user["role"]:
                log_test(f"AUTH_{user['role']}", "PASS", f"Login successful for {user['email']}")
                tokens[user["role"]] = token
                
                # Test /auth/me endpoint
                me_response = make_request("GET", "/auth/me", headers={"Authorization": f"Bearer {token}"})
                if me_response and me_response.status_code == 200:
                    me_data = me_response.json()
                    log_test(f"AUTH_ME_{user['role']}", "PASS", f"User data retrieved: {me_data.get('name', 'Unknown')}")
                else:
                    log_test(f"AUTH_ME_{user['role']}", "FAIL", "Failed to get user data")
                    all_passed = False
            else:
                log_test(f"AUTH_{user['role']}", "FAIL", f"Invalid login response for {user['email']}")
                all_passed = False
        else:
            log_test(f"AUTH_{user['role']}", "FAIL", f"Login failed for {user['email']}")
            all_passed = False
    
    return all_passed, tokens

def test_step_3_role_scoped_plantations(tokens):
    """Step 3: Test role-scoped plantations"""
    print("\n" + "="*50)
    print("STEP 3: ROLE-SCOPED PLANTATIONS")
    print("="*50)
    
    all_passed = True
    
    # Test RO Dharwad - should see only Dharwad range plantations (plt-d01 through plt-d05)
    if "RO" in tokens:
        response = make_request("GET", "/plantations", headers={"Authorization": f"Bearer {tokens['RO']}"})
        if response and response.status_code == 200:
            plantations = response.json()
            dharwad_plantations = [p for p in plantations if p.get("id", "").startswith("plt-d0")]
            
            if len(dharwad_plantations) == 5:  # plt-d01 to plt-d05
                log_test("PLANTATIONS_RO_DHARWAD", "PASS", f"RO sees {len(dharwad_plantations)} Dharwad range plantations")
                
                # Verify village/taluk/district fields
                has_location_fields = all(
                    p.get("village") and p.get("taluk") and p.get("district") 
                    for p in dharwad_plantations
                )
                if has_location_fields:
                    log_test("PLANTATIONS_LOCATION_FIELDS", "PASS", "All plantations have village/taluk/district fields")
                else:
                    log_test("PLANTATIONS_LOCATION_FIELDS", "FAIL", "Some plantations missing location fields")
                    all_passed = False
            else:
                log_test("PLANTATIONS_RO_DHARWAD", "FAIL", f"Expected 5, got {len(dharwad_plantations)} Dharwad range plantations")
                all_passed = False
        else:
            log_test("PLANTATIONS_RO_DHARWAD", "FAIL", "Failed to get RO plantations")
            all_passed = False
    
    # Test DM Dharwad - should see all Dharwad division plantations (all ranges)
    if "DM" in tokens:
        response = make_request("GET", "/plantations", headers={"Authorization": f"Bearer {tokens['DM']}"})
        if response and response.status_code == 200:
            plantations = response.json()
            dharwad_div_plantations = [p for p in plantations if p.get("id", "").startswith("plt-d")]
            
            if len(dharwad_div_plantations) >= 20:  # Should see plantations from all Dharwad ranges
                log_test("PLANTATIONS_DM_DHARWAD", "PASS", f"DM sees {len(dharwad_div_plantations)} Dharwad division plantations")
            else:
                log_test("PLANTATIONS_DM_DHARWAD", "FAIL", f"Expected 20+, got {len(dharwad_div_plantations)} Dharwad division plantations")
                all_passed = False
        else:
            log_test("PLANTATIONS_DM_DHARWAD", "FAIL", "Failed to get DM plantations")
            all_passed = False
    
    # Test Admin - should see all 45+ plantations
    if "ADMIN" in tokens:
        response = make_request("GET", "/plantations", headers={"Authorization": f"Bearer {tokens['ADMIN']}"})
        if response and response.status_code == 200:
            plantations = response.json()
            
            if len(plantations) >= 45:
                log_test("PLANTATIONS_ADMIN_ALL", "PASS", f"Admin sees {len(plantations)} plantations")
            else:
                log_test("PLANTATIONS_ADMIN_ALL", "FAIL", f"Expected 45+, got {len(plantations)} plantations")
                all_passed = False
        else:
            log_test("PLANTATIONS_ADMIN_ALL", "FAIL", "Failed to get Admin plantations")
            all_passed = False
    
    return all_passed

def test_step_4_norms_with_ssr(tokens):
    """Step 4: Test norms with SSR numbers"""
    print("\n" + "="*50)
    print("STEP 4: NORMS WITH SSR NUMBERS")
    print("="*50)
    
    all_passed = True
    
    if "ADMIN" in tokens:
        response = make_request("GET", "/norms", headers={"Authorization": f"Bearer {tokens['ADMIN']}"})
        if response and response.status_code == 200:
            norms = response.json()
            
            # Check if activities have SSR numbers
            activities_with_ssr = [n for n in norms if n.get("ssr_no") and n["ssr_no"] != "-"]
            activities_without_ssr = [n for n in norms if not n.get("ssr_no") or n["ssr_no"] == "-"]
            
            log_test("NORMS_SSR_NUMBERS", "PASS", f"Found {len(activities_with_ssr)} activities with SSR numbers, {len(activities_without_ssr)} without")
            
            # Check for specific rate (Fire Line Clearing = 5455.86)
            fire_line_norms = [n for n in norms if "Fire Line" in n.get("activity_name", "")]
            fire_line_rate_correct = any(n.get("standard_rate") == 5455.86 for n in fire_line_norms)
            
            if fire_line_rate_correct:
                log_test("NORMS_FIRE_LINE_RATE", "PASS", "Fire Line Clearing rate is 5455.86")
            else:
                log_test("NORMS_FIRE_LINE_RATE", "FAIL", "Fire Line Clearing rate not found or incorrect")
                all_passed = False
            
            # Check age ranges (should have norms for ages 0-40+)
            ages = set()
            for norm in norms:
                ages.add(norm.get("applicable_age", 0))
            
            max_age = max(ages) if ages else 0
            if max_age >= 22:
                log_test("NORMS_AGE_RANGE", "PASS", f"Norms available for ages up to {max_age}")
            else:
                log_test("NORMS_AGE_RANGE", "FAIL", f"Expected norms for ages 22+, max age found: {max_age}")
                all_passed = False
                
        else:
            log_test("NORMS_FETCH", "FAIL", "Failed to fetch norms")
            all_passed = False
    
    return all_passed

def test_step_5_apo_generate_draft(tokens):
    """Step 5: Test APO draft generation with real plantations"""
    print("\n" + "="*50)
    print("STEP 5: APO GENERATE DRAFT (KEY FEATURE)")
    print("="*50)
    
    all_passed = True
    
    if "RO" in tokens:
        # Test plt-d05 (Degaon, planted 2018, age ~8 years)
        response = make_request("POST", "/apo/generate-draft", 
                               headers={"Authorization": f"Bearer {tokens['RO']}"}, 
                               data={"plantation_id": "plt-d05", "financial_year": "2026-27"})
        
        if response and response.status_code == 200:
            data = response.json()
            age = data.get("age", 0)
            items = data.get("items", [])
            
            # Age should be around 8 (2026 - 2018)
            if age == 8:
                log_test("APO_DRAFT_PLT_D05_AGE", "PASS", f"Correct age calculation: {age}")
                
                # Should return fire line + fire watch norms for age 8
                fire_activities = [item for item in items if "Fire" in item.get("activity_name", "")]
                if len(fire_activities) >= 2:
                    log_test("APO_DRAFT_PLT_D05_ACTIVITIES", "PASS", f"Found {len(fire_activities)} fire-related activities")
                else:
                    log_test("APO_DRAFT_PLT_D05_ACTIVITIES", "FAIL", f"Expected fire activities, got {len(fire_activities)}")
                    all_passed = False
            else:
                log_test("APO_DRAFT_PLT_D05_AGE", "FAIL", f"Expected age 8, got {age}")
                all_passed = False
        else:
            log_test("APO_DRAFT_PLT_D05", "FAIL", "Failed to generate draft for plt-d05")
            all_passed = False
        
        # Test plt-d22 (Kinaye, planted 2025, age ~1 year)
        response = make_request("POST", "/apo/generate-draft", 
                               headers={"Authorization": f"Bearer {tokens['RO']}"}, 
                               data={"plantation_id": "plt-d22", "financial_year": "2026-27"})
        
        if response and response.status_code == 200:
            data = response.json()
            age = data.get("age", 0)
            items = data.get("items", [])
            
            # Age should be 1 (2026 - 2025)
            if age == 1:
                log_test("APO_DRAFT_PLT_D22_AGE", "PASS", f"Correct age calculation: {age}")
                
                # Should return many planting works norms for age 1
                if len(items) >= 10:
                    log_test("APO_DRAFT_PLT_D22_ACTIVITIES", "PASS", f"Found {len(items)} planting activities")
                else:
                    log_test("APO_DRAFT_PLT_D22_ACTIVITIES", "FAIL", f"Expected 10+ planting activities, got {len(items)}")
                    all_passed = False
            else:
                log_test("APO_DRAFT_PLT_D22_AGE", "FAIL", f"Expected age 1, got {age}")
                all_passed = False
        else:
            log_test("APO_DRAFT_PLT_D22", "FAIL", "Failed to generate draft for plt-d22")
            all_passed = False
    
    return all_passed

def test_step_6_apo_workflow(tokens):
    """Step 6: Test APO workflow (create, approve, budget enforcement)"""
    print("\n" + "="*50)
    print("STEP 6: APO WORKFLOW")
    print("="*50)
    
    all_passed = True
    
    if "RO" in tokens and "DM" in tokens:
        # First get a draft
        draft_response = make_request("POST", "/apo/generate-draft", 
                                     headers={"Authorization": f"Bearer {tokens['RO']}"}, 
                                     data={"plantation_id": "plt-d05", "financial_year": "2026-27"})
        
        if draft_response and draft_response.status_code == 200:
            draft_data = draft_response.json()
            items = draft_data.get("items", [])[:3]  # Take first 3 items
            
            # Create APO as RO
            apo_data = {
                "plantation_id": "plt-d05",
                "financial_year": "2026-27",
                "status": "PENDING_APPROVAL",
                "items": items
            }
            
            create_response = make_request("POST", "/apo", 
                                         headers={"Authorization": f"Bearer {tokens['RO']}"}, 
                                         data=apo_data)
            
            if create_response and create_response.status_code == 201:
                apo = create_response.json()
                apo_id = apo.get("id")
                log_test("APO_CREATE", "PASS", f"APO created with ID: {apo_id}")
                
                # Approve as DM
                approve_response = make_request("PATCH", f"/apo/{apo_id}/status",
                                              headers={"Authorization": f"Bearer {tokens['DM']}"}, 
                                              data={"status": "SANCTIONED"})
                
                if approve_response and approve_response.status_code == 200:
                    log_test("APO_APPROVE", "PASS", "APO approved by DM")
                    
                    # Test budget enforcement with work logs
                    if items:
                        first_item = items[0]
                        apo_items_response = make_request("GET", f"/apo/{apo_id}", 
                                                        headers={"Authorization": f"Bearer {tokens['RO']}"})
                        
                        if apo_items_response and apo_items_response.status_code == 200:
                            apo_detail = apo_items_response.json()
                            apo_items = apo_detail.get("items", [])
                            
                            if apo_items:
                                item_id = apo_items[0].get("id")
                                item_cost = apo_items[0].get("total_cost", 0)
                                
                                # Try to log work that exceeds budget
                                overbudget_response = make_request("POST", "/work-logs",
                                                                 headers={"Authorization": f"Bearer {tokens['RO']}"}, 
                                                                 data={
                                                                     "apo_item_id": item_id,
                                                                     "actual_qty": 1,
                                                                     "expenditure": item_cost + 1000,  # Exceed by 1000
                                                                     "work_date": "2026-05-25"
                                                                 })
                                
                                if overbudget_response and overbudget_response.status_code == 400:
                                    error_data = overbudget_response.json()
                                    if "Budget Exceeded" in error_data.get("error", ""):
                                        log_test("BUDGET_ENFORCEMENT", "PASS", "Budget enforcement working - rejected overbudget")
                                    else:
                                        log_test("BUDGET_ENFORCEMENT", "FAIL", "Wrong error message for overbudget")
                                        all_passed = False
                                else:
                                    log_test("BUDGET_ENFORCEMENT", "FAIL", "Should have rejected overbudget work log")
                                    all_passed = False
                            else:
                                log_test("BUDGET_ENFORCEMENT", "FAIL", "No APO items found for testing")
                                all_passed = False
                        else:
                            log_test("BUDGET_ENFORCEMENT", "FAIL", "Failed to get APO details")
                            all_passed = False
                else:
                    log_test("APO_APPROVE", "FAIL", "Failed to approve APO")
                    all_passed = False
            else:
                log_test("APO_CREATE", "FAIL", "Failed to create APO")
                all_passed = False
        else:
            log_test("APO_WORKFLOW", "FAIL", "Failed to get draft for workflow test")
            all_passed = False
    
    return all_passed

def test_step_7_dashboard(tokens):
    """Step 7: Test dashboard stats"""
    print("\n" + "="*50)
    print("STEP 7: DASHBOARD STATS")
    print("="*50)
    
    all_passed = True
    
    # Test for each role
    for role in ["RO", "DM", "ADMIN"]:
        if role in tokens:
            response = make_request("GET", "/dashboard/stats", headers={"Authorization": f"Bearer {tokens[role]}"})
            
            if response and response.status_code == 200:
                stats = response.json()
                required_fields = ["total_plantations", "total_apos", "total_sanctioned_amount", "utilization_pct"]
                
                has_all_fields = all(field in stats for field in required_fields)
                if has_all_fields:
                    log_test(f"DASHBOARD_{role}", "PASS", f"Stats retrieved: {stats.get('total_plantations', 0)} plantations, {stats.get('total_apos', 0)} APOs")
                else:
                    missing = [field for field in required_fields if field not in stats]
                    log_test(f"DASHBOARD_{role}", "FAIL", f"Missing fields: {missing}")
                    all_passed = False
            else:
                log_test(f"DASHBOARD_{role}", "FAIL", f"Failed to get dashboard stats for {role}")
                all_passed = False
    
    return all_passed

def main():
    """Main test execution"""
    print("🌲 KFDC iFMS Backend Testing - UPDATED REAL DATA")
    print("=" * 60)
    print(f"Testing against: {BASE_URL}")
    print("=" * 60)
    
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    # Step 1: Seed
    if test_step_1_seed():
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Step 2: Auth
    auth_passed, tokens = test_step_2_auth()
    if auth_passed:
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Only continue if we have tokens
    if not tokens:
        print("\n❌ CRITICAL: No authentication tokens available. Cannot continue testing.")
        return
    
    # Step 3: Role-scoped plantations
    if test_step_3_role_scoped_plantations(tokens):
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Step 4: Norms with SSR
    if test_step_4_norms_with_ssr(tokens):
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Step 5: APO Generate Draft
    if test_step_5_apo_generate_draft(tokens):
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Step 6: APO Workflow
    if test_step_6_apo_workflow(tokens):
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Step 7: Dashboard
    if test_step_7_dashboard(tokens):
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Final Summary
    print("\n" + "="*60)
    print("🏁 FINAL SUMMARY")
    print("="*60)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: ✅ {passed_tests}")
    print(f"Failed: ❌ {failed_tests}")
    
    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    
    if failed_tests == 0:
        print("\n🎉 ALL TESTS PASSED! KFDC iFMS backend with real data is working perfectly!")
        return True
    else:
        print(f"\n⚠️  {failed_tests} test(s) failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)