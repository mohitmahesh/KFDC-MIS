#!/usr/bin/env python3
"""Debug script to investigate test issues"""

import requests
import json

BASE_URL = "https://kfdc-fund-mgmt.preview.emergentagent.com/api"

def debug_ro_plantations():
    """Debug RO plantation access"""
    print("=== DEBUGGING RO PLANTATIONS ===")
    
    # Login as RO Dharwad
    login_response = requests.post(f"{BASE_URL}/auth/login", 
                                 json={"email": "ro.dharwad@kfdc.in", "password": "pass123"})
    
    if login_response.status_code == 200:
        token = login_response.json()["token"]
        user_data = login_response.json()["user"]
        print(f"RO User: {user_data}")
        
        # Get plantations
        plantations_response = requests.get(f"{BASE_URL}/plantations", 
                                           headers={"Authorization": f"Bearer {token}"})
        
        if plantations_response.status_code == 200:
            plantations = plantations_response.json()
            print(f"RO sees {len(plantations)} plantations:")
            for p in plantations:
                print(f"  - {p['id']}: {p['name']} (range: {p['range_id']})")
        else:
            print(f"Failed to get plantations: {plantations_response.status_code}")

def debug_all_plantations():
    """Debug all plantations"""
    print("\n=== DEBUGGING ALL PLANTATIONS ===")
    
    # Login as Admin
    login_response = requests.post(f"{BASE_URL}/auth/login", 
                                 json={"email": "admin@kfdc.in", "password": "pass123"})
    
    if login_response.status_code == 200:
        token = login_response.json()["token"]
        
        # Get all plantations
        plantations_response = requests.get(f"{BASE_URL}/plantations", 
                                           headers={"Authorization": f"Bearer {token}"})
        
        if plantations_response.status_code == 200:
            plantations = plantations_response.json()
            print(f"Admin sees {len(plantations)} total plantations:")
            
            # Count by division
            dharwad_count = len([p for p in plantations if p['id'].startswith('plt-d')])
            bangalore_count = len([p for p in plantations if p['id'].startswith('plt-b')])
            shimoga_count = len([p for p in plantations if p['id'].startswith('plt-s')])
            chikmagalur_count = len([p for p in plantations if p['id'].startswith('plt-c')])
            
            print(f"  Dharwad (plt-d*): {dharwad_count}")
            print(f"  Bangalore (plt-b*): {bangalore_count}")
            print(f"  Shimoga (plt-s*): {shimoga_count}")
            print(f"  Chikmagalur (plt-c*): {chikmagalur_count}")
            
            # Check Dharwad range specifically
            dharwad_range_plantations = [p for p in plantations if p.get('range_id') == 'rng-dharwad']
            print(f"  Dharwad Range (rng-dharwad): {len(dharwad_range_plantations)}")
            for p in dharwad_range_plantations:
                print(f"    - {p['id']}: {p['name']}")

def debug_apo_item_cost():
    """Debug APO item cost issue"""
    print("\n=== DEBUGGING APO ITEM COST ===")
    
    # Login as RO
    login_response = requests.post(f"{BASE_URL}/auth/login", 
                                 json={"email": "ro.dharwad@kfdc.in", "password": "pass123"})
    
    if login_response.status_code == 200:
        token = login_response.json()["token"]
        
        # Get draft
        draft_response = requests.post(f"{BASE_URL}/apo/generate-draft", 
                                     headers={"Authorization": f"Bearer {token}"}, 
                                     json={"plantation_id": "plt-d05", "financial_year": "2026-27"})
        
        if draft_response.status_code == 200:
            draft = draft_response.json()
            items = draft["items"][:2]  # Take first 2 items
            print(f"Draft items: {len(items)}")
            for item in items:
                print(f"  Item: {item['activity_name']} - Rate: {item['sanctioned_rate']} - Qty: {item['suggested_qty']} - Cost: {item['total_cost']}")
            
            # Create APO
            apo_data = {
                "plantation_id": "plt-d05",
                "financial_year": "2026-27", 
                "status": "PENDING_APPROVAL",
                "items": items
            }
            
            create_response = requests.post(f"{BASE_URL}/apo", 
                                          headers={"Authorization": f"Bearer {token}"}, 
                                          json=apo_data)
            
            if create_response.status_code == 201:
                apo = create_response.json()
                apo_id = apo["id"]
                print(f"Created APO: {apo_id}")
                
                # Get APO detail
                detail_response = requests.get(f"{BASE_URL}/apo/{apo_id}", 
                                             headers={"Authorization": f"Bearer {token}"})
                
                if detail_response.status_code == 200:
                    detail = detail_response.json()
                    apo_items = detail.get("items", [])
                    print(f"APO detail items: {len(apo_items)}")
                    for item in apo_items:
                        print(f"  Item: {item.get('activity_name')} - Cost: {item.get('total_cost')}")

if __name__ == "__main__":
    # Seed first
    seed_response = requests.post(f"{BASE_URL}/seed")
    print(f"Seed status: {seed_response.status_code}")
    
    debug_ro_plantations()
    debug_all_plantations()
    debug_apo_item_cost()