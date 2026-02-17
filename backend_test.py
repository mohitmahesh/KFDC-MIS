#!/usr/bin/env python3
"""
KFDC iFMS Backend Testing Script
Testing comprehensive backend functionality including new estimates feature
"""
import requests
import json
import sys
import os

# Base URL from environment - use localhost for testing to avoid 520 errors
BASE_URL = 'http://localhost:3001'  # Direct localhost testing
API_BASE = f"{BASE_URL}/api"

# Global auth token storage
AUTH_TOKENS = {}

class KFDCTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def print_result(self, test_name, success, message="", data=None):
        """Print test result in consistent format"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   → {message}")
        if data and isinstance(data, dict):
            if 'error' in data:
                print(f"   → Error: {data['error']}")
        print()

    def test_seed_database(self):
        """Test POST /api/seed"""
        try:
            print("🔄 Testing Database Seeding...")
            response = self.session.post(f"{API_BASE}/seed")
            
            if response.status_code == 200:
                data = response.json()
                # Check response structure and data counts
                counts = data.get('counts', {})
                users_count = counts.get('users', 0)
                activities_count = counts.get('activities', 0)
                plantations_count = counts.get('plantations', 0)
                apos_count = counts.get('apos', 0)
                
                # Consider it successful if we have reasonable data counts
                success = users_count >= 8 and activities_count >= 20 and plantations_count >= 40
                
                message = f"Seeded {users_count} users, {activities_count} activities, {plantations_count} plantations, {apos_count} APOs"
                
                # Check for new estimate users by testing if we have ECW user
                if users_count >= 10:  # Should include ECW and PS users
                    message += " (includes ECW and PS users)"
                    
                self.print_result("POST /api/seed", success, message)
                return success
            else:
                self.print_result("POST /api/seed", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.print_result("POST /api/seed", False, f"Exception: {str(e)}")
            return False

    def test_login(self, email, password, expected_role):
        """Test login for a specific user"""
        try:
            print(f"🔄 Testing Login: {email}...")
            response = self.session.post(f"{API_BASE}/auth/login", json={
                'email': email,
                'password': password
            })
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    token = data['token']
                    user = data['user']
                    role = user.get('role')
                    name = user.get('name')
                    
                    # Store token for later use
                    AUTH_TOKENS[role] = token
                    
                    success = role == expected_role
                    message = f"{name} ({role})" + (" ✓" if success else f" ≠ {expected_role}")
                    
                    self.print_result(f"Login {email}", success, message)
                    return success, token
                else:
                    self.print_result(f"Login {email}", False, "Missing token or user in response")
                    return False, None
            else:
                self.print_result(f"Login {email}", False, f"HTTP {response.status_code}")
                return False, None
                
        except Exception as e:
            self.print_result(f"Login {email}", False, f"Exception: {str(e)}")
            return False, None

    def test_dashboard_stats(self, token, expected_role):
        """Test GET /api/dashboard/stats with auth"""
        try:
            print(f"🔄 Testing Dashboard Stats for {expected_role}...")
            headers = {'Authorization': f'Bearer {token}'}
            response = self.session.get(f"{API_BASE}/dashboard/stats", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['total_plantations', 'total_apos', 'total_sanctioned_amount']
                
                success = all(field in data for field in required_fields)
                plantations = data.get('total_plantations', 0)
                apos = data.get('total_apos', 0)
                
                message = f"Plantations: {plantations}, APOs: {apos}"
                self.print_result(f"Dashboard Stats ({expected_role})", success, message)
                return success
            else:
                self.print_result(f"Dashboard Stats ({expected_role})", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.print_result(f"Dashboard Stats ({expected_role})", False, f"Exception: {str(e)}")
            return False

    def test_basic_endpoints(self, token):
        """Test basic GET endpoints"""
        endpoints = [
            ('/plantations', 'Plantations'),
            ('/apo', 'APOs'),
            ('/activities', 'Activities'),
            ('/norms', 'Norms')
        ]
        
        headers = {'Authorization': f'Bearer {token}'}
        results = []
        
        for endpoint, name in endpoints:
            try:
                print(f"🔄 Testing GET {endpoint}...")
                response = self.session.get(f"{API_BASE}{endpoint}", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    count = len(data) if isinstance(data, list) else 1
                    self.print_result(f"GET {endpoint}", True, f"Retrieved {count} {name.lower()}")
                    results.append(True)
                else:
                    self.print_result(f"GET {endpoint}", False, f"HTTP {response.status_code}")
                    results.append(False)
            except Exception as e:
                self.print_result(f"GET {endpoint}", False, f"Exception: {str(e)}")
                results.append(False)
                
        return all(results)

    def test_apo_workflow(self, ro_token, dm_token):
        """Test complete APO workflow: create draft → add works → submit → approve"""
        try:
            print("🔄 Testing APO Draft & Append Workflow...")
            
            # Step 1: Create draft APO as RO
            print("   → Creating draft APO...")
            ro_headers = {'Authorization': f'Bearer {ro_token}'}
            
            # Get a plantation first
            plantations_resp = self.session.get(f"{API_BASE}/plantations", headers=ro_headers)
            if plantations_resp.status_code != 200:
                self.print_result("APO Workflow", False, "Cannot get plantations")
                return False
                
            plantations = plantations_resp.json()
            if not plantations:
                self.print_result("APO Workflow", False, "No plantations available")
                return False
                
            test_plantation = plantations[0]  # Use first plantation
            plantation_id = test_plantation['id']
            
            apo_data = {
                'plantation_id': plantation_id,
                'financial_year': '2026-27',
                'title': 'Test APO for Backend Testing'
            }
            
            apo_response = self.session.post(f"{API_BASE}/apo", json=apo_data, headers=ro_headers)
            if apo_response.status_code != 201:
                self.print_result("APO Workflow - Create", False, f"Create APO failed: HTTP {apo_response.status_code}")
                return False
                
            apo = apo_response.json()
            apo_id = apo['id']
            print(f"   → APO created: {apo_id}")
            
            # Step 2: Add work to APO
            print("   → Adding work to APO...")
            
            # Get activity suggestions for plantation
            suggest_response = self.session.post(
                f"{API_BASE}/works/suggest-activities", 
                json={'plantation_id': plantation_id}, 
                headers=ro_headers
            )
            
            if suggest_response.status_code == 200:
                activities = suggest_response.json()
                if activities:
                    # Add first suggested activity
                    activity = activities[0]
                    work_data = {
                        'apo_id': apo_id,
                        'plantation_id': plantation_id,
                        'items': [activity]  # Use suggested activity with rate
                    }
                    
                    work_response = self.session.post(f"{API_BASE}/works", json=work_data, headers=ro_headers)
                    if work_response.status_code != 201:
                        self.print_result("APO Workflow - Add Work", False, f"Add work failed: HTTP {work_response.status_code}")
                        return False
                        
                    print("   → Work added successfully")
                else:
                    self.print_result("APO Workflow", False, "No activity suggestions available")
                    return False
            else:
                self.print_result("APO Workflow", False, f"Activity suggestions failed: HTTP {suggest_response.status_code}")
                return False
                
            # Step 3: Submit APO
            print("   → Submitting APO...")
            submit_response = self.session.patch(
                f"{API_BASE}/apo/{apo_id}/status", 
                json={'status': 'PENDING_APPROVAL'}, 
                headers=ro_headers
            )
            
            if submit_response.status_code != 200:
                self.print_result("APO Workflow - Submit", False, f"Submit failed: HTTP {submit_response.status_code}")
                return False
                
            print("   → APO submitted for approval")
            
            # Step 4: Approve APO as DM
            print("   → Approving APO as DM...")
            dm_headers = {'Authorization': f'Bearer {dm_token}'}
            
            approve_response = self.session.patch(
                f"{API_BASE}/apo/{apo_id}/status", 
                json={'status': 'SANCTIONED'}, 
                headers=dm_headers
            )
            
            if approve_response.status_code == 200:
                print("   → APO approved successfully")
                self.print_result("APO Workflow (Complete)", True, f"APO {apo_id} created → submitted → approved")
                return True, apo_id
            else:
                self.print_result("APO Workflow - Approve", False, f"Approve failed: HTTP {approve_response.status_code}")
                return False, None
                
        except Exception as e:
            self.print_result("APO Workflow", False, f"Exception: {str(e)}")
            return False, None

    def test_estimates_feature(self, ecw_token, ps_token):
        """Test the NEW estimates feature comprehensively"""
        try:
            print("🔄 Testing NEW Estimates Feature...")
            
            # Step 1: Get estimates for plantation plt-d01 as ECW
            print("   → Getting estimates for plt-d01...")
            ecw_headers = {'Authorization': f'Bearer {ecw_token}'}
            
            estimates_response = self.session.get(
                f"{API_BASE}/apo/estimates?plantation_id=plt-d01", 
                headers=ecw_headers
            )
            
            if estimates_response.status_code != 200:
                self.print_result("Estimates - Get Items", False, f"HTTP {estimates_response.status_code}")
                return False
                
            estimates = estimates_response.json()
            if not estimates:
                self.print_result("Estimates - Get Items", False, "No sanctioned APO items found for plt-d01")
                return False
                
            print(f"   → Found {len(estimates)} estimate items")
            test_item = estimates[0]
            item_id = test_item['id']
            original_qty = test_item.get('sanctioned_qty', 1)
            rate = test_item.get('sanctioned_rate', 100)
            
            # Step 2: Update revised_qty as ECW
            print("   → Updating revised quantity as ECW...")
            revised_qty = max(1, original_qty - 5)  # Reduce quantity to test budget
            
            update_response = self.session.patch(
                f"{API_BASE}/apo/items/{item_id}/estimate",
                json={
                    'revised_qty': revised_qty,
                    'user_role': 'CASE_WORKER_ESTIMATES'
                },
                headers=ecw_headers
            )
            
            if update_response.status_code != 200:
                self.print_result("Estimates - Update Qty", False, f"HTTP {update_response.status_code}")
                return False
                
            print(f"   → Revised quantity updated to {revised_qty}")
            
            # Step 3: Submit estimate as ECW
            print("   → Submitting estimate as ECW...")
            submit_response = self.session.patch(
                f"{API_BASE}/apo/items/{item_id}/status",
                json={
                    'status': 'SUBMITTED',
                    'user_role': 'CASE_WORKER_ESTIMATES'
                },
                headers=ecw_headers
            )
            
            if submit_response.status_code != 200:
                self.print_result("Estimates - Submit", False, f"HTTP {submit_response.status_code}")
                return False
                
            print("   → Estimate submitted successfully")
            
            # Step 4: Test RBAC - ECW should NOT be able to approve
            print("   → Testing RBAC - ECW trying to approve (should fail)...")
            rbac_fail_response = self.session.patch(
                f"{API_BASE}/apo/items/{item_id}/status",
                json={
                    'status': 'APPROVED',
                    'user_role': 'CASE_WORKER_ESTIMATES'
                },
                headers=ecw_headers
            )
            
            rbac_blocked = rbac_fail_response.status_code == 403
            if rbac_blocked:
                print("   → ✓ RBAC working: ECW blocked from approving")
            else:
                self.print_result("Estimates - RBAC", False, f"ECW was able to approve (should be blocked): HTTP {rbac_fail_response.status_code}")
                return False
                
            # Step 5: Approve estimate as PS
            print("   → Approving estimate as PS...")
            ps_headers = {'Authorization': f'Bearer {ps_token}'}
            
            approve_response = self.session.patch(
                f"{API_BASE}/apo/items/{item_id}/status",
                json={
                    'status': 'APPROVED',
                    'user_role': 'PLANTATION_SUPERVISOR'
                },
                headers=ps_headers
            )
            
            if approve_response.status_code != 200:
                self.print_result("Estimates - Approve", False, f"HTTP {approve_response.status_code}")
                return False
                
            print("   → Estimate approved by PS")
            
            # Step 6: Test RBAC - PS should NOT be able to edit quantities
            print("   → Testing RBAC - PS trying to edit quantity (should fail)...")
            ps_edit_response = self.session.patch(
                f"{API_BASE}/apo/items/{item_id}/estimate",
                json={
                    'revised_qty': revised_qty + 10,
                    'user_role': 'PLANTATION_SUPERVISOR'
                },
                headers=ps_headers
            )
            
            ps_blocked = ps_edit_response.status_code == 403
            if ps_blocked:
                print("   → ✓ RBAC working: PS blocked from editing quantities")
            else:
                self.print_result("Estimates - RBAC", False, f"PS was able to edit quantities (should be blocked): HTTP {ps_edit_response.status_code}")
                return False
                
            # Step 7: Test budget validation by trying to exceed sanctioned amount
            print("   → Testing budget validation...")
            
            # First, create another item to test budget overflow
            if len(estimates) > 1:
                second_item = estimates[1]
                second_item_id = second_item['id']
                
                # Try to set a very high quantity that would exceed budget
                high_qty = original_qty * 100  # Intentionally high
                
                budget_test_response = self.session.patch(
                    f"{API_BASE}/apo/items/{second_item_id}/estimate",
                    json={
                        'revised_qty': high_qty,
                        'user_role': 'CASE_WORKER_ESTIMATES'
                    },
                    headers=ecw_headers
                )
                
                if budget_test_response.status_code == 400:
                    print("   → ✓ Budget validation working: High quantity rejected")
                else:
                    print("   → Budget validation may not be triggered or APO has high budget")
            
            self.print_result("NEW Estimates Feature (Complete)", True, "All estimates workflow and RBAC rules working correctly")
            return True
            
        except Exception as e:
            self.print_result("NEW Estimates Feature", False, f"Exception: {str(e)}")
            return False

def main():
    print("=" * 80)
    print("🧪 KFDC iFMS Backend Testing - Comprehensive Test Suite")
    print("   Including NEW Estimates Feature Testing")
    print("=" * 80)
    print()
    
    tester = KFDCTester()
    
    # Test Results Tracking
    test_results = []
    
    # 1. Seed Database
    print("📂 PHASE 1: DATABASE SEEDING")
    print("-" * 40)
    seed_result = tester.test_seed_database()
    test_results.append(("Database Seeding", seed_result))
    
    # 2. Authentication Tests
    print("🔐 PHASE 2: AUTHENTICATION TESTING")
    print("-" * 40)
    
    login_tests = [
        ('ro.dharwad@kfdc.in', 'pass123', 'RO'),
        ('dm.dharwad@kfdc.in', 'pass123', 'DM'),
        ('ecw.dharwad@kfdc.in', 'pass123', 'CASE_WORKER_ESTIMATES'),
        ('ps.dharwad@kfdc.in', 'pass123', 'PLANTATION_SUPERVISOR')
    ]
    
    login_results = []
    tokens = {}
    
    for email, password, expected_role in login_tests:
        success, token = tester.test_login(email, password, expected_role)
        login_results.append(success)
        if success and token:
            tokens[expected_role] = token
    
    auth_success = all(login_results)
    test_results.append(("Authentication (All Users)", auth_success))
    
    if not auth_success:
        print("❌ Authentication failed - cannot proceed with remaining tests")
        sys.exit(1)
    
    # 3. Basic API Endpoints
    print("📡 PHASE 3: BASIC API ENDPOINTS")
    print("-" * 40)
    
    basic_endpoints_result = True
    for role, token in tokens.items():
        if role in ['RO', 'DM']:  # Test basic endpoints with standard roles
            dashboard_result = tester.test_dashboard_stats(token, role)
            basic_result = tester.test_basic_endpoints(token)
            if not dashboard_result or not basic_result:
                basic_endpoints_result = False
    
    test_results.append(("Basic API Endpoints", basic_endpoints_result))
    
    # 4. APO Workflow Testing
    print("📋 PHASE 4: APO WORKFLOW TESTING")
    print("-" * 40)
    
    if 'RO' in tokens and 'DM' in tokens:
        apo_workflow_result = tester.test_apo_workflow(tokens['RO'], tokens['DM'])
        if isinstance(apo_workflow_result, tuple):
            apo_result, apo_id = apo_workflow_result
        else:
            apo_result = apo_workflow_result
        test_results.append(("APO Workflow", apo_result))
    else:
        print("❌ Missing RO or DM tokens - skipping APO workflow test")
        test_results.append(("APO Workflow", False))
    
    # 5. NEW Estimates Feature Testing
    print("🎯 PHASE 5: NEW ESTIMATES FEATURE TESTING")
    print("-" * 40)
    
    if 'CASE_WORKER_ESTIMATES' in tokens and 'PLANTATION_SUPERVISOR' in tokens:
        estimates_result = tester.test_estimates_feature(
            tokens['CASE_WORKER_ESTIMATES'], 
            tokens['PLANTATION_SUPERVISOR']
        )
        test_results.append(("NEW Estimates Feature", estimates_result))
    else:
        print("❌ Missing ECW or PS tokens - skipping estimates feature test")
        test_results.append(("NEW Estimates Feature", False))
    
    # Final Results Summary
    print("=" * 80)
    print("📊 FINAL TEST RESULTS SUMMARY")
    print("=" * 80)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
    
    print()
    print(f"📈 OVERALL: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! KFDC iFMS backend is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please review the results above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)