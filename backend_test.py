#!/usr/bin/env python3

"""
KFDC iFMS - FNB PDF Upload Testing Suite
Testing FNB PDF Upload functionality for Fund Indent workflow
"""

import requests
import json
import sys
import os
import io
from typing import Dict, Any, Optional

# Base URL from environment
BASE_URL = "https://kfdc-green-deploy.preview.emergentagent.com/api"

class FNBUploadTester:
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

    def make_request(self, method: str, endpoint: str, token: str, data: Dict = None, files: Dict = None) -> Dict[str, Any]:
        """Make authenticated API request"""
        try:
            headers = {"Authorization": f"Bearer {token}"}
            url = f"{BASE_URL}{endpoint}"
            
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                if files:
                    # For file uploads, don't set Content-Type header, let requests handle it
                    response = self.session.post(url, headers=headers, files=files, data=data)
                else:
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

    def create_test_pdf(self, filename: str = "test_fnb.pdf") -> bytes:
        """Create a simple test PDF content"""
        # Simple PDF content for testing
        pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(FNB Test Document) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
298
%%EOF"""
        return pdf_content

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

    def run_test_2_authentication_fund_roles(self):
        """Test 2: Authentication for Fund Indent roles"""
        self.log("\n=== TEST 2: AUTHENTICATION - FUND INDENT ROLES ===")
        
        users_to_test = [
            ("rfo.dharwad@kfdc.in", "pass123", "RFO"),
            ("dcf.dharwad@kfdc.in", "pass123", "DCF"),
            ("ro.dharwad@kfdc.in", "pass123", "RO"),  # For negative testing
            ("ed@kfdc.in", "pass123", "ED"),
            ("md@kfdc.in", "pass123", "MD")
        ]
        
        for email, password, role in users_to_test:
            token = self.login(email, password, role)
            self.test_assertion(token is not None, f"Authentication for {role}", f"Email: {email}")

    def run_test_3_fnb_upload_rfo_auth(self):
        """Test 3: FNB Upload - RFO Authentication Tests"""
        self.log("\n=== TEST 3: FNB UPLOAD - RFO AUTHENTICATION TESTS ===")
        
        if "RFO" not in self.tokens:
            self.log("❌ Missing RFO token for upload test", "ERROR")
            return

        # Create test PDF file
        pdf_content = self.create_test_pdf()
        
        # Test 3a: RFO can upload FNB PDF
        self.log("\n--- Test 3a: RFO uploads FNB PDF successfully ---")
        files = {
            'file': ('test_fnb.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        data = {
            'item_id': 'test-item-123'
        }
        
        upload_response = self.make_request("POST", "/fund-indent/upload-fnb", self.tokens["RFO"], data=data, files=files)
        
        upload_success = self.test_assertion(
            upload_response["success"],
            "RFO FNB PDF upload",
            f"Status: {upload_response['status_code']}"
        )
        
        if upload_success:
            response_data = upload_response["data"]
            self.test_assertion(
                "file_url" in response_data,
                "Response contains file_url",
                f"file_url: {response_data.get('file_url', 'N/A')}"
            )
            self.test_assertion(
                "file_name" in response_data,
                "Response contains file_name",
                f"file_name: {response_data.get('file_name', 'N/A')}"
            )
            self.test_assertion(
                response_data.get("item_id") == "test-item-123",
                "Response contains correct item_id",
                f"item_id: {response_data.get('item_id', 'N/A')}"
            )
            # Store the uploaded file URL for verification
            self.test_data["uploaded_file_url"] = response_data.get("file_url")

    def run_test_4_fnb_upload_access_control(self):
        """Test 4: FNB Upload - Access Control Tests"""
        self.log("\n=== TEST 4: FNB UPLOAD - ACCESS CONTROL TESTS ===")
        
        # Test 4a: Non-RFO user cannot upload (403 Forbidden)
        if "RO" in self.tokens:
            self.log("\n--- Test 4a: RO user blocked from uploading FNB PDF ---")
            
            pdf_content = self.create_test_pdf()
            files = {
                'file': ('test_fnb_ro.pdf', io.BytesIO(pdf_content), 'application/pdf')
            }
            data = {
                'item_id': 'test-item-ro'
            }
            
            ro_upload_response = self.make_request("POST", "/fund-indent/upload-fnb", self.tokens["RO"], data=data, files=files)
            
            self.test_assertion(
                not ro_upload_response["success"] and ro_upload_response["status_code"] == 403,
                "RO blocked from FNB upload",
                f"Status: {ro_upload_response['status_code']}, Expected: 403 (Only RFO can upload FNB documents)"
            )
        
        # Test 4b: DCF user cannot upload (403 Forbidden)
        if "DCF" in self.tokens:
            self.log("\n--- Test 4b: DCF user blocked from uploading FNB PDF ---")
            
            pdf_content = self.create_test_pdf()
            files = {
                'file': ('test_fnb_dcf.pdf', io.BytesIO(pdf_content), 'application/pdf')
            }
            data = {
                'item_id': 'test-item-dcf'
            }
            
            dcf_upload_response = self.make_request("POST", "/fund-indent/upload-fnb", self.tokens["DCF"], data=data, files=files)
            
            self.test_assertion(
                not dcf_upload_response["success"] and dcf_upload_response["status_code"] == 403,
                "DCF blocked from FNB upload",
                f"Status: {dcf_upload_response['status_code']}, Expected: 403 (Only RFO can upload FNB documents)"
            )

    def run_test_5_file_validation(self):
        """Test 5: File Validation Tests"""
        self.log("\n=== TEST 5: FILE VALIDATION TESTS ===")
        
        if "RFO" not in self.tokens:
            self.log("❌ Missing RFO token for file validation test", "ERROR")
            return

        # Test 5a: Only PDF files accepted - reject non-PDF
        self.log("\n--- Test 5a: Reject non-PDF files ---")
        
        # Create a text file
        text_content = b"This is not a PDF file"
        files = {
            'file': ('test_document.txt', io.BytesIO(text_content), 'text/plain')
        }
        data = {
            'item_id': 'test-item-txt'
        }
        
        txt_upload_response = self.make_request("POST", "/fund-indent/upload-fnb", self.tokens["RFO"], data=data, files=files)
        
        self.test_assertion(
            not txt_upload_response["success"] and txt_upload_response["status_code"] == 400,
            "Non-PDF file rejected",
            f"Status: {txt_upload_response['status_code']}, Expected: 400 (Only PDF files allowed)"
        )

        # Test 5b: No file uploaded
        self.log("\n--- Test 5b: No file uploaded error ---")
        
        data = {
            'item_id': 'test-item-nofile'
        }
        
        no_file_response = self.make_request("POST", "/fund-indent/upload-fnb", self.tokens["RFO"], data=data)
        
        self.test_assertion(
            not no_file_response["success"] and no_file_response["status_code"] == 400,
            "No file uploaded error",
            f"Status: {no_file_response['status_code']}, Expected: 400 (No file uploaded)"
        )

    def run_test_6_file_accessibility(self):
        """Test 6: Verify uploaded file accessibility"""
        self.log("\n=== TEST 6: FILE ACCESSIBILITY TEST ===")
        
        if "uploaded_file_url" not in self.test_data:
            self.log("❌ No uploaded file URL found, skipping accessibility test", "ERROR")
            return
            
        file_url = self.test_data["uploaded_file_url"]
        self.log(f"Testing file accessibility for: {file_url}")
        
        # Test file accessibility through public URL
        try:
            # Convert to full URL for testing
            full_url = f"https://kfdc-green-deploy.preview.emergentagent.com{file_url}"
            response = requests.get(full_url)
            
            self.test_assertion(
                response.status_code == 200,
                "Uploaded file is accessible",
                f"URL: {file_url}, Status: {response.status_code}"
            )
            
            # Verify it's a PDF by checking content type or content
            content_type = response.headers.get('content-type', '').lower()
            is_pdf = 'pdf' in content_type or response.content.startswith(b'%PDF')
            
            self.test_assertion(
                is_pdf,
                "Uploaded file is valid PDF",
                f"Content-Type: {content_type}"
            )
            
        except Exception as e:
            self.log(f"❌ File accessibility test failed: {str(e)}", "ERROR")
            self.tests_failed += 1

    def run_test_7_fund_indent_with_fnb(self):
        """Test 7: Fund Indent Generation with FNB PDF URL"""
        self.log("\n=== TEST 7: FUND INDENT GENERATION WITH FNB PDF ===")
        
        if "RFO" not in self.tokens:
            self.log("❌ Missing RFO token for Fund Indent generation test", "ERROR")
            return
        
        if "uploaded_file_url" not in self.test_data:
            self.log("❌ No uploaded FNB file URL found, skipping Fund Indent test", "ERROR")
            return

        # First, get available works for Fund Indent generation
        self.log("\n--- Getting available works for Fund Indent ---")
        works_response = self.make_request("GET", "/fund-indent/works", self.tokens["RFO"])
        
        if not works_response["success"]:
            self.log("❌ Failed to get available works for Fund Indent", "ERROR")
            return
            
        works_data = works_response["data"]
        works = works_data.get("works", [])
        
        if not works:
            self.log("❌ No works available for Fund Indent generation", "ERROR")
            return
            
        # Use first work for testing
        work = works[0]
        apo_id = work.get("apo_id")
        self.log(f"Using work from APO: {apo_id}")
        
        # Get line items for the APO
        self.log(f"\n--- Getting line items for APO {apo_id} ---")
        items_response = self.make_request("GET", f"/fund-indent/work-items/{apo_id}", self.tokens["RFO"])
        
        if not items_response["success"]:
            self.log("❌ Failed to get work items for Fund Indent", "ERROR")
            return
            
        items_data = items_response["data"]
        items = items_data.get("items", [])
        
        if not items:
            self.log("❌ No items found for Fund Indent generation", "ERROR")
            return
            
        # Prepare Fund Indent with FNB PDF URL
        fnb_pdf_url = self.test_data["uploaded_file_url"]
        fund_indent_items = []
        
        for item in items[:2]:  # Use first 2 items for testing
            fund_indent_item = {
                "id": item["id"],
                "period_from": "2026-01-01",
                "period_to": "2026-03-31",
                "cm_date": "2026-01-15",
                "cm_by": "Range Officer",
                "fnb_book_no": "FNB-001",
                "fnb_page_no": "Page-1",
                "fnb_pdf_url": fnb_pdf_url  # Include the uploaded FNB PDF URL
            }
            fund_indent_items.append(fund_indent_item)
        
        self.log(f"\n--- Generating Fund Indent with FNB PDF URL: {fnb_pdf_url} ---")
        
        generate_response = self.make_request("POST", "/fund-indent/generate", self.tokens["RFO"], {
            "apo_id": apo_id,
            "items": fund_indent_items
        })
        
        fund_indent_success = self.test_assertion(
            generate_response["success"],
            "Fund Indent generation with FNB PDF",
            f"Status: {generate_response['status_code']}"
        )
        
        if fund_indent_success:
            response_data = generate_response["data"]
            est_id = response_data.get("est_id")
            self.log(f"Fund Indent generated with EST_ID: {est_id}")
            
            self.test_assertion(
                est_id is not None,
                "Fund Indent EST_ID generated",
                f"EST_ID: {est_id}"
            )
            
            # Store EST_ID for potential verification
            self.test_data["fund_indent_id"] = est_id

    def run_all_tests(self):
        """Run all FNB upload tests in sequence"""
        self.log("🚀 STARTING KFDC iFMS FNB PDF UPLOAD TESTING")
        self.log(f"Base URL: {BASE_URL}")
        self.log("Testing FNB PDF Upload functionality for Fund Indent workflow")
        
        try:
            # Run all test phases
            self.run_test_1_seed_database()
            self.run_test_2_authentication_fund_roles()
            self.run_test_3_fnb_upload_rfo_auth()
            self.run_test_4_fnb_upload_access_control()
            self.run_test_5_file_validation()
            self.run_test_6_file_accessibility()
            self.run_test_7_fund_indent_with_fnb()
            
        except Exception as e:
            self.log(f"❌ Critical error during testing: {str(e)}", "ERROR")
            self.tests_failed += 1

        # Final summary
        total_tests = self.tests_passed + self.tests_failed
        success_rate = (self.tests_passed / total_tests * 100) if total_tests > 0 else 0
        
        self.log("\n" + "="*60)
        self.log("🎯 FINAL FNB UPLOAD TEST RESULTS")
        self.log("="*60)
        self.log(f"✅ Tests Passed: {self.tests_passed}")
        self.log(f"❌ Tests Failed: {self.tests_failed}")
        self.log(f"📊 Total Tests: {total_tests}")
        self.log(f"🎯 Success Rate: {success_rate:.1f}%")
        
        if self.tests_failed == 0:
            self.log("🎉 ALL FNB UPLOAD TESTS PASSED! FNB PDF Upload functionality working correctly.")
        else:
            self.log("⚠️  Some FNB upload tests failed. Please review the errors above.")
            
        return self.tests_failed == 0

if __name__ == "__main__":
    tester = FNBUploadTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)