/**
 * @fileoverview Application factory for the proxy fetch server.
 * @author Nicholas C. Zakas
 */

/* @ts-self-types="./app.d.ts" */

import { Hono } from "hono";
import { ProxyAgent } from "undici";

/**
 * Creates the Hono app with the given configuration
 * @param {object} config - Configuration options
 * @param {string} config.expectedKey - Expected Bearer token
 * @param {string} config.proxyUri - Proxy URI (required)
 * @param {string} [config.proxyToken] - Proxy token
 * @returns {Hono} The configured Hono app
 */
function createApp(config) {
	const app = new Hono();

	const { expectedKey, proxyUri, proxyToken } = config;

	// Validate required configuration
	if (!expectedKey) {
		throw new Error("expectedKey is required in configuration");
	}

	if (!proxyUri) {
		throw new Error("proxyUri is required in configuration");
	}

	/**
	 * POST / endpoint - Fetches a URL using a proxy agent
	 */
	app.post("/", async (c) => {
		// Check Authorization header
		const authHeader = c.req.header("Authorization");

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json(
				{ error: "Missing or invalid Authorization header" },
				401,
			);
		}

		const token = authHeader.substring(7); // Remove "Bearer " prefix

		if (token !== expectedKey) {
			return c.json({ error: "Invalid authorization token" }, 403);
		}

		// Parse request body
		/** @type {any} */
		let body;

		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "Invalid JSON body" }, 400);
		}

		if (!body.url) {
			return c.json(
				{ error: "Missing url property in request body" },
				400,
			);
		}

		// Validate URL format
		let targetUrl;

		try {
			targetUrl = new URL(body.url);
		} catch {
			return c.json({ error: "Invalid URL format" }, 400);
		}

		// Restrict to HTTP/HTTPS schemes to prevent SSRF attacks
		if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
			return c.json(
				{ error: "Only HTTP and HTTPS URLs are allowed" },
				400,
			);
		}

		// Create proxy agent with undici
		const proxyAgent = new ProxyAgent(proxyUri);

		/** @type {Record<string, any>} */
		const fetchOptions = {
			dispatcher: proxyAgent,
		};

		// Add proxy token as Authorization header if configured
		if (proxyToken) {
			fetchOptions.headers = {
				Authorization: `Bearer ${proxyToken}`,
			};
		}

		// Fetch the URL
		try {
			const response = await fetch(body.url, fetchOptions);

			// Pass through the response
			const responseBody = await response.text();
			const contentType =
				response.headers.get("Content-Type") || "text/plain";

			return new Response(responseBody, {
				status: response.status,
				headers: {
					"Content-Type": contentType,
				},
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			return c.json(
				{ error: `Failed to fetch URL: ${errorMessage}` },
				500,
			);
		}
	});

	return app;
}

export { createApp };
