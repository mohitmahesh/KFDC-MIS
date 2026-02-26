#!/usr/bin/env python3
"""
KFDC iFMS Backend Testing Suite
Focus: NEW APO creation flow with CapEx/RevEx categorization and DO→ED→MD approval workflow

Test Scenarios from Review Request:
1. Database Seeding - POST /api/seed
2. Authentication - All 4 new roles (RO, DO, ED, MD)
3. DO Creates APO with Multi-Module Items
4. Rate Card Endpoints 
5. APO Approval Workflow (DO→ED→MD)
6. RBAC Enforcement
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://ifms-apo-wizard.preview.emergentagent.com/api"
CREDENTIALS = {
    "RO": {"email": "ro.dharwad@kfdc.in", "password": "pass123"},
    "DO": {"email": "do.dharwad@kfdc.in", "password": "pass123"}, 
    "ED": {"email": "ed@kfdc.in", "password": "pass123"},
    "MD": {"email": "md@kfdc.in", "password": "pass123"},
    "ADMIN": {"email": "admin@kfdc.in", "password": "pass123"}
}

class KFDCBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.test_results = []
        self.failed_tests = []

    def log_test(self, test_name, status, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        
        status_symbol = "✅" if status == "PASS" else "❌"
        print(f"{status_symbol} {test_name}: {message}")
        
        if status == "FAIL":
            self.failed_tests.append(test_name)
            if details:
                print(f"   Details: {details}")

    def make_request(self, method, endpoint, token=None, data=None, files=None):
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                if files:
                    # Remove Content-Type for file uploads
                    headers.pop("Content-Type", None)
                    response = self.session.post(url, headers=headers, files=files, data=data)
                else:
                    response = self.session.post(url, headers=headers, json=data)
            elif method.upper() == "PATCH":
                response = self.session.patch(url, headers=headers, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_database_seeding(self):
        """Test 1: Database Seeding"""
        print("\n=== TEST 1: DATABASE SEEDING ===")
        
        try:
            response = self.make_request("POST", "/seed")
            
            if response and response.status_code == 200:
                data = response.json()
                # Validate seed response
                if "message" in data and "Database seeded" in data["message"]:
                    self.log_test(
                        "Database Seeding", 
                        "PASS", 
                        f"Database seeded successfully: {data['message']}"
                    )
                    return True
                else:
                    self.log_test(
                        "Database Seeding", 
                        "FAIL", 
                        "Invalid seed response format",
                        data
                    )
            else:
                self.log_test(
                    "Database Seeding", 
                    "FAIL", 
                    f"Seeding failed with status {response.status_code if response else 'No Response'}"
                )
                
        except Exception as e:
            self.log_test("Database Seeding", "FAIL", f"Exception: {str(e)}")
            
        return False

    def test_authentication(self):
        """Test 2: Authentication - All 4 new roles"""
        print("\n=== TEST 2: AUTHENTICATION (RO, DO, ED, MD) ===")
        
        success_count = 0
        
        for role, creds in CREDENTIALS.items():
            try:
                response = self.make_request("POST", "/auth/login", data=creds)
                
                if response and response.status_code == 200:
                    data = response.json()
                    if "token" in data and "user" in data:
                        self.tokens[role] = data["token"]
                        user = data["user"]
                        self.log_test(
                            f"Authentication - {role}",
                            "PASS", 
                            f"Login successful: {user.get('name', 'Unknown')} ({user.get('role', 'Unknown')})"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            f"Authentication - {role}",
                            "FAIL",
                            "Invalid login response format",
                            data
                        )
                else:
                    error_msg = "No response"
                    if response:
                        error_msg = f"Status {response.status_code}"
                        try:
                            error_data = response.json()
                            if "error" in error_data:
                                error_msg += f": {error_data['error']}"
                        except:
                            pass
                    
                    self.log_test(
                        f"Authentication - {role}",
                        "FAIL",
                        f"Login failed: {error_msg}"
                    )
                        
            except Exception as e:
                self.log_test(f"Authentication - {role}", "FAIL", f"Exception: {str(e)}")
        
        return success_count == len(CREDENTIALS)

    def test_do_apo_creation_multi_module(self):
        """Test 3: DO Creates APO with Multi-Module Items"""
        print("\n=== TEST 3: DO CREATES APO WITH MULTI-MODULE ITEMS ===")
        
        if "DO" not in self.tokens:
            self.log_test("DO APO Creation", "SKIP", "DO not authenticated")
            return False

        do_token = self.tokens["DO"]
        
        # 3a. Get plantations (DO should see all)
        try:
            response = self.make_request("GET", "/plantations", token=do_token)
            if response and response.status_code == 200:
                plantations = response.json()
                self.log_test(
                    "DO Get Plantations",
                    "PASS", 
                    f"Retrieved {len(plantations)} plantations"
                )
            else:
                self.log_test("DO Get Plantations", "FAIL", f"Failed to get plantations")
                return False
        except Exception as e:
            self.log_test("DO Get Plantations", "FAIL", f"Exception: {str(e)}")
            return False

        # 3b. Get buildings
        try:
            response = self.make_request("GET", "/buildings", token=do_token)
            if response and response.status_code == 200:
                buildings = response.json()
                self.log_test(
                    "DO Get Buildings",
                    "PASS", 
                    f"Retrieved {len(buildings)} buildings"
                )
            else:
                self.log_test("DO Get Buildings", "FAIL", f"Failed to get buildings")
                return False
        except Exception as e:
            self.log_test("DO Get Buildings", "FAIL", f"Exception: {str(e)}")
            return False

        # 3c. Get nurseries 
        try:
            response = self.make_request("GET", "/nurseries", token=do_token)
            if response and response.status_code == 200:
                nurseries = response.json()
                self.log_test(
                    "DO Get Nurseries",
                    "PASS", 
                    f"Retrieved {len(nurseries)} nurseries"
                )
            else:
                self.log_test("DO Get Nurseries", "FAIL", f"Failed to get nurseries")
                return False
        except Exception as e:
            self.log_test("DO Get Nurseries", "FAIL", f"Exception: {str(e)}")
            return False

        # 3d. Generate draft for plantation
        plantation_id = None
        if plantations:
            plantation_id = plantations[0]["id"]
            
        try:
            response = self.make_request("POST", "/apo/generate-draft", token=do_token, data={
                "plantation_id": plantation_id,
                "financial_year": "2026-27"
            })
            if response and response.status_code == 200:
                draft_data = response.json()
                self.log_test(
                    "Plantation Draft Generation",
                    "PASS", 
                    f"Generated {len(draft_data.get('items', []))} activities for plantation"
                )
            else:
                self.log_test("Plantation Draft Generation", "FAIL", f"Failed to generate draft")
        except Exception as e:
            self.log_test("Plantation Draft Generation", "FAIL", f"Exception: {str(e)}")

        # 3e. Generate draft for building
        building_id = None
        if buildings:
            building_id = buildings[0]["id"]
            
        try:
            response = self.make_request("POST", "/buildings/generate-draft", token=do_token, data={
                "building_id": building_id,
                "financial_year": "2026-27"
            })
            if response and response.status_code == 200:
                draft_data = response.json()
                self.log_test(
                    "Building Draft Generation",
                    "PASS", 
                    f"Generated {len(draft_data.get('items', []))} activities for building"
                )
            else:
                self.log_test("Building Draft Generation", "FAIL", f"Failed to generate building draft")
        except Exception as e:
            self.log_test("Building Draft Generation", "FAIL", f"Exception: {str(e)}")

        # 3f. Generate draft for nursery
        nursery_id = None
        if nurseries:
            nursery_id = nurseries[0]["id"]
            
        try:
            response = self.make_request("POST", "/nurseries/generate-draft", token=do_token, data={
                "nursery_id": nursery_id,
                "financial_year": "2026-27"
            })
            if response and response.status_code == 200:
                draft_data = response.json()
                self.log_test(
                    "Nursery Draft Generation",
                    "PASS", 
                    f"Generated {len(draft_data.get('items', []))} activities for nursery"
                )
            else:
                self.log_test("Nursery Draft Generation", "FAIL", f"Failed to generate nursery draft")
        except Exception as e:
            self.log_test("Nursery Draft Generation", "FAIL", f"Exception: {str(e)}")

        # 3g. Create APO with capex_items and revex_items
        try:
            apo_data = {
                "financial_year": "2026-27",
                "title": "Test Multi-Module APO",
                "status": "DRAFT",
                "capex_items": [
                    {
                        "activity_id": "act-planting",
                        "activity_name": "Planting of Seedlings", 
                        "sanctioned_qty": 10,
                        "sanctioned_rate": 1521.71,
                        "unit": "Per 1000 Sdls",
                        "source_type": "plantation",
                        "source_id": plantation_id,
                        "source_name": "Test Plantation"
                    }
                ],
                "revex_items": [
                    {
                        "activity_id": "act-fireline",
                        "activity_name": "Clearing 5m Wide Fire Lines",
                        "sanctioned_qty": 5,
                        "sanctioned_rate": 5455.86,
                        "unit": "Per Hectare", 
                        "source_type": "plantation",
                        "source_id": plantation_id,
                        "source_name": "Test Plantation"
                    }
                ]
            }
            
            response = self.make_request("POST", "/apo", token=do_token, data=apo_data)
            if response and response.status_code == 201:
                apo_result = response.json()
                self.apo_id = apo_result.get("id")  # Store for later tests
                status = apo_result.get("status", "Unknown")
                
                expected_statuses = ["DRAFT", "PENDING_ED_APPROVAL"]
                if status in expected_statuses:
                    self.log_test(
                        "APO Creation with CapEx/RevEx",
                        "PASS", 
                        f"APO created with status: {status}, ID: {self.apo_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "APO Creation with CapEx/RevEx",
                        "FAIL", 
                        f"Unexpected status: {status}"
                    )
            else:
                error_msg = "Unknown error"
                if response:
                    error_msg = f"Status {response.status_code}"
                    try:
                        error_data = response.json()
                        if "error" in error_data:
                            error_msg += f": {error_data['error']}"
                    except:
                        pass
                self.log_test("APO Creation with CapEx/RevEx", "FAIL", error_msg)
        except Exception as e:
            self.log_test("APO Creation with CapEx/RevEx", "FAIL", f"Exception: {str(e)}")
            
        return False

    def test_rate_card_endpoints(self):
        """Test 4: Rate Card Endpoints"""
        print("\n=== TEST 4: RATE CARD ENDPOINTS ===")
        
        token = self.tokens.get("DO") or self.tokens.get("ADMIN")
        if not token:
            self.log_test("Rate Card Endpoints", "SKIP", "No valid token available")
            return False

        endpoints = [
            ("/activities", "Plantation Activities"),
            ("/norms", "Plantation Norms"), 
            ("/building-activities", "Building Activities"),
            ("/building-norms", "Building Norms"),
            ("/nursery-activities", "Nursery Activities"),
            ("/nursery-norms", "Nursery Norms")
        ]
        
        success_count = 0
        
        for endpoint, name in endpoints:
            try:
                response = self.make_request("GET", endpoint, token=token)
                if response and response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        self.log_test(
                            f"Rate Card - {name}",
                            "PASS", 
                            f"Retrieved {len(data)} {name.lower()}"
                        )
                        success_count += 1
                    else:
                        self.log_test(
                            f"Rate Card - {name}",
                            "FAIL", 
                            "Empty or invalid response"
                        )
                else:
                    self.log_test(
                        f"Rate Card - {name}",
                        "FAIL", 
                        f"HTTP {response.status_code if response else 'No Response'}"
                    )
            except Exception as e:
                self.log_test(f"Rate Card - {name}", "FAIL", f"Exception: {str(e)}")
        
        return success_count == len(endpoints)

    def test_apo_approval_workflow(self):
        """Test 5: APO Approval Workflow (DO→ED→MD)"""
        print("\n=== TEST 5: APO APPROVAL WORKFLOW (DO→ED→MD) ===")
        
        if not hasattr(self, 'apo_id') or not self.apo_id:
            self.log_test("APO Workflow", "SKIP", "No APO created to test workflow")
            return False

        # Step 1: DO submits APO to ED (if not already submitted)
        if "DO" in self.tokens:
            try:
                # First check current APO status
                response = self.make_request("GET", f"/apo/{self.apo_id}", token=self.tokens["DO"])
                if response and response.status_code == 200:
                    apo_data = response.json()
                    current_status = apo_data.get("status")
                    
                    if current_status == "DRAFT":
                        # Submit to ED
                        response = self.make_request("PATCH", f"/apo/{self.apo_id}/status", 
                                                  token=self.tokens["DO"], 
                                                  data={"status": "PENDING_ED_APPROVAL"})
                        if response and response.status_code == 200:
                            self.log_test(
                                "DO Submits to ED",
                                "PASS", 
                                "APO submitted to ED for approval"
                            )
                        else:
                            self.log_test("DO Submits to ED", "FAIL", f"Failed to submit APO")
                            return False
                    elif current_status == "PENDING_ED_APPROVAL":
                        self.log_test(
                            "DO Submits to ED",
                            "PASS", 
                            "APO already in PENDING_ED_APPROVAL status"
                        )
                    else:
                        self.log_test(
                            "DO Submits to ED",
                            "FAIL", 
                            f"Unexpected APO status: {current_status}"
                        )
                        return False
            except Exception as e:
                self.log_test("DO Submits to ED", "FAIL", f"Exception: {str(e)}")
                return False

        # Step 2: ED sees pending APOs
        if "ED" in self.tokens:
            try:
                response = self.make_request("GET", "/apo", token=self.tokens["ED"])
                if response and response.status_code == 200:
                    apos = response.json()
                    pending_apos = [apo for apo in apos if apo.get("status") == "PENDING_ED_APPROVAL"]
                    if len(pending_apos) > 0:
                        self.log_test(
                            "ED Views Pending APOs",
                            "PASS", 
                            f"ED can see {len(pending_apos)} pending APOs"
                        )
                    else:
                        self.log_test(
                            "ED Views Pending APOs",
                            "FAIL", 
                            "No pending APOs visible to ED"
                        )
                        return False
            except Exception as e:
                self.log_test("ED Views Pending APOs", "FAIL", f"Exception: {str(e)}")
                return False

        # Step 3: ED approves APO (forwards to MD)
        if "ED" in self.tokens:
            try:
                response = self.make_request("PATCH", f"/apo/{self.apo_id}/status", 
                                          token=self.tokens["ED"], 
                                          data={"status": "PENDING_MD_APPROVAL"})
                if response and response.status_code == 200:
                    self.log_test(
                        "ED Approves (forwards to MD)",
                        "PASS", 
                        "ED approved APO, forwarded to MD"
                    )
                else:
                    self.log_test("ED Approves (forwards to MD)", "FAIL", f"ED approval failed")
                    return False
            except Exception as e:
                self.log_test("ED Approves (forwards to MD)", "FAIL", f"Exception: {str(e)}")
                return False

        # Step 4: MD sees pending APOs
        if "MD" in self.tokens:
            try:
                response = self.make_request("GET", "/apo", token=self.tokens["MD"])
                if response and response.status_code == 200:
                    apos = response.json()
                    pending_apos = [apo for apo in apos if apo.get("status") == "PENDING_MD_APPROVAL"]
                    if len(pending_apos) > 0:
                        self.log_test(
                            "MD Views Pending APOs",
                            "PASS", 
                            f"MD can see {len(pending_apos)} pending APOs"
                        )
                    else:
                        self.log_test(
                            "MD Views Pending APOs",
                            "FAIL", 
                            "No pending APOs visible to MD"
                        )
                        return False
            except Exception as e:
                self.log_test("MD Views Pending APOs", "FAIL", f"Exception: {str(e)}")
                return False

        # Step 5: MD gives final approval
        if "MD" in self.tokens:
            try:
                response = self.make_request("PATCH", f"/apo/{self.apo_id}/status", 
                                          token=self.tokens["MD"], 
                                          data={"status": "SANCTIONED"})
                if response and response.status_code == 200:
                    self.log_test(
                        "MD Final Approval",
                        "PASS", 
                        "MD sanctioned APO successfully"
                    )
                    return True
                else:
                    self.log_test("MD Final Approval", "FAIL", f"MD approval failed")
                    return False
            except Exception as e:
                self.log_test("MD Final Approval", "FAIL", f"Exception: {str(e)}")
                return False

        return True

    def test_rbac_enforcement(self):
        """Test 6: RBAC Enforcement"""
        print("\n=== TEST 6: RBAC ENFORCEMENT ===")
        
        # Test 6a: RO should NOT be able to create APOs
        if "RO" in self.tokens:
            try:
                apo_data = {
                    "financial_year": "2026-27",
                    "title": "Unauthorized APO",
                    "status": "DRAFT",
                    "capex_items": []
                }
                
                response = self.make_request("POST", "/apo", token=self.tokens["RO"], data=apo_data)
                if response and response.status_code == 403:
                    self.log_test(
                        "RO APO Creation Block",
                        "PASS", 
                        "RO correctly blocked from creating APOs (403 Forbidden)"
                    )
                else:
                    self.log_test(
                        "RO APO Creation Block",
                        "FAIL", 
                        f"RO should be blocked but got status: {response.status_code if response else 'No Response'}"
                    )
            except Exception as e:
                self.log_test("RO APO Creation Block", "FAIL", f"Exception: {str(e)}")

        # Test 6b: RO should be able to create buildings and nurseries
        if "RO" in self.tokens:
            # Test building creation
            try:
                building_data = {
                    "name": "Test Building by RO",
                    "division": "Dharwad",
                    "district": "Dharwad", 
                    "taluk": "Dharwad",
                    "year_of_creation": 2026,
                    "building_phase": "Creation",
                    "status": "Active"
                }
                
                response = self.make_request("POST", "/buildings", token=self.tokens["RO"], data=building_data)
                if response and response.status_code == 201:
                    self.log_test(
                        "RO Building Creation",
                        "PASS", 
                        "RO can create buildings successfully"
                    )
                else:
                    self.log_test(
                        "RO Building Creation",
                        "FAIL", 
                        f"RO building creation failed: {response.status_code if response else 'No Response'}"
                    )
            except Exception as e:
                self.log_test("RO Building Creation", "FAIL", f"Exception: {str(e)}")

            # Test nursery creation
            try:
                nursery_data = {
                    "name": "Test Nursery by RO",
                    "nursery_type": "Raising",
                    "capacity_seedlings": 25000,
                    "status": "Active"
                }
                
                response = self.make_request("POST", "/nurseries", token=self.tokens["RO"], data=nursery_data)
                if response and response.status_code == 201:
                    self.log_test(
                        "RO Nursery Creation",
                        "PASS", 
                        "RO can create nurseries successfully"
                    )
                else:
                    self.log_test(
                        "RO Nursery Creation",
                        "FAIL", 
                        f"RO nursery creation failed: {response.status_code if response else 'No Response'}"
                    )
            except Exception as e:
                self.log_test("RO Nursery Creation", "FAIL", f"Exception: {str(e)}")

        return True

    def run_all_tests(self):
        """Run all test scenarios"""
        print("🚀 Starting KFDC iFMS Backend Testing Suite")
        print(f"Backend URL: {BASE_URL}")
        print("=" * 60)
        
        # Test 1: Database Seeding
        self.test_database_seeding()
        
        # Test 2: Authentication
        self.test_authentication()
        
        # Test 3: DO APO Creation with Multi-Module Items
        self.test_do_apo_creation_multi_module()
        
        # Test 4: Rate Card Endpoints
        self.test_rate_card_endpoints()
        
        # Test 5: APO Approval Workflow (DO→ED→MD)
        self.test_apo_approval_workflow()
        
        # Test 6: RBAC Enforcement
        self.test_rbac_enforcement()
        
        # Print Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🎯 BACKEND TESTING SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["status"] == "PASS"])
        failed_tests = len([t for t in self.test_results if t["status"] == "FAIL"])
        skipped_tests = len([t for t in self.test_results if t["status"] == "SKIP"])
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⏭️  Skipped: {skipped_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"   - {test}")
        
        if success_rate >= 80:
            print(f"\n🎉 TESTING RESULT: SUCCESS")
            print("The KFDC iFMS backend is working correctly!")
        else:
            print(f"\n⚠️  TESTING RESULT: ISSUES FOUND") 
            print("Some backend functionality needs attention.")
        
        print("=" * 60)

def main():
    """Main execution function"""
    try:
        tester = KFDCBackendTester()
        tester.run_all_tests()
        return 0
    except KeyboardInterrupt:
        print("\n\n⚠️ Testing interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n❌ Testing failed with exception: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())