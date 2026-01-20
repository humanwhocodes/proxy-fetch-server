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

const app = createApp({ key });

console.log(`Starting server on port ${port}...`);
serve({
	fetch: app.fetch,
	port,
});

