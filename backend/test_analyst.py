"""
Test script for Analyst Agent streaming
"""

import asyncio
import json
import websockets
from datetime import datetime


async def test_analyst_streaming():
    """Test the Analyst agent streaming via WebSocket"""
    uri = "ws://localhost:8000/ws/debate"

    print("=" * 60)
    print("Testing Analyst Agent Streaming")
    print("=" * 60)

    print(f"\nConnecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("✓ WebSocket connected")

            # Send start_debate message
            query = "What are the key benefits of artificial intelligence in healthcare?"
            message = {
                "type": "start_debate",
                "query": query
            }

            print(f"\nSending query: {query}")
            print("-" * 60)
            await websocket.send(json.dumps(message))

            # Receive streamed tokens
            full_response = ""
            token_count = 0
            start_time = datetime.now()

            while True:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                    data = json.loads(response)

                    if data.get("type") == "agent_token":
                        content = data.get("content", "")
                        full_response += content
                        token_count += 1
                        print(content, end="", flush=True)

                    elif data.get("type") == "debate_complete":
                        print("\n" + "-" * 60)
                        print(f"✓ Debate complete - Received {token_count} tokens")
                        elapsed = (datetime.now() - start_time).total_seconds()
                        print(f"  Time elapsed: {elapsed:.2f}s")
                        break

                    elif data.get("type") == "error":
                        print(f"\n✗ Error: {data.get('message')}")
                        return False

                except asyncio.TimeoutError:
                    print("\n✗ Timeout waiting for response")
                    return False

            print("\n✓ Analyst streaming test passed")
            return True

    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_health():
    """Test health endpoint"""
    import httpx

    url = "http://localhost:8000/api/health"
    print(f"\nTesting health endpoint: {url}...")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")

            if data.get("status") == "ok":
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
    print("\n" + "=" * 60)
    print("Story 1.2 Test Suite")
    print("=" * 60)

    # Test health first
    health_passed = await test_health()

    if not health_passed:
        print("\n⚠️  Health check failed - skipping streaming test")
        return 1

    # Test streaming
    stream_passed = await test_analyst_streaming()

    print("\n" + "=" * 60)
    print("Test Results:")
    print(f"  Health Endpoint: {'✓ PASSED' if health_passed else '✗ FAILED'}")
    print(f"  Analyst Streaming: {'✓ PASSED' if stream_passed else '✗ FAILED'}")
    print("=" * 60)

    if health_passed and stream_passed:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
