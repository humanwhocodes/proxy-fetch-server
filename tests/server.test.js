/**
 * @fileoverview Tests for the proxy fetch server.
 * @author Nicholas C. Zakas
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockServer, FetchMocker } from "mentoss";
import { createApp } from "../src/server.js";

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
			expectedKey: "test-secret-key",
			proxyUri: "http://proxy.example.com:8080",
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
			const data = await res.json();

			expect(res.status).toBe(401);
			expect(data).toEqual({
				error: "Missing or invalid Authorization header",
			});
		});

		it("should return 401 when Authorization header is not Bearer", async () => {
			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Basic abc123",
				},
				body: JSON.stringify({ url: "https://example.com" }),
			});

			const res = await app.fetch(req);
			const data = await res.json();

			expect(res.status).toBe(401);
			expect(data).toEqual({
				error: "Missing or invalid Authorization header",
			});
		});

		it("should return 403 when Bearer token is invalid", async () => {
			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer wrong-token",
				},
				body: JSON.stringify({ url: "https://example.com" }),
			});

			const res = await app.fetch(req);
			const data = await res.json();

			expect(res.status).toBe(403);
			expect(data).toEqual({ error: "Invalid authorization token" });
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
	});
});
