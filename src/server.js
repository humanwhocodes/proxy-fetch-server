#!/usr/bin/env node

/**
 * @fileoverview Proxy fetch server using Hono.
 * @author Nicholas C. Zakas
 */

/* @ts-self-types="./server.d.ts" */

// @ts-ignore - @hono/node-server may not have types
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

// Get configuration from environment variables
const key = process.env.PROXY_FETCH_KEY;
const port = parseInt(process.env.PORT || "8080", 10);
const fetchProxyUri = process.env.FETCH_PROXY_URI;
const httpProxy = fetchProxyUri || process.env.http_proxy;
const httpsProxy = fetchProxyUri || process.env.https_proxy;
const noProxyEnv = process.env.no_proxy;
const proxyToken = process.env.PROXY_TOKEN;
const proxyTokenType = process.env.PROXY_TOKEN_TYPE;

// Parse no_proxy into an array
const noProxy = noProxyEnv
	? noProxyEnv.split(",").map(entry => entry.trim())
	: [];

// Validate required configuration
if (!httpProxy && !httpsProxy) {
	console.error(
		"Error: Either FETCH_PROXY_URI, http_proxy, or https_proxy environment variable is required",
	);
	process.exit(1);
}

const app = createApp({
	key,
	httpProxy,
	httpsProxy,
	noProxy,
	proxyToken,
	proxyTokenType,
});

console.log(`Starting server on port ${port}...`);
serve({
	fetch: app.fetch,
	port,
});
