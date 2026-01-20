# Proxy Fetch Server

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate).

## Description

A Node.js server that makes fetch requests through a proxy. Built with [Hono](https://hono.dev/), this server accepts POST requests with URLs to fetch. Proxy configuration is handled through standard Node.js environment variables.

The intended use is as a serverless function.

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

- **PROXY_FETCH_KEY** (optional) - The expected Bearer token in the Authorization header
- **PORT** (optional) - The port to start the server on (default: 8080)

#### Proxy Configuration

The server uses Node.js's built-in proxy support through standard environment variables:

- **HTTP_PROXY** - Proxy URL for HTTP requests
- **HTTPS_PROXY** - Proxy URL for HTTPS requests
- **NO_PROXY** - Comma-separated list of hosts that should bypass the proxy

Example:

```shell
HTTP_PROXY=http://proxy.example.com:8080 \
HTTPS_PROXY=http://proxy.example.com:8080 \
NO_PROXY=localhost,127.0.0.1 \
PROXY_FETCH_KEY=my-secret-key \
PORT=3000 \
npx @humanwhocodes/proxy-fetch-server
```

### Making Requests

Send a POST request to the root endpoint (`/`) with:

- **Authorization header** (optional): `Bearer <PROXY_FETCH_KEY>` - Required only if PROXY_FETCH_KEY is configured
- **Request body**: JSON object with a `url` property

Example using curl:

```shell
curl -X POST http://localhost:8080/ \
  -H "Authorization: Bearer my-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

The server will:
1. Validate the Bearer token (if configured)
2. Fetch the specified URL (using the configured proxy if HTTP_PROXY/HTTPS_PROXY are set)
3. Return the response with the same status code and content type

### Programmatic Usage

You can also use this package programmatically:

```javascript
import { createApp } from "@humanwhocodes/proxy-fetch-server";

const app = createApp({
	key: "my-secret-key",
});

// Use with your preferred Node.js server adapter
// Note: Proxy configuration is handled through HTTP_PROXY/HTTPS_PROXY environment variables
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
