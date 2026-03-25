#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Zumba App
Tests all endpoints mentioned in the review request
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend environment
BASE_URL = "https://zumba-fitness-1.preview.emergentagent.com/api"

class ZumbaAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.user_token = None
        self.admin_token = None
        self.staff_token = None
        self.test_results = []
        self.event_id = None
        self.post_id = None
        self.challenge_id = None
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
    def make_request(self, method, endpoint, data=None, headers=None, token=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Set up headers
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        if token:
            req_headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=req_headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=req_headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=req_headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=req_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def test_health_check(self):
        """Test basic health check"""
        print("\n=== HEALTH CHECK ===")
        response = self.make_request("GET", "/")
        if response and response.status_code == 200:
            data = response.json()
            self.log_result("Health Check", True, f"API is running: {data.get('message', 'OK')}")
        else:
            self.log_result("Health Check", False, f"API not responding. Status: {response.status_code if response else 'No response'}")
    
    def test_seed_data(self):
        """Seed initial data"""
        print("\n=== SEEDING DATA ===")
        response = self.make_request("POST", "/seed")
        if response and response.status_code == 200:
            data = response.json()
            self.log_result("Seed Data", True, data.get("message", "Data seeded"))
        else:
            self.log_result("Seed Data", False, f"Failed to seed data. Status: {response.status_code if response else 'No response'}")
    
    def test_user_registration(self):
        """Test user registration"""
        print("\n=== USER REGISTRATION ===")
        user_data = {
            "email": "maria.gonzalez@email.com",
            "password": "zumba2025!",
            "name": "Maria Gonzalez"
        }
        
        response = self.make_request("POST", "/register", user_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data and "user" in data:
                self.user_token = data["access_token"]
                self.log_result("User Registration", True, f"User registered successfully: {data['user']['name']}")
            else:
                self.log_result("User Registration", False, "Missing token or user data in response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("User Registration", False, f"Registration failed: {error_msg}")
    
    def test_user_login(self):
        """Test user login with existing user"""
        print("\n=== USER LOGIN ===")
        login_data = {
            "email": "maria.gonzalez@email.com",
            "password": "zumba2025!"
        }
        
        response = self.make_request("POST", "/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.user_token = data["access_token"]
                self.log_result("User Login", True, f"Login successful for: {data['user']['name']}")
            else:
                self.log_result("User Login", False, "Missing token in response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("User Login", False, f"Login failed: {error_msg}")
    
    def test_admin_login(self):
        """Test admin login"""
        print("\n=== ADMIN LOGIN ===")
        login_data = {
            "email": "admin@zumba.com",
            "password": "admin123"
        }
        
        response = self.make_request("POST", "/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.admin_token = data["access_token"]
                self.log_result("Admin Login", True, f"Admin login successful: {data['user']['role']}")
            else:
                self.log_result("Admin Login", False, "Missing token in response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Admin Login", False, f"Admin login failed: {error_msg}")
    
    def test_staff_login(self):
        """Test staff login"""
        print("\n=== STAFF LOGIN ===")
        login_data = {
            "email": "staff@zumba.com",
            "password": "staff123"
        }
        
        response = self.make_request("POST", "/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if "access_token" in data:
                self.staff_token = data["access_token"]
                self.log_result("Staff Login", True, f"Staff login successful: {data['user']['role']}")
            else:
                self.log_result("Staff Login", False, "Missing token in response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Staff Login", False, f"Staff login failed: {error_msg}")
    
    def test_get_current_user(self):
        """Test get current user endpoint"""
        print("\n=== GET CURRENT USER ===")
        if not self.user_token:
            self.log_result("Get Current User", False, "No user token available")
            return
            
        response = self.make_request("GET", "/me", token=self.user_token)
        if response and response.status_code == 200:
            data = response.json()
            if "email" in data and "name" in data:
                self.log_result("Get Current User", True, f"User info retrieved: {data['name']} ({data['email']})")
            else:
                self.log_result("Get Current User", False, "Missing user data in response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Get Current User", False, f"Failed to get user info: {error_msg}")
    
    def test_get_events(self):
        """Test get events endpoint"""
        print("\n=== GET EVENTS ===")
        response = self.make_request("GET", "/events")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.event_id = data[0]["id"]  # Store first event ID for later tests
                self.log_result("Get Events", True, f"Retrieved {len(data)} events")
            else:
                self.log_result("Get Events", False, "No events found or invalid response format")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Get Events", False, f"Failed to get events: {error_msg}")
    
    def test_get_single_event(self):
        """Test get single event endpoint"""
        print("\n=== GET SINGLE EVENT ===")
        if not self.event_id:
            self.log_result("Get Single Event", False, "No event ID available")
            return
            
        response = self.make_request("GET", f"/events/{self.event_id}")
        if response and response.status_code == 200:
            data = response.json()
            if "title" in data and "id" in data:
                self.log_result("Get Single Event", True, f"Event retrieved: {data['title']}")
            else:
                self.log_result("Get Single Event", False, "Missing event data in response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Get Single Event", False, f"Failed to get event: {error_msg}")
    
    def test_buy_ticket(self):
        """Test buy ticket endpoint"""
        print("\n=== BUY TICKET ===")
        if not self.user_token:
            self.log_result("Buy Ticket", False, "No user token available")
            return
        if not self.event_id:
            self.log_result("Buy Ticket", False, "No event ID available")
            return
            
        ticket_data = {
            "event_id": self.event_id,
            "quantity": 1
        }
        
        response = self.make_request("POST", "/buy-ticket", ticket_data, token=self.user_token)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0 and "qr_token" in data[0]:
                self.log_result("Buy Ticket", True, f"Ticket purchased successfully. QR: {data[0]['qr_token'][:10]}...")
            else:
                self.log_result("Buy Ticket", False, "Invalid ticket response format")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Buy Ticket", False, f"Failed to buy ticket: {error_msg}")
    
    def test_get_my_tickets(self):
        """Test get my tickets endpoint"""
        print("\n=== GET MY TICKETS ===")
        if not self.user_token:
            self.log_result("Get My Tickets", False, "No user token available")
            return
            
        response = self.make_request("GET", "/my-tickets", token=self.user_token)
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Get My Tickets", True, f"Retrieved {len(data)} tickets")
            else:
                self.log_result("Get My Tickets", False, "Invalid tickets response format")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Get My Tickets", False, f"Failed to get tickets: {error_msg}")
    
    def test_check_ticket(self):
        """Test check ticket endpoint (staff only)"""
        print("\n=== CHECK TICKET (STAFF) ===")
        if not self.staff_token:
            self.log_result("Check Ticket", False, "No staff token available")
            return
            
        # First get a ticket to check
        if not self.user_token:
            self.log_result("Check Ticket", False, "No user token to get tickets")
            return
            
        tickets_response = self.make_request("GET", "/my-tickets", token=self.user_token)
        if not tickets_response or tickets_response.status_code != 200:
            self.log_result("Check Ticket", False, "Could not retrieve tickets to check")
            return
            
        tickets = tickets_response.json()
        if not tickets or len(tickets) == 0:
            self.log_result("Check Ticket", False, "No tickets available to check")
            return
            
        qr_token = tickets[0]["qr_token"]
        check_data = {"qr_token": qr_token}
        
        response = self.make_request("POST", "/check-ticket", check_data, token=self.staff_token)
        if response and response.status_code == 200:
            data = response.json()
            if "status" in data:
                self.log_result("Check Ticket", True, f"Ticket check result: {data['status']} - {data.get('message', '')}")
            else:
                self.log_result("Check Ticket", False, "Invalid ticket check response format")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Check Ticket", False, f"Failed to check ticket: {error_msg}")
    
    def test_get_challenges(self):
        """Test get challenges endpoint"""
        print("\n=== GET CHALLENGES ===")
        response = self.make_request("GET", "/challenges")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.challenge_id = data[0]["id"]  # Store first challenge ID
                self.log_result("Get Challenges", True, f"Retrieved {len(data)} challenges")
            else:
                self.log_result("Get Challenges", False, "No challenges found or invalid response format")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Get Challenges", False, f"Failed to get challenges: {error_msg}")
    
    def test_complete_challenge(self):
        """Test complete challenge endpoint"""
        print("\n=== COMPLETE CHALLENGE ===")
        if not self.user_token:
            self.log_result("Complete Challenge", False, "No user token available")
            return
        if not self.challenge_id:
            self.log_result("Complete Challenge", False, "No challenge ID available")
            return
            
        response = self.make_request("POST", f"/challenges/complete/{self.challenge_id}", token=self.user_token)
        if response and response.status_code == 200:
            data = response.json()
            if "message" in data:
                self.log_result("Complete Challenge", True, f"Challenge completed: {data['message']}")
            else:
                self.log_result("Complete Challenge", False, "Invalid challenge completion response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            # Note: 400 error might be expected if already completed today
            if response and response.status_code == 400 and "Already completed" in error_msg:
                self.log_result("Complete Challenge", True, f"Challenge already completed today (expected): {error_msg}")
            else:
                self.log_result("Complete Challenge", False, f"Failed to complete challenge: {error_msg}")
    
    def test_get_posts(self):
        """Test get posts endpoint"""
        print("\n=== GET POSTS ===")
        response = self.make_request("GET", "/posts")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("Get Posts", True, f"Retrieved {len(data)} posts")
            else:
                self.log_result("Get Posts", False, "Invalid posts response format")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Get Posts", False, f"Failed to get posts: {error_msg}")
    
    def test_create_post(self):
        """Test create post endpoint"""
        print("\n=== CREATE POST ===")
        if not self.user_token:
            self.log_result("Create Post", False, "No user token available")
            return
            
        post_data = {
            "media_url": "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800",
            "caption": "Just finished an amazing Zumba session! 💃 #ZumbaLife #Fitness"
        }
        
        response = self.make_request("POST", "/posts", post_data, token=self.user_token)
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data and "caption" in data:
                self.post_id = data["id"]  # Store post ID for like test
                self.log_result("Create Post", True, f"Post created successfully: {data['caption'][:50]}...")
            else:
                self.log_result("Create Post", False, "Invalid post creation response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Create Post", False, f"Failed to create post: {error_msg}")
    
    def test_like_post(self):
        """Test like post endpoint"""
        print("\n=== LIKE POST ===")
        if not self.user_token:
            self.log_result("Like Post", False, "No user token available")
            return
        if not self.post_id:
            self.log_result("Like Post", False, "No post ID available")
            return
            
        response = self.make_request("POST", f"/posts/{self.post_id}/like", token=self.user_token)
        if response and response.status_code == 200:
            data = response.json()
            if "liked" in data and "likes" in data:
                self.log_result("Like Post", True, f"Post like toggled: liked={data['liked']}, total likes={data['likes']}")
            else:
                self.log_result("Like Post", False, "Invalid like response format")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Like Post", False, f"Failed to like post: {error_msg}")
    
    def test_admin_stats(self):
        """Test admin stats endpoint"""
        print("\n=== ADMIN STATS ===")
        if not self.admin_token:
            self.log_result("Admin Stats", False, "No admin token available")
            return
            
        response = self.make_request("GET", "/admin/stats", token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            expected_fields = ["total_users", "total_events", "total_tickets", "tickets_used", "total_posts"]
            if all(field in data for field in expected_fields):
                self.log_result("Admin Stats", True, f"Stats retrieved: {data}")
            else:
                self.log_result("Admin Stats", False, "Missing expected fields in stats response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Admin Stats", False, f"Failed to get admin stats: {error_msg}")
    
    def test_payment_create(self):
        """Test iyzico payment endpoint /api/payment/create"""
        print("\n🧪 Testing iyzico Payment Endpoint")
        print("-" * 40)
        
        if not self.admin_token:
            self.log_result("Payment Create", False, "No admin token available")
            return
        
        # Get a valid event ID first
        events_response = self.make_request("GET", "/events", token=self.admin_token)
        if not events_response or events_response.status_code != 200:
            self.log_result("Payment Create", False, "Could not fetch events for payment test")
            return
            
        events = events_response.json()
        if not events:
            self.log_result("Payment Create", False, "No events available for payment test")
            return
            
        test_event = events[0]
        event_id = test_event["id"]
        
        # Test payment creation with mock data
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
                "email": "test@test.com",
                "phone": "5551234567",
                "identity_number": "11111111111",
                "address": "Test Address",
                "city": "Istanbul",
                "country": "Turkey",
                "zip_code": "34000"
            }
        }
        
        response = self.make_request("POST", "/payment/create", data=payment_data, token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            
            # Verify response structure
            required_fields = ["success", "status", "message"]
            if all(field in data for field in required_fields):
                if data["success"]:
                    # Check if tickets were created
                    if "tickets" in data and data["tickets"]:
                        tickets = data["tickets"]
                        self.log_result("Payment Create", True, 
                                      f"Payment successful! Created {len(tickets)} ticket(s). Mode: {data['status']}")
                        
                        # Verify tickets in user's account
                        tickets_response = self.make_request("GET", "/my-tickets", token=self.admin_token)
                        if tickets_response and tickets_response.status_code == 200:
                            my_tickets = tickets_response.json()
                            event_tickets = [t for t in my_tickets if t["event_id"] == event_id]
                            if event_tickets:
                                self.log_result("Payment Verification", True, 
                                              f"Tickets verified in user account: {len(event_tickets)} ticket(s)")
                            else:
                                self.log_result("Payment Verification", False, "Tickets not found in user account")
                    else:
                        self.log_result("Payment Create", False, "Payment successful but no tickets in response")
                else:
                    self.log_result("Payment Create", False, f"Payment failed: {data['message']}")
            else:
                self.log_result("Payment Create", False, "Missing required fields in payment response")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "No response"
            self.log_result("Payment Create", False, f"Payment request failed: {error_msg}")
        
        # Test edge case: Invalid event ID
        invalid_payment_data = payment_data.copy()
        invalid_payment_data["event_id"] = "invalid-event-id"
        
        response = self.make_request("POST", "/payment/create", data=invalid_payment_data, token=self.admin_token)
        if response and response.status_code == 404:
            self.log_result("Payment Invalid Event", True, "Correctly rejected invalid event ID")
        else:
            status = response.status_code if response else "No response"
            self.log_result("Payment Invalid Event", False, f"Expected 404 for invalid event, got {status}")
        
        # Test edge case: No authentication
        response = self.make_request("POST", "/payment/create", data=payment_data)
        if response and response.status_code == 401:
            self.log_result("Payment No Auth", True, "Correctly rejected unauthenticated request")
        else:
            status = response.status_code if response else "No response"
            self.log_result("Payment No Auth", False, f"Expected 401 for no auth, got {status}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting Zumba App Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Health and setup
        self.test_health_check()
        self.test_seed_data()
        
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_admin_login()
        self.test_staff_login()
        self.test_get_current_user()
        
        # Events tests
        self.test_get_events()
        self.test_get_single_event()
        
        # Tickets tests
        self.test_buy_ticket()
        self.test_get_my_tickets()
        self.test_check_ticket()
        
        # Challenges tests
        self.test_get_challenges()
        self.test_complete_challenge()
        
        # Social tests
        self.test_get_posts()
        self.test_create_post()
        self.test_like_post()
        
        # Admin tests
        self.test_admin_stats()
        
        # Payment tests
        self.test_payment_create()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)
        return failed == 0

if __name__ == "__main__":
    tester = ZumbaAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)