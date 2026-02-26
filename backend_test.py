#!/usr/bin/env python3
"""
KFDC iFMS Backend Testing Suite - NEW MODULES & UPDATED RBAC
Focus: Testing NEW Buildings & Nurseries modules + Updated RBAC (RO/DO/ED/MD workflow)
Review Request: Buildings API, Nurseries API, Updated RBAC testing
"""

import requests
import json
import sys
from typing import Dict, List, Any, Optional

# Test Configuration - Updated Base URL as per review request
BASE_URL = "https://ifms-apo-wizard.preview.emergentagent.com/api"

# Test Credentials - Updated RBAC roles as per review request
TEST_CREDENTIALS = {
    "RO": {"email": "ro.dharwad@kfdc.in", "password": "pass123"},
    "DO": {"email": "do.dharwad@kfdc.in", "password": "pass123"},
    "ED": {"email": "ed@kfdc.in", "password": "pass123"},
    "MD": {"email": "md@kfdc.in", "password": "pass123"},
}

class KFDCBackendTester:
    def __init__(self):
        self.auth_tokens = {}
        self.test_results = []
        self.apo_id = None
        
    def log_result(self, test_name: str, status: str, details: str = ""):
        """Log test results with consistent formatting"""
        result = {
            "test": test_name,
            "status": status,
            "details": details
        }
        self.test_results.append(result)
        
        # Console output
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⏳"
        print(f"{status_icon} {test_name}: {status}")
        if details:
            print(f"   Details: {details}")

    def authenticate_user(self, role: str) -> str:
        """Authenticate user and return token"""
        try:
            creds = TEST_CREDENTIALS[role]
            response = requests.post(f"{BASE_URL}/auth/login", json=creds, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("token")
                if token:
                    self.auth_tokens[role] = token
                    user_info = data.get("user", {})
                    user_name = user_info.get("name", "Unknown")
                    user_role = user_info.get("role", "Unknown")
                    self.log_result(f"Authentication - {role}", "PASS", f"User: {user_name} (Role: {user_role})")
                    return token
                else:
                    self.log_result(f"Authentication - {role}", "FAIL", "No token in response")
                    return None
            else:
                self.log_result(f"Authentication - {role}", "FAIL", f"Status: {response.status_code}, Error: {response.text}")
                return None
        except Exception as e:
            self.log_result(f"Authentication - {role}", "FAIL", f"Exception: {str(e)}")
            return None

    def make_authenticated_request(self, method: str, endpoint: str, role: str, data: Optional[Dict] = None) -> Optional[Dict]:
        """Make authenticated API request"""
        try:
            token = self.auth_tokens.get(role)
            if not token:
                print(f"❌ No authentication token for {role}")
                return None
                
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            url = f"{BASE_URL}{endpoint}"
            
            response = requests.request(method, url, json=data, headers=headers, timeout=30)
            
            if response.status_code < 400:
                try:
                    return response.json() if response.text else {}
                except json.JSONDecodeError:
                    return {"raw_response": response.text, "status_code": response.status_code}
            else:
                print(f"❌ API Error - {method} {endpoint}: {response.status_code} - {response.text}")
                return {"error": True, "status_code": response.status_code, "error_text": response.text}
        except Exception as e:
            print(f"❌ Request Exception - {method} {endpoint}: {str(e)}")
            return None

    def test_buildings_api(self):
        """Test NEW Buildings API endpoints"""
        print("\n🏢 TESTING BUILDINGS API MODULE")
        
        # Test 1: GET /buildings (should return buildings in RO's range)
        try:
            response = self.make_authenticated_request("GET", "/buildings", "RO")
            
            if response and isinstance(response, list):
                buildings_count = len(response)
                building_names = [b.get("name", "Unknown") for b in response[:3]]
                self.log_result(
                    "GET /buildings (RO access)",
                    "PASS",
                    f"Retrieved {buildings_count} buildings in RO's range. Sample: {', '.join(building_names)}"
                )
            elif response and response.get("error"):
                self.log_result("GET /buildings (RO access)", "FAIL", f"Error: {response}")
            else:
                self.log_result("GET /buildings (RO access)", "FAIL", f"Invalid response: {type(response)}")
                
        except Exception as e:
            self.log_result("GET /buildings (RO access)", "FAIL", f"Exception: {str(e)}")

        # Test 2: POST /buildings (RO should be able to create building)
        try:
            new_building = {
                "name": "Test Building - Automated Test",
                "division": "Dharwad",
                "district": "Dharwad",
                "taluk": "Dharwad",
                "year_of_creation": 2026,
                "latitude": 15.4589,
                "longitude": 75.0078,
                "survey_number": "TEST-001",
                "building_phase": "Creation",
                "status": "Under Construction"
            }
            
            response = self.make_authenticated_request("POST", "/buildings", "RO", new_building)
            
            if response and not response.get("error"):
                building_id = response.get("id")
                building_name = response.get("name", "Unknown")
                self.log_result(
                    "POST /buildings (RO create)",
                    "PASS",
                    f"Created building: {building_name} (ID: {building_id})"
                )
            else:
                self.log_result("POST /buildings (RO create)", "FAIL", f"Error: {response}")
                
        except Exception as e:
            self.log_result("POST /buildings (RO create)", "FAIL", f"Exception: {str(e)}")

        # Test 3: GET /building-activities (rate card)
        try:
            response = self.make_authenticated_request("GET", "/building-activities", "RO")
            
            if response and isinstance(response, list):
                activities_count = len(response)
                activity_names = [a.get("name", "Unknown") for a in response[:3]]
                self.log_result(
                    "GET /building-activities",
                    "PASS",
                    f"Retrieved {activities_count} building activities. Sample: {', '.join(activity_names)}"
                )
            elif response and response.get("error"):
                self.log_result("GET /building-activities", "FAIL", f"Error: {response}")
            else:
                self.log_result("GET /building-activities", "FAIL", f"Invalid response: {type(response)}")
                
        except Exception as e:
            self.log_result("GET /building-activities", "FAIL", f"Exception: {str(e)}")

        # Test 4: GET /building-norms (rate card with rates)
        try:
            response = self.make_authenticated_request("GET", "/building-norms", "RO")
            
            if response and isinstance(response, list):
                norms_count = len(response)
                # Check if norms have enriched activity data
                sample_norm = response[0] if len(response) > 0 else {}
                has_activity_data = "activity_name" in sample_norm and "standard_rate" in sample_norm
                
                self.log_result(
                    "GET /building-norms",
                    "PASS" if has_activity_data else "FAIL",
                    f"Retrieved {norms_count} building norms with rates and activity details"
                )
            elif response and response.get("error"):
                self.log_result("GET /building-norms", "FAIL", f"Error: {response}")
            else:
                self.log_result("GET /building-norms", "FAIL", f"Invalid response: {type(response)}")
                
        except Exception as e:
            self.log_result("GET /building-norms", "FAIL", f"Exception: {str(e)}")

    def test_nurseries_api(self):
        """Test NEW Nurseries API endpoints"""
        print("\n🌱 TESTING NURSERIES API MODULE")
        
        # Test 1: GET /nurseries (should return nurseries in RO's range)
        try:
            response = self.make_authenticated_request("GET", "/nurseries", "RO")
            
            if response and isinstance(response, list):
                nurseries_count = len(response)
                nursery_names = [n.get("name", "Unknown") for n in response[:3]]
                self.log_result(
                    "GET /nurseries (RO access)",
                    "PASS",
                    f"Retrieved {nurseries_count} nurseries in RO's range. Sample: {', '.join(nursery_names)}"
                )
            elif response and response.get("error"):
                self.log_result("GET /nurseries (RO access)", "FAIL", f"Error: {response}")
            else:
                self.log_result("GET /nurseries (RO access)", "FAIL", f"Invalid response: {type(response)}")
                
        except Exception as e:
            self.log_result("GET /nurseries (RO access)", "FAIL", f"Exception: {str(e)}")

        # Test 2: POST /nurseries (RO should be able to create nursery)
        try:
            new_nursery = {
                "name": "Test Nursery - Automated Test",
                "nursery_type": "Raising",
                "latitude": 15.4567,
                "longitude": 75.0123,
                "status": "Active",
                "capacity_seedlings": 25000
            }
            
            response = self.make_authenticated_request("POST", "/nurseries", "RO", new_nursery)
            
            if response and not response.get("error"):
                nursery_id = response.get("id")
                nursery_name = response.get("name", "Unknown")
                self.log_result(
                    "POST /nurseries (RO create)",
                    "PASS",
                    f"Created nursery: {nursery_name} (ID: {nursery_id})"
                )
            else:
                self.log_result("POST /nurseries (RO create)", "FAIL", f"Error: {response}")
                
        except Exception as e:
            self.log_result("POST /nurseries (RO create)", "FAIL", f"Exception: {str(e)}")

        # Test 3: GET /nursery-activities (rate card)
        try:
            response = self.make_authenticated_request("GET", "/nursery-activities", "RO")
            
            if response and isinstance(response, list):
                activities_count = len(response)
                activity_names = [a.get("name", "Unknown") for a in response[:3]]
                self.log_result(
                    "GET /nursery-activities",
                    "PASS",
                    f"Retrieved {activities_count} nursery activities. Sample: {', '.join(activity_names)}"
                )
            elif response and response.get("error"):
                self.log_result("GET /nursery-activities", "FAIL", f"Error: {response}")
            else:
                self.log_result("GET /nursery-activities", "FAIL", f"Invalid response: {type(response)}")
                
        except Exception as e:
            self.log_result("GET /nursery-activities", "FAIL", f"Exception: {str(e)}")

        # Test 4: GET /nursery-norms (rate card with rates)
        try:
            response = self.make_authenticated_request("GET", "/nursery-norms", "RO")
            
            if response and isinstance(response, list):
                norms_count = len(response)
                # Check if norms have enriched activity data
                sample_norm = response[0] if len(response) > 0 else {}
                has_activity_data = "activity_name" in sample_norm and "standard_rate" in sample_norm
                
                self.log_result(
                    "GET /nursery-norms",
                    "PASS" if has_activity_data else "FAIL",
                    f"Retrieved {norms_count} nursery norms with rates and activity details"
                )
            elif response and response.get("error"):
                self.log_result("GET /nursery-norms", "FAIL", f"Error: {response}")
            else:
                self.log_result("GET /nursery-norms", "FAIL", f"Invalid response: {type(response)}")
                
        except Exception as e:
            self.log_result("GET /nursery-norms", "FAIL", f"Exception: {str(e)}")

    def test_updated_rbac(self):
        """Test Updated RBAC with new roles and permissions"""
        print("\n🔐 TESTING UPDATED RBAC SYSTEM")
        
        # Test 1: RO Role (Data Entry Only) - Should NOT be able to create APO
        try:
            apo_data = {
                "financial_year": "2026-27",
                "title": "Test APO - Should Fail",
                "status": "DRAFT",
                "capex_items": [],
                "revex_items": []
            }
            
            response = self.make_authenticated_request("POST", "/apo", "RO", apo_data)
            
            if response and response.get("status_code") == 403:
                self.log_result(
                    "RO APO Creation (Should be blocked)",
                    "PASS",
                    "RO correctly blocked from creating APO (403 Forbidden)"
                )
            else:
                self.log_result("RO APO Creation (Should be blocked)", "FAIL", f"Expected 403, got: {response}")
                
        except Exception as e:
            self.log_result("RO APO Creation (Should be blocked)", "FAIL", f"Exception: {str(e)}")

        # Test 2: DO Role (APO Creation) - Should be able to create APO
        try:
            # First get plantations, buildings, nurseries for APO creation
            plantations_response = self.make_authenticated_request("GET", "/plantations", "DO")
            buildings_response = self.make_authenticated_request("GET", "/buildings", "DO")
            nurseries_response = self.make_authenticated_request("GET", "/nurseries", "DO")
            
            apo_data = {
                "financial_year": "2026-27",
                "title": "Test APO - DO Creation",
                "status": "DRAFT",
                "capex_items": [
                    {"activity_id": "act-survey", "activity_name": "Survey & Demarcation", "sanctioned_qty": 5, "sanctioned_rate": 1534.16, "unit": "Per Km"}
                ],
                "revex_items": [
                    {"activity_id": "act-fireline", "activity_name": "Clearing Fire Lines", "sanctioned_qty": 10, "sanctioned_rate": 5455.86, "unit": "Per Hectare"}
                ]
            }
            
            response = self.make_authenticated_request("POST", "/apo", "DO", apo_data)
            
            if response and not response.get("error") and response.get("id"):
                self.apo_id = response.get("id")
                apo_title = response.get("title", "Unknown")
                apo_status = response.get("status", "Unknown")
                self.log_result(
                    "DO APO Creation",
                    "PASS",
                    f"DO created APO: {apo_title} (ID: {self.apo_id}, Status: {apo_status})"
                )
            else:
                self.log_result("DO APO Creation", "FAIL", f"Error: {response}")
                
        except Exception as e:
            self.log_result("DO APO Creation", "FAIL", f"Exception: {str(e)}")

        # Test 3: DO should be able to access plantations, buildings, nurseries
        try:
            plantations_resp = self.make_authenticated_request("GET", "/plantations", "DO")
            buildings_resp = self.make_authenticated_request("GET", "/buildings", "DO")
            nurseries_resp = self.make_authenticated_request("GET", "/nurseries", "DO")
            
            plantations_count = len(plantations_resp) if isinstance(plantations_resp, list) else 0
            buildings_count = len(buildings_resp) if isinstance(buildings_resp, list) else 0
            nurseries_count = len(nurseries_resp) if isinstance(nurseries_resp, list) else 0
            
            if plantations_count > 0 and buildings_count > 0 and nurseries_count > 0:
                self.log_result(
                    "DO Resource Access",
                    "PASS",
                    f"DO can access: {plantations_count} plantations, {buildings_count} buildings, {nurseries_count} nurseries"
                )
            else:
                self.log_result("DO Resource Access", "FAIL", f"Limited access: P:{plantations_count}, B:{buildings_count}, N:{nurseries_count}")
                
        except Exception as e:
            self.log_result("DO Resource Access", "FAIL", f"Exception: {str(e)}")

    def test_apo_workflow(self):
        """Test APO Workflow: DO creates → PENDING_ED_APPROVAL → ED approves → PENDING_MD_APPROVAL → MD approves → SANCTIONED"""
        print("\n📋 TESTING APO WORKFLOW (DO → ED → MD)")
        
        if not self.apo_id:
            self.log_result("APO Workflow", "SKIP", "No APO ID available for workflow testing")
            return
            
        try:
            # Note: The current codebase has two conflicting workflows, but based on the review request,
            # we need to test the DO→ED→MD workflow. However, the /apo/:id/status endpoint uses the
            # RO→DM→HO workflow. Let me test what actually works.
            
            # Step 1: First, let's check the current APO status
            current_apo = self.make_authenticated_request("GET", f"/apo/{self.apo_id}", "DO")
            if current_apo and not current_apo.get("error"):
                current_status = current_apo.get("status", "Unknown")
                self.log_result(
                    "APO Current Status Check",
                    "PASS", 
                    f"Current APO status: {current_status}"
                )
                
                # Step 2: Try to use the ED/MD approval endpoint (/apo/:id/approve)
                # But first the DO needs to submit it to PENDING_ED_APPROVAL
                # Let's check if the DO can directly set it to PENDING_ED_APPROVAL
                
                # Try the /apo/:id/status endpoint first with PENDING_ED_APPROVAL
                submit_data = {"status": "PENDING_ED_APPROVAL"}
                submit_response = self.make_authenticated_request("PATCH", f"/apo/{self.apo_id}/status", "DO", submit_data)
                
                if submit_response and submit_response.get("error"):
                    # If PENDING_ED_APPROVAL doesn't work, try the legacy workflow 
                    # Since the review asks for testing the system as it is currently implemented
                    self.log_result(
                        "APO ED/MD Workflow Not Implemented", 
                        "FAIL", 
                        f"System uses legacy RO→DM→HO workflow, not DO→ED→MD: {submit_response.get('error_text', 'Unknown error')}"
                    )
                    
                    # Test the actual implemented workflow instead
                    # This uses PENDING_DM_APPROVAL instead of PENDING_ED_APPROVAL
                    # Since DO role maps to DM in the legacy system, try PENDING_DM_APPROVAL
                    legacy_submit_data = {"status": "PENDING_DM_APPROVAL"}
                    legacy_response = self.make_authenticated_request("PATCH", f"/apo/{self.apo_id}/status", "DO", legacy_submit_data)
                    
                    if legacy_response and not legacy_response.get("error"):
                        self.log_result(
                            "Legacy APO Workflow (DO as DM)",
                            "PASS",
                            f"DO submitted APO using legacy workflow: {legacy_response.get('new_status')}"
                        )
                    else:
                        self.log_result(
                            "Legacy APO Workflow", 
                            "FAIL", 
                            f"Legacy workflow also failed: {legacy_response}"
                        )
                else:
                    # ED/MD workflow succeeded
                    if submit_response and submit_response.get("new_status") == "PENDING_ED_APPROVAL":
                        self.log_result(
                            "DO Submit APO (ED/MD workflow)",
                            "PASS",
                            f"APO status updated to: {submit_response.get('new_status')}"
                        )
                        
                        # Step 3: ED approves using /apo/:id/approve endpoint
                        ed_token = self.authenticate_user("ED")
                        if ed_token:
                            approve_data = {"action": "approve", "remarks": "ED Approved"}
                            ed_response = self.make_authenticated_request("PATCH", f"/apo/{self.apo_id}/approve", "ED", approve_data)
                            
                            if ed_response and not ed_response.get("error"):
                                ed_status = ed_response.get("status")
                                if ed_status == "PENDING_MD_APPROVAL":
                                    self.log_result(
                                        "ED Approval",
                                        "PASS",
                                        f"ED approved APO, status: {ed_status}"
                                    )
                                    
                                    # Step 4: MD final approval
                                    md_token = self.authenticate_user("MD")
                                    if md_token:
                                        final_approve_data = {"action": "approve", "remarks": "MD Final Approval"}
                                        md_response = self.make_authenticated_request("PATCH", f"/apo/{self.apo_id}/approve", "MD", final_approve_data)
                                        
                                        if md_response and not md_response.get("error"):
                                            final_status = md_response.get("status")
                                            if final_status == "SANCTIONED":
                                                self.log_result(
                                                    "MD Final Approval",
                                                    "PASS",
                                                    f"MD approved APO, final status: {final_status}"
                                                )
                                            else:
                                                self.log_result("MD Final Approval", "FAIL", f"Expected SANCTIONED, got: {final_status}")
                                        else:
                                            self.log_result("MD Final Approval", "FAIL", f"MD approval failed: {md_response}")
                                else:
                                    self.log_result("ED Approval", "FAIL", f"Expected PENDING_MD_APPROVAL, got: {ed_status}")
                            else:
                                self.log_result("ED Approval", "FAIL", f"ED approval failed: {ed_response}")
            else:
                self.log_result("APO Status Check", "FAIL", "Cannot retrieve current APO status")
                
        except Exception as e:
            self.log_result("APO Workflow", "FAIL", f"Exception: {str(e)}")

    def test_apo_visibility_by_role(self):
        """Test APO visibility based on user roles"""
        print("\n👁️ TESTING APO VISIBILITY BY ROLE")
        
        # Test ED Role - Should see APOs pending approval
        try:
            ed_apos = self.make_authenticated_request("GET", "/apo", "ED")
            if ed_apos and isinstance(ed_apos, list):
                pending_ed = [apo for apo in ed_apos if apo.get("status") == "PENDING_ED_APPROVAL"]
                self.log_result(
                    "ED APO Visibility",
                    "PASS",
                    f"ED can see {len(ed_apos)} total APOs, {len(pending_ed)} pending ED approval"
                )
            else:
                self.log_result("ED APO Visibility", "FAIL", f"Error: {ed_apos}")
        except Exception as e:
            self.log_result("ED APO Visibility", "FAIL", f"Exception: {str(e)}")

        # Test MD Role - Should see APOs pending MD approval
        try:
            md_apos = self.make_authenticated_request("GET", "/apo", "MD")
            if md_apos and isinstance(md_apos, list):
                pending_md = [apo for apo in md_apos if apo.get("status") == "PENDING_MD_APPROVAL"]
                sanctioned = [apo for apo in md_apos if apo.get("status") == "SANCTIONED"]
                self.log_result(
                    "MD APO Visibility",
                    "PASS",
                    f"MD can see {len(md_apos)} total APOs, {len(pending_md)} pending MD approval, {len(sanctioned)} sanctioned"
                )
            else:
                self.log_result("MD APO Visibility", "FAIL", f"Error: {md_apos}")
        except Exception as e:
            self.log_result("MD APO Visibility", "FAIL", f"Exception: {str(e)}")

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 STARTING KFDC iFMS - NEW MODULES & UPDATED RBAC TESTING")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"🔑 Testing Roles: {', '.join(TEST_CREDENTIALS.keys())}")
        print("=" * 80)
        
        # Phase 1: Authentication for all roles
        print("\n📋 PHASE 1: AUTHENTICATION")
        authenticated_roles = []
        for role in TEST_CREDENTIALS.keys():
            token = self.authenticate_user(role)
            if token:
                authenticated_roles.append(role)
        
        if len(authenticated_roles) < 2:
            print("❌ CRITICAL: Insufficient authentication. Cannot continue comprehensive testing.")
            return
        
        # Phase 2: Test NEW Buildings API
        if "RO" in authenticated_roles:
            self.test_buildings_api()
        
        # Phase 3: Test NEW Nurseries API
        if "RO" in authenticated_roles:
            self.test_nurseries_api()
        
        # Phase 4: Test Updated RBAC
        if "RO" in authenticated_roles and "DO" in authenticated_roles:
            self.test_updated_rbac()
        
        # Phase 5: Test APO Workflow
        if all(role in authenticated_roles for role in ["DO", "ED", "MD"]):
            self.test_apo_workflow()
        
        # Phase 6: Test APO Visibility by Role
        if "ED" in authenticated_roles and "MD" in authenticated_roles:
            self.test_apo_visibility_by_role()
        
        # Summary
        self.print_test_summary()

    def print_test_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST RESULTS SUMMARY")
        print("=" * 80)
        
        passed_tests = [r for r in self.test_results if r["status"] == "PASS"]
        failed_tests = [r for r in self.test_results if r["status"] == "FAIL"]
        skipped_tests = [r for r in self.test_results if r["status"] == "SKIP"]
        
        total_tests = len(self.test_results)
        pass_rate = (len(passed_tests) / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📈 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {len(passed_tests)}")
        print(f"   ❌ Failed: {len(failed_tests)}")
        print(f"   ⏭️ Skipped: {len(skipped_tests)}")
        print(f"   📊 Pass Rate: {pass_rate:.1f}%")
        
        if failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        if passed_tests:
            print(f"\n✅ SUCCESSFUL TESTS:")
            for test in passed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        print("\n" + "=" * 80)
        if pass_rate >= 80:
            print("🎉 TESTING COMPLETED SUCCESSFULLY!")
            print("✨ NEW iFMS modules and RBAC are working as expected")
        elif pass_rate >= 60:
            print("⚠️ PARTIAL SUCCESS - Some issues found")
            print("🔧 Review failed tests for improvements")
        else:
            print("🚨 CRITICAL ISSUES DETECTED")
            print("🛠️ Major fixes required before production")
        
        return len(passed_tests), len(failed_tests)

def main():
    """Main test execution function"""
    try:
        tester = KFDCBackendTester()
        tester.run_comprehensive_test()
            
    except KeyboardInterrupt:
        print("\n⏹️ Testing interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error during testing: {str(e)}")

if __name__ == "__main__":
    main()