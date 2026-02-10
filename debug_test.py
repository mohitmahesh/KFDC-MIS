#!/usr/bin/env python3
"""
Quick debug test to understand the response issue
"""

import requests
from datetime import datetime

BASE_URL = "https://forest-apo-hub.preview.emergentagent.com/api"

class SimpleTest:
    def __init__(self):
        self.session = requests.Session()
        
    def log(self, message):
        print(f"[DEBUG] {datetime.now().strftime('%H:%M:%S')} - {message}")
        
    def test_budget_enforcement(self):
        # Login
        login_data = {'email': 'ro.sagara@kfdc.in', 'password': 'pass123'}
        response = self.session.post(f'{BASE_URL}/auth/login', json=login_data)
        token = response.json()['token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test budget enforcement
        work_data = {'apo_item_id': 'apoi-001', 'actual_qty': 10, 'expenditure': 300000}
        response = self.session.post(f'{BASE_URL}/work-logs', json=work_data, headers=headers)
        
        self.log(f"Response object type: {type(response)}")
        self.log(f"Response is None: {response is None}")
        self.log(f"Response status code: {response.status_code}")
        self.log(f"Status code == 400: {response.status_code == 400}")
        self.log(f"Response truthy: {bool(response)}")
        self.log(f"Combined condition: {bool(response and response.status_code == 400)}")
        
        # Test different condition formats
        condition1 = response and response.status_code == 400
        condition2 = response is not None and response.status_code == 400
        self.log(f"Condition1 result: {condition1} (type: {type(condition1)})")
        self.log(f"Condition2 result: {condition2} (type: {type(condition2)})")
        
        if response and response.status_code == 400:
            self.log("Condition 1: Correct 400 response")
            error_data = response.json()
            error_msg = error_data.get('error', '')
            self.log(f"Error message: {error_msg}")
            self.log(f"Boolean check: {bool(response and response.status_code == 400)}")
            if "Budget Exceeded" in error_msg:
                self.log("PASS: Budget enforcement working")
            else:
                self.log("FAIL: Wrong error message")
        elif response and response.status_code == 201:
            self.log("Condition 2: Wrong 201 response")
            self.log("FAIL: Budget enforcement not working")
        else:
            self.log(f"Condition 3: Unexpected - response={response}, status={response.status_code if response else 'None'}")
            self.log("FAIL: Unexpected status")

if __name__ == "__main__":
    test = SimpleTest()
    test.test_budget_enforcement()