#!/usr/bin/env python3
"""
KFDC iFMS Backend Testing Suite - Multi-Plantation APO Features
Focus: Testing APO creation workflow with new multi-plantation features
Review Request: Multi-plantation draft generation, APO creation, Activities/Norms endpoints
"""

import requests
import json
import sys
from typing import Dict, List, Any, Optional

# Test Configuration
BASE_URL = "https://ifms-kfdc-demo.preview.emergentagent.com/api"

# Test Credentials (as per review request)
TEST_CREDENTIALS = {
    "RO": {"email": "ro.dharwad@kfdc.in", "password": "pass123"},
    "DM": {"email": "dm.dharwad@kfdc.in", "password": "pass123"},
}

# Test Plantation IDs (as per review request)
TEST_PLANTATION_IDS = ["plt-d01", "plt-d05"]

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
                    user_name = data.get("user", {}).get("name", "Unknown")
                    self.log_result(f"Authentication - {role}", "PASS", f"User: {user_name}")
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
                    return {"raw_response": response.text}
            else:
                print(f"❌ API Error - {method} {endpoint}: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Request Exception - {method} {endpoint}: {str(e)}")
            return None

    def test_multi_plantation_draft_generation(self):
        """Test 1: Multi-Plantation Draft Generation - POST /api/apo/generate-draft"""
        print("\n🎯 TESTING MULTI-PLANTATION DRAFT GENERATION")
        
        # Test with multiple plantation IDs as specified in review request
        for plantation_id in TEST_PLANTATION_IDS:
            try:
                data = {
                    "plantation_id": plantation_id,
                    "financial_year": "2026-27"
                }
                
                response = self.make_authenticated_request("POST", "/apo/generate-draft", "RO", data)
                
                if response:
                    plantation_name = response.get("plantation_name", "Unknown")
                    age = response.get("age", 0)
                    items_count = len(response.get("items", []))
                    total_cost = response.get("total_estimated_cost", 0)
                    
                    self.log_result(
                        f"Draft Generation - {plantation_id}",
                        "PASS",
                        f"Plantation: {plantation_name} (Age: {age}), Activities: {items_count}, Total: ₹{total_cost:,.2f}"
                    )
                else:
                    self.log_result(f"Draft Generation - {plantation_id}", "FAIL", "No response received")
                    
            except Exception as e:
                self.log_result(f"Draft Generation - {plantation_id}", "FAIL", f"Exception: {str(e)}")

    def test_apo_creation_multiple_plantations(self):
        """Test 2: APO Creation with Multiple Plantation Items"""
        print("\n🎯 TESTING APO CREATION WITH MULTIPLE PLANTATIONS")
        
        try:
            # Create APO with items from multiple plantations
            # First, get draft data for both plantations
            draft_items = []
            plantation_names = []
            
            for plantation_id in TEST_PLANTATION_IDS:
                draft_response = self.make_authenticated_request(
                    "POST", "/apo/generate-draft", "RO", 
                    {"plantation_id": plantation_id, "financial_year": "2026-27"}
                )
                
                if draft_response:
                    plantation_names.append(draft_response.get("plantation_name", plantation_id))
                    items = draft_response.get("items", [])
                    # Take first 2 items from each plantation for testing
                    for item in items[:2]:
                        draft_items.append({
                            "activity_id": item["activity_id"],
                            "activity_name": item["activity_name"],
                            "sanctioned_qty": item["suggested_qty"],
                            "sanctioned_rate": item["sanctioned_rate"],
                            "unit": item["unit"]
                        })
            
            if not draft_items:
                self.log_result("APO Creation - Multi-Plantation", "FAIL", "No draft items generated")
                return
            
            # Create APO with DRAFT status and items from multiple plantations
            apo_data = {
                "plantation_id": TEST_PLANTATION_IDS[0],  # Primary plantation
                "financial_year": "2026-27",
                "title": f"Multi-Plantation APO - {', '.join(plantation_names)}",
                "status": "DRAFT",
                "items": draft_items
            }
            
            apo_response = self.make_authenticated_request("POST", "/apo", "RO", apo_data)
            
            if apo_response:
                self.apo_id = apo_response.get("id")
                total_amount = apo_response.get("total_sanctioned_amount", 0)
                items_count = len(apo_response.get("items", []))
                
                self.log_result(
                    "APO Creation - Multi-Plantation",
                    "PASS",
                    f"APO ID: {self.apo_id}, Items: {items_count}, Total: ₹{total_amount:,.2f}"
                )
                
                # Verify total calculation
                expected_total = sum(float(item["sanctioned_qty"]) * float(item["sanctioned_rate"]) for item in draft_items)
                if abs(total_amount - expected_total) < 0.01:
                    self.log_result("Total Calculation Verification", "PASS", f"Calculated: ₹{expected_total:,.2f}, Received: ₹{total_amount:,.2f}")
                else:
                    self.log_result("Total Calculation Verification", "FAIL", f"Expected: ₹{expected_total:,.2f}, Got: ₹{total_amount:,.2f}")
            else:
                self.log_result("APO Creation - Multi-Plantation", "FAIL", "No response received")
                
        except Exception as e:
            self.log_result("APO Creation - Multi-Plantation", "FAIL", f"Exception: {str(e)}")

    def test_activities_endpoint(self):
        """Test 3: GET /api/activities - verify all activities are returned"""
        print("\n🎯 TESTING ACTIVITIES ENDPOINT")
        
        try:
            response = self.make_authenticated_request("GET", "/activities", "RO")
            
            if response:
                activities_count = len(response)
                
                # Verify structure and content
                sample_activity = response[0] if response else {}
                required_fields = ["id", "name", "category", "unit"]
                missing_fields = [field for field in required_fields if field not in sample_activity]
                
                if missing_fields:
                    self.log_result("Activities Endpoint", "FAIL", f"Missing fields: {missing_fields}")
                else:
                    # Get some sample activities for verification
                    activity_names = [act["name"] for act in response[:3]]
                    self.log_result(
                        "Activities Endpoint",
                        "PASS",
                        f"Retrieved {activities_count} activities. Sample: {', '.join(activity_names)}"
                    )
            else:
                self.log_result("Activities Endpoint", "FAIL", "No response received")
                
        except Exception as e:
            self.log_result("Activities Endpoint", "FAIL", f"Exception: {str(e)}")

    def test_norms_endpoint(self):
        """Test 4: GET /api/norms - verify norms are returned with activity details"""
        print("\n🎯 TESTING NORMS ENDPOINT")
        
        try:
            response = self.make_authenticated_request("GET", "/norms", "RO")
            
            if response:
                norms_count = len(response)
                
                # Verify structure and enrichment with activity details
                sample_norm = response[0] if response else {}
                required_fields = ["id", "activity_id", "applicable_age", "standard_rate", "activity_name", "category", "unit"]
                missing_fields = [field for field in required_fields if field not in sample_norm]
                
                if missing_fields:
                    self.log_result("Norms Endpoint", "FAIL", f"Missing fields: {missing_fields}")
                else:
                    # Get age distribution
                    ages = set(norm.get("applicable_age", 0) for norm in response)
                    age_range = f"{min(ages)}-{max(ages)}" if ages else "None"
                    
                    self.log_result(
                        "Norms Endpoint",
                        "PASS",
                        f"Retrieved {norms_count} norms with activity details. Age range: {age_range}"
                    )
            else:
                self.log_result("Norms Endpoint", "FAIL", "No response received")
                
        except Exception as e:
            self.log_result("Norms Endpoint", "FAIL", f"Exception: {str(e)}")

    def test_apo_list_and_detail(self):
        """Test 5: APO List and Detail endpoints"""
        print("\n🎯 TESTING APO LIST AND DETAIL")
        
        # Test APO List
        try:
            list_response = self.make_authenticated_request("GET", "/apo", "RO")
            
            if list_response:
                apo_count = len(list_response)
                self.log_result("APO List", "PASS", f"Retrieved {apo_count} APOs")
                
                # Test APO Detail if we have an APO ID
                if self.apo_id:
                    detail_response = self.make_authenticated_request("GET", f"/apo/{self.apo_id}", "RO")
                    
                    if detail_response:
                        items_count = len(detail_response.get("items", []))
                        apo_title = detail_response.get("title", "Unknown")
                        self.log_result(
                            "APO Detail",
                            "PASS",
                            f"APO: {apo_title}, Items: {items_count}"
                        )
                    else:
                        self.log_result("APO Detail", "FAIL", "No response received")
                else:
                    # Get the first APO from the list
                    if list_response:
                        first_apo_id = list_response[0].get("id")
                        if first_apo_id:
                            detail_response = self.make_authenticated_request("GET", f"/apo/{first_apo_id}", "RO")
                            
                            if detail_response:
                                items_count = len(detail_response.get("items", []))
                                apo_title = detail_response.get("title", "Unknown")
                                self.log_result(
                                    "APO Detail (First in List)",
                                    "PASS",
                                    f"APO: {apo_title}, Items: {items_count}"
                                )
                            else:
                                self.log_result("APO Detail (First in List)", "FAIL", "No response received")
            else:
                self.log_result("APO List", "FAIL", "No response received")
                
        except Exception as e:
            self.log_result("APO List/Detail", "FAIL", f"Exception: {str(e)}")

    def test_apo_status_transitions(self):
        """Test 6: Test APO Status Transitions (DRAFT → PENDING → SANCTIONED)"""
        print("\n🎯 TESTING APO STATUS TRANSITIONS")
        
        if not self.apo_id:
            self.log_result("APO Status Transitions", "SKIP", "No APO ID available for testing")
            return
        
        try:
            # Test RO submitting APO to DM
            status_data = {"status": "PENDING_DM_APPROVAL"}
            response = self.make_authenticated_request("PATCH", f"/apo/{self.apo_id}/status", "RO", status_data)
            
            if response:
                new_status = response.get("status")
                self.log_result("APO Submit (RO)", "PASS", f"Status: {new_status}")
                
                # Test DM approving APO
                dm_token = self.authenticate_user("DM")
                if dm_token:
                    approval_data = {"status": "SANCTIONED"}
                    dm_response = self.make_authenticated_request("PATCH", f"/apo/{self.apo_id}/status", "DM", approval_data)
                    
                    if dm_response:
                        final_status = dm_response.get("status")
                        self.log_result("APO Approval (DM)", "PASS", f"Final Status: {final_status}")
                    else:
                        self.log_result("APO Approval (DM)", "FAIL", "No response received")
            else:
                self.log_result("APO Submit (RO)", "FAIL", "No response received")
                
        except Exception as e:
            self.log_result("APO Status Transitions", "FAIL", f"Exception: {str(e)}")

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 STARTING KFDC iFMS MULTI-PLANTATION APO WORKFLOW TESTING")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"🔑 Test Plantations: {', '.join(TEST_PLANTATION_IDS)}")
        print("=" * 80)
        
        # Phase 1: Authentication
        print("\n📋 PHASE 1: AUTHENTICATION")
        ro_token = self.authenticate_user("RO")
        
        if not ro_token:
            print("❌ CRITICAL: RO authentication failed. Cannot continue.")
            return
        
        # Phase 2: Multi-Plantation Draft Generation
        self.test_multi_plantation_draft_generation()
        
        # Phase 3: APO Creation with Multiple Plantation Items
        self.test_apo_creation_multiple_plantations()
        
        # Phase 4: Activities and Norms Endpoints
        self.test_activities_endpoint()
        self.test_norms_endpoint()
        
        # Phase 5: APO List and Detail
        self.test_apo_list_and_detail()
        
        # Phase 6: APO Status Transitions
        self.test_apo_status_transitions()
        
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
            print("✨ Multi-Plantation APO workflow is working as expected")
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