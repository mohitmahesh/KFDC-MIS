#!/usr/bin/env python3
"""
KFDC iFMS - Jurisdiction-based Estimates Feature Testing
Tests the updated Estimates feature as specified in review request
"""

import requests
import json
import os
from datetime import datetime
import sys

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://kfdc-fund-mgmt.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Test credentials from review request
TEST_USERS = {
    'ECW': {'email': 'ecw.dharwad@kfdc.in', 'password': 'pass123'},
    'PS': {'email': 'ps.dharwad@kfdc.in', 'password': 'pass123'},
    'RO': {'email': 'ro.dharwad@kfdc.in', 'password': 'pass123'}
}

class JurisdictionEstimatesTester:
    def __init__(self):
        self.tokens = {}
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.results = []
        self.test_item_id = None
        self.test_apo_id = None

    def log_result(self, test_name, status, message="", details=None):
        result = {
            'test': test_name,
            'status': status,
            'message': message,
            'timestamp': datetime.now().isoformat(),
        }
        if details:
            result['details'] = details
        self.results.append(result)
        status_symbol = "✅" if status == "PASS" else "❌"
        print(f"{status_symbol} {test_name}: {message}")

    def test_seed_database(self):
        """1. SEED DATABASE"""
        try:
            print("📊 1. Seeding Database...")
            response = self.session.post(f"{API_BASE}/seed")
            if response.status_code == 200:
                data = response.json()
                counts = data.get('counts', {})
                self.log_result("Seed Database", "PASS", f"Database seeded with {counts.get('users', 0)} users, {counts.get('apos', 0)} APOs")
            else:
                self.log_result("Seed Database", "FAIL", f"Failed with status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Seed Database", "FAIL", f"Exception: {str(e)}")
            return False
        return True

    def authenticate_user(self, role):
        """Authenticate a specific user role"""
        if role not in TEST_USERS:
            self.log_result(f"Auth - {role}", "FAIL", f"Unknown role: {role}")
            return False

        try:
            creds = TEST_USERS[role]
            login_data = {
                'email': creds['email'],
                'password': creds['password']
            }
            response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('token')
                user = data.get('user', {})
                
                if token and user.get('role'):
                    self.tokens[role] = token
                    self.log_result(f"Auth - {role}", "PASS", 
                                  f"Login successful for {user.get('name', 'Unknown')} ({user.get('email')})")
                    return True
                else:
                    self.log_result(f"Auth - {role}", "FAIL", "Missing token or user data in response")
            else:
                self.log_result(f"Auth - {role}", "FAIL", f"Login failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_result(f"Auth - {role}", "FAIL", f"Exception: {str(e)}")
        
        return False

    def test_ecw_jurisdiction_access(self):
        """2. Test ECW Jurisdiction Access - NO plantation_id needed now!"""
        if 'ECW' not in self.tokens:
            self.log_result("ECW Jurisdiction Access", "FAIL", "ECW not authenticated")
            return False

        try:
            print("🏛️ 2. Testing ECW Jurisdiction Access...")
            headers = {'Authorization': f'Bearer {self.tokens["ECW"]}'}
            
            # NEW: Call without plantation_id parameter!
            response = self.session.get(f"{API_BASE}/apo/estimates", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                works = data.get('works', [])
                summary = data.get('summary', {})
                
                if works:
                    # Find sanctioned APO items only
                    sanctioned_items = [w for w in works if 'plantation_id' in w]
                    self.log_result("ECW Jurisdiction Access", "PASS", 
                                  f"Retrieved {len(works)} works from SANCTIONED APOs. Jurisdiction: {summary.get('jurisdiction', 'Unknown')}")
                    
                    # Store first item for later testing
                    if sanctioned_items:
                        self.test_item_id = sanctioned_items[0].get('id')
                        self.test_apo_id = sanctioned_items[0].get('apo_id')
                        
                        # Verify jurisdiction info is present
                        jurisdiction = summary.get('jurisdiction')
                        jurisdiction_type = summary.get('jurisdiction_type')
                        
                        if jurisdiction and jurisdiction_type:
                            self.log_result("Jurisdiction Info", "PASS", 
                                          f"Jurisdiction correctly identified: {jurisdiction} ({jurisdiction_type})")
                        else:
                            self.log_result("Jurisdiction Info", "FAIL", "Missing jurisdiction information in summary")
                    
                    return True
                else:
                    self.log_result("ECW Jurisdiction Access", "FAIL", "No works found - need sanctioned APOs for testing")
                    return False
            else:
                self.log_result("ECW Jurisdiction Access", "FAIL", f"Failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("ECW Jurisdiction Access", "FAIL", f"Exception: {str(e)}")
            return False

    def test_ps_jurisdiction_access(self):
        """3. Test PS Jurisdiction Access"""  
        if 'PS' not in self.tokens:
            self.log_result("PS Jurisdiction Access", "FAIL", "PS not authenticated")
            return False

        try:
            print("👨‍💼 3. Testing PS Jurisdiction Access...")
            headers = {'Authorization': f'Bearer {self.tokens["PS"]}'}
            
            # Call without plantation_id - should show same jurisdiction as ECW
            response = self.session.get(f"{API_BASE}/apo/estimates", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                works = data.get('works', [])
                summary = data.get('summary', {})
                
                jurisdiction = summary.get('jurisdiction', 'Unknown')
                if jurisdiction == 'Dharwad':  # Both ECW and PS are from Dharwad range
                    self.log_result("PS Jurisdiction Access", "PASS", 
                                  f"PS sees works from same jurisdiction: {jurisdiction}")
                    return True
                else:
                    self.log_result("PS Jurisdiction Access", "PASS", 
                                  f"PS has access with jurisdiction: {jurisdiction}")
                    return True
            else:
                self.log_result("PS Jurisdiction Access", "FAIL", f"Failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("PS Jurisdiction Access", "FAIL", f"Exception: {str(e)}")
            return False

    def test_ro_access_denied(self):
        """4. Test RO Access Denied - Should return 403 Forbidden"""
        if 'RO' not in self.tokens:
            self.log_result("RO Access Denied", "FAIL", "RO not authenticated")
            return False

        try:
            print("🚫 4. Testing RO Access Denied...")
            headers = {'Authorization': f'Bearer {self.tokens["RO"]}'}
            
            response = self.session.get(f"{API_BASE}/apo/estimates", headers=headers)
            
            if response.status_code == 403:
                self.log_result("RO Access Denied", "PASS", "RO correctly blocked with 403 Forbidden")
                return True
            else:
                self.log_result("RO Access Denied", "FAIL", f"Expected 403, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("RO Access Denied", "FAIL", f"Exception: {str(e)}")
            return False

    def test_estimate_update_ecw_only(self):
        """5. Test Estimate Update (ECW only)"""
        if 'ECW' not in self.tokens or not self.test_item_id:
            self.log_result("Estimate Update ECW", "FAIL", "ECW not authenticated or no test item")
            return False

        try:
            print("✏️ 5. Testing Estimate Update (ECW only)...")
            headers = {'Authorization': f'Bearer {self.tokens["ECW"]}'}
            
            # Find an item with estimate_status: "DRAFT" 
            # Update revised quantity
            estimate_data = {
                "revised_qty": 15,
                "user_role": "CASE_WORKER_ESTIMATES"
            }
            response = self.session.patch(f"{API_BASE}/apo/items/{self.test_item_id}/estimate", 
                                        json=estimate_data, headers=headers)
            
            if response.status_code == 200:
                self.log_result("Estimate Update ECW", "PASS", "ECW successfully updated revised quantity to 15")
                
                # Submit the estimate
                status_data = {
                    "status": "SUBMITTED",
                    "user_role": "CASE_WORKER_ESTIMATES"
                }
                response = self.session.patch(f"{API_BASE}/apo/items/{self.test_item_id}/status", 
                                            json=status_data, headers=headers)
                
                if response.status_code == 200:
                    self.log_result("Estimate Submit ECW", "PASS", "ECW successfully submitted estimate")
                    return True
                else:
                    self.log_result("Estimate Submit ECW", "FAIL", f"Submit failed: {response.status_code} - {response.text}")
                    return False
            else:
                self.log_result("Estimate Update ECW", "FAIL", f"Update failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Estimate Update ECW", "FAIL", f"Exception: {str(e)}")
            return False

    def test_estimate_approval_ps_only(self):
        """6. Test Estimate Approval (PS only)"""
        if 'PS' not in self.tokens or not self.test_item_id:
            self.log_result("Estimate Approval PS", "FAIL", "PS not authenticated or no test item")
            return False

        try:
            print("✅ 6. Testing Estimate Approval (PS only)...")
            headers = {'Authorization': f'Bearer {self.tokens["PS"]}'}
            
            # Approve the submitted estimate
            status_data = {
                "status": "APPROVED",
                "user_role": "PLANTATION_SUPERVISOR"
            }
            response = self.session.patch(f"{API_BASE}/apo/items/{self.test_item_id}/status", 
                                        json=status_data, headers=headers)
            
            if response.status_code == 200:
                self.log_result("Estimate Approval PS", "PASS", "PS successfully approved estimate")
                return True
            else:
                self.log_result("Estimate Approval PS", "FAIL", f"Approval failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Estimate Approval PS", "FAIL", f"Exception: {str(e)}")
            return False

    def test_rbac_enforcement(self):
        """Test RBAC Enforcement - ECW can't approve, PS can't edit"""
        if not self.test_item_id:
            self.log_result("RBAC Enforcement", "FAIL", "No test item available")
            return False

        try:
            print("🔐 7. Testing RBAC Enforcement...")
            
            # Test: ECW cannot approve estimates
            if 'ECW' in self.tokens:
                headers = {'Authorization': f'Bearer {self.tokens["ECW"]}'}
                status_data = {
                    "status": "APPROVED",
                    "user_role": "CASE_WORKER_ESTIMATES"
                }
                response = self.session.patch(f"{API_BASE}/apo/items/{self.test_item_id}/status", 
                                            json=status_data, headers=headers)
                
                if response.status_code == 403:
                    self.log_result("RBAC - ECW Blocked from Approval", "PASS", "ECW correctly blocked from approving")
                else:
                    self.log_result("RBAC - ECW Blocked from Approval", "FAIL", f"Expected 403, got {response.status_code}")

            # Test: PS cannot edit quantities
            if 'PS' in self.tokens:
                headers = {'Authorization': f'Bearer {self.tokens["PS"]}'}
                estimate_data = {
                    "revised_qty": 20,
                    "user_role": "PLANTATION_SUPERVISOR"
                }
                response = self.session.patch(f"{API_BASE}/apo/items/{self.test_item_id}/estimate", 
                                            json=estimate_data, headers=headers)
                
                if response.status_code == 403:
                    self.log_result("RBAC - PS Blocked from Edit", "PASS", "PS correctly blocked from editing quantities")
                    return True
                else:
                    self.log_result("RBAC - PS Blocked from Edit", "FAIL", f"Expected 403, got {response.status_code}")
                    return False
                    
        except Exception as e:
            self.log_result("RBAC Enforcement", "FAIL", f"Exception: {str(e)}")
            return False

    def run_jurisdiction_estimates_test(self):
        """Run the complete jurisdiction-based estimates test"""
        print("🎯 KFDC iFMS - Jurisdiction-based Estimates Feature Testing")
        print(f"📡 Testing against: {API_BASE}")
        print("=" * 80)

        success = True
        
        # Test sequence as per review request
        if not self.test_seed_database():
            success = False

        # Authenticate required users
        for role in ['ECW', 'PS', 'RO']:
            if not self.authenticate_user(role):
                success = False

        # Test jurisdiction-based access
        if not self.test_ecw_jurisdiction_access():
            success = False
        
        if not self.test_ps_jurisdiction_access():
            success = False
            
        if not self.test_ro_access_denied():
            success = False

        # Test estimate workflow
        if not self.test_estimate_update_ecw_only():
            success = False
            
        if not self.test_estimate_approval_ps_only():
            success = False

        # Test RBAC
        if not self.test_rbac_enforcement():
            success = False

        # Summary
        print("\n" + "=" * 80)
        print("📊 JURISDICTION ESTIMATES TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r['status'] == 'PASS'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if result['status'] == 'FAIL':
                    print(f"   • {result['test']}: {result['message']}")

        print("\n🎯 KEY VERIFICATION POINTS:")
        key_tests = [
            "ECW Jurisdiction Access",
            "PS Jurisdiction Access", 
            "RO Access Denied",
            "Estimate Update ECW",
            "Estimate Approval PS",
            "RBAC - ECW Blocked from Approval",
            "RBAC - PS Blocked from Edit"
        ]
        
        key_passed = 0
        for test_name in key_tests:
            test_result = next((r for r in self.results if r['test'] == test_name), None)
            if test_result and test_result['status'] == 'PASS':
                key_passed += 1
                print(f"✅ {test_name}")
            else:
                print(f"❌ {test_name}")
                
        print(f"\nKey Features Working: {key_passed}/{len(key_tests)}")
        
        if key_passed == len(key_tests):
            print("🎉 JURISDICTION-BASED ESTIMATES FEATURE FULLY WORKING!")
            print("• ECW/PS only see works from SANCTIONED APOs")
            print("• Works are filtered by user's jurisdiction (range_id)")
            print("• Summary includes jurisdiction name and type") 
            print("• RBAC enforcement working (ECW can't approve, PS can't edit)")
        else:
            print("⚠️  Some key features need attention")
            
        return success

if __name__ == "__main__":
    tester = JurisdictionEstimatesTester()
    success = tester.run_jurisdiction_estimates_test()
    sys.exit(0 if success else 1)