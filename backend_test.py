#!/usr/bin/env python3
"""
KFDC iFMS Backend Test - Dynamic Work Type Calculation Feature
Test the new Dynamic Work Type Calculation feature as specified in review request.
"""

import json
import requests
import sys
from datetime import datetime

# Test Configuration
BASE_URL = "https://kfdc-green-deploy.preview.emergentagent.com/api"
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
        print(f"\n{'='*60}")
        print(f"DYNAMIC WORK TYPE CALCULATION - TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests)*100:.1f}%")
        
        if self.failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if result["status"] == "FAIL":
                    print(f"  - {result['test']}: {result['message']}")

def test_dynamic_work_type_calculation():
    """Test the Dynamic Work Type Calculation feature"""
    result = TestResult()
    auth_token = None
    
    try:
        # Step 1: Seed the database
        print("🔄 Step 1: Seeding database...")
        try:
            response = requests.post(f"{BASE_URL}/seed", headers=HEADERS, timeout=30)
            if response.status_code == 200:
                seed_data = response.json()
                result.add_result("Database Seeding", True, 
                    f"Seeded successfully: {seed_data.get('counts', {})}")
            else:
                result.add_result("Database Seeding", False, 
                    f"Failed: {response.status_code} - {response.text[:200]}")
                return result
        except Exception as e:
            result.add_result("Database Seeding", False, f"Exception: {str(e)}")
            return result
        
        # Step 2: Login as RO
        print("🔄 Step 2: Login as RO (ro.dharwad@kfdc.in)...")
        try:
            login_data = {"email": "ro.dharwad@kfdc.in", "password": "pass123"}
            response = requests.post(f"{BASE_URL}/auth/login", 
                                   headers=HEADERS, 
                                   json=login_data, 
                                   timeout=10)
            if response.status_code == 200:
                auth_data = response.json()
                auth_token = auth_data.get("token")
                user_info = auth_data.get("user", {})
                result.add_result("RO Authentication", True, 
                    f"Login successful: {user_info.get('name')} ({user_info.get('role')})")
            else:
                result.add_result("RO Authentication", False, 
                    f"Failed: {response.status_code} - {response.text[:200]}")
                return result
        except Exception as e:
            result.add_result("RO Authentication", False, f"Exception: {str(e)}")
            return result
        
        # Set up auth headers
        auth_headers = {**HEADERS, "Authorization": f"Bearer {auth_token}"}
        
        # Step 3: Test GET /plantations - Verify work_type calculation
        print("🔄 Step 3: Testing GET /plantations - Dynamic Work Type...")
        try:
            response = requests.get(f"{BASE_URL}/plantations", 
                                  headers=auth_headers, 
                                  timeout=15)
            if response.status_code == 200:
                plantations = response.json()
                
                # Check if we have plantations
                if not plantations:
                    result.add_result("GET /plantations", False, "No plantations found")
                else:
                    # Look for 2025 plantations (should be FW)
                    fw_plantations = [p for p in plantations if p.get('year_of_planting') == 2025]
                    m_plantations = [p for p in plantations if p.get('year_of_planting') < 2025]
                    
                    # Check FW plantations
                    fw_correct = all(p.get('work_type') == 'FW' for p in fw_plantations)
                    m_correct = all(p.get('work_type') == 'M' for p in m_plantations)
                    
                    if fw_plantations and fw_correct:
                        result.add_result("2025 Plantations = FW", True, 
                            f"Found {len(fw_plantations)} plantations from 2025, all correctly marked as FW")
                        # List specific plantations
                        for p in fw_plantations[:3]:  # Show first 3
                            print(f"   📋 {p.get('id')}: {p.get('name')} (2025) → {p.get('work_type')}")
                    else:
                        result.add_result("2025 Plantations = FW", False, 
                            f"Found {len(fw_plantations)} plantations from 2025, but work_type calculation incorrect")
                    
                    if m_plantations and m_correct:
                        result.add_result("Pre-2025 Plantations = M", True, 
                            f"Found {len(m_plantations)} pre-2025 plantations, all correctly marked as M")
                        # Show examples
                        for p in m_plantations[:3]:  # Show first 3
                            print(f"   📋 {p.get('id')}: {p.get('name')} ({p.get('year_of_planting')}) → {p.get('work_type')}")
                    else:
                        result.add_result("Pre-2025 Plantations = M", False, 
                            f"Found {len(m_plantations)} pre-2025 plantations, but work_type calculation incorrect")
                    
                    # Test specific plantations mentioned in review request
                    specific_tests = [
                        ("plt-d22", 2025, "FW"),
                        ("plt-d23", 2025, "FW"),
                        ("plt-b11", 2025, "FW"),
                        ("plt-b12", 2025, "FW"),
                        ("plt-d01", 2014, "M"),
                        ("plt-d02", 2017, "M")
                    ]
                    
                    for plt_id, expected_year, expected_work_type in specific_tests:
                        plt = next((p for p in plantations if p.get('id') == plt_id), None)
                        if plt:
                            actual_work_type = plt.get('work_type')
                            actual_year = plt.get('year_of_planting')
                            if actual_work_type == expected_work_type and actual_year == expected_year:
                                result.add_result(f"Plantation {plt_id}", True, 
                                    f"{plt.get('name')} ({actual_year}) correctly calculated as {actual_work_type}")
                            else:
                                result.add_result(f"Plantation {plt_id}", False, 
                                    f"{plt.get('name')} expected {expected_work_type} but got {actual_work_type}")
                        else:
                            result.add_result(f"Plantation {plt_id}", False, f"Plantation not found")
            else:
                result.add_result("GET /plantations", False, 
                    f"Failed: {response.status_code} - {response.text[:200]}")
        except Exception as e:
            result.add_result("GET /plantations", False, f"Exception: {str(e)}")
        
        # Step 4: Test GET /plantations/:id - Individual plantation detail
        print("🔄 Step 4: Testing GET /plantations/:id - Individual Details...")
        test_plantations = [
            ("plt-d22", "2025 plantation detail (should be FW)"),
            ("plt-d01", "2014 plantation detail (should be M)")
        ]
        
        for plt_id, description in test_plantations:
            try:
                response = requests.get(f"{BASE_URL}/plantations/{plt_id}", 
                                      headers=auth_headers, 
                                      timeout=10)
                if response.status_code == 200:
                    plantation = response.json()
                    work_type = plantation.get('work_type')
                    year = plantation.get('year_of_planting')
                    expected_work_type = 'FW' if year == 2025 else 'M'
                    
                    if work_type == expected_work_type:
                        result.add_result(f"GET /plantations/{plt_id}", True, 
                            f"{plantation.get('name')} ({year}) correctly shows work_type={work_type}")
                    else:
                        result.add_result(f"GET /plantations/{plt_id}", False, 
                            f"{plantation.get('name')} ({year}) shows work_type={work_type}, expected {expected_work_type}")
                else:
                    result.add_result(f"GET /plantations/{plt_id}", False, 
                        f"Failed: {response.status_code}")
            except Exception as e:
                result.add_result(f"GET /plantations/{plt_id}", False, f"Exception: {str(e)}")
        
        # Step 5: Test POST /plantations - Create new plantations
        print("🔄 Step 5: Testing POST /plantations - Dynamic work_type assignment...")
        
        test_cases = [
            {
                "name": "Test FW Plantation 2025",
                "year": 2025,
                "expected_work_type": "FW",
                "species": "Acacia auriculiformis"
            },
            {
                "name": "Test M Plantation 2020",
                "year": 2020,
                "expected_work_type": "M",
                "species": "Eucalyptus pellita"
            }
        ]
        
        for case in test_cases:
            try:
                plantation_data = {
                    "name": case["name"],
                    "species": case["species"],
                    "year_of_planting": case["year"],
                    "total_area_ha": 10.5,
                    "village": "Test Village",
                    "taluk": "Test Taluk",
                    "district": "Test District",
                    "vidhana_sabha": "Test VS",
                    "lok_sabha": "Test LS",
                    "division": "Test Division"
                }
                
                response = requests.post(f"{BASE_URL}/plantations", 
                                       headers=auth_headers, 
                                       json=plantation_data, 
                                       timeout=10)
                
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
                        f"Failed to create: {response.status_code} - {response.text[:200]}")
            except Exception as e:
                result.add_result(f"POST Plantation {case['year']}", False, f"Exception: {str(e)}")
        
        # Step 6: Verify Financial Year Logic
        print("🔄 Step 6: Testing Financial Year Logic...")
        try:
            # Test with some edge cases if possible
            current_year = datetime.now().year
            print(f"   📅 Current Year: {current_year}")
            print(f"   📅 Expected FY Start for plantations: {current_year} (April-March cycle)")
            
            # Create a test with current year
            test_data = {
                "name": f"Current Year Test {current_year}",
                "species": "Test Species",
                "year_of_planting": current_year,
                "total_area_ha": 5.0,
                "village": "Test Village",
            }
            
            response = requests.post(f"{BASE_URL}/plantations", 
                                   headers=auth_headers, 
                                   json=test_data, 
                                   timeout=10)
            
            if response.status_code == 201:
                created = response.json()
                work_type = created.get('work_type')
                result.add_result("Financial Year Logic", True, 
                    f"Current year ({current_year}) plantation correctly assigned work_type={work_type}")
            else:
                result.add_result("Financial Year Logic", False, 
                    f"Failed to test current year: {response.status_code}")
        except Exception as e:
            result.add_result("Financial Year Logic", False, f"Exception: {str(e)}")
        
    except Exception as e:
        result.add_result("Overall Test", False, f"Critical exception: {str(e)}")
    
    return result

def main():
    """Main test execution"""
    print("🚀 KFDC iFMS - Dynamic Work Type Calculation Feature Testing")
    print(f"📍 Base URL: {BASE_URL}")
    print(f"📅 Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # Execute the test
    result = test_dynamic_work_type_calculation()
    
    # Print detailed summary
    result.print_summary()
    
    # Return appropriate exit code
    if result.failed_tests == 0:
        print(f"\n🎉 ALL TESTS PASSED! Dynamic Work Type Calculation feature is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {result.failed_tests} tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())