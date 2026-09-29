# @servicespack/curlify

Easily convert SuperTest and HTTP requests into executable cURL commands.

## Installation

```bash
npm install -D @servicespack/curlify
```

## Features

- **SuperTest First**: Convert responses or requests directly from SuperTest / SuperAgent.
- **Safe Shell Escaping**: Properly handles single quotes in payloads and variables/quotes in headers to prevent shell injection or execution issues.
- **Full Header Support**: Automatically includes custom headers and infers `Content-Type: application/json` for object payloads.
- **Framework-Agnostic**: Can be used with plain JavaScript objects (`{ method, url, headers, body }`).
- **Flexible Logging**: Built-in middleware for SuperTest with support for custom loggers (Pino, Winston, etc.).
- **Formatting Options**: Supports multiline formatting with customizable indentation or single-line commands.

## Usage

### Direct Conversion with SuperTest Response

```typescript
import request from 'supertest'
import { curlify } from '@servicespack/curlify'
import app from './app'

const response = await request(app)
  .post('/users')
  .set('Authorization', 'Bearer token123')
  .send({ name: 'Gabriel' })

console.log(curlify(response))
```

Output:
```bash
curl -X POST http://localhost:3000/users \
	-d '{"name":"Gabriel"}' \
	-H "Authorization: Bearer token123" \
	-H "Content-Type: application/json"
```

### Using SuperTest Middleware (.use)

Log commands automatically upon response:

```typescript
import request from 'supertest'
import { curlifyMiddleware } from '@servicespack/curlify'
import app from './app'

await request(app)
  .post('/users')
  .send({ name: 'Gabriel' })
  .use(curlifyMiddleware)
```

### Custom Logger and Options

You can configure a custom logger and format options:

```typescript
import request from 'supertest'
import { createCurlifyMiddleware } from '@servicespack/curlify'
import app from './app'

await request(app)
  .post('/users')
  .send({ name: 'Gabriel' })
  .use(
    createCurlifyMiddleware({
      logger: (cmd) => myLogger.info(cmd),
      options: { multiline: false },
      logOnError: true,
    })
  )
```

Output (single-line):
```bash
curl -X POST http://localhost:3000/users -d '{"name":"Gabriel"}' -H "Content-Type: application/json"
```

### Framework-Agnostic Usage

You can also pass raw request objects without SuperTest:

```typescript
import { curlify } from '@servicespack/curlify'

const cmd = curlify({
  method: 'PUT',
  url: 'https://api.example.com/items/42',
  headers: {
    Authorization: 'Bearer secret-token',
  },
  body: { active: true },
})
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `multiline` | `boolean` | `true` | When `false`, produces a single-line command without `\` breaks. |
| `indent` | `string` | `'\t'` | Indentation string used for each line in multiline mode. |

## License

[The Unlicense](LICENSE)
