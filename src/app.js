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
 * @param {string} [config.httpProxy] - HTTP proxy URI
 * @param {string} [config.httpsProxy] - HTTPS proxy URI
 * @param {string[]} [config.noProxy] - Array of hostnames or hostname:port to bypass proxy
 * @param {string} [config.proxyToken] - Proxy token
 * @param {string} [config.proxyTokenType] - Proxy token type prefix (default: "Bearer")
 * @returns {Hono} The configured Hono app
 */
function createApp(config) {
	const app = new Hono();

	const {
		key,
		httpProxy,
		httpsProxy,
		noProxy = [],
		proxyToken,
		proxyTokenType = "Bearer",
	} = config;

	// Validate required configuration
	if (!httpProxy && !httpsProxy) {
		throw new Error(
			"Either httpProxy or httpsProxy is required in configuration",
		);
	}

	// Apply bearer auth middleware if key is provided
	if (key) {
		app.use("/", bearerAuth({ token: key }));
	}

	/**
	 * Checks if a hostname should bypass the proxy
	 * @param {string} hostname - The hostname to check
	 * @param {string} port - The port (optional)
	 * @param {string[]} noProxyList - Array of hostnames or hostname:port to bypass
	 * @returns {boolean} True if should bypass proxy
	 */
	function shouldBypassProxy(hostname, port, noProxyList) {
		for (const entry of noProxyList) {
			// Check for hostname:port match
			if (entry.includes(":")) {
				const hostnamePort = port ? `${hostname}:${port}` : hostname;

				if (entry === hostnamePort) {
					return true;
				}
			}

			// Check for subdomain pattern (starts with .)
			if (entry.startsWith(".")) {
				const domain = entry.slice(1); // Remove leading dot

				if (hostname === domain || hostname.endsWith(`.${domain}`)) {
					return true;
				}
			} else if (entry === hostname) {
				// Exact hostname match
				return true;
			}
		}

		return false;
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

		// Check if we should bypass the proxy
		const hostname = targetUrl.hostname;
		const port = targetUrl.port;
		const useProxy = !shouldBypassProxy(hostname, port, noProxy);

		/** @type {Record<string, any>} */
		const fetchOptions = {};

		if (useProxy) {
			// Determine which proxy to use based on the protocol
			const selectedProxy =
				targetUrl.protocol === "https:" ? httpsProxy : httpProxy;

			// If the selected proxy is not configured, fall back to the other one
			const proxyUri = selectedProxy || httpsProxy || httpProxy;

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
			fetchOptions.dispatcher = proxyAgent;
		}

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
