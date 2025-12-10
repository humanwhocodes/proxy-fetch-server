#!/usr/bin/env node

/**
 * @fileoverview Proxy fetch server using Hono.
 * @author Nicholas C. Zakas
 */

/* @ts-self-types="./server.d.ts" */

// @ts-ignore - @hono/node-server may not have types
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { ProxyAgent } from "proxy-agent";

/**
 * Creates the Hono app with the given configuration
 * @param {object} config - Configuration options
 * @param {string} config.expectedKey - Expected Bearer token
 * @param {string} config.proxyUri - Proxy URI
 * @param {string} config.proxyToken - Proxy token
 * @returns {Hono} The configured Hono app
 */
function createApp(config) {
	const app = new Hono();

	const { expectedKey, proxyUri, proxyToken } = config;

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

		// Create proxy agent if proxy URI is configured
		/** @type {Record<string, any>} */
		const fetchOptions = {};

		if (proxyUri) {
			const agent = new ProxyAgent({
				getProxyForUrl: () => proxyUri,
			});

			// Add proxy token as Authorization header if configured
			/** @type {Record<string, string>} */
			const headers = {};

			if (proxyToken) {
				headers["Authorization"] = `Bearer ${proxyToken}`;
			}

			fetchOptions.dispatcher = agent;
			fetchOptions.headers = headers;
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

// Get configuration from environment variables
const expectedKey = process.env.PROXY_FETCH_KEY || "";
const port = parseInt(process.env.PROXY_FETCH_PORT || "8080", 10);
const proxyUri = process.env.PROXY_FETCH_URI || "";
const proxyToken = process.env.PROXY_FETCH_TOKEN || "";

const app = createApp({ expectedKey, proxyUri, proxyToken });

// Start server only if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	console.log(`Starting server on port ${port}...`);
	serve({
		fetch: app.fetch,
		port,
	});
}

export { app, createApp };
