# SMS Gateway

A two-microservice system, Node.js + TypeScript, demonstrating clean architecture,
provider abstraction, reliability, and extensibility.

---

## 1. How to run locally

### Option A — Docker Compose (recommended)

```bash
docker compose up --build
```

- `my-server`     : http://localhost:4000  (Swagger UI: http://localhost:4000/docs)
- `sms-provider`  : http://localhost:4001  (Swagger UI: http://localhost:4001/docs)
- Logs are written to `./logs/sms.log` on the host (mounted volume).

### Option B — Run each service in a terminal

```bash
# Terminal 1 — fake external provider
cd sms-provider
npm install
npm run dev          # listens on :4001

# Terminal 2 — main service
cd my-server
npm install
npm run dev          # listens on :4000
```

### Try it

```bash
# Valid request
curl -X POST http://localhost:4000/sms/send \
  -H 'content-type: application/json' \
  -d '{"phoneNumber":"+96170123456","message":"Hello from MyServer"}'

# Invalid input -> 400
curl -X POST http://localhost:4000/sms/send \
  -H 'content-type: application/json' \
  -d '{"phoneNumber":"abc","message":""}'

# Tail provider call logs
tail -f logs/sms.log
```

### Run tests

```bash
cd my-server && npm test
```

---

## 2. High-level architecture

### 2.1 System diagram

```
                     ┌────────────────────────────────────────────────┐
                     │                  MyServer (4000)               │
                     │                                                │
   HTTP POST         │   ┌─────────────┐    ┌────────────────────┐    │
 /sms/send  ────────►│──►│ SmsControll │───►│     SmsService     │    │
                     │   └─────────────┘    │ (orchestration)    │    │
                     │                      │                    │    │
                     │                      │  • selector.pick() │    │
                     │                      │  • retry+backoff   │    │
                     │                      │  • failover        │    │
                     │                      │  • log + stats     │    │
                     │                      └─────────┬──────────┘    │
                     │                                │               │
                     │            ┌───────────────────┴────────┐      │
                     │            ▼                            ▼      │
                     │   ┌────────────────┐          ┌───────────────┐│
                     │   │ ProviderA      │          │ ProviderB     ││
                     │   │ (POST adapter) │          │ (GET adapter) ││
                     │   └────────┬───────┘          └────────┬──────┘│
                     │            │                           │       │
                     │            └────────────┬──────────────┘       │
                     │                         │ HttpClient (timeout) │
                     │                         ▼                      │
                     │   ┌──────────────────────────────────────┐     │
                     │   │  FileLogger ─► logs/sms.log (JSONL)  │     │
                     │   │  StatsCollector ◄── records          │     │
                     │   │  StatsCronJob   ──► every 5 min      │     │
                     │   └──────────────────────────────────────┘     │
                     └─────────────────────┬──────────────────────────┘
                                           │ HTTP
                                           ▼
                     ┌────────────────────────────────────────────────┐
                     │             SMSProvider (4001)                 │
                     │   POST /provider-a/send   { phoneNumber, msg } │
                     │   GET  /provider-b/send?to=...&text=...        │
                     │   simulate(): latency + random failure         │
                     └────────────────────────────────────────────────┘
```

### 2.2 Request flow

1. Client calls `POST /sms/send` on **MyServer**.
2. `SmsController` validates the body via Zod (E.164 phone, non-empty message).
3. `SmsService` picks a provider via `RandomProviderSelector`.
4. The chosen provider adapter (`ProviderA` or `ProviderB`) translates the
   neutral request into the provider's wire format using `HttpClient`
   (timeouts via `AbortController`).
5. On failure (timeout, network error, 5xx, or provider-reported failure),
   `SmsService` retries the same provider with exponential backoff + jitter.
6. If retries are exhausted, **failover**: the OTHER provider is tried.
7. Every attempt is logged as a JSON line to `logs/sms.log`, and stats are
   updated.
8. Every 5 minutes, `StatsCronJob` sends an SMS like
   `SMS stats: 120 sent successfully, 8 failed` to the configured number,
   reusing the same `SmsService` (so the report itself is reliable too).

### 2.3 Module map

```
my-server/src
├── api/                 HTTP boundary only (controller, routes, validation)
├── core/                Application logic (SmsService, Retry, HttpClient)
├── providers/           SmsProvider interface + adapters + registry + selector
├── logging/             Logger interface, FileLogger, ConsoleLogger, Composite
├── stats/               StatsCollector + StatsCronJob
├── config.ts            Single source of configuration (env-driven)
├── app.ts               Express app composition
└── index.ts             Composition root (DI wiring)
```

### 2.4 Key design decisions

| Concern              | Decision                                                                                       | Why                                                                                                       |
|----------------------|------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| Provider abstraction | `SmsProvider` interface + per-provider adapter classes                                          | Hides heterogeneous wire formats; adding a new provider = 1 class + 1 line in the composition root.       |
| Provider selection   | Strategy pattern (`ProviderSelector`); `RandomProviderSelector` is the default                  | Spec demands random; future strategies (round-robin, weighted, health-based) drop in without other edits. |
| Reliability          | Retry with exponential backoff + full jitter + cross-provider failover                          | Survives transient errors AND a fully-down provider. Service never crashes on upstream failures.          |
| Logging              | `Logger` interface + `FileLogger` (JSON lines) + `ConsoleLogger`, fanned out via `CompositeLogger` | Structured logs, file required by spec, console aids dev/Docker. Easy to add Loki/Datadog later.          |
| Validation           | Zod schema at the HTTP boundary                                                                | Fails fast with meaningful errors; types are inferred so the rest of the code is safe.                    |
| Configuration        | Single `config.ts` that reads env with defaults                                                 | Nothing is hardcoded; same image runs in dev/staging/prod.                                                |
| DI / wiring          | One composition root in `index.ts`                                                              | Every other module depends on interfaces — trivial to unit-test with fakes.                               |
| Crash safety         | Express error handler + `uncaughtException`/`unhandledRejection` guards + provider errors caught | Spec: "must not crash if SMSProvider is down".                                                            |

### 2.5 Reliability strategy (retry + fallback)

- **Timeouts**: every outbound HTTP call uses `AbortController` with
  `REQUEST_TIMEOUT_MS` (default 3 s).
- **Retries (same provider)**: `RETRY_MAX_ATTEMPTS` (default 3), exponential
  backoff `base * 2^(n-1)` capped at `RETRY_MAX_DELAY_MS`, with **full jitter**
  to avoid thundering herd.
- **Failover (different provider)**: when retries are exhausted on provider X,
  `SmsService` picks a different provider Y (excluded set); if all providers
  fail, it returns a structured 502 — without throwing.
- **Stats accuracy**: one *failure* is recorded per failed send (not per
  retry); one *success* per successful delivery. This keeps the cron's
  message meaningful.

---

## 3. API

### `POST /sms/send` (MyServer)

Request body:

```json
{ "phoneNumber": "+96170123456", "message": "Hello from MyServer" }
```

Responses:

| Status | Meaning                                                  | Body example                                                                  |
|-------:|----------------------------------------------------------|-------------------------------------------------------------------------------|
| 202    | Accepted by an upstream provider                          | `{"status":"accepted","provider":"provider-a","messageId":"msg_..."}`        |
| 400    | Validation error                                          | `{"error":"ValidationError","details":[{"path":"phoneNumber","message":...}]}`|
| 502    | All providers failed after retries                        | `{"status":"failed","provider":"provider-b","error":"timeout after 3000ms"}` |

### Provider service (4001)

- `POST /provider-a/send` body `{ phoneNumber, message }` →
  `200 {status:"sent",messageId}` or `502 {status:"failed",error}`.
- `GET /provider-b/send?to=...&text=...` →
  `200 {result:"success",id}` or `502 {result:"failure",reason}`.

---

## 4. Configuration

All values are environment-driven (see `my-server/src/config.ts` and
`sms-provider/src/config.ts`):

| Variable                | Default                  | Purpose                                  |
|-------------------------|--------------------------|------------------------------------------|
| `PORT`                  | 4000 / 4001              | Listening port                           |
| `SMS_PROVIDER_BASE_URL` | `http://localhost:4001`  | Where MyServer reaches SMSProvider       |
| `REQUEST_TIMEOUT_MS`    | 3000                     | Outbound HTTP timeout                    |
| `RETRY_MAX_ATTEMPTS`    | 3                        | Retries per provider                     |
| `RETRY_BASE_DELAY_MS`   | 200                      | Exponential backoff base                 |
| `RETRY_MAX_DELAY_MS`    | 2000                     | Backoff cap                              |
| `LOG_FILE_PATH`         | `logs/sms.log`           | Structured JSON-line log file            |
| `STATS_CRON`            | `*/5 * * * *`            | Cron expression                          |
| `STATS_TARGET_PHONE`    | `+96170000000`           | Stats recipient                          |
| `STATS_ENABLED`         | `true`                   | Disable cron in tests                    |
| `FAILURE_RATE`          | `0.2`                    | (provider) probability of simulated fail |

---

## 5. Adding a new provider (extensibility check)

1. Create `my-server/src/providers/MyNewProvider.ts` implementing `SmsProvider`.
2. Register it in `my-server/src/index.ts`:
   ```ts
   registry.register(new MyNewProvider(http, '...'));
   ```
   That's it. No other change needed:
   - Random selection automatically includes it.
   - Retry + failover automatically apply.
   - Logging + stats automatically include it.

---

## 6. Assumptions

- No persistence (in-memory stats reset on restart) — explicitly out of scope.
- No auth/authz — explicitly out of scope.
- Phone numbers must be E.164 (`+` followed by 8–15 digits).
- "Random selection" is uniform over registered providers.
- Stats counters are cumulative since process start (the spec example
  `"120 sent successfully, 8 failed"` reads as cumulative).
- A "failed send" = all providers failed after retries; we count one failure
  per send, not per retry attempt.
- The stats SMS uses the same `SmsService`, so it is itself logged and
  counted (it is genuinely sent through a provider).

---

## 7. What's covered

- [x] Two microservices, Node.js + TypeScript
- [x] Provider A `POST /provider-a/send` and Provider B `GET /provider-b/send`
- [x] Random provider selection on the server side
- [x] Graceful handling of provider failures (timeouts, errors, invalid responses)
- [x] Service does not crash if SMSProvider is down
- [x] File logging with provider, phone, message, status, timestamp, errors
- [x] Stats cron every 5 minutes to a configurable phone number
- [x] Retry with exponential backoff + jitter, plus cross-provider failover
- [x] Input validation with meaningful errors
- [x] Configurable via env (no hardcoded values)
- [x] Docker / Docker Compose
- [x] Unit tests for retry, SmsService (success/failover/all-fail), validation
- [x] Structured (JSON) logging
- [x] Clean separation of concerns + provider abstraction designed for extensibility
