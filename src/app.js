/**
 * @fileoverview Application factory for the proxy fetch server.
 * @author Nicholas C. Zakas
 */

/* @ts-self-types="./app.d.ts" */

import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { ProxyAgent } from "undici";

/**
 * Creates the Hono app with the given configuration
 * @param {object} config - Configuration options
 * @param {string} [config.key] - Expected Bearer token (optional)
 * @param {string} config.proxyUri - Proxy URI (required)
 * @param {string} [config.proxyToken] - Proxy token
 * @param {string} [config.proxyTokenType] - Proxy token type prefix (default: "Bearer")
 * @returns {Hono} The configured Hono app
 */
function createApp(config) {
	const app = new Hono();

	const { key, proxyUri, proxyToken, proxyTokenType = "Bearer" } = config;

	// Validate required configuration
	if (!proxyUri) {
		throw new Error("proxyUri is required in configuration");
	}

	// Apply bearer auth middleware if key is provided
	if (key) {
		app.use("/", bearerAuth({ token: key }));
	}

	/**
	 * POST / endpoint - Fetches a URL using a proxy agent
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

		// Create proxy agent with undici
		/** @type {import('undici').ProxyAgent.Options} */
		const proxyAgentOptions = {
			uri: proxyUri,
		};

		// Add proxy token if configured
		if (proxyToken) {
			proxyAgentOptions.token = `${proxyTokenType} ${proxyToken}`;
		}

		const proxyAgent = new ProxyAgent(proxyAgentOptions);

		/** @type {Record<string, any>} */
		const fetchOptions = {
			dispatcher: proxyAgent,
		};

		// Fetch the URL
		try {
			const response = await fetch(body.url, fetchOptions);

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
