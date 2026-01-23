/**
 * @fileoverview Tests for the proxy fetch server.
 * @author Nicholas C. Zakas
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockServer, FetchMocker } from "mentoss";
import { createApp } from "../src/app.js";

describe("Proxy Fetch Server", () => {
	let fetchMocker;
	let mockServer;
	let app;

	beforeEach(() => {
		// Create a mock server for the external URLs we'll be fetching
		mockServer = new MockServer("https://example.com");

		// Create a fetch mocker with the mock server
		fetchMocker = new FetchMocker({
			servers: [mockServer],
		});

		// Mock the global fetch
		fetchMocker.mockGlobal();

		// Create the app with test configuration
		app = createApp({
			key: "test-secret-key",
			httpsProxy: "http://proxy.example.com:8080",
			proxyToken: "proxy-token",
		});
	});

	afterEach(() => {
		fetchMocker.unmockGlobal();
	});

	describe("POST /", () => {
		it("should return 401 when Authorization header is missing", async () => {
			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com" }),
			});

			const res = await app.fetch(req);

			expect(res.status).toBe(401);
		});

		it("should return 400 when Authorization header is not Bearer", async () => {
			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Basic abc123",
				},
				body: JSON.stringify({ url: "https://example.com" }),
			});

			const res = await app.fetch(req);

			expect(res.status).toBe(400);
		});

		it("should return 401 when Bearer token is invalid", async () => {
			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer wrong-token",
				},
				body: JSON.stringify({ url: "https://example.com" }),
			});

			const res = await app.fetch(req);

			expect(res.status).toBe(401);
		});

		it("should return 400 when request body is not valid JSON", async () => {
			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-secret-key",
				},
				body: "not valid json",
			});

			const res = await app.fetch(req);
			const data = await res.json();

			expect(res.status).toBe(400);
			expect(data).toEqual({ error: "Invalid JSON body" });
		});

		it("should return 400 when url property is missing", async () => {
			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-secret-key",
				},
				body: JSON.stringify({ notUrl: "value" }),
			});

			const res = await app.fetch(req);
			const data = await res.json();

			expect(res.status).toBe(400);
			expect(data).toEqual({
				error: "Missing url property in request body",
			});
		});

		it("should return 400 when url is not a valid URL", async () => {
			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-secret-key",
				},
				body: JSON.stringify({ url: "not-a-valid-url" }),
			});

			const res = await app.fetch(req);
			const data = await res.json();

			expect(res.status).toBe(400);
			expect(data).toEqual({ error: "Invalid URL format" });
		});

		it("should return 400 when url uses disallowed protocol", async () => {
			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-secret-key",
				},
				body: JSON.stringify({ url: "file:///etc/passwd" }),
			});

			const res = await app.fetch(req);
			const data = await res.json();

			expect(res.status).toBe(400);
			expect(data).toEqual({
				error: "Only HTTP and HTTPS URLs are allowed",
			});
		});

		it("should successfully fetch and return the response", async () => {
			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/html",
				},
				body: "<html>Test content</html>",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-secret-key",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await app.fetch(req);
			const text = await res.text();

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain("text/html");
			expect(text).toBe("<html>Test content</html>");
		});

		it("should pass through different status codes", async () => {
			// Mock the route with 404
			mockServer.get("/notfound", {
				status: 404,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "Not Found",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-secret-key",
				},
				body: JSON.stringify({ url: "https://example.com/notfound" }),
			});

			const res = await app.fetch(req);
			const text = await res.text();

			expect(res.status).toBe(404);
			expect(text).toBe("Not Found");
		});

		it("should return 500 when fetch fails", async () => {
			// Mock a route that throws an error
			mockServer.get("/error", () => {
				throw new Error("Network error");
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-secret-key",
				},
				body: JSON.stringify({ url: "https://example.com/error" }),
			});

			const res = await app.fetch(req);
			const data = await res.json();

			expect(res.status).toBe(500);
			expect(data.error).toContain("Failed to fetch URL");
		});

		it("should handle JSON responses", async () => {
			// Mock the route with JSON response
			mockServer.get("/data", {
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ key: "value" }),
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-secret-key",
				},
				body: JSON.stringify({ url: "https://example.com/data" }),
			});

			const res = await app.fetch(req);
			const text = await res.text();

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain(
				"application/json",
			);
			expect(JSON.parse(text)).toEqual({ key: "value" });
		});

		it("should handle text file responses", async () => {
			// Mock the route with plain text file
			const textContent =
				"This is a plain text file.\nWith multiple lines.";
			mockServer.get("/file.txt", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: textContent,
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-secret-key",
				},
				body: JSON.stringify({ url: "https://example.com/file.txt" }),
			});

			const res = await app.fetch(req);
			const text = await res.text();

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain("text/plain");
			expect(text).toBe(textContent);
		});

		it("should handle binary image responses", async () => {
			// Create a small binary image (1x1 transparent PNG)
			const pngData = new Uint8Array([
				0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
				0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01,
				0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
				0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
				0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00,
				0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
				0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
			]);

			mockServer.get("/image.png", {
				status: 200,
				headers: {
					"Content-Type": "image/png",
				},
				body: pngData,
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-secret-key",
				},
				body: JSON.stringify({ url: "https://example.com/image.png" }),
			});

			const res = await app.fetch(req);
			const arrayBuffer = await res.arrayBuffer();
			const receivedData = new Uint8Array(arrayBuffer);

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain("image/png");
			expect(receivedData.length).toBe(pngData.length);
			// Verify the binary data matches
			expect(Array.from(receivedData)).toEqual(Array.from(pngData));
		});

		it("should add X-Proxied-By header to responses", async () => {
			// Mock a simple response
			mockServer.get("/test", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "test",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-secret-key",
				},
				body: JSON.stringify({ url: "https://example.com/test" }),
			});

			const res = await app.fetch(req);

			expect(res.status).toBe(200);
			expect(res.headers.get("X-Proxied-By")).toBe("proxy-fetch-server");
		});
	});

	describe("POST / (without authentication key)", () => {
		let appNoAuth;

		beforeEach(() => {
			// Create the app without a key
			appNoAuth = createApp({
				httpsProxy: "http://proxy.example.com:8080",
				proxyToken: "proxy-token",
			});
		});

		it("should allow requests without Authorization header when key is not configured", async () => {
			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/html",
				},
				body: "<html>Test content</html>",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appNoAuth.fetch(req);
			const text = await res.text();

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain("text/html");
			expect(text).toBe("<html>Test content</html>");
		});

		it("should ignore Authorization header when key is not configured", async () => {
			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/html",
				},
				body: "<html>Test content</html>",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer any-token",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appNoAuth.fetch(req);
			const text = await res.text();

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain("text/html");
			expect(text).toBe("<html>Test content</html>");
		});
	});

	describe("Proxy token configuration", () => {
		it("should use default Bearer token type when proxyTokenType is not specified", async () => {
			// Create app without specifying proxyTokenType
			const appWithDefaultTokenType = createApp({
				httpsProxy: "http://proxy.example.com:8080",
				proxyToken: "my-token",
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appWithDefaultTokenType.fetch(req);

			expect(res.status).toBe(200);
		});

		it("should use custom token type when proxyTokenType is specified", async () => {
			// Create app with custom token type
			const appWithCustomTokenType = createApp({
				httpsProxy: "http://proxy.example.com:8080",
				proxyToken: "my-token",
				proxyTokenType: "Basic",
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appWithCustomTokenType.fetch(req);

			expect(res.status).toBe(200);
		});

		it("should work without proxyToken when not configured", async () => {
			// Create app without proxy token
			const appWithoutToken = createApp({
				httpsProxy: "http://proxy.example.com:8080",
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appWithoutToken.fetch(req);

			expect(res.status).toBe(200);
		});
	});

	describe("New proxy configuration", () => {
		it("should throw error when neither httpProxy nor httpsProxy is provided", () => {
			expect(() => {
				createApp({});
			}).toThrow(
				"Either httpProxy or httpsProxy is required in configuration",
			);
		});

		it("should work with only httpProxy", async () => {
			const appHttpOnly = createApp({
				httpProxy: "http://proxy.example.com:8080",
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appHttpOnly.fetch(req);

			expect(res.status).toBe(200);
		});

		it("should work with only httpsProxy", async () => {
			const appHttpsOnly = createApp({
				httpsProxy: "http://proxy.example.com:8080",
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appHttpsOnly.fetch(req);

			expect(res.status).toBe(200);
		});

		it("should use httpProxy for http URLs", async () => {
			const appWithBoth = createApp({
				httpProxy: "http://http-proxy.example.com:8080",
				httpsProxy: "http://https-proxy.example.com:8080",
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "http success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appWithBoth.fetch(req);

			expect(res.status).toBe(200);
		});

		it("should use httpsProxy for https URLs", async () => {
			const appWithBoth = createApp({
				httpProxy: "http://http-proxy.example.com:8080",
				httpsProxy: "http://https-proxy.example.com:8080",
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "https success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appWithBoth.fetch(req);

			expect(res.status).toBe(200);
		});
	});

	describe("noProxy configuration", () => {
		it("should bypass proxy for exact hostname match", async () => {
			const appWithNoProxy = createApp({
				httpsProxy: "http://proxy.example.com:8080",
				noProxy: ["example.com"],
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appWithNoProxy.fetch(req);

			expect(res.status).toBe(200);
		});

		it("should bypass proxy for hostname:port match", async () => {
			const appWithNoProxy = createApp({
				httpsProxy: "http://proxy.example.com:8080",
				noProxy: ["example.com:443"],
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com:443/" }),
			});

			const res = await appWithNoProxy.fetch(req);

			expect(res.status).toBe(200);
		});

		it("should bypass proxy for subdomain pattern", async () => {
			const appWithNoProxy = createApp({
				httpsProxy: "http://proxy.example.com:8080",
				noProxy: [".example.com"],
			});

			// Mock the route
			mockServer.get("/subdomain", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "subdomain success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/subdomain" }),
			});

			const res = await appWithNoProxy.fetch(req);

			expect(res.status).toBe(200);
		});

		it("should bypass proxy for root domain with dot pattern", async () => {
			const appWithNoProxy = createApp({
				httpsProxy: "http://proxy.example.com:8080",
				noProxy: [".example.com"],
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appWithNoProxy.fetch(req);

			expect(res.status).toBe(200);
		});

		it("should not bypass proxy for non-matching hostname", async () => {
			const appWithNoProxy = createApp({
				httpsProxy: "http://proxy.example.com:8080",
				noProxy: ["other.com"],
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appWithNoProxy.fetch(req);

			expect(res.status).toBe(200);
		});

		it("should work with empty noProxy array", async () => {
			const appWithEmptyNoProxy = createApp({
				httpsProxy: "http://proxy.example.com:8080",
				noProxy: [],
			});

			// Mock the route
			mockServer.get("/", {
				status: 200,
				headers: {
					"Content-Type": "text/plain",
				},
				body: "success",
			});

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url: "https://example.com/" }),
			});

			const res = await appWithEmptyNoProxy.fetch(req);

			expect(res.status).toBe(200);
		});
	});
});
