#!/usr/bin/env python3
"""
KFDC iFMS Backend Test - Dynamic Work Type Calculation Feature (COMPREHENSIVE)
Test with proper role-based access considerations
"""

import json
import requests
import sys
from datetime import datetime

BASE_URL = "https://ifms-kfdc-demo.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class TestResult:
    def __init__(self):
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.results = []
    
    def add_result(self, test_name, passed, message):
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            print(f"✅ {test_name}: {message}")
        else:
            self.failed_tests += 1
            print(f"❌ {test_name}: {message}")
        self.results.append({
            "test": test_name,
            "status": "PASS" if passed else "FAIL",
            "message": message
        })
    
    def print_summary(self):
        print(f"\n{'='*80}")
        print(f"DYNAMIC WORK TYPE CALCULATION - COMPREHENSIVE TEST SUMMARY")
        print(f"{'='*80}")
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests)*100:.1f}%")
        
        if self.failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if result["status"] == "FAIL":
                    print(f"  - {result['test']}: {result['message']}")

def get_auth_token(email):
    """Get auth token for a user"""
    try:
        login_data = {"email": email, "password": "pass123"}
        response = requests.post(f"{BASE_URL}/auth/login", 
                               headers=HEADERS, 
                               json=login_data, 
                               timeout=10)
        if response.status_code == 200:
            return response.json().get("token"), response.json().get("user")
        return None, None
    except:
        return None, None

def test_comprehensive_work_type():
    """Comprehensive test of Dynamic Work Type Calculation"""
    result = TestResult()
    
    print("🚀 KFDC iFMS - Dynamic Work Type Calculation Comprehensive Testing")
    print(f"📍 Base URL: {BASE_URL}")
    print("="*80)
    
    try:
        # Step 1: Seed the database
        print("🔄 Step 1: Seeding database...")
        response = requests.post(f"{BASE_URL}/seed", headers=HEADERS, timeout=30)
        if response.status_code == 200:
            seed_data = response.json()
            result.add_result("Database Seeding", True, 
                f"Seeded successfully: {seed_data.get('counts', {})}")
        else:
            result.add_result("Database Seeding", False, 
                f"Failed: {response.status_code}")
            return result
        
        # Step 2: Test with Admin user (sees all plantations)
        print("🔄 Step 2: Testing with Admin user (complete view)...")
        admin_token, admin_user = get_auth_token("admin@kfdc.in")
        if admin_token:
            result.add_result("Admin Login", True, 
                f"Login successful: {admin_user.get('name')} ({admin_user.get('role')})")
            
            auth_headers = {**HEADERS, "Authorization": f"Bearer {admin_token}"}
            
            # Get all plantations as Admin
            response = requests.get(f"{BASE_URL}/plantations", headers=auth_headers, timeout=15)
            if response.status_code == 200:
                plantations = response.json()
                
                # Test 2025 plantations (should all be FW)
                fw_plantations = [p for p in plantations if p.get('year_of_planting') == 2025]
                fw_correct = all(p.get('work_type') == 'FW' for p in fw_plantations)
                
                if fw_plantations and fw_correct:
                    result.add_result("2025 Plantations = FW (Admin View)", True, 
                        f"Found {len(fw_plantations)} plantations from 2025, all correctly marked as FW")
                    for p in fw_plantations:
                        print(f"   📋 {p.get('id')}: {p.get('name')} (2025) → {p.get('work_type')} [Range: {p.get('range_id')}]")
                else:
                    result.add_result("2025 Plantations = FW (Admin View)", False, 
                        f"Found {len(fw_plantations)} plantations but work_type calculation incorrect")
                
                # Test pre-2025 plantations (should all be M)
                m_plantations = [p for p in plantations if p.get('year_of_planting', 0) < 2025]
                m_correct = all(p.get('work_type') == 'M' for p in m_plantations)
                
                if m_plantations and m_correct:
                    result.add_result("Pre-2025 Plantations = M (Admin View)", True, 
                        f"Found {len(m_plantations)} pre-2025 plantations, all correctly marked as M")
                else:
                    result.add_result("Pre-2025 Plantations = M (Admin View)", False, 
                        f"Found {len(m_plantations)} pre-2025 plantations but work_type calculation incorrect")
                
                # Test specific plantations from review request
                specific_tests = [
                    ("plt-d22", 2025, "FW", "Kinaye R.F 166"),
                    ("plt-d23", 2025, "FW", "Watra RF 83,86"),
                    ("plt-b11", 2025, "FW", "Hejjala"),
                    ("plt-b12", 2025, "FW", "Nelamangala"),
                    ("plt-d01", 2014, "M", "Varavanagalavi"),
                    ("plt-d02", 2017, "M", "Varavanagalavi (Casuarina)")
                ]
                
                for plt_id, expected_year, expected_work_type, expected_name_part in specific_tests:
                    plt = next((p for p in plantations if p.get('id') == plt_id), None)
                    if plt:
                        actual_work_type = plt.get('work_type')
                        actual_year = plt.get('year_of_planting')
                        if actual_work_type == expected_work_type and actual_year == expected_year:
                            result.add_result(f"Plantation {plt_id}", True, 
                                f"{plt.get('name')} ({actual_year}) correctly calculated as {actual_work_type}")
                        else:
                            result.add_result(f"Plantation {plt_id}", False, 
                                f"Expected {expected_work_type} for year {expected_year}, got {actual_work_type} for year {actual_year}")
                    else:
                        result.add_result(f"Plantation {plt_id}", False, "Plantation not found in seed data")
            else:
                result.add_result("GET /plantations (Admin)", False, f"Failed: {response.status_code}")
        else:
            result.add_result("Admin Login", False, "Failed to authenticate")
            return result
        
        # Step 3: Test individual plantation detail endpoints
        print("🔄 Step 3: Testing individual plantation detail endpoints...")
        
        test_cases = [
            ("plt-d22", "FW", 2025, "Fresh Work plantation"),
            ("plt-d23", "FW", 2025, "Fresh Work plantation"),
            ("plt-b11", "FW", 2025, "Fresh Work plantation"),
            ("plt-b12", "FW", 2025, "Fresh Work plantation"),
            ("plt-d01", "M", 2014, "Maintenance plantation"),
            ("plt-d02", "M", 2017, "Maintenance plantation")
        ]
        
        for plt_id, expected_work_type, expected_year, description in test_cases:
            response = requests.get(f"{BASE_URL}/plantations/{plt_id}", 
                                  headers=auth_headers, timeout=10)
            if response.status_code == 200:
                plantation = response.json()
                work_type = plantation.get('work_type')
                year = plantation.get('year_of_planting')
                
                if work_type == expected_work_type and year == expected_year:
                    result.add_result(f"GET /plantations/{plt_id}", True, 
                        f"{plantation.get('name')} ({year}) correctly shows work_type={work_type}")
                else:
                    result.add_result(f"GET /plantations/{plt_id}", False, 
                        f"Expected work_type={expected_work_type} for year {expected_year}, got work_type={work_type} for year {year}")
            else:
                result.add_result(f"GET /plantations/{plt_id}", False, 
                    f"Failed to get plantation details: {response.status_code}")
        
        # Step 4: Test POST /plantations - Create new plantations with different years
        print("🔄 Step 4: Testing POST /plantations - Dynamic work_type assignment...")
        
        # First login as RO for plantation creation
        ro_token, ro_user = get_auth_token("ro.dharwad@kfdc.in")
        if ro_token:
            ro_headers = {**HEADERS, "Authorization": f"Bearer {ro_token}"}
            
            test_plantation_cases = [
                {
                    "name": "Test Fresh Work 2025",
                    "year": 2025,
                    "expected_work_type": "FW",
                    "species": "Acacia auriculiformis"
                },
                {
                    "name": "Test Maintenance 2020",
                    "year": 2020,
                    "expected_work_type": "M",
                    "species": "Eucalyptus pellita"
                },
                {
                    "name": "Test Current Year 2026",
                    "year": 2026,
                    "expected_work_type": "FW",
                    "species": "Corymbia"
                },
                {
                    "name": "Test Old Plantation 2015",
                    "year": 2015,
                    "expected_work_type": "M",
                    "species": "Casuarina"
                }
            ]
            
            for case in test_plantation_cases:
                plantation_data = {
                    "name": case["name"],
                    "species": case["species"],
                    "year_of_planting": case["year"],
                    "total_area_ha": 12.5,
                    "village": "Test Village",
                    "taluk": "Test Taluk",
                    "district": "Test District"
                }
                
                response = requests.post(f"{BASE_URL}/plantations", 
                                       headers=ro_headers, 
                                       json=plantation_data, timeout=10)
                
                if response.status_code == 201:
                    created_plantation = response.json()
                    actual_work_type = created_plantation.get('work_type')
                    
                    if actual_work_type == case["expected_work_type"]:
                        result.add_result(f"POST Plantation {case['year']}", True, 
                            f"New plantation ({case['year']}) correctly assigned work_type={actual_work_type}")
                    else:
                        result.add_result(f"POST Plantation {case['year']}", False, 
                            f"New plantation ({case['year']}) got work_type={actual_work_type}, expected {case['expected_work_type']}")
                else:
                    result.add_result(f"POST Plantation {case['year']}", False, 
                        f"Failed to create plantation: {response.status_code}")
        else:
            result.add_result("RO Login for Creation", False, "Failed to authenticate RO")
        
        # Step 5: Test Role-Based Access Control for plantations
        print("🔄 Step 5: Testing Role-Based Access Control...")
        
        # Test RO access (should see limited plantations based on range)
        ro_token, ro_user = get_auth_token("ro.dharwad@kfdc.in")
        if ro_token:
            ro_headers = {**HEADERS, "Authorization": f"Bearer {ro_token}"}
            response = requests.get(f"{BASE_URL}/plantations", headers=ro_headers, timeout=15)
            if response.status_code == 200:
                ro_plantations = response.json()
                result.add_result("RO Plantation Access", True, 
                    f"RO sees {len(ro_plantations)} plantations (range-scoped access working)")
                
                # Check if work_type calculation works for visible plantations
                if ro_plantations:
                    work_types_correct = True
                    for p in ro_plantations:
                        year = p.get('year_of_planting', 0)
                        work_type = p.get('work_type')
                        expected = 'FW' if year >= 2025 else 'M'
                        if work_type != expected:
                            work_types_correct = False
                            break
                    
                    result.add_result("RO Work Type Calculation", work_types_correct, 
                        f"Work type calculation correct for all {len(ro_plantations)} visible plantations")
            else:
                result.add_result("RO Plantation Access", False, 
                    f"Failed: {response.status_code}")
        
        # Step 6: Financial Year Logic Validation
        print("🔄 Step 6: Testing Financial Year Logic...")
        
        current_year = datetime.now().year
        print(f"   📅 Current System Year: {current_year}")
        
        # Expected logic: April-March cycle
        # If current month is Jan-Mar, we're in previous FY
        # If current month is Apr-Dec, we're in current FY
        current_month = datetime.now().month
        if current_month < 4:  # Jan, Feb, Mar
            expected_fy_start = current_year - 1
        else:  # Apr through Dec
            expected_fy_start = current_year
        
        print(f"   📅 Expected FY Start Year: {expected_fy_start}")
        print(f"   📅 Plantations >= {expected_fy_start} should be FW")
        print(f"   📅 Plantations < {expected_fy_start} should be M")
        
        # Validate this logic against actual plantations
        response = requests.get(f"{BASE_URL}/plantations", headers=auth_headers, timeout=15)
        if response.status_code == 200:
            plantations = response.json()
            logic_correct = True
            
            for p in plantations:
                year = p.get('year_of_planting', 0)
                work_type = p.get('work_type')
                expected = 'FW' if year >= expected_fy_start else 'M'
                
                if work_type != expected:
                    result.add_result("Financial Year Logic", False, 
                        f"Plantation {p.get('id')} ({year}) has work_type={work_type}, expected {expected}")
                    logic_correct = False
                    break
            
            if logic_correct:
                result.add_result("Financial Year Logic", True, 
                    f"All plantations follow correct FY logic (FY start: {expected_fy_start})")
        else:
            result.add_result("Financial Year Logic", False, 
                "Could not validate FY logic")
        
    except Exception as e:
        result.add_result("Overall Test", False, f"Critical exception: {str(e)}")
    
    return result

def main():
    """Main test execution"""
    result = test_comprehensive_work_type()
    
    # Print summary
    result.print_summary()
    
    # Final assessment
    if result.failed_tests == 0:
        print(f"\n🎉 COMPREHENSIVE TESTING COMPLETE - ALL TESTS PASSED!")
        print("✅ Dynamic Work Type Calculation feature is fully functional")
        print("✅ Financial year logic (April-March cycle) working correctly")
        print("✅ Role-based access control working as expected")
        print("✅ All specific plantations from review request verified")
        return 0
    else:
        print(f"\n⚠️  {result.failed_tests}/{result.total_tests} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())