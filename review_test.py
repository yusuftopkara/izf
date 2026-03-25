#!/usr/bin/env python3
"""
Focused Backend API Testing for Review Request
Testing PostgreSQL removal and Push Notification addition
"""

import requests
import json
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://zumba-fitness-1.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@zumba.com"
ADMIN_PASSWORD = "admin123"

def test_review_scenarios():
    """Test the specific scenarios from the review request"""
    session = requests.Session()
    results = []
    
    print("🎯 IZF ZUMBA APP - REVIEW REQUEST TESTING")
    print("=" * 60)
    print(f"Backend URL: {API_BASE}")
    print("=" * 60)
    
    # 1. Login with admin@zumba.com / admin123
    print("\n1️⃣ Testing Admin Login (admin@zumba.com / admin123)")
    try:
        response = session.post(f"{API_BASE}/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                admin_token = data["access_token"]
                session.headers.update({"Authorization": f"Bearer {admin_token}"})
                print(f"✅ PASS: Admin login successful - Role: {data.get('user', {}).get('role', 'unknown')}")
                results.append(("Admin Login", True, "Successfully authenticated"))
            else:
                print(f"❌ FAIL: No access token in response")
                results.append(("Admin Login", False, "No access token"))
                return results
        else:
            print(f"❌ FAIL: Login failed with status {response.status_code}")
            results.append(("Admin Login", False, f"Status {response.status_code}"))
            return results
    except Exception as e:
        print(f"❌ FAIL: Login request failed: {str(e)}")
        results.append(("Admin Login", False, f"Request failed: {str(e)}"))
        return results
    
    # 2. Test new endpoint: POST /api/me/register-push-token
    print("\n2️⃣ Testing Push Notification Token Registration")
    try:
        test_token = "ExponentPushToken[test-token-xxx]"
        response = session.post(f"{API_BASE}/me/register-push-token", json={
            "push_token": test_token
        })
        
        if response.status_code == 200:
            data = response.json()
            expected_response = {"success": True, "message": "Push token registered successfully"}
            
            if data.get("success") == True and "Push token registered successfully" in data.get("message", ""):
                print(f"✅ PASS: Push token registered successfully")
                print(f"   Response: {data}")
                results.append(("Push Token Registration", True, "Working correctly"))
            else:
                print(f"❌ FAIL: Unexpected response format: {data}")
                results.append(("Push Token Registration", False, "Unexpected response"))
        else:
            print(f"❌ FAIL: Request failed with status {response.status_code}")
            results.append(("Push Token Registration", False, f"Status {response.status_code}"))
    except Exception as e:
        print(f"❌ FAIL: Request failed: {str(e)}")
        results.append(("Push Token Registration", False, f"Request failed: {str(e)}"))
    
    # 3. Verify settings endpoint no longer has PostgreSQL
    print("\n3️⃣ Testing Settings Endpoint (No PostgreSQL)")
    try:
        response = session.get(f"{API_BASE}/admin/settings")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for expected sections
            has_iyzico = "iyzico" in data
            has_firebase = "firebase" in data
            has_sendgrid = "sendgrid" in data
            has_postgres = "postgres" in data or "postgresql" in data
            
            sections_found = list(data.keys())
            
            if has_iyzico and has_firebase and has_sendgrid and not has_postgres:
                print(f"✅ PASS: Settings correctly configured")
                print(f"   ✓ Has iyzico section")
                print(f"   ✓ Has firebase section")
                print(f"   ✓ Has sendgrid section")
                print(f"   ✓ NO postgres section")
                print(f"   Sections found: {sections_found}")
                results.append(("Settings Endpoint", True, "Correctly configured"))
            else:
                issues = []
                if not has_iyzico:
                    issues.append("missing iyzico")
                if not has_firebase:
                    issues.append("missing firebase")
                if not has_sendgrid:
                    issues.append("missing sendgrid")
                if has_postgres:
                    issues.append("still has postgres section")
                
                print(f"❌ FAIL: Settings issues: {', '.join(issues)}")
                print(f"   Sections found: {sections_found}")
                results.append(("Settings Endpoint", False, f"Issues: {', '.join(issues)}"))
        else:
            print(f"❌ FAIL: Settings request failed with status {response.status_code}")
            results.append(("Settings Endpoint", False, f"Status {response.status_code}"))
    except Exception as e:
        print(f"❌ FAIL: Settings request failed: {str(e)}")
        results.append(("Settings Endpoint", False, f"Request failed: {str(e)}"))
    
    # 4. Test payment flow still works
    print("\n4️⃣ Testing Payment Flow (POST /api/payment/create)")
    try:
        # First get an event to use for payment
        events_response = session.get(f"{API_BASE}/events")
        if events_response.status_code != 200:
            print(f"❌ FAIL: Could not fetch events for payment test")
            results.append(("Payment Flow", False, "Could not fetch events"))
        else:
            events = events_response.json()
            if not events:
                print(f"❌ FAIL: No events available for payment test")
                results.append(("Payment Flow", False, "No events available"))
            else:
                event_id = events[0]["id"]
                
                # Mock payment data
                payment_data = {
                    "event_id": event_id,
                    "quantity": 1,
                    "card": {
                        "card_holder_name": "Test User",
                        "card_number": "5528790000000008",
                        "expire_month": "12",
                        "expire_year": "2030",
                        "cvc": "123"
                    },
                    "buyer": {
                        "name": "Test",
                        "surname": "User",
                        "email": "test@example.com",
                        "phone": "+905551234567",
                        "identity_number": "11111111111",
                        "address": "Test Address",
                        "city": "Istanbul",
                        "country": "Turkey",
                        "zip_code": "34000"
                    }
                }
                
                response = session.post(f"{API_BASE}/payment/create", json=payment_data)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success") == True:
                        print(f"✅ PASS: Payment endpoint working")
                        print(f"   Status: {data.get('status')}")
                        print(f"   Message: {data.get('message')}")
                        if data.get('tickets'):
                            print(f"   Tickets created: {len(data['tickets'])}")
                        results.append(("Payment Flow", True, f"Working - {data.get('status')}"))
                    else:
                        print(f"❌ FAIL: Payment failed - Status: {data.get('status')}")
                        print(f"   Message: {data.get('message')}")
                        results.append(("Payment Flow", False, f"Payment failed - {data.get('status')}"))
                else:
                    print(f"❌ FAIL: Payment request failed with status {response.status_code}")
                    results.append(("Payment Flow", False, f"Status {response.status_code}"))
    except Exception as e:
        print(f"❌ FAIL: Payment request failed: {str(e)}")
        results.append(("Payment Flow", False, f"Request failed: {str(e)}"))
    
    # 5. Verify all core APIs still work
    print("\n5️⃣ Testing Core APIs Still Work")
    core_apis = [
        ("GET /api/events", "/events"),
        ("GET /api/videos", "/videos"),
        ("GET /api/challenges", "/challenges")
    ]
    
    for api_name, endpoint in core_apis:
        try:
            response = session.get(f"{API_BASE}{endpoint}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    print(f"✅ PASS: {api_name} - {len(data)} items found")
                    results.append((f"Core API {api_name}", True, f"{len(data)} items"))
                else:
                    print(f"❌ FAIL: {api_name} - Non-list response")
                    results.append((f"Core API {api_name}", False, "Non-list response"))
            else:
                print(f"❌ FAIL: {api_name} - Status {response.status_code}")
                results.append((f"Core API {api_name}", False, f"Status {response.status_code}"))
        except Exception as e:
            print(f"❌ FAIL: {api_name} - Request failed: {str(e)}")
            results.append((f"Core API {api_name}", False, f"Request failed: {str(e)}"))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 REVIEW REQUEST TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, success, _ in results if success)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    print(f"📈 Success Rate: {(passed/total*100):.1f}%")
    
    if total - passed > 0:
        print("\n🔍 FAILED TESTS:")
        for test_name, success, message in results:
            if not success:
                print(f"   ❌ {test_name}: {message}")
    
    print("\n🎉 REVIEW REQUEST TESTING COMPLETE!")
    return passed == total

if __name__ == "__main__":
    success = test_review_scenarios()
    exit(0 if success else 1)