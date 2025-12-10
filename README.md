# Proxy Fetch Server

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate).

## Description

A Node.js server that uses a proxy agent to make fetch requests. Built with [Hono](https://hono.dev/), this server accepts POST requests with URLs to fetch through a configurable proxy.

## Installation

```shell
npm install @humanwhocodes/proxy-fetch-server
```

## Usage

### Starting the Server

You can start the server using `npx`:

```shell
npx @humanwhocodes/proxy-fetch-server
```

### Configuration

The server is configured using environment variables:

- **PROXY_FETCH_KEY** (required) - The expected Bearer token in the Authorization header
- **PROXY_FETCH_URI** (required) - The address of the proxy to use with the proxy agent
- **PROXY_FETCH_PORT** (optional) - The port to start the server on (default: 8080)
- **PROXY_FETCH_TOKEN** (optional) - The token that the proxy expects

Example:

```shell
PROXY_FETCH_KEY=my-secret-key \
PROXY_FETCH_PORT=3000 \
PROXY_FETCH_URI=http://proxy.example.com:8080 \
PROXY_FETCH_TOKEN=proxy-secret \
npx @humanwhocodes/proxy-fetch-server
```

### Making Requests

Send a POST request to the root endpoint (`/`) with:

- **Authorization header**: `Bearer <PROXY_FETCH_KEY>`
- **Request body**: JSON object with a `url` property

Example using curl:

```shell
curl -X POST http://localhost:8080/ \
  -H "Authorization: Bearer my-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

The server will:
1. Validate the Bearer token
2. Fetch the specified URL through the configured proxy
3. Return the response with the same status code and content type

### Programmatic Usage

You can also use this package programmatically:

```javascript
import { createApp } from "@humanwhocodes/proxy-fetch-server";

const app = createApp({
	expectedKey: "my-secret-key",
	proxyUri: "http://proxy.example.com:8080",
	proxyToken: "proxy-secret",
});

// Use with your preferred Node.js server adapter
```

## License

Copyright 2025 Nicholas C. Zakas

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
