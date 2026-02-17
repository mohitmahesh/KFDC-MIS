#!/usr/bin/env python3

"""
KFDC iFMS - Backend Test Suite for Approval Hierarchies
Testing APO workflow: RO → DM → HO (Admin) and Estimates workflow: ECW → PS
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Base URL from environment
BASE_URL = "https://green-erp.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens: Dict[str, str] = {}
        self.test_data = {}
        self.tests_passed = 0
        self.tests_failed = 0

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

    def make_request(self, method: str, endpoint: str, token: str, data: Dict = None) -> Dict[str, Any]:
        """Make authenticated API request"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
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

    def run_test_1_seed_database(self):
        """Test 1: Seed Database"""
        self.log("\n=== TEST 1: SEED DATABASE ===")
        
        # Use any token for seeding or make it public
        response = self.make_request("POST", "/seed", "")
        
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

    def run_test_2_authentication_all_roles(self):
        """Test 2: Authentication for all roles"""
        self.log("\n=== TEST 2: AUTHENTICATION - ALL ROLES ===")
        
        users_to_test = [
            ("ro.dharwad@kfdc.in", "pass123", "RO"),
            ("dm.dharwad@kfdc.in", "pass123", "DM"), 
            ("admin@kfdc.in", "pass123", "ADMIN"),
            ("ecw.dharwad@kfdc.in", "pass123", "ECW"),
            ("ps.dharwad@kfdc.in", "pass123", "PS")
        ]
        
        for email, password, role in users_to_test:
            token = self.login(email, password, role)
            self.test_assertion(token is not None, f"Authentication for {role}", f"Email: {email}")

    def run_test_3_apo_approval_hierarchy(self):
        """Test 3: Complete APO Approval Flow - RO → DM → HO"""
        self.log("\n=== TEST 3: APO APPROVAL HIERARCHY (RO → DM → HO) ===")
        
        if "RO" not in self.tokens or "DM" not in self.tokens or "ADMIN" not in self.tokens:
            self.log("❌ Missing required tokens for APO workflow test", "ERROR")
            return

        # Step A: RO Creates and Submits APO
        self.log("\n--- Step A: RO Creates and Submits APO ---")
        
        # Create draft APO as RO
        apo_response = self.make_request("POST", "/apo", self.tokens["RO"], {
            "financial_year": "2026-27",
            "plantation_id": "plt-d01"
        })
        
        apo_created = self.test_assertion(
            apo_response["success"],
            "RO creates draft APO",
            f"Status: {apo_response['status_code']}"
        )
        
        if not apo_created:
            self.log(f"APO creation failed: {apo_response['data']}", "ERROR")
            return
            
        apo_id = apo_response["data"].get("id")
        self.test_data["apo_id"] = apo_id
        self.log(f"APO created with ID: {apo_id}")

        # Add work to APO to make it substantial
        self.log("\n--- Adding work to APO ---")
        work_response = self.make_request("POST", "/works", self.tokens["RO"], {
            "apo_id": apo_id,
            "plantation_id": "plt-d01",
            "items": [
                {
                    "activity_id": "act-firelines",
                    "activity_name": "Fire Lines",
                    "quantity": 10.0,
                    "rate": 5455.86,
                    "unit": "Per Km"
                }
            ]
        })
        
        work_added = self.test_assertion(
            work_response["success"],
            "Add work to APO",
            f"Status: {work_response['status_code']}"
        )

        # RO submits to DM (should work)
        self.log("\n--- RO submits to DM ---")
        submit_response = self.make_request("PATCH", f"/apo/{apo_id}/status", self.tokens["RO"], {
            "status": "PENDING_DM_APPROVAL"
        })
        
        self.test_assertion(
            submit_response["success"],
            "RO submits APO to DM",
            f"Status: {submit_response['status_code']}"
        )

        # RO tries to forward directly to HO (should fail)
        self.log("\n--- RO tries to forward directly to HO (should fail) ---")
        direct_ho_response = self.make_request("PATCH", f"/apo/{apo_id}/status", self.tokens["RO"], {
            "status": "PENDING_HO_APPROVAL"
        })
        
        self.test_assertion(
            not direct_ho_response["success"] and direct_ho_response["status_code"] == 403,
            "RO blocked from forwarding directly to HO",
            f"Status: {direct_ho_response['status_code']}, Expected: 403 (Only DM can forward to HO)"
        )

        # Step B: DM Reviews and Forwards to HO
        self.log("\n--- Step B: DM Reviews and Forwards to HO ---")
        
        # DM forwards to HO (should work)
        dm_forward_response = self.make_request("PATCH", f"/apo/{apo_id}/status", self.tokens["DM"], {
            "status": "PENDING_HO_APPROVAL"
        })
        
        self.test_assertion(
            dm_forward_response["success"],
            "DM forwards APO to HO",
            f"Status: {dm_forward_response['status_code']}"
        )

        # DM tries to sanction directly (should fail)
        self.log("\n--- DM tries to sanction directly (should fail) ---")
        dm_sanction_response = self.make_request("PATCH", f"/apo/{apo_id}/status", self.tokens["DM"], {
            "status": "SANCTIONED"
        })
        
        self.test_assertion(
            not dm_sanction_response["success"] and dm_sanction_response["status_code"] == 403,
            "DM blocked from sanctioning directly",
            f"Status: {dm_sanction_response['status_code']}, Expected: 403"
        )

        # Step C: HO (Admin) Sanctions
        self.log("\n--- Step C: HO (Admin) Sanctions ---")
        
        # Admin sanctions (should work)
        admin_sanction_response = self.make_request("PATCH", f"/apo/{apo_id}/status", self.tokens["ADMIN"], {
            "status": "SANCTIONED"
        })
        
        self.test_assertion(
            admin_sanction_response["success"],
            "ADMIN (HO) sanctions APO",
            f"Status: {admin_sanction_response['status_code']}"
        )

        # Verify APO is now SANCTIONED
        apo_detail_response = self.make_request("GET", f"/apo/{apo_id}", self.tokens["ADMIN"])
        
        if apo_detail_response["success"]:
            final_status = apo_detail_response["data"].get("status")
            self.test_assertion(
                final_status == "SANCTIONED",
                "APO final status verification",
                f"Status: {final_status}, Expected: SANCTIONED"
            )

    def run_test_4_apo_rejection_flow(self):
        """Test 4: APO Rejection Flow"""
        self.log("\n=== TEST 4: APO REJECTION FLOW ===")
        
        if "RO" not in self.tokens or "DM" not in self.tokens:
            self.log("❌ Missing required tokens for rejection flow test", "ERROR")
            return

        # Create another APO
        apo_response = self.make_request("POST", "/apo", self.tokens["RO"], {
            "financial_year": "2026-27",
            "plantation_id": "plt-d02"
        })
        
        if not apo_response["success"]:
            self.log("❌ Failed to create APO for rejection test", "ERROR")
            return
            
        apo_id = apo_response["data"].get("id")
        
        # Add work to APO
        work_response = self.make_request("POST", "/works", self.tokens["RO"], {
            "apo_id": apo_id,
            "plantation_id": "plt-d02",
            "items": [
                {
                    "activity_id": "act-planting",
                    "activity_name": "Planting of Seedlings",
                    "quantity": 1000.0,
                    "rate": 25.0,
                    "unit": "Per 1000 Sdls"
                }
            ]
        })

        # Submit to DM
        self.make_request("PATCH", f"/apo/{apo_id}/status", self.tokens["RO"], {
            "status": "PENDING_DM_APPROVAL"
        })

        # DM rejects
        reject_response = self.make_request("PATCH", f"/apo/{apo_id}/status", self.tokens["DM"], {
            "status": "REJECTED",
            "comment": "Needs revision"
        })
        
        self.test_assertion(
            reject_response["success"],
            "DM rejects APO",
            f"Status: {reject_response['status_code']}"
        )

        # RO revises (back to DRAFT)
        revise_response = self.make_request("PATCH", f"/apo/{apo_id}/status", self.tokens["RO"], {
            "status": "DRAFT"
        })
        
        self.test_assertion(
            revise_response["success"],
            "RO revises APO (REJECTED → DRAFT)",
            f"Status: {revise_response['status_code']}"
        )

        # RO resubmits to DM
        resubmit_response = self.make_request("PATCH", f"/apo/{apo_id}/status", self.tokens["RO"], {
            "status": "PENDING_DM_APPROVAL"
        })
        
        self.test_assertion(
            resubmit_response["success"],
            "RO resubmits APO to DM",
            f"Status: {resubmit_response['status_code']}"
        )

    def run_test_5_estimates_workflow(self):
        """Test 5: Verify Estimates Workflow Still Works (ECW → PS)"""
        self.log("\n=== TEST 5: ESTIMATES WORKFLOW (ECW → PS) ===")
        
        if "ECW" not in self.tokens or "PS" not in self.tokens:
            self.log("❌ Missing required tokens for estimates workflow test", "ERROR")
            return

        # Get estimates as ECW
        self.log("\n--- ECW gets estimates ---")
        estimates_response = self.make_request("GET", "/apo/estimates", self.tokens["ECW"])
        
        estimates_found = self.test_assertion(
            estimates_response["success"],
            "ECW gets estimates",
            f"Status: {estimates_response['status_code']}"
        )

        if not estimates_found:
            self.log("❌ No estimates found, skipping estimates workflow test", "ERROR")
            return

        estimates_data = estimates_response["data"]
        works = estimates_data.get("works", [])
        
        if not works:
            self.log("❌ No work items found in estimates", "ERROR")
            return

        # Use first work item for testing
        item = works[0]
        item_id = item["id"]
        self.log(f"Testing with work item: {item_id} ({item.get('activity_name', 'Unknown')})")

        # ECW updates revised quantity
        self.log("\n--- ECW updates revised quantity ---")
        original_qty = item.get("sanctioned_qty", 10)
        revised_qty = max(1, original_qty - 2)  # Reduce quantity by 2
        
        update_response = self.make_request("PATCH", f"/apo/items/{item_id}/estimate", self.tokens["ECW"], {
            "revised_qty": revised_qty,
            "user_role": "CASE_WORKER_ESTIMATES"
        })
        
        self.test_assertion(
            update_response["success"],
            "ECW updates revised quantity",
            f"Status: {update_response['status_code']}, Qty: {original_qty} → {revised_qty}"
        )

        # ECW submits estimate
        self.log("\n--- ECW submits estimate ---")
        submit_response = self.make_request("PATCH", f"/apo/items/{item_id}/status", self.tokens["ECW"], {
            "status": "SUBMITTED",
            "user_role": "CASE_WORKER_ESTIMATES"
        })
        
        self.test_assertion(
            submit_response["success"],
            "ECW submits estimate",
            f"Status: {submit_response['status_code']}"
        )

        # PS approves estimate
        self.log("\n--- PS approves estimate ---")
        approve_response = self.make_request("PATCH", f"/apo/items/{item_id}/status", self.tokens["PS"], {
            "status": "APPROVED",
            "user_role": "PLANTATION_SUPERVISOR"
        })
        
        self.test_assertion(
            approve_response["success"],
            "PS approves estimate",
            f"Status: {approve_response['status_code']}"
        )

    def run_test_6_rbac_enforcement(self):
        """Test 6: RBAC Enforcement"""
        self.log("\n=== TEST 6: RBAC ENFORCEMENT ===")
        
        if "ECW" not in self.tokens or "PS" not in self.tokens:
            self.log("❌ Missing required tokens for RBAC test", "ERROR")
            return

        # Get any estimate item for testing
        estimates_response = self.make_request("GET", "/apo/estimates", self.tokens["ECW"])
        
        if not estimates_response["success"]:
            self.log("❌ Cannot get estimates for RBAC test", "ERROR")
            return

        works = estimates_response["data"].get("works", [])
        if not works:
            self.log("❌ No work items for RBAC test", "ERROR")
            return

        item_id = works[0]["id"]

        # Test ECW blocked from approval
        self.log("\n--- Testing ECW blocked from approval ---")
        ecw_approve_response = self.make_request("PATCH", f"/apo/items/{item_id}/status", self.tokens["ECW"], {
            "status": "APPROVED",
            "user_role": "CASE_WORKER_ESTIMATES"
        })
        
        self.test_assertion(
            not ecw_approve_response["success"] and ecw_approve_response["status_code"] == 403,
            "ECW blocked from approval",
            f"Status: {ecw_approve_response['status_code']}, Expected: 403"
        )

        # Test PS blocked from quantity edit
        self.log("\n--- Testing PS blocked from quantity edit ---")
        ps_edit_response = self.make_request("PATCH", f"/apo/items/{item_id}/estimate", self.tokens["PS"], {
            "revised_qty": 5,
            "user_role": "PLANTATION_SUPERVISOR"
        })
        
        self.test_assertion(
            not ps_edit_response["success"] and ps_edit_response["status_code"] == 403,
            "PS blocked from quantity edit",
            f"Status: {ps_edit_response['status_code']}, Expected: 403"
        )

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 STARTING KFDC iFMS APPROVAL HIERARCHIES TESTING")
        self.log(f"Base URL: {BASE_URL}")
        
        try:
            # Run all test phases
            self.run_test_1_seed_database()
            self.run_test_2_authentication_all_roles()
            self.run_test_3_apo_approval_hierarchy()
            self.run_test_4_apo_rejection_flow()
            self.run_test_5_estimates_workflow()
            self.run_test_6_rbac_enforcement()
            
        except Exception as e:
            self.log(f"❌ Critical error during testing: {str(e)}", "ERROR")
            self.tests_failed += 1

        # Final summary
        total_tests = self.tests_passed + self.tests_failed
        success_rate = (self.tests_passed / total_tests * 100) if total_tests > 0 else 0
        
        self.log("\n" + "="*60)
        self.log("🎯 FINAL TEST RESULTS")
        self.log("="*60)
        self.log(f"✅ Tests Passed: {self.tests_passed}")
        self.log(f"❌ Tests Failed: {self.tests_failed}")
        self.log(f"📊 Total Tests: {total_tests}")
        self.log(f"🎯 Success Rate: {success_rate:.1f}%")
        
        if self.tests_failed == 0:
            self.log("🎉 ALL TESTS PASSED! Approval hierarchies working correctly.")
        else:
            self.log("⚠️  Some tests failed. Please review the errors above.")
            
        return self.tests_failed == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)