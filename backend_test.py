import requests
import sys
import json
from datetime import datetime

class StorageHunterAPITester:
    def __init__(self, base_url="https://storage-scan-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            self.test_results.append({
                'name': name,
                'method': method,
                'endpoint': endpoint,
                'expected_status': expected_status,
                'actual_status': response.status_code,
                'success': success,
                'response_preview': response.text[:200] if not success else 'OK'
            })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                'name': name,
                'method': method,
                'endpoint': endpoint,
                'expected_status': expected_status,
                'actual_status': 'ERROR',
                'success': False,
                'response_preview': str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_stats_endpoint(self):
        """Test dashboard stats endpoint"""
        return self.run_test("Dashboard Stats", "GET", "stats", 200)

    def test_published_units(self):
        """Test published units endpoint"""
        return self.run_test("Published Units", "GET", "published-units", 200)

    def test_my_bids(self):
        """Test my bids endpoint"""
        return self.run_test("My Bids", "GET", "my-bids", 200)

    def test_review_queue(self):
        """Test review queue endpoint"""
        return self.run_test("Review Queue", "GET", "review-queue", 200)

    def test_scan_auctions(self):
        """Test scan auctions endpoint with sample URLs"""
        sample_urls = [
            'https://www.storagetreasures.com/auctions/detail/1234567',
            'https://www.hibid.com/lot/12345678'
        ]
        
        scan_data = {
            "urls": sample_urls,
            "state_filter": "WA",
            "county_filter": "King"
        }
        
        return self.run_test("Scan Auctions", "POST", "scan", 200, scan_data)

    def test_scan_with_empty_urls(self):
        """Test scan with empty URLs"""
        scan_data = {
            "urls": [],
            "state_filter": None,
            "county_filter": None
        }
        
        return self.run_test("Scan Empty URLs", "POST", "scan", 200, scan_data)

    def test_review_queue_with_filters(self):
        """Test review queue with state/county filters"""
        return self.run_test("Review Queue with Filters", "GET", "review-queue", 200, 
                           params={"state": "WA", "county": "King"})

    def test_published_units_with_filters(self):
        """Test published units with filters"""
        return self.run_test("Published Units with Filters", "GET", "published-units", 200,
                           params={"state": "WA", "county": "King"})

    def test_status_check_create(self):
        """Test status check creation"""
        status_data = {
            "client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"
        }
        return self.run_test("Create Status Check", "POST", "status", 200, status_data)

    def test_status_check_get(self):
        """Test getting status checks"""
        return self.run_test("Get Status Checks", "GET", "status", 200)

def main():
    print("🚀 Starting StorageHunter Pro API Tests")
    print("=" * 50)
    
    # Setup
    tester = StorageHunterAPITester()
    
    # Run basic endpoint tests
    print("\n📋 Testing Basic Endpoints...")
    tester.test_root_endpoint()
    tester.test_stats_endpoint()
    tester.test_published_units()
    tester.test_my_bids()
    tester.test_review_queue()
    
    # Test status endpoints
    print("\n📊 Testing Status Endpoints...")
    tester.test_status_check_create()
    tester.test_status_check_get()
    
    # Test filtering
    print("\n🔍 Testing Filtered Endpoints...")
    tester.test_review_queue_with_filters()
    tester.test_published_units_with_filters()
    
    # Test scan functionality (this will take longer due to AI processing)
    print("\n🤖 Testing AI Scan Functionality...")
    print("⚠️  Note: This test may take 30-60 seconds due to AI processing...")
    tester.test_scan_auctions()
    tester.test_scan_with_empty_urls()
    
    # Print results summary
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    # Print failed tests details
    failed_tests = [t for t in tester.test_results if not t['success']]
    if failed_tests:
        print("\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"  - {test['name']}: {test['actual_status']} (expected {test['expected_status']})")
            print(f"    Error: {test['response_preview']}")
    
    # Print success rate
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"\n✅ Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())