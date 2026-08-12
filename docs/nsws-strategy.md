# NSWS adapter strategy

Strategy: `COOKIE_API`

Contract: authenticated NUS web API

Evidence:

- Observed request: `POST https://inetapps.nus.edu.sg/nsws/api/v1/job/getall` with pagination and search filters.
- Auth source: the NSWS Angular application stores its short-lived bearer token in the current tab's `sessionStorage` under `auth_info`.
- Replay result: HTTP 200, `application/json`, with non-empty pagination metadata and structured job rows.

The adapter navigates the persistent OpenCLI tab to NSWS, reads the in-memory token, and performs the read-only request from Node. It never persists or outputs the token. Missing or rejected authentication becomes `AuthRequiredError`; invalid filters, empty searches, and runtime failures use their corresponding OpenCLI typed errors.

The endpoint is an internal web API rather than a separately documented public API. Its request and response shapes are therefore covered by unit tests and live OpenCLI validation.
