#!/usr/bin/env python3

"""
KFDC iFMS - Simple FNB Upload Test
Simplified test for debugging FNB upload issues
"""

import requests
import json
import io

BASE_URL = "https://kfdc-fund-mgmt.preview.emergentagent.com/api"

def login_rfo():
    """Login as RFO and return token"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "rfo.dharwad@kfdc.in",
            "password": "pass123"
        })
        
        if response.status_code == 200:
            token = response.json().get("token")
            print(f"✅ RFO Login successful")
            return token
        else:
            print(f"❌ RFO Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        return None

def test_fnb_upload_simple():
    """Simple FNB upload test"""
    print("🚀 TESTING FNB UPLOAD - SIMPLE VERSION")
    
    # Login
    token = login_rfo()
    if not token:
        return False
    
    # Create simple PDF content
    pdf_content = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF"""
    
    print("\n--- Testing FNB Upload with RFO ---")
    
    # Test with proper multipart/form-data
    files = {
        'file': ('test_fnb.pdf', pdf_content, 'application/pdf')
    }
    data = {
        'item_id': 'test-item-001'
    }
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    try:
        upload_response = requests.post(
            f"{BASE_URL}/fund-indent/upload-fnb",
            headers=headers,
            files=files,
            data=data,
            timeout=30
        )
        
        print(f"Upload Status Code: {upload_response.status_code}")
        print(f"Response Headers: {dict(upload_response.headers)}")
        print(f"Response Content: {upload_response.text[:500]}")
        
        if upload_response.status_code == 200:
            response_data = upload_response.json()
            print(f"✅ FNB Upload successful!")
            print(f"File URL: {response_data.get('file_url', 'N/A')}")
            print(f"File Name: {response_data.get('file_name', 'N/A')}")
            return True
        else:
            print(f"❌ FNB Upload failed with status {upload_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        return False

def test_access_control():
    """Test access control"""
    print("\n--- Testing Access Control ---")
    
    # Login as RO (should be denied)
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "ro.dharwad@kfdc.in",
        "password": "pass123"
    })
    
    if response.status_code != 200:
        print("❌ RO login failed")
        return False
        
    ro_token = response.json().get("token")
    
    # Try to upload as RO
    files = {
        'file': ('test_fnb_ro.pdf', b'%PDF-1.4 test', 'application/pdf')
    }
    data = {
        'item_id': 'test-ro'
    }
    headers = {
        'Authorization': f'Bearer {ro_token}'
    }
    
    try:
        upload_response = requests.post(
            f"{BASE_URL}/fund-indent/upload-fnb",
            headers=headers,
            files=files,
            data=data,
            timeout=30
        )
        
        if upload_response.status_code == 403:
            print("✅ RO correctly blocked from FNB upload (403)")
            return True
        else:
            print(f"❌ RO should be blocked but got status {upload_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Access control test error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔧 SIMPLE FNB UPLOAD DEBUGGING TEST")
    print(f"Base URL: {BASE_URL}")
    
    success1 = test_fnb_upload_simple()
    success2 = test_access_control()
    
    if success1 and success2:
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️ Some tests failed - debugging needed")