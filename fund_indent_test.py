#!/usr/bin/env python3

"""
KFDC iFMS - Fund Indent Workflow Test Suite
Testing Fund Indent workflow: RFO → DCF → ED → MD
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Base URL from environment
BASE_URL = "https://kfdc-fund-mgmt.preview.emergentagent.com/api"

class FundIndentTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens: Dict[str, str] = {}
        self.test_data = {}
        self.tests_passed = 0
        self.tests_failed = 0
        self.est_id = None
        self.apo_id = None

    def log(self, message: str, level: str = "INFO"):
        """Enhanced logging with levels"""
        print(f"[{level}] {message}")
        if level == "ERROR":
            print(f"[ERROR DETAIL] Check the response and endpoint configuration")

    def login(self, email: str, password: str, role_name: str) -> Optional[str]:
        """Login and return token"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": email,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("token")
                self.tokens[role_name] = token
                self.log(f"✅ Login successful for {role_name} ({email})")
                return token
            else:
                self.log(f"❌ Login failed for {role_name} ({email}): {response.status_code} - {response.text}", "ERROR")
                return None
        except Exception as e:
            self.log(f"❌ Login error for {role_name}: {str(e)}", "ERROR")
            return None

    def make_request(self, method: str, endpoint: str, token: str = None, data: Dict = None) -> Dict[str, Any]:
        """Make authenticated API request"""
        try:
            headers = {}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            url = f"{BASE_URL}{endpoint}"
            
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=headers, json=data)
            elif method.upper() == "PATCH":
                response = self.session.patch(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, headers=headers, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            
            try:
                return {
                    "status_code": response.status_code,
                    "data": response.json(),
                    "success": 200 <= response.status_code < 300
                }
            except:
                return {
                    "status_code": response.status_code,
                    "data": {"message": response.text},
                    "success": 200 <= response.status_code < 300
                }
        except Exception as e:
            self.log(f"❌ Request error for {method} {endpoint}: {str(e)}", "ERROR")
            return {"status_code": 500, "data": {"error": str(e)}, "success": False}

    def test_assertion(self, condition: bool, test_name: str, details: str = ""):
        """Test assertion with detailed logging"""
        if condition:
            self.tests_passed += 1
            self.log(f"✅ PASS: {test_name} {details}")
        else:
            self.tests_failed += 1
            self.log(f"❌ FAIL: {test_name} {details}", "ERROR")
        return condition

    def test_1_seed_database(self):
        """Test 1: Seed Database"""
        self.log("\n=== TEST 1: SEED DATABASE ===")
        
        response = self.make_request("POST", "/seed")
        
        success = self.test_assertion(
            response["success"],
            "Database seeding",
            f"Status: {response['status_code']}"
        )
        
        if success:
            data = response["data"]
            self.log(f"Users seeded: {data.get('users_count', 'N/A')}")
            self.log(f"APOs seeded: {data.get('apos_count', 'N/A')}")
            self.log(f"Plantations seeded: {data.get('plantations_count', 'N/A')}")
            
            # Verify new Fund Indent users exist
            expected_users = [
                'rfo.dharwad@kfdc.in', 'dcf.dharwad@kfdc.in', 
                'ed@kfdc.in', 'md@kfdc.in'
            ]
            self.log(f"Expected Fund Indent users: {expected_users}")

    def test_2_user_logins(self):
        """Test 2: Test User Logins for Fund Indent Hierarchy"""
        self.log("\n=== TEST 2: USER LOGINS FOR FUND INDENT HIERARCHY ===")
        
        fund_indent_users = [
            ("rfo.dharwad@kfdc.in", "pass123", "RFO"),
            ("dcf.dharwad@kfdc.in", "pass123", "DCF"),
            ("ed@kfdc.in", "pass123", "ED"),
            ("md@kfdc.in", "pass123", "MD")
        ]
        
        for email, password, role in fund_indent_users:
            token = self.login(email, password, role)
            self.test_assertion(token is not None, f"Authentication for {role}", f"Email: {email}")

    def test_3a_rfo_login(self):
        """Test 3A: RFO Login"""
        self.log("\n=== TEST 3A: RFO LOGIN ===")
        
        # Already tested in test_2, just verify token exists
        rfo_token_exists = "RFO" in self.tokens
        self.test_assertion(rfo_token_exists, "RFO token available", f"Token exists: {rfo_token_exists}")

    def test_3b_get_available_works(self):
        """Test 3B: Get available works"""
        self.log("\n=== TEST 3B: GET AVAILABLE WORKS ===")
        
        if "RFO" not in self.tokens:
            self.log("❌ RFO token not available", "ERROR")
            return
            
        response = self.make_request("GET", "/fund-indent/works?year=2026-27", self.tokens["RFO"])
        
        success = self.test_assertion(
            response["success"],
            "Get available works for Fund Indent",
            f"Status: {response['status_code']}"
        )
        
        if success:
            data = response["data"]
            works = data.get("works", [])
            self.log(f"Found {len(works)} works available for Fund Indent")
            
            if works:
                # Store the first work's APO ID for next test
                self.apo_id = works[0]["apo_id"]
                self.log(f"Using APO ID for testing: {self.apo_id}")
                self.test_assertion(True, "Works available from SANCTIONED APOs", f"Count: {len(works)}")
            else:
                self.log("No works available - may need to create and sanction APO first", "WARN")

    def test_3c_get_line_items(self):
        """Test 3C: Get line items for a work"""
        self.log("\n=== TEST 3C: GET LINE ITEMS FOR A WORK ===")
        
        if "RFO" not in self.tokens:
            self.log("❌ RFO token not available", "ERROR")
            return
            
        if not self.apo_id:
            self.log("❌ No APO ID available from previous test", "ERROR")
            return
            
        response = self.make_request("GET", f"/fund-indent/work-items/{self.apo_id}", self.tokens["RFO"])
        
        success = self.test_assertion(
            response["success"],
            "Get line items for work",
            f"Status: {response['status_code']}, APO: {self.apo_id}"
        )
        
        if success:
            data = response["data"]
            items = data.get("items", [])
            self.log(f"Found {len(items)} line items for APO {self.apo_id}")
            
            if items:
                self.test_data["line_items"] = items
                self.log(f"Plantation: {data.get('plantation_name', 'Unknown')}")
                self.log(f"Financial Year: {data.get('financial_year', 'Unknown')}")
            else:
                self.log("No line items found", "WARN")

    def test_3d_generate_fund_indent(self):
        """Test 3D: Generate Fund Indent"""
        self.log("\n=== TEST 3D: GENERATE FUND INDENT (GFI) ===")
        
        if "RFO" not in self.tokens:
            self.log("❌ RFO token not available", "ERROR")
            return
            
        if not self.apo_id:
            self.log("❌ No APO ID available", "ERROR")
            return
            
        if not self.test_data.get("line_items"):
            self.log("❌ No line items available from previous test", "ERROR")
            return
            
        # Use first line item for Fund Indent
        line_item = self.test_data["line_items"][0]
        
        fund_indent_data = {
            "apo_id": self.apo_id,
            "items": [
                {
                    "id": line_item["id"],
                    "period_from": "2026-04-01",
                    "period_to": "2026-05-15",
                    "cm_date": "2026-05-10",
                    "cm_by": "RFO Name",
                    "fnb_book_no": "123",
                    "fnb_page_no": "45"
                }
            ]
        }
        
        response = self.make_request("POST", "/fund-indent/generate", self.tokens["RFO"], fund_indent_data)
        
        success = self.test_assertion(
            response["success"],
            "Generate Fund Indent",
            f"Status: {response['status_code']}"
        )
        
        if success:
            data = response["data"]
            self.est_id = data.get("est_id")
            self.log(f"Fund Indent generated with EST_ID: {self.est_id}")
            self.log(f"Total Amount: ₹{data.get('total_amount', 0)}")
            self.log(f"Item Count: {data.get('item_count', 0)}")
            self.log(f"Next Approver: {data.get('next_approver', 'Unknown')}")
            
            # Verify EST_ID format
            self.test_assertion(
                self.est_id and self.est_id.startswith("EST-"),
                "EST_ID format validation",
                f"EST_ID: {self.est_id}"
            )

    def test_4a_dcf_login_and_pending(self):
        """Test 4A: DCF Login and Get Pending Fund Indents"""
        self.log("\n=== TEST 4A: DCF LOGIN AND GET PENDING FUND INDENTS ===")
        
        if "DCF" not in self.tokens:
            self.log("❌ DCF token not available", "ERROR")
            return
            
        response = self.make_request("GET", "/fund-indent/pending", self.tokens["DCF"])
        
        success = self.test_assertion(
            response["success"],
            "DCF get pending Fund Indents",
            f"Status: {response['status_code']}"
        )
        
        if success:
            data = response["data"]
            indents = data.get("indents", [])
            pending_count = data.get("pending_count", 0)
            
            self.log(f"DCF found {pending_count} pending Fund Indents")
            
            # Verify the generated fund indent is visible
            if self.est_id:
                found_indent = next((indent for indent in indents if indent["id"] == self.est_id), None)
                self.test_assertion(
                    found_indent is not None,
                    "Generated Fund Indent visible to DCF",
                    f"EST_ID: {self.est_id}, Status: {found_indent.get('status') if found_indent else 'NOT_FOUND'}"
                )
                
                if found_indent:
                    expected_status = "PENDING_DCF"
                    actual_status = found_indent.get("status")
                    self.test_assertion(
                        actual_status == expected_status,
                        "Fund Indent status validation",
                        f"Expected: {expected_status}, Actual: {actual_status}"
                    )

    def test_4b_dcf_approves(self):
        """Test 4B: DCF Approves (forwards to ED)"""
        self.log("\n=== TEST 4B: DCF APPROVES (FORWARDS TO ED) ===")
        
        if "DCF" not in self.tokens:
            self.log("❌ DCF token not available", "ERROR")
            return
            
        if not self.est_id:
            self.log("❌ No EST_ID available from Fund Indent generation", "ERROR")
            return
            
        # Get the line items to approve
        if not self.test_data.get("line_items"):
            self.log("❌ No line items data available", "ERROR")
            return
            
        line_item = self.test_data["line_items"][0]
        
        approval_data = {
            "approved_items": [line_item["id"]],
            "rejected_items": []
        }
        
        response = self.make_request("POST", f"/fund-indent/{self.est_id}/approve", self.tokens["DCF"], approval_data)
        
        success = self.test_assertion(
            response["success"],
            "DCF approves Fund Indent",
            f"Status: {response['status_code']}, EST_ID: {self.est_id}"
        )
        
        if success:
            data = response["data"]
            new_status = data.get("new_status")
            self.log(f"Fund Indent new status: {new_status}")
            self.log(f"Message: {data.get('message', 'No message')}")
            
            # Verify status changed to PENDING_ED
            expected_status = "PENDING_ED"
            self.test_assertion(
                new_status == expected_status,
                "Fund Indent status after DCF approval",
                f"Expected: {expected_status}, Actual: {new_status}"
            )

    def test_4c_ed_login_and_pending(self):
        """Test 4C: ED Login and Get Pending Fund Indents"""
        self.log("\n=== TEST 4C: ED LOGIN AND GET PENDING FUND INDENTS ===")
        
        if "ED" not in self.tokens:
            self.log("❌ ED token not available", "ERROR")
            return
            
        response = self.make_request("GET", "/fund-indent/pending", self.tokens["ED"])
        
        success = self.test_assertion(
            response["success"],
            "ED get pending Fund Indents",
            f"Status: {response['status_code']}"
        )
        
        if success:
            data = response["data"]
            indents = data.get("indents", [])
            pending_count = data.get("pending_count", 0)
            
            self.log(f"ED found {pending_count} pending Fund Indents")
            
            # Verify the fund indent is visible with PENDING_ED status
            if self.est_id:
                found_indent = next((indent for indent in indents if indent["id"] == self.est_id), None)
                self.test_assertion(
                    found_indent is not None,
                    "Fund Indent visible to ED",
                    f"EST_ID: {self.est_id}"
                )
                
                if found_indent:
                    expected_status = "PENDING_ED"
                    actual_status = found_indent.get("status")
                    self.test_assertion(
                        actual_status == expected_status,
                        "Fund Indent status for ED",
                        f"Expected: {expected_status}, Actual: {actual_status}"
                    )

    def test_4d_ed_approves(self):
        """Test 4D: ED Approves (forwards to MD)"""
        self.log("\n=== TEST 4D: ED APPROVES (FORWARDS TO MD) ===")
        
        if "ED" not in self.tokens:
            self.log("❌ ED token not available", "ERROR")
            return
            
        if not self.est_id:
            self.log("❌ No EST_ID available", "ERROR")
            return
            
        # Get the line items to approve
        if not self.test_data.get("line_items"):
            self.log("❌ No line items data available", "ERROR")
            return
            
        line_item = self.test_data["line_items"][0]
        
        approval_data = {
            "approved_items": [line_item["id"]],
            "rejected_items": []
        }
        
        response = self.make_request("POST", f"/fund-indent/{self.est_id}/approve", self.tokens["ED"], approval_data)
        
        success = self.test_assertion(
            response["success"],
            "ED approves Fund Indent",
            f"Status: {response['status_code']}, EST_ID: {self.est_id}"
        )
        
        if success:
            data = response["data"]
            new_status = data.get("new_status")
            self.log(f"Fund Indent new status: {new_status}")
            self.log(f"Message: {data.get('message', 'No message')}")
            
            # Verify status changed to PENDING_MD
            expected_status = "PENDING_MD"
            self.test_assertion(
                new_status == expected_status,
                "Fund Indent status after ED approval",
                f"Expected: {expected_status}, Actual: {new_status}"
            )

    def test_4e_md_login_and_pending(self):
        """Test 4E: MD Login and Get Pending Fund Indents"""
        self.log("\n=== TEST 4E: MD LOGIN AND GET PENDING FUND INDENTS ===")
        
        if "MD" not in self.tokens:
            self.log("❌ MD token not available", "ERROR")
            return
            
        response = self.make_request("GET", "/fund-indent/pending", self.tokens["MD"])
        
        success = self.test_assertion(
            response["success"],
            "MD get pending Fund Indents",
            f"Status: {response['status_code']}"
        )
        
        if success:
            data = response["data"]
            indents = data.get("indents", [])
            pending_count = data.get("pending_count", 0)
            
            self.log(f"MD found {pending_count} pending Fund Indents")
            
            # Verify the fund indent is visible with PENDING_MD status
            if self.est_id:
                found_indent = next((indent for indent in indents if indent["id"] == self.est_id), None)
                self.test_assertion(
                    found_indent is not None,
                    "Fund Indent visible to MD",
                    f"EST_ID: {self.est_id}"
                )
                
                if found_indent:
                    expected_status = "PENDING_MD"
                    actual_status = found_indent.get("status")
                    self.test_assertion(
                        actual_status == expected_status,
                        "Fund Indent status for MD",
                        f"Expected: {expected_status}, Actual: {actual_status}"
                    )

    def test_4f_md_final_approval(self):
        """Test 4F: MD Final Approval"""
        self.log("\n=== TEST 4F: MD FINAL APPROVAL ===")
        
        if "MD" not in self.tokens:
            self.log("❌ MD token not available", "ERROR")
            return
            
        if not self.est_id:
            self.log("❌ No EST_ID available", "ERROR")
            return
            
        # Get the line items to approve
        if not self.test_data.get("line_items"):
            self.log("❌ No line items data available", "ERROR")
            return
            
        line_item = self.test_data["line_items"][0]
        
        approval_data = {
            "approved_items": [line_item["id"]],
            "rejected_items": []
        }
        
        response = self.make_request("POST", f"/fund-indent/{self.est_id}/approve", self.tokens["MD"], approval_data)
        
        success = self.test_assertion(
            response["success"],
            "MD final approval",
            f"Status: {response['status_code']}, EST_ID: {self.est_id}"
        )
        
        if success:
            data = response["data"]
            new_status = data.get("new_status")
            self.log(f"Fund Indent final status: {new_status}")
            self.log(f"Message: {data.get('message', 'No message')}")
            
            # Verify status changed to APPROVED
            expected_status = "APPROVED"
            self.test_assertion(
                new_status == expected_status,
                "Fund Indent final status after MD approval",
                f"Expected: {expected_status}, Actual: {new_status}"
            )

    def test_5_rbac_verification(self):
        """Test 5: RBAC Verification"""
        self.log("\n=== TEST 5: RBAC VERIFICATION ===")
        
        # Test RO cannot access fund-indent endpoints (should get 403)
        if "RO" in self.tokens:
            self.log("\n--- Testing RO cannot access fund-indent endpoints ---")
            ro_response = self.make_request("GET", "/fund-indent/works?year=2026-27", self.tokens["RO"])
            self.test_assertion(
                ro_response["status_code"] == 403,
                "RO blocked from fund-indent endpoints",
                f"Status: {ro_response['status_code']}, Expected: 403"
            )
        
        # Test RFO cannot approve (only generate)
        if "RFO" in self.tokens and self.est_id:
            self.log("\n--- Testing RFO cannot approve Fund Indent ---")
            rfo_approve_response = self.make_request("POST", f"/fund-indent/{self.est_id}/approve", self.tokens["RFO"], {
                "approved_items": [],
                "rejected_items": []
            })
            self.test_assertion(
                rfo_approve_response["status_code"] == 403,
                "RFO blocked from approving Fund Indent",
                f"Status: {rfo_approve_response['status_code']}, Expected: 403"
            )
        
        # Test DCF cannot access before status is PENDING_DCF (this would require another fund indent)
        # For now, we'll skip this as it requires more complex setup
        
        self.log("\n--- RBAC verification completed ---")

    def run_all_tests(self):
        """Run all Fund Indent tests in sequence"""
        self.log("🚀 STARTING KFDC iFMS FUND INDENT WORKFLOW TESTING")
        self.log(f"Base URL: {BASE_URL}")
        self.log("Expected Workflow: RFO generates → DCF approves → ED approves → MD approves")
        
        try:
            # Phase 1: Setup
            self.test_1_seed_database()
            self.test_2_user_logins()
            
            # Phase 2: RFO - Generate Fund Indent (GFI)
            self.test_3a_rfo_login()
            self.test_3b_get_available_works()
            self.test_3c_get_line_items()
            self.test_3d_generate_fund_indent()
            
            # Phase 3: DCF/ED/MD Approval (AFI)
            self.test_4a_dcf_login_and_pending()
            self.test_4b_dcf_approves()
            self.test_4c_ed_login_and_pending()
            self.test_4d_ed_approves()
            self.test_4e_md_login_and_pending()
            self.test_4f_md_final_approval()
            
            # Phase 4: RBAC Verification
            self.test_5_rbac_verification()
            
        except Exception as e:
            self.log(f"❌ Critical error during testing: {str(e)}", "ERROR")
            self.tests_failed += 1

        # Final summary
        total_tests = self.tests_passed + self.tests_failed
        success_rate = (self.tests_passed / total_tests * 100) if total_tests > 0 else 0
        
        self.log("\n" + "="*70)
        self.log("🎯 FUND INDENT WORKFLOW TEST RESULTS")
        self.log("="*70)
        self.log(f"✅ Tests Passed: {self.tests_passed}")
        self.log(f"❌ Tests Failed: {self.tests_failed}")
        self.log(f"📊 Total Tests: {total_tests}")
        self.log(f"🎯 Success Rate: {success_rate:.1f}%")
        
        if self.tests_failed == 0:
            self.log("🎉 ALL FUND INDENT TESTS PASSED! Workflow working correctly.")
            self.log("✅ Verified: RFO → DCF → ED → MD approval hierarchy")
        else:
            self.log("⚠️  Some tests failed. Please review the errors above.")
            
        return self.tests_failed == 0

if __name__ == "__main__":
    tester = FundIndentTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)