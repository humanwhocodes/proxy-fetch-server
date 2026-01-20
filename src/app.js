/**
 * @fileoverview Application factory for the proxy fetch server.
 * @author Nicholas C. Zakas
 */

/* @ts-self-types="./app.d.ts" */

import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";

/**
 * Creates the Hono app with the given configuration
 * @param {object} config - Configuration options
 * @param {string} [config.key] - Expected Bearer token (optional)
 * @returns {Hono} The configured Hono app
 */
function createApp(config) {
	const app = new Hono();

	const { key } = config;

	// Apply bearer auth middleware if key is provided
	if (key) {
		app.use("/", bearerAuth({ token: key }));
	}

	/**
	 * POST / endpoint - Fetches a URL
	 */
	app.post("/", async (c) => {

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

		// Fetch the URL using Node.js built-in fetch
		// Node.js automatically uses HTTP_PROXY, HTTPS_PROXY, and NO_PROXY environment variables
		try {
			const response = await fetch(body.url);

			// Pass through the response using arrayBuffer for proper binary handling
			const responseBody = await response.arrayBuffer();
			const contentType =
				response.headers.get("Content-Type") || "application/octet-stream";

			return new Response(responseBody, {
				status: response.status,
				headers: {
					"Content-Type": contentType,
					"X-Proxied-By": "proxy-fetch-server",
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
