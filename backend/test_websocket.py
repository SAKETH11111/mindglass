"""
Test script for WebSocket endpoint
"""

import asyncio
import websockets
import json

async def test_websocket():
    """Test the WebSocket endpoint"""
    uri = "ws://localhost:8000/ws/debate"

    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("✓ WebSocket connection established")

            # Send a test message
            test_message = "Hello, MindGlass!"
            print(f"Sending: {test_message}")
            await websocket.send(test_message)

            # Receive response
            response = await websocket.recv()
            print(f"Received: {response}")

            print("✓ WebSocket test passed")
            return True
    except Exception as e:
        print(f"✗ WebSocket test failed: {e}")
        return False

async def test_health_endpoint():
    """Test the health endpoint"""
    import httpx

    url = "http://localhost:8000/api/health"
    print(f"\nTesting health endpoint: {url}...")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")

            if data.get("status") == "ok" and "timestamp" in data:
                print("✓ Health endpoint test passed")
                return True
            else:
                print("✗ Health endpoint response invalid")
                return False
    except Exception as e:
        print(f"✗ Health endpoint test failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("=" * 50)
    print("MindGlass Backend Tests")
    print("=" * 50)

    # Test health endpoint first
    health_passed = await test_health_endpoint()

    # Test WebSocket
    ws_passed = await test_websocket()

    print("\n" + "=" * 50)
    print("Test Results:")
    print(f"  Health Endpoint: {'✓ PASSED' if health_passed else '✗ FAILED'}")
    print(f"  WebSocket: {'✓ PASSED' if ws_passed else '✗ FAILED'}")
    print("=" * 50)

    if health_passed and ws_passed:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
