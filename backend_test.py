#!/usr/bin/env python3
"""
KFDC iFMS v2 Backend Testing Script - Works Edition
Testing NEW RESTRUCTURED system with Activity → Works → APO hierarchy
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
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except Exception as e:
        log_test("REQUEST_ERROR", "FAIL", f"Failed to make {method} request to {endpoint}: {str(e)}")
        return None

def test_step_1_seed():
    """Step 1: SEED - Verify new structure with 'works' collection"""
    print("\n" + "="*50)
    print("STEP 1: SEED (v2 - Works Edition)")
    print("="*50)
    
    response = make_request("POST", "/seed")
    if not response:
        return False
        
    if response.status_code == 200:
        data = response.json()
        message = data.get("message", "")
        counts = data.get("counts", {})
        
        # Verify this is Works edition
        if "Works edition" in message:
            log_test("SEED_WORKS_EDITION", "PASS", "Confirmed Works edition seeding")
        else:
            log_test("SEED_WORKS_EDITION", "FAIL", f"Expected Works edition, got: {message}")
            return False
            
        # Verify 'works' in counts (not 'apo_items')
        if "works" in counts:
            works_count = counts["works"]
            log_test("SEED_WORKS_COLLECTION", "PASS", f"Works collection seeded with {works_count} entries")
        else:
            log_test("SEED_WORKS_COLLECTION", "FAIL", "No 'works' collection found in seed counts")
            return False
            
        # Check other expected counts
        expected = {
            "divisions": 4, "ranges": 19, "users": 8, "activities": 25,
            "plantations": 18  # From seed data
        }
        
        all_correct = True
        for key, expected_count in expected.items():
            actual = counts.get(key, 0)
            if actual >= expected_count:
                log_test(f"SEED_{key.upper()}", "PASS", f"Expected {expected_count}+, got {actual}")
            else:
                log_test(f"SEED_{key.upper()}", "FAIL", f"Expected {expected_count}+, got {actual}")
                all_correct = False
                
        return all_correct
    else:
        log_test("SEED", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return False

def test_step_2_auth():
    """Step 2: Auth - Login RO and DM tokens"""
    print("\n" + "="*50)
    print("STEP 2: AUTH (Login RO & DM)")
    print("="*50)
    
    tokens = {}
    all_passed = True
    
    # Test users from review request
    test_users = [
        {"email": "ro.dharwad@kfdc.in", "password": "pass123", "role": "RO"},
        {"email": "dm.dharwad@kfdc.in", "password": "pass123", "role": "DM"}
    ]
    
    for user in test_users:
        response = make_request("POST", "/auth/login", data=user)
        
        if response and response.status_code == 200:
            data = response.json()
            token = data.get("token")
            user_data = data.get("user", {})
            
            if token and user_data.get("role") == user["role"]:
                log_test(f"AUTH_{user['role']}", "PASS", f"Login successful for {user['email']}")
                tokens[user["role"]] = token
            else:
                log_test(f"AUTH_{user['role']}", "FAIL", f"Invalid response for {user['email']}")
                all_passed = False
        else:
            log_test(f"AUTH_{user['role']}", "FAIL", f"Login failed for {user['email']}")
            all_passed = False
    
    return all_passed, tokens

def test_step_3_apo_draft_append(tokens):
    """Step 3: APO Draft & Append Workflow (KEY NEW FEATURE)"""
    print("\n" + "="*50)
    print("STEP 3: APO DRAFT & APPEND WORKFLOW")
    print("="*50)
    
    if "RO" not in tokens:
        log_test("APO_DRAFT_WORKFLOW", "FAIL", "No RO token available")
        return False, None
        
    all_passed = True
    
    # a) Create DRAFT APO header (no items)
    apo_data = {"financial_year": "2026-27"}
    response = make_request("POST", "/apo", 
                           headers={"Authorization": f"Bearer {tokens['RO']}"}, 
                           data=apo_data)
    
    if response and response.status_code == 201:
        apo = response.json()
        apo_id = apo.get("id")
        status = apo.get("status")
        total_amount = apo.get("total_sanctioned_amount", 0)
        
        if status == "DRAFT" and total_amount == 0:
            log_test("APO_CREATE_DRAFT", "PASS", f"APO header created as DRAFT: {apo_id}")
        else:
            log_test("APO_CREATE_DRAFT", "FAIL", f"Expected DRAFT with 0 amount, got {status} with {total_amount}")
            all_passed = False
            
        # b) Suggest activities for plantation
        suggest_response = make_request("POST", "/works/suggest-activities",
                                       headers={"Authorization": f"Bearer {tokens['RO']}"},
                                       data={"plantation_id": "plt-d02", "financial_year": "2026-27"})
        
        if suggest_response and suggest_response.status_code == 200:
            suggestions = suggest_response.json()
            suggested_activities = suggestions.get("suggested_activities", [])
            plantation_name = suggestions.get("plantation_name")
            age = suggestions.get("age")
            
            log_test("WORKS_SUGGEST_ACTIVITIES", "PASS", 
                    f"Suggested {len(suggested_activities)} activities for {plantation_name} (age {age})")
                    
            # c) Create first Work inside the draft APO
            if suggested_activities:
                first_activity = suggested_activities[0]  # Take first suggested activity
                work_data = {
                    "apo_id": apo_id,
                    "plantation_id": "plt-d02", 
                    "name": "Year 9 Maintenance - Varavanagalavi",
                    "items": [{
                        "activity_id": first_activity["activity_id"],
                        "activity_name": first_activity["activity_name"],
                        "unit": first_activity["unit"],
                        "ssr_no": first_activity["ssr_no"],
                        "sanctioned_rate": first_activity["sanctioned_rate"],
                        "sanctioned_qty": 10  # Use 10 as per review request
                    }]
                }
                
                work_response = make_request("POST", "/works",
                                           headers={"Authorization": f"Bearer {tokens['RO']}"},
                                           data=work_data)
                
                if work_response and work_response.status_code == 201:
                    work = work_response.json()
                    work_id = work.get("id")
                    log_test("WORKS_CREATE_FIRST", "PASS", f"First work created: {work_id}")
                    
                    # d) Verify APO now shows 1 work
                    apo_detail_response = make_request("GET", f"/apo/{apo_id}",
                                                      headers={"Authorization": f"Bearer {tokens['RO']}"})
                    
                    if apo_detail_response and apo_detail_response.status_code == 200:
                        apo_detail = apo_detail_response.json()
                        works = apo_detail.get("works", [])
                        total_amount = apo_detail.get("total_amount", 0)
                        
                        if len(works) == 1 and total_amount > 0:
                            log_test("APO_VERIFY_ONE_WORK", "PASS", f"APO has 1 work, total: ₹{total_amount}")
                        else:
                            log_test("APO_VERIFY_ONE_WORK", "FAIL", f"Expected 1 work, got {len(works)}")
                            all_passed = False
                            
                        # e) Add SECOND work to same APO
                        if len(suggested_activities) > 1:
                            second_activity = suggested_activities[1]
                            second_work_data = {
                                "apo_id": apo_id,
                                "plantation_id": "plt-d05",
                                "name": "Year 8 Maintenance - Degaon", 
                                "items": [{
                                    "activity_id": second_activity["activity_id"],
                                    "activity_name": second_activity["activity_name"], 
                                    "unit": second_activity["unit"],
                                    "ssr_no": second_activity["ssr_no"],
                                    "sanctioned_rate": second_activity["sanctioned_rate"],
                                    "sanctioned_qty": 14.6  # As per review request
                                }]
                            }
                            
                            second_work_response = make_request("POST", "/works",
                                                              headers={"Authorization": f"Bearer {tokens['RO']}"},
                                                              data=second_work_data)
                            
                            if second_work_response and second_work_response.status_code == 201:
                                log_test("WORKS_CREATE_SECOND", "PASS", "Second work created")
                                
                                # f) Verify APO now shows 2 works with recalculated total
                                final_apo_response = make_request("GET", f"/apo/{apo_id}",
                                                                 headers={"Authorization": f"Bearer {tokens['RO']}"})
                                
                                if final_apo_response and final_apo_response.status_code == 200:
                                    final_apo = final_apo_response.json()
                                    final_works = final_apo.get("works", [])
                                    final_total = final_apo.get("total_amount", 0)
                                    
                                    if len(final_works) == 2 and final_total > total_amount:
                                        log_test("APO_VERIFY_TWO_WORKS", "PASS", f"APO has 2 works, recalculated total: ₹{final_total}")
                                        return all_passed, apo_id
                                    else:
                                        log_test("APO_VERIFY_TWO_WORKS", "FAIL", f"Expected 2 works, got {len(final_works)}")
                                        all_passed = False
                                else:
                                    log_test("APO_VERIFY_TWO_WORKS", "FAIL", "Failed to get final APO details")
                                    all_passed = False
                            else:
                                log_test("WORKS_CREATE_SECOND", "FAIL", "Failed to create second work")
                                all_passed = False
                        else:
                            log_test("WORKS_CREATE_SECOND", "FAIL", "Not enough suggested activities")
                            all_passed = False
                    else:
                        log_test("APO_VERIFY_ONE_WORK", "FAIL", "Failed to get APO details")
                        all_passed = False
                else:
                    log_test("WORKS_CREATE_FIRST", "FAIL", "Failed to create first work")
                    all_passed = False
            else:
                log_test("WORKS_CREATE_FIRST", "FAIL", "No suggested activities available")
                all_passed = False
        else:
            log_test("WORKS_SUGGEST_ACTIVITIES", "FAIL", "Failed to get activity suggestions")
            all_passed = False
            
        return all_passed, apo_id
    else:
        log_test("APO_CREATE_DRAFT", "FAIL", "Failed to create draft APO")
        return False, None

def test_step_4_submit_approve(tokens, apo_id):
    """Step 4: Submit & Approve workflow"""
    print("\n" + "="*50)
    print("STEP 4: SUBMIT & APPROVE")
    print("="*50)
    
    if not apo_id or "RO" not in tokens or "DM" not in tokens:
        log_test("SUBMIT_APPROVE", "FAIL", "Missing APO ID or tokens")
        return False
        
    all_passed = True
    
    # a) Submit APO as RO
    submit_response = make_request("PATCH", f"/apo/{apo_id}/status",
                                  headers={"Authorization": f"Bearer {tokens['RO']}"},
                                  data={"status": "PENDING_APPROVAL"})
    
    if submit_response and submit_response.status_code == 200:
        log_test("APO_SUBMIT", "PASS", "APO submitted for approval")
        
        # b) Try to add work to non-DRAFT APO (should fail)
        fail_work_data = {
            "apo_id": apo_id,
            "plantation_id": "plt-d03",
            "name": "Should Fail",
            "items": [{
                "activity_id": "act-fireline",
                "activity_name": "Test Activity",
                "unit": "Per Hectare",
                "ssr_no": "99(a)",
                "sanctioned_rate": 5000,
                "sanctioned_qty": 1
            }]
        }
        
        fail_response = make_request("POST", "/works",
                                    headers={"Authorization": f"Bearer {tokens['RO']}"},
                                    data=fail_work_data)
        
        if fail_response and fail_response.status_code == 400:
            error_msg = fail_response.json().get("error", "")
            if "DRAFT" in error_msg:
                log_test("WORKS_NON_DRAFT_FAIL", "PASS", "Correctly blocked work addition to non-DRAFT APO")
            else:
                log_test("WORKS_NON_DRAFT_FAIL", "FAIL", f"Wrong error message: {error_msg}")
                all_passed = False
        else:
            log_test("WORKS_NON_DRAFT_FAIL", "FAIL", "Should have blocked work addition to non-DRAFT APO")
            all_passed = False
            
        # c) Approve as DM
        approve_response = make_request("PATCH", f"/apo/{apo_id}/status",
                                       headers={"Authorization": f"Bearer {tokens['DM']}"},
                                       data={"status": "SANCTIONED"})
        
        if approve_response and approve_response.status_code == 200:
            log_test("APO_APPROVE", "PASS", "APO approved by DM")
            return all_passed
        else:
            log_test("APO_APPROVE", "FAIL", "Failed to approve APO as DM")
            all_passed = False
    else:
        log_test("APO_SUBMIT", "FAIL", "Failed to submit APO")
        all_passed = False
        
    return all_passed

def test_step_5_work_logs_budget(tokens, apo_id):
    """Step 5: Work Logs with Budget Enforcement"""
    print("\n" + "="*50)
    print("STEP 5: WORK LOGS WITH BUDGET ENFORCEMENT")
    print("="*50)
    
    if not apo_id or "RO" not in tokens:
        log_test("WORK_LOGS", "FAIL", "Missing APO ID or RO token")
        return False
        
    all_passed = True
    
    # Get work items from the APO detail
    apo_response = make_request("GET", f"/apo/{apo_id}",
                               headers={"Authorization": f"Bearer {tokens['RO']}"})
    
    if apo_response and apo_response.status_code == 200:
        apo_detail = apo_response.json()
        works = apo_detail.get("works", [])
        
        if works and works[0].get("items"):
            work = works[0]
            work_id = work.get("id")
            first_item = work["items"][0]
            item_id = first_item.get("id")
            total_cost = first_item.get("total_cost", 0)
            
            log_test("WORK_LOGS_SETUP", "PASS", f"Found work item {item_id} with budget ₹{total_cost}")
            
            # a) Log valid work within budget
            valid_log_data = {
                "work_item_id": item_id,
                "work_id": work_id,
                "actual_qty": 5,
                "expenditure": min(10000, total_cost * 0.5)  # Use 50% of budget
            }
            
            log_response = make_request("POST", "/work-logs",
                                       headers={"Authorization": f"Bearer {tokens['RO']}"},
                                       data=valid_log_data)
            
            if log_response and log_response.status_code == 201:
                log_test("WORK_LOGS_VALID", "PASS", f"Work log created within budget")
                
                # b) Try exceeding budget
                excess_amount = total_cost + 1000  # Exceed budget by 1000
                excess_log_data = {
                    "work_item_id": item_id,
                    "work_id": work_id,
                    "actual_qty": 10,
                    "expenditure": excess_amount
                }
                
                excess_response = make_request("POST", "/work-logs",
                                              headers={"Authorization": f"Bearer {tokens['RO']}"},
                                              data=excess_log_data)
                
                if excess_response and excess_response.status_code == 400:
                    error_data = excess_response.json()
                    error_msg = error_data.get("error", "")
                    
                    if "Budget Exceeded" in error_msg:
                        log_test("BUDGET_ENFORCEMENT", "PASS", "Budget enforcement working - rejected overbudget expenditure")
                    else:
                        log_test("BUDGET_ENFORCEMENT", "FAIL", f"Wrong error message: {error_msg}")
                        all_passed = False
                else:
                    log_test("BUDGET_ENFORCEMENT", "FAIL", f"Expected 400, got {excess_response.status_code if excess_response else 'None'}")
                    all_passed = False
            else:
                log_test("WORK_LOGS_VALID", "FAIL", f"Failed to create valid work log")
                all_passed = False
        else:
            log_test("WORK_LOGS_SETUP", "FAIL", "No work items found in APO")
            all_passed = False
    else:
        log_test("WORK_LOGS_SETUP", "FAIL", "Failed to get APO details")
        all_passed = False
        
    return all_passed

def test_step_6_delete_work_from_draft(tokens):
    """Step 6: Delete Work from Draft APO"""
    print("\n" + "="*50)
    print("STEP 6: DELETE WORK FROM DRAFT")
    print("="*50)
    
    if "RO" not in tokens:
        log_test("DELETE_WORK", "FAIL", "No RO token available")
        return False
        
    all_passed = True
    
    # a) Create another DRAFT APO
    draft_apo_data = {"financial_year": "2026-27"}
    apo_response = make_request("POST", "/apo",
                               headers={"Authorization": f"Bearer {tokens['RO']}"},
                               data=draft_apo_data)
    
    if apo_response and apo_response.status_code == 201:
        draft_apo = apo_response.json()
        draft_apo_id = draft_apo.get("id")
        
        # Add a work to it
        work_data = {
            "apo_id": draft_apo_id,
            "plantation_id": "plt-d02",
            "name": "Test Work for Deletion",
            "items": [{
                "activity_id": "act-fireline",
                "activity_name": "Clearing 5m Wide Fire Lines",
                "unit": "Per Hectare",
                "ssr_no": "99(a)",
                "sanctioned_rate": 5455.86,
                "sanctioned_qty": 5
            }]
        }
        
        work_response = make_request("POST", "/works",
                                    headers={"Authorization": f"Bearer {tokens['RO']}"},
                                    data=work_data)
        
        if work_response and work_response.status_code == 201:
            work = work_response.json()
            work_id = work.get("id")
            
            # Delete the work (should succeed)
            delete_response = make_request("DELETE", f"/works/{work_id}",
                                          headers={"Authorization": f"Bearer {tokens['RO']}"})
            
            if delete_response and delete_response.status_code == 200:
                log_test("DELETE_WORK_DRAFT", "PASS", "Successfully deleted work from DRAFT APO")
            else:
                log_test("DELETE_WORK_DRAFT", "FAIL", f"Failed to delete work from DRAFT APO")
                all_passed = False
        else:
            log_test("DELETE_WORK_SETUP", "FAIL", "Failed to create work for deletion test")
            all_passed = False
    else:
        log_test("DELETE_WORK_SETUP", "FAIL", "Failed to create draft APO for deletion test")
        all_passed = False
        
    return all_passed

def test_step_7_plantation_new_fields(tokens):
    """Step 7: Plantation with new fields (vidhana_sabha, lok_sabha, latitude, longitude)"""
    print("\n" + "="*50)
    print("STEP 7: PLANTATION WITH NEW FIELDS")
    print("="*50)
    
    if "RO" not in tokens:
        log_test("PLANTATION_NEW_FIELDS", "FAIL", "No RO token available")
        return False
        
    all_passed = True
    
    # a) Create plantation with new fields
    plantation_data = {
        "name": "Test Plantation with New Fields",
        "species": "Eucalyptus Test",
        "year_of_planting": 2020,
        "total_area_ha": 15.5,
        "village": "Test Village",
        "taluk": "Test Taluk", 
        "district": "Test District",
        "vidhana_sabha": "Test Vidhana Sabha",
        "lok_sabha": "Test Lok Sabha",
        "latitude": 15.4589,
        "longitude": 75.0078
    }
    
    create_response = make_request("POST", "/plantations",
                                  headers={"Authorization": f"Bearer {tokens['RO']}"},
                                  data=plantation_data)
    
    if create_response and create_response.status_code == 201:
        plantation = create_response.json()
        plantation_id = plantation.get("id")
        
        # Verify new fields are present
        new_fields = ["vidhana_sabha", "lok_sabha", "latitude", "longitude"]
        missing_fields = [field for field in new_fields if field not in plantation or plantation[field] is None]
        
        if not missing_fields:
            log_test("PLANTATION_CREATE_NEW_FIELDS", "PASS", f"Plantation created with all new fields")
            
            # b) Update plantation using PUT
            update_data = {
                "vidhana_sabha": "Updated Vidhana Sabha",
                "lok_sabha": "Updated Lok Sabha",
                "latitude": 16.5000,
                "longitude": 76.0000
            }
            
            update_response = make_request("PUT", f"/plantations/{plantation_id}",
                                          headers={"Authorization": f"Bearer {tokens['RO']}"},
                                          data=update_data)
            
            if update_response and update_response.status_code == 200:
                updated_plantation = update_response.json()
                
                if (updated_plantation.get("vidhana_sabha") == "Updated Vidhana Sabha" and
                    updated_plantation.get("latitude") == 16.5000):
                    log_test("PLANTATION_UPDATE_NEW_FIELDS", "PASS", "Plantation updated successfully")
                else:
                    log_test("PLANTATION_UPDATE_NEW_FIELDS", "FAIL", "Update values not reflected")
                    all_passed = False
            else:
                log_test("PLANTATION_UPDATE_NEW_FIELDS", "FAIL", "Failed to update plantation")
                all_passed = False
        else:
            log_test("PLANTATION_CREATE_NEW_FIELDS", "FAIL", f"Missing fields: {missing_fields}")
            all_passed = False
    else:
        log_test("PLANTATION_CREATE_NEW_FIELDS", "FAIL", "Failed to create plantation")
        all_passed = False
        
    return all_passed

def main():
    """Main test execution following the review request workflow"""
    print("🌲 KFDC iFMS v2 Backend Testing - WORKS EDITION")
    print("Testing RESTRUCTURED system with Activity → Works → APO hierarchy")
    print("=" * 70)
    print(f"Testing against: {BASE_URL}")
    print("=" * 70)
    
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    # Step 1: SEED
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
    
    if not tokens:
        print("\n❌ CRITICAL: No authentication tokens. Cannot continue.")
        return False
    
    # Step 3: APO Draft & Append Workflow 
    draft_passed, apo_id = test_step_3_apo_draft_append(tokens)
    if draft_passed:
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Step 4: Submit & Approve
    if apo_id and test_step_4_submit_approve(tokens, apo_id):
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Step 5: Work Logs with Budget Enforcement
    if apo_id and test_step_5_work_logs_budget(tokens, apo_id):
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Step 6: Delete Work from Draft
    if test_step_6_delete_work_from_draft(tokens):
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Step 7: Plantation with new fields
    if test_step_7_plantation_new_fields(tokens):
        passed_tests += 1
    else:
        failed_tests += 1
    total_tests += 1
    
    # Final Summary
    print("\n" + "="*70)
    print("🏁 FINAL SUMMARY - KFDC iFMS v2 WORKS EDITION")
    print("="*70)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: ✅ {passed_tests}")
    print(f"Failed: ❌ {failed_tests}")
    
    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    
    if failed_tests == 0:
        print("\n🎉 ALL TESTS PASSED! KFDC iFMS v2 Works Edition backend is working perfectly!")
        print("✅ NEW Activity → Works → APO hierarchy verified")
        print("✅ Draft & Append workflow working")
        print("✅ Budget enforcement via Works functional")
        print("✅ Plantation new fields supported")
        return True
    else:
        print(f"\n⚠️  {failed_tests} test(s) failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)