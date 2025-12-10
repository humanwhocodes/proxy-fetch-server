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
const expectedKey = process.env.PROXY_FETCH_KEY;
const port = parseInt(process.env.PORT || "8080", 10);
const proxyUri = process.env.PROXY_URI;
const proxyToken = process.env.PROXY_TOKEN;

// Validate required configuration
if (!expectedKey) {
	console.error(
		"Error: PROXY_FETCH_KEY environment variable is required",
	);
	process.exit(1);
}

if (!proxyUri) {
	console.error(
		"Error: PROXY_URI environment variable is required",
	);
	process.exit(1);
}

const app = createApp({ expectedKey, proxyUri, proxyToken });

console.log(`Starting server on port ${port}...`);
serve({
	fetch: app.fetch,
	port,
});

