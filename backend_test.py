#!/usr/bin/env python3
"""
KFDC iFMS Backend API Testing Script
Tests all backend endpoints with role-based access control
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://forest-apo-hub.preview.emergentagent.com/api"

# Test users
TEST_USERS = {
    'ro': {'email': 'ro.sagara@kfdc.in', 'password': 'pass123'},
    'dm': {'email': 'dm.shimoga@kfdc.in', 'password': 'pass123'},
    'admin': {'email': 'admin@kfdc.in', 'password': 'pass123'}
}

class KFDCTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.test_results = {}
        
    def log(self, message, level="INFO"):
        print(f"[{level}] {datetime.now().strftime('%H:%M:%S')} - {message}")
        
    def test_endpoint(self, method, endpoint, data=None, headers=None, expected_status=200):
        """Test a single endpoint"""
        url = f"{BASE_URL}{endpoint}"
        try:
            response = self.session.request(method, url, json=data, headers=headers)
            self.log(f"{method} {endpoint} -> {response.status_code}")
            
            if response.status_code != expected_status:
                self.log(f"  Expected {expected_status}, got {response.status_code}", "WARNING")
                if response.text:
                    try:
                        error_data = response.json()
                        self.log(f"  Error: {error_data.get('error', 'No error message')}", "WARNING")
                    except:
                        self.log(f"  Response: {response.text[:200]}", "WARNING")
            
            # Debug: verify response object is valid
            if response is None:
                self.log(f"  DEBUG: Response object is None!", "ERROR")
                
            return response
        except Exception as e:
            self.log(f"ERROR testing {method} {endpoint}: {str(e)}", "ERROR")
            return None
            
    def run_tests(self):
        """Run all tests in order"""
        self.log("Starting KFDC iFMS Backend Tests")
        
        try:
            # Step 1: Seed Database
            self.test_seed_database()
            
            # Step 2: Authentication Tests
            self.test_authentication()
            
            # Step 3: Role-based Plantation Access
            self.test_plantation_access()
            
            # Step 4: Norms Engine
            self.test_norms_engine()
            
            # Step 5: APO Workflow
            self.test_apo_workflow()
            
            # Step 6: Work Logs with Budget Enforcement
            self.test_work_logs()
            
            # Step 7: Dashboard Stats
            self.test_dashboard_stats()
            
            # Step 8: RBAC Enforcement
            self.test_rbac_enforcement()
            
            self.print_summary()
            
        except Exception as e:
            self.log(f"Critical error during testing: {str(e)}", "ERROR")
            sys.exit(1)
            
    def test_seed_database(self):
        """Test database seeding"""
        self.log("\n=== Testing Database Seeding ===")
        
        response = self.test_endpoint("POST", "/seed")
        if response and response.status_code == 200:
            data = response.json()
            self.log(f"  Database seeded successfully: {data.get('counts', {})}")
            self.test_results['seed'] = {'status': 'PASS', 'message': 'Database seeded successfully'}
        else:
            self.test_results['seed'] = {'status': 'FAIL', 'message': 'Failed to seed database'}
            
    def test_authentication(self):
        """Test authentication for all user types"""
        self.log("\n=== Testing Authentication ===")
        
        auth_results = []
        
        for role, credentials in TEST_USERS.items():
            self.log(f"Testing {role.upper()} login...")
            
            # Test login
            response = self.test_endpoint("POST", "/auth/login", credentials)
            if response and response.status_code == 200:
                data = response.json()
                token = data.get('token')
                user = data.get('user', {})
                
                if token and user:
                    self.tokens[role] = token
                    self.log(f"  {role.upper()} login successful - {user.get('name')} ({user.get('role')})")
                    
                    # Test auth/me
                    headers = {'Authorization': f'Bearer {token}'}
                    me_response = self.test_endpoint("GET", "/auth/me", headers=headers)
                    if me_response and me_response.status_code == 200:
                        self.log(f"  {role.upper()} /auth/me successful")
                        auth_results.append(f"{role.upper()}: PASS")
                    else:
                        auth_results.append(f"{role.upper()}: FAIL - /auth/me failed")
                        
                    # Test logout (but keep token for subsequent tests)
                    # Note: We'll test logout separately to keep tokens for other tests
                else:
                    auth_results.append(f"{role.upper()}: FAIL - No token/user in response")
            else:
                auth_results.append(f"{role.upper()}: FAIL - Login failed")
                
        self.test_results['authentication'] = {
            'status': 'PASS' if all('PASS' in r for r in auth_results) else 'FAIL',
            'message': '; '.join(auth_results)
        }
        
    def test_plantation_access(self):
        """Test role-based plantation access"""
        self.log("\n=== Testing Role-Based Plantation Access ===")
        
        access_results = []
        
        for role in ['ro', 'dm', 'admin']:
            if role in self.tokens:
                headers = {'Authorization': f'Bearer {self.tokens[role]}'}
                response = self.test_endpoint("GET", "/plantations", headers=headers)
                
                if response and response.status_code == 200:
                    plantations = response.json()
                    count = len(plantations)
                    
                    # Expected counts based on RBAC
                    expected_counts = {'ro': 2, 'dm': 4, 'admin': 8}
                    expected = expected_counts.get(role, 0)
                    
                    if count == expected:
                        self.log(f"  {role.upper()}: Correctly sees {count}/{expected} plantations")
                        access_results.append(f"{role.upper()}: PASS ({count} plantations)")
                    else:
                        self.log(f"  {role.upper()}: Expected {expected}, got {count} plantations", "WARNING")
                        access_results.append(f"{role.upper()}: FAIL (expected {expected}, got {count})")
                        
                    # Test plantation detail
                    if plantations:
                        detail_response = self.test_endpoint("GET", f"/plantations/{plantations[0]['id']}", headers=headers)
                        if detail_response and detail_response.status_code == 200:
                            self.log(f"  {role.upper()}: Plantation detail access successful")
                        else:
                            self.log(f"  {role.upper()}: Plantation detail access failed", "WARNING")
                            
                        # Test plantation history
                        history_response = self.test_endpoint("GET", f"/plantations/{plantations[0]['id']}/history", headers=headers)
                        if history_response and history_response.status_code == 200:
                            self.log(f"  {role.upper()}: Plantation history access successful")
                        else:
                            self.log(f"  {role.upper()}: Plantation history access failed", "WARNING")
                else:
                    access_results.append(f"{role.upper()}: FAIL - API call failed")
                    
        self.test_results['plantation_access'] = {
            'status': 'PASS' if all('PASS' in r for r in access_results) else 'FAIL',
            'message': '; '.join(access_results)
        }
        
    def test_norms_engine(self):
        """Test the norms engine - key feature"""
        self.log("\n=== Testing Norms Engine ===")
        
        if 'ro' not in self.tokens:
            self.test_results['norms_engine'] = {'status': 'FAIL', 'message': 'No RO token available'}
            return
            
        headers = {'Authorization': f'Bearer {self.tokens["ro"]}'}
        norms_results = []
        
        # Test plt-001 (2 years old Teak in FY 2025-26) - should return Year 2 norms
        self.log("Testing plt-001 (2 years old Teak in FY 2025-26)...")
        draft_data = {"plantation_id": "plt-001", "financial_year": "2025-26"}
        response = self.test_endpoint("POST", "/apo/generate-draft", draft_data, headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            age = data.get('age')
            items = data.get('items', [])
            
            if age == 2:
                self.log(f"  plt-001: Age correctly calculated as {age}")
                
                # Check for Year 2 activities (Weeding, Soil Working, Fire Line, Fire Watching, Casualty)
                year2_activities = ['Weeding', 'Soil Working', 'Fire Line Tracing', 'Fire Watching', 'Casualty Replacement']
                found_activities = [item['activity_name'] for item in items]
                
                if any(act in found_activities for act in year2_activities):
                    self.log(f"  plt-001: Found expected Year 2 activities: {found_activities}")
                    norms_results.append("plt-001: PASS")
                else:
                    self.log(f"  plt-001: Missing expected Year 2 activities. Found: {found_activities}", "WARNING")
                    norms_results.append("plt-001: FAIL - Wrong activities")
            else:
                self.log(f"  plt-001: Wrong age calculation. Expected 2, got {age}", "WARNING")
                norms_results.append("plt-001: FAIL - Wrong age")
        else:
            norms_results.append("plt-001: FAIL - API call failed")
            
        # Test plt-002 (3 years old Eucalyptus in FY 2025-26) - should return Year 3 norms  
        self.log("Testing plt-002 (3 years old Eucalyptus in FY 2025-26)...")
        draft_data = {"plantation_id": "plt-002", "financial_year": "2025-26"}
        response = self.test_endpoint("POST", "/apo/generate-draft", draft_data, headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            age = data.get('age')
            items = data.get('items', [])
            
            if age == 3:
                self.log(f"  plt-002: Age correctly calculated as {age}")
                
                # Check for Year 3 activities (Weeding, Fire Line, Fire Watching, Pruning)
                year3_activities = ['Weeding', 'Fire Line Tracing', 'Fire Watching', 'Pruning']
                found_activities = [item['activity_name'] for item in items]
                
                if any(act in found_activities for act in year3_activities):
                    self.log(f"  plt-002: Found expected Year 3 activities: {found_activities}")
                    norms_results.append("plt-002: PASS")
                else:
                    self.log(f"  plt-002: Missing expected Year 3 activities. Found: {found_activities}", "WARNING")
                    norms_results.append("plt-002: FAIL - Wrong activities")
            else:
                self.log(f"  plt-002: Wrong age calculation. Expected 3, got {age}", "WARNING")
                norms_results.append("plt-002: FAIL - Wrong age")
        else:
            norms_results.append("plt-002: FAIL - API call failed")
            
        self.test_results['norms_engine'] = {
            'status': 'PASS' if all('PASS' in r for r in norms_results) else 'FAIL',
            'message': '; '.join(norms_results)
        }
        
    def test_apo_workflow(self):
        """Test APO creation and approval workflow"""
        self.log("\n=== Testing APO Workflow ===")
        
        if 'ro' not in self.tokens or 'dm' not in self.tokens:
            self.test_results['apo_workflow'] = {'status': 'FAIL', 'message': 'Missing required tokens'}
            return
            
        ro_headers = {'Authorization': f'Bearer {self.tokens["ro"]}'}
        dm_headers = {'Authorization': f'Bearer {self.tokens["dm"]}'}
        
        workflow_results = []
        apo_id = None
        
        # Step 1: Create APO as RO
        self.log("Creating APO as RO...")
        apo_data = {
            "plantation_id": "plt-001",
            "financial_year": "2025-26",
            "status": "PENDING_APPROVAL",
            "items": [
                {
                    "activity_id": "act-weeding",
                    "activity_name": "Weeding",
                    "sanctioned_qty": 25.5,
                    "sanctioned_rate": 5500,
                    "unit": "Per Hectare"
                },
                {
                    "activity_id": "act-soilwork", 
                    "activity_name": "Soil Working",
                    "sanctioned_qty": 25.5,
                    "sanctioned_rate": 4200,
                    "unit": "Per Hectare"
                }
            ]
        }
        
        response = self.test_endpoint("POST", "/apo", apo_data, headers=ro_headers, expected_status=201)
        if response and response.status_code == 201:
            data = response.json()
            apo_id = data.get('id')
            status = data.get('status')
            
            if apo_id and status == 'PENDING_APPROVAL':
                self.log(f"  APO created successfully: {apo_id} with status {status}")
                workflow_results.append("Create APO: PASS")
            else:
                self.log(f"  APO creation issues: ID={apo_id}, Status={status}", "WARNING")
                workflow_results.append("Create APO: FAIL - Wrong response")
        else:
            workflow_results.append("Create APO: FAIL - API call failed")
            
        # Step 2: Get APOs as RO
        if apo_id:
            self.log("Fetching APOs as RO...")
            response = self.test_endpoint("GET", "/apo", headers=ro_headers)
            if response and response.status_code == 200:
                apos = response.json()
                if any(apo['id'] == apo_id for apo in apos):
                    self.log(f"  RO can see created APO in list ({len(apos)} total)")
                    workflow_results.append("List APOs: PASS")
                else:
                    workflow_results.append("List APOs: FAIL - APO not in list")
            else:
                workflow_results.append("List APOs: FAIL - API call failed")
                
            # Step 3: Get APO detail
            self.log("Fetching APO detail...")
            response = self.test_endpoint("GET", f"/apo/{apo_id}", headers=ro_headers)
            if response and response.status_code == 200:
                data = response.json()
                items = data.get('items', [])
                self.log(f"  APO detail retrieved with {len(items)} items")
                workflow_results.append("APO Detail: PASS")
            else:
                workflow_results.append("APO Detail: FAIL")
                
            # Step 4: Approve APO as DM
            self.log("Approving APO as DM...")
            approval_data = {"status": "SANCTIONED"}
            response = self.test_endpoint("PATCH", f"/apo/{apo_id}/status", approval_data, headers=dm_headers)
            if response and response.status_code == 200:
                data = response.json()
                new_status = data.get('new_status')
                if new_status == 'SANCTIONED':
                    self.log(f"  APO approved successfully: {new_status}")
                    workflow_results.append("Approve APO: PASS")
                    
        # Step 5: Verify immutability - try to change status again
        self.log("Testing APO immutability...")
        response = self.test_endpoint("PATCH", f"/apo/{apo_id}/status", {"status": "REJECTED"}, headers=dm_headers, expected_status=400)
        if response is not None and response.status_code == 400:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', '')
                if "Cannot transition" in error_msg:
                    self.log("  APO correctly immutable after sanctioning")
                    workflow_results.append("APO Immutable: PASS")
                else:
                    self.log(f"  Unexpected immutability error: {error_msg}", "WARNING")
                    workflow_results.append("APO Immutable: FAIL - Wrong error message")
            except:
                self.log("  APO immutability test - could not parse response", "WARNING")
                workflow_results.append("APO Immutable: FAIL - Parse error")
        else:
            self.log(f"  APO immutability test failed - status {response.status_code if response else 'None'}", "WARNING")
            workflow_results.append("APO Immutable: FAIL")
            
        self.test_results['apo_workflow'] = {
            'status': 'PASS' if all('PASS' in r for r in workflow_results) else 'FAIL',
            'message': '; '.join(workflow_results),
            'apo_id': apo_id  # Save for work logs test
        }
        
    def test_work_logs(self):
        """Test work logs with budget enforcement"""
        self.log("\n=== Testing Work Logs with Budget Enforcement ===")
        
        if 'ro' not in self.tokens:
            self.test_results['work_logs'] = {'status': 'FAIL', 'message': 'No RO token available'}
            return
            
        ro_headers = {'Authorization': f'Bearer {self.tokens["ro"]}'}
        work_results = []
        
        # First, find a sanctioned APO item from seed data
        apo_item_id = "apoi-001"  # From seed data - sanctioned APO
        
        self.log(f"Testing work log against sanctioned APO item {apo_item_id}...")
        
        # Step 1: Create valid work log
        work_log_data = {
            "apo_item_id": apo_item_id,
            "actual_qty": 5,
            "expenditure": 10000,
            "work_date": "2025-06-01"
        }
        
        response = self.test_endpoint("POST", "/work-logs", work_log_data, headers=ro_headers, expected_status=201)
        if response and response.status_code == 201:
            data = response.json()
            work_log_id = data.get('id')
            if work_log_id:
                self.log(f"  Work log created successfully: {work_log_id}")
                work_results.append("Create Work Log: PASS")
            else:
                work_results.append("Create Work Log: FAIL - No ID returned")
        else:
            work_results.append("Create Work Log: FAIL - API call failed")
            
        # Step 2: Test budget enforcement - try to exceed budget
        self.log("Testing budget enforcement...")
        excessive_log_data = {
            "apo_item_id": apo_item_id,
            "actual_qty": 10,
            "expenditure": 200000,  # This should exceed the budget
            "work_date": "2025-06-02"
        }
        
        response = self.test_endpoint("POST", "/work-logs", excessive_log_data, headers=ro_headers, expected_status=400)
        if response is not None and response.status_code == 400:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', '')
                if "Budget Exceeded" in error_msg:
                    self.log("  Budget enforcement working correctly")
                    work_results.append("Budget Enforcement: PASS")
                else:
                    self.log(f"  Unexpected budget error message: {error_msg}", "WARNING")
                    work_results.append("Budget Enforcement: FAIL - Wrong error message")
            except:
                self.log("  Budget enforcement test - could not parse response", "WARNING")
                work_results.append("Budget Enforcement: FAIL - Parse error")
        elif response is not None and response.status_code == 201:
            # This means budget enforcement is not working
            self.log("  ERROR: Budget enforcement failed - overbudget request was accepted!", "ERROR")
            work_results.append("Budget Enforcement: FAIL - Overbudget accepted")
        else:
            self.log(f"  Budget enforcement - unexpected status {response.status_code if response else 'None'}", "WARNING")
            work_results.append("Budget Enforcement: FAIL - Unexpected status")
            
        # Step 3: Get work logs
        self.log("Fetching work logs...")
        response = self.test_endpoint("GET", "/work-logs", headers=ro_headers)
        if response and response.status_code == 200:
            logs = response.json()
            self.log(f"  Retrieved {len(logs)} work logs")
            work_results.append("List Work Logs: PASS")
        else:
            work_results.append("List Work Logs: FAIL")
            
        # Step 4: Try to log against non-sanctioned APO (should fail)
        self.log("Testing work log against pending APO...")
        pending_log_data = {
            "apo_item_id": "apoi-004",  # From pending APO in seed data
            "actual_qty": 1,
            "expenditure": 1000
        }
        
        response = self.test_endpoint("POST", "/work-logs", pending_log_data, headers=ro_headers, expected_status=400)
        if response is not None and response.status_code == 400:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', '').lower()
                if "sanctioned" in error_msg:
                    self.log("  Correctly rejected work log against non-sanctioned APO")
                    work_results.append("Sanctioned APO Only: PASS")
                else:
                    self.log(f"  Unexpected pending APO error: {error_data.get('error')}", "WARNING")
                    work_results.append("Sanctioned APO Only: FAIL - Wrong error message")
            except:
                self.log("  Sanctioned APO test - could not parse response", "WARNING") 
                work_results.append("Sanctioned APO Only: FAIL - Parse error")
        else:
            self.log(f"  Sanctioned APO test - unexpected status {response.status_code if response else 'None'}", "WARNING")
            work_results.append("Sanctioned APO Only: FAIL - Unexpected status")
            
        self.test_results['work_logs'] = {
            'status': 'PASS' if all('PASS' in r for r in work_results) else 'FAIL',
            'message': '; '.join(work_results)
        }
        
    def test_dashboard_stats(self):
        """Test dashboard stats for all roles"""
        self.log("\n=== Testing Dashboard Stats ===")
        
        dashboard_results = []
        
        for role in ['ro', 'dm', 'admin']:
            if role in self.tokens:
                headers = {'Authorization': f'Bearer {self.tokens[role]}'}
                response = self.test_endpoint("GET", "/dashboard/stats", headers=headers)
                
                if response and response.status_code == 200:
                    data = response.json()
                    required_fields = ['total_plantations', 'total_apos', 'total_sanctioned_amount', 'utilization_pct', 'budget_chart']
                    
                    if all(field in data for field in required_fields):
                        self.log(f"  {role.upper()}: Dashboard stats complete - {data['total_plantations']} plantations, {data['total_apos']} APOs")
                        dashboard_results.append(f"{role.upper()}: PASS")
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log(f"  {role.upper()}: Missing fields: {missing}", "WARNING")
                        dashboard_results.append(f"{role.upper()}: FAIL - Missing fields")
                else:
                    dashboard_results.append(f"{role.upper()}: FAIL - API call failed")
                    
        self.test_results['dashboard_stats'] = {
            'status': 'PASS' if all('PASS' in r for r in dashboard_results) else 'FAIL',
            'message': '; '.join(dashboard_results)
        }
        
    def test_rbac_enforcement(self):
        """Test Role-Based Access Control enforcement"""
        self.log("\n=== Testing RBAC Enforcement ===")
        
        rbac_results = []
        
        # Test 1: DM cannot create APO (should get 403)
        if 'dm' in self.tokens:
            self.log("Testing DM cannot create APO...")
            dm_headers = {'Authorization': f'Bearer {self.tokens["dm"]}'}
            apo_data = {
                "plantation_id": "plt-001",
                "financial_year": "2025-26",
                "items": [{"activity_id": "act-weeding", "activity_name": "Weeding", "sanctioned_qty": 1, "sanctioned_rate": 5500, "unit": "Per Hectare"}]
            }
            
            response = self.test_endpoint("POST", "/apo", apo_data, headers=dm_headers, expected_status=403)
            if response and response.status_code == 403:
                self.log("  DM correctly blocked from creating APO")
                rbac_results.append("DM Create APO Block: PASS")
            else:
                self.log(f"  DM create APO should fail but got {response.status_code if response else 'None'}", "WARNING")
                rbac_results.append("DM Create APO Block: FAIL")
        else:
            rbac_results.append("DM Create APO Block: SKIP - No DM token")
            
        # Test 2: RO cannot approve APO (should get 403)
        if 'ro' in self.tokens:
            self.log("Testing RO cannot approve APO...")
            ro_headers = {'Authorization': f'Bearer {self.tokens["ro"]}'}
            
            # Try to approve an existing pending APO
            approval_data = {"status": "SANCTIONED"}
            response = self.test_endpoint("PATCH", "/apo/apo-002/status", approval_data, headers=ro_headers, expected_status=403)
            if response and response.status_code == 403:
                self.log("  RO correctly blocked from approving APO")
                rbac_results.append("RO Approve APO Block: PASS")
            else:
                self.log(f"  RO approve APO should fail but got {response.status_code if response else 'None'}", "WARNING")
                rbac_results.append("RO Approve APO Block: FAIL")
        else:
            rbac_results.append("RO Approve APO Block: SKIP - No RO token")
            
        # Test 3: Only Admin can create norms
        if 'admin' in self.tokens and 'ro' in self.tokens:
            self.log("Testing only Admin can create norms...")
            
            norm_data = {
                "activity_id": "act-weeding",
                "applicable_age": 6,
                "standard_rate": 6000,
                "financial_year": "2025-26"
            }
            
            # Test Admin can create
            admin_headers = {'Authorization': f'Bearer {self.tokens["admin"]}'}
            response = self.test_endpoint("POST", "/norms", norm_data, headers=admin_headers, expected_status=201)
            if response and response.status_code == 201:
                self.log("  Admin can create norms")
                admin_result = "Admin Create Norms: PASS"
            else:
                admin_result = "Admin Create Norms: FAIL"
                
            # Test RO cannot create
            ro_headers = {'Authorization': f'Bearer {self.tokens["ro"]}'}
            response = self.test_endpoint("POST", "/norms", norm_data, headers=ro_headers, expected_status=403)
            if response and response.status_code == 403:
                self.log("  RO correctly blocked from creating norms")
                ro_result = "RO Create Norms Block: PASS"
            else:
                self.log(f"  RO create norms should fail but got {response.status_code if response else 'None'}", "WARNING")
                ro_result = "RO Create Norms Block: FAIL"
                
            rbac_results.extend([admin_result, ro_result])
        else:
            rbac_results.append("Norms RBAC: SKIP - Missing tokens")
            
        self.test_results['rbac_enforcement'] = {
            'status': 'PASS' if all('PASS' in r for r in rbac_results) else 'FAIL',
            'message': '; '.join(rbac_results)
        }
        
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*60)
        self.log("KFDC iFMS BACKEND TEST SUMMARY")
        self.log("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result['status'] == 'PASS')
        
        for test_name, result in self.test_results.items():
            status = result['status']
            message = result['message']
            status_icon = "✅" if status == 'PASS' else "❌"
            self.log(f"{status_icon} {test_name.upper()}: {message}")
            
        self.log(f"\nOVERALL: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            self.log("🎉 ALL BACKEND TESTS PASSED!", "SUCCESS")
        else:
            self.log(f"⚠️  {total_tests - passed_tests} tests failed", "WARNING")
            
        return passed_tests == total_tests

if __name__ == "__main__":
    tester = KFDCTester()
    tester.run_tests()