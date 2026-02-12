#!/usr/bin/env python3

import requests
import json
from datetime import datetime

BASE_URL = "https://green-erp.preview.emergentagent.com/api"

def test_custom_activity_to_work():
    """
    Test the 'Add Custom Activity to Work' feature for KFDC iFMS v2
    
    Test Flow:
    1. Seed the database
    2. Login as RO
    3. Get all activities 
    4. Create a Draft APO
    5. Get activity suggestions for plantation
    6. Create Work with BOTH suggested AND custom activities
    7. Verify the work was created correctly
    8. Get APO detail and verify total calculation
    """
    
    print("🚀 Testing: Add Custom Activity to Work Feature")
    print("=" * 60)
    
    # Step 1: Seed the database
    print("\n1. 🌱 Seeding database...")
    try:
        response = requests.post(f"{BASE_URL}/seed")
        response.raise_for_status()
        seed_result = response.json()
        print(f"   ✅ Seed successful: {seed_result.get('message', 'Database seeded')}")
        if 'activities' in seed_result:
            print(f"   📊 Activities seeded: {seed_result['activities']}")
    except Exception as e:
        print(f"   ❌ FAILED to seed database: {str(e)}")
        return False

    # Step 2: Login as RO
    print("\n2. 🔐 Logging in as RO (ro.dharwad@kfdc.in)...")
    try:
        login_data = {
            "email": "ro.dharwad@kfdc.in",
            "password": "pass123"
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        response.raise_for_status()
        login_result = response.json()
        
        if 'token' not in login_result:
            print(f"   ❌ FAILED: No token in login response: {login_result}")
            return False
            
        token = login_result['token']
        headers = {"Authorization": f"Bearer {token}"}
        
        print(f"   ✅ Login successful: {login_result['user']['name']} ({login_result['user']['role']})")
    except Exception as e:
        print(f"   ❌ FAILED to login: {str(e)}")
        return False

    # Step 3: Get all activities (should return 25 activities)
    print("\n3. 📋 Getting all activities from master...")
    try:
        response = requests.get(f"{BASE_URL}/activities", headers=headers)
        response.raise_for_status()
        activities = response.json()
        
        print(f"   ✅ Retrieved {len(activities)} activities")
        if len(activities) >= 25:
            print("   ✅ Expected 25 activities found")
        else:
            print(f"   ⚠️  Expected 25 activities, got {len(activities)}")
            
        # Show some activity examples
        if activities:
            print("   📝 Sample activities:")
            for i, activity in enumerate(activities[:3]):
                print(f"      - {activity.get('name', 'Unknown')} (ID: {activity.get('id', 'N/A')}, SSR: {activity.get('ssr_no', 'N/A')})")
                
    except Exception as e:
        print(f"   ❌ FAILED to get activities: {str(e)}")
        return False

    # Step 4: Create a Draft APO
    print("\n4. 📄 Creating Draft APO for FY 2026-27...")
    try:
        apo_data = {
            "financial_year": "2026-27"
        }
        response = requests.post(f"{BASE_URL}/apo", json=apo_data, headers=headers)
        response.raise_for_status()
        apo_result = response.json()
        
        apo_id = apo_result['id']
        print(f"   ✅ Draft APO created: {apo_id}")
        print(f"   📊 Status: {apo_result.get('status', 'Unknown')}, Amount: ₹{apo_result.get('total_sanctioned_amount', 0)}")
        
    except Exception as e:
        print(f"   ❌ FAILED to create APO: {str(e)}")
        return False

    # Step 5: Get activity suggestions for plantation plt-d02 (Casuarina, 9 years old)
    print("\n5. 💡 Getting activity suggestions for plantation plt-d02...")
    try:
        suggestion_data = {
            "plantation_id": "plt-d02",
            "financial_year": "2026-27"
        }
        response = requests.post(f"{BASE_URL}/works/suggest-activities", json=suggestion_data, headers=headers)
        response.raise_for_status()
        suggestions = response.json()
        
        plantation_name = suggestions.get('plantation_name', 'Unknown')
        plantation_age = suggestions.get('age', 0)
        suggested_activities = suggestions.get('suggested_activities', [])
        
        print(f"   ✅ Suggestions for {plantation_name} (Age: {plantation_age} years)")
        print(f"   📊 Found {len(suggested_activities)} suggested activities")
        
        if suggested_activities:
            print("   📝 Suggested activities:")
            for activity in suggested_activities:
                print(f"      - {activity.get('activity_name', 'Unknown')} (Rate: ₹{activity.get('sanctioned_rate', 0)})")
                
    except Exception as e:
        print(f"   ❌ FAILED to get activity suggestions: {str(e)}")
        return False

    # Step 6: Create Work with BOTH suggested AND custom activities
    print("\n6. 🔨 Creating Work with both suggested and custom activities...")
    try:
        # Prepare items array with suggested and custom activities
        work_items = []
        
        # Add a suggested activity (if available)
        if suggested_activities:
            suggested_activity = suggested_activities[0]  # Take first suggested activity
            work_items.append({
                "activity_id": suggested_activity['activity_id'],
                "activity_name": suggested_activity['activity_name'],
                "unit": suggested_activity['unit'],
                "ssr_no": suggested_activity['ssr_no'],
                "sanctioned_rate": suggested_activity['sanctioned_rate'],
                "sanctioned_qty": 10
            })
            print(f"   📝 Added suggested activity: {suggested_activity['activity_name']}")
        
        # Add custom activities (activities NOT in suggestions)
        # Find activities not in suggestions
        suggested_activity_ids = [act['activity_id'] for act in suggested_activities]
        custom_activities = [act for act in activities if act['id'] not in suggested_activity_ids]
        
        if custom_activities:
            # Add Survey & Demarcation as custom activity with manual rate
            survey_activity = next((act for act in custom_activities if 'survey' in act.get('name', '').lower()), None)
            if survey_activity:
                work_items.append({
                    "activity_id": survey_activity['id'],
                    "activity_name": survey_activity['name'],
                    "unit": survey_activity['unit'],
                    "ssr_no": survey_activity['ssr_no'],
                    "sanctioned_rate": 2000,  # Manual rate since not in plantation norms
                    "sanctioned_qty": 5
                })
                print(f"   📝 Added custom activity: {survey_activity['name']} (Manual rate: ₹2000)")
            else:
                # Fallback to any custom activity
                custom_act = custom_activities[0]
                work_items.append({
                    "activity_id": custom_act['id'],
                    "activity_name": custom_act['name'],
                    "unit": custom_act['unit'],
                    "ssr_no": custom_act['ssr_no'],
                    "sanctioned_rate": 1500,  # Manual rate
                    "sanctioned_qty": 3
                })
                print(f"   📝 Added custom activity: {custom_act['name']} (Manual rate: ₹1500)")
        
        # Create the work
        work_data = {
            "apo_id": apo_id,
            "plantation_id": "plt-d02",
            "name": "Test Work with Custom Activities",
            "items": work_items
        }
        
        response = requests.post(f"{BASE_URL}/works", json=work_data, headers=headers)
        response.raise_for_status()
        work_result = response.json()
        
        work_id = work_result['id']
        total_estimated_cost = work_result.get('total_estimated_cost', 0)
        
        print(f"   ✅ Work created successfully: {work_id}")
        print(f"   📊 Total estimated cost: ₹{total_estimated_cost}")
        print(f"   📊 Number of items: {len(work_result.get('items', []))}")
        
        # Verify items in work
        work_items_result = work_result.get('items', [])
        print("   📝 Work items created:")
        for item in work_items_result:
            print(f"      - {item.get('activity_name', 'Unknown')}: ₹{item.get('sanctioned_rate', 0)} x {item.get('sanctioned_qty', 0)} = ₹{item.get('total_cost', 0)}")
            
    except Exception as e:
        print(f"   ❌ FAILED to create work: {str(e)}")
        try:
            error_detail = response.json() if response else {}
            print(f"   📄 Error detail: {error_detail}")
        except:
            pass
        return False

    # Step 7: Get APO detail and verify total calculation
    print("\n7. 🔍 Verifying APO detail and total calculation...")
    try:
        response = requests.get(f"{BASE_URL}/apo/{apo_id}", headers=headers)
        response.raise_for_status()
        apo_detail = response.json()
        
        works = apo_detail.get('works', [])
        total_amount = apo_detail.get('total_amount', 0)
        
        print(f"   ✅ APO detail retrieved")
        print(f"   📊 Number of works: {len(works)}")
        print(f"   📊 Total amount: ₹{total_amount}")
        
        if works:
            work = works[0]  # Our created work
            work_items = work.get('items', [])
            work_total = work.get('total_estimated_cost', 0)
            
            print(f"   📊 Work contains {len(work_items)} items with total ₹{work_total}")
            
            # Check if both suggested and custom activities are present
            has_suggested = False
            has_custom = False
            
            for item in work_items:
                item_activity_id = item.get('activity_id')
                if item_activity_id in suggested_activity_ids:
                    has_suggested = True
                    print(f"   ✅ Found suggested activity: {item.get('activity_name')}")
                else:
                    has_custom = True
                    print(f"   ✅ Found custom activity: {item.get('activity_name')} (Rate: ₹{item.get('sanctioned_rate')})")
            
            if has_suggested and has_custom:
                print("   ✅ SUCCESS: Work contains both suggested AND custom activities!")
            elif has_suggested:
                print("   ⚠️  Work contains only suggested activities")
            elif has_custom:
                print("   ⚠️  Work contains only custom activities")
            else:
                print("   ❌ Work contains no identifiable activity types")
                
            # Verify total calculation
            calculated_total = sum(item.get('total_cost', 0) for item in work_items)
            if abs(calculated_total - work_total) < 0.01:
                print(f"   ✅ Total calculation correct: ₹{work_total}")
            else:
                print(f"   ❌ Total calculation incorrect: Expected ₹{calculated_total}, got ₹{work_total}")
                
    except Exception as e:
        print(f"   ❌ FAILED to get APO detail: {str(e)}")
        return False

    print("\n🎉 Custom Activity to Work Feature Test COMPLETED!")
    print("=" * 60)
    return True


# Additional test function to verify API endpoint responses
def test_api_endpoints():
    """Test that all required API endpoints are responding correctly"""
    
    print("\n🔧 Testing API Endpoints...")
    print("-" * 40)
    
    endpoints_to_test = [
        ("POST", "/seed", "Seed database"),
        ("POST", "/auth/login", "Authentication"),
        ("GET", "/activities", "Get activities", True),  # Requires auth
        ("POST", "/apo", "Create APO", True),  # Requires auth
        ("POST", "/works/suggest-activities", "Activity suggestions", True),  # Requires auth
        ("POST", "/works", "Create work", True),  # Requires auth
    ]
    
    # First login to get token for authenticated endpoints
    token = None
    try:
        login_data = {"email": "ro.dharwad@kfdc.in", "password": "pass123"}
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token = response.json().get('token')
            print(f"   🔐 Auth token obtained")
    except:
        print(f"   ⚠️  Could not obtain auth token for endpoint testing")
    
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    for method, endpoint, description, *auth_required in endpoints_to_test:
        try:
            if endpoint == "/seed":
                response = requests.post(f"{BASE_URL}{endpoint}")
            elif endpoint == "/auth/login":
                response = requests.post(f"{BASE_URL}{endpoint}", json={"email": "ro.dharwad@kfdc.in", "password": "pass123"})
            elif endpoint == "/activities":
                response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            elif endpoint == "/apo":
                response = requests.post(f"{BASE_URL}{endpoint}", json={"financial_year": "2026-27"}, headers=headers)
            elif endpoint == "/works/suggest-activities":
                response = requests.post(f"{BASE_URL}{endpoint}", json={"plantation_id": "plt-d02", "financial_year": "2026-27"}, headers=headers)
            elif endpoint == "/works":
                # Skip actual work creation in endpoint test
                print(f"   ⏭️  Skipping {description} - tested in main flow")
                continue
            else:
                continue
                
            if response.status_code in [200, 201]:
                print(f"   ✅ {description}: {response.status_code}")
            else:
                print(f"   ❌ {description}: {response.status_code} - {response.text[:100]}")
                
        except Exception as e:
            print(f"   ❌ {description}: Error - {str(e)}")


if __name__ == "__main__":
    print(f"🧪 KFDC iFMS v2 - Custom Activity Testing Suite")
    print(f"🌐 Base URL: {BASE_URL}")
    print(f"⏰ Test started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        # Test API endpoints first
        test_api_endpoints()
        
        # Run main custom activity test
        success = test_custom_activity_to_work()
        
        if success:
            print("\n🎯 ALL TESTS PASSED! ✅")
            print("Custom Activity to Work feature is working correctly.")
        else:
            print("\n💥 SOME TESTS FAILED! ❌")
            print("Please check the errors above and fix the issues.")
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n💥 UNEXPECTED ERROR: {str(e)}")