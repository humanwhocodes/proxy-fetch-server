# Proxy Fetch Server

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate).

## Description

A Node.js server that uses a proxy agent to make fetch requests. Built with [Hono](https://hono.dev/), this server accepts POST requests with URLs to fetch through a configurable proxy.

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

- **http_proxy** (conditionally required) - The proxy server to use for requests that use the http protocol
- **https_proxy** (conditionally required) - The proxy server to use for requests that use the https protocol
- **no_proxy** (optional) - A comma-delimited list of hostnames or hostname:port entries that should bypass using the configured proxy completely. If a hostname begins with a dot (.) then it applies to all subdomains. For instance `.humanwhocodes.com` applies to `humanwhocodes.com`, `www.humanwhocodes.com`, `newsletter.humanwhocodes.com`, etc.
- **PROXY_FETCH_KEY** (optional) - The expected Bearer token in the Authorization header
- **PORT** (optional) - The port to start the server on (default: 8080)
- **PROXY_TOKEN** (optional) - The token that the proxy expects
- **PROXY_TOKEN_TYPE** (optional) - The token type prefix for the proxy (default: "Bearer")

Either `http_proxy` or `https_proxy` is required.

Example:

```shell
http_proxy=http://proxy.example.com:8080 \
https_proxy=http://proxy.example.com:8080 \
no_proxy=localhost,.internal.com \
PROXY_FETCH_KEY=my-secret-key \
PORT=3000 \
PROXY_TOKEN=proxy-secret \
PROXY_TOKEN_TYPE=Bearer \
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
2. Fetch the specified URL through the configured proxy
3. Return the response with the same status code and content type

### Programmatic Usage

You can also use this package programmatically:

```javascript
import { createApp } from "@humanwhocodes/proxy-fetch-server";

const app = createApp({
	key: "my-secret-key",
	httpProxy: "http://proxy.example.com:8080",
	httpsProxy: "http://proxy.example.com:8080",
	noProxy: ["localhost", ".internal.com"],
	proxyToken: "proxy-secret",
	proxyTokenType: "Bearer",
});

// Use with your preferred Node.js server adapter
```

**Configuration options:**

- `key` (string, optional) - The expected Bearer token in the Authorization header
- `httpProxy` (string, conditionally required) - The proxy server to use for HTTP requests
- `httpsProxy` (string, conditionally required) - The proxy server to use for HTTPS requests
- `noProxy` (string[], optional) - Array of hostnames or hostname:port entries to bypass proxy
- `proxyToken` (string, optional) - The token that the proxy expects
- `proxyTokenType` (string, optional) - The token type prefix for the proxy (default: "Bearer")

Either `httpProxy` or `httpsProxy` is required.

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
