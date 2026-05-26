# Cohort Management Web Application

## Running in Development

This project was built and tested with Node.js `22.14.0`.

Install dependencies from the repository root:

```bash
npm install
```

Run the backend API:

```bash
npm run dev -w server
```

The API runs on `http://localhost:3000`. Swagger UI is available at `http://localhost:3000/api/docs`.

Run the frontend in a separate terminal when you want to test the full application:

```bash
npm run dev -w client
```

The React app runs on `http://localhost:5173` and proxies `/api` requests to the backend on port `3000`.

There is intentionally no root `dev` script that starts both apps together. Run only the workspace you need while developing, or run both manually when testing the full UI flow.

## API Error and Edge Case Strategy

For the current in-memory V1 scope, the API handles the obvious request and business-rule edge cases.

API responses use a consistent error shape:

```json
{
  "message": "Human-readable error.",
  "details": {}
}
```

`details` is optional and is mainly used for tsoa validation errors.

### Request Validation

- Missing or incorrectly typed request fields are rejected by tsoa with `422 Validation failed`.
- Malformed JSON request bodies return `400 Malformed JSON request body`.
- Unknown `/api` routes return `404 API route not found`.
- Unexpected failures return `500 Unexpected server error`.

### Business Rules

- Waiting list capacity must be a positive integer.
- Take count must be a non-negative integer.
- Adding creators requires complete creator records: `name`, `email_address`, `phone_number`, and `course_type`.
- Blank required creator fields are rejected.
- Taking more creators than are waiting is allowed; the API removes only the available creators.
- Taking zero creators is allowed as a no-op.
- Taking creators always removes from the oldest cohort first.
- Adding creators fills the oldest cohort with available space first, then creates new cohorts as needed.
- Removing a specific creator requires a removal reason.
- Removing a missing or already-removed creator returns `404`.
- Removed creator-cohort records keep `removed_at` and `removal_reason`.

Not covered in V1: authentication, authorization, persistence, cross-process concurrency, idempotency, rate limiting,
and audit logging beyond the in-memory removal fields.

## Frontend UI/UX Impact

- The frontend shows API and validation failures in an "Action needed" alert instead of silently failing.
- Successful actions refresh the waiting list and show a short confirmation message.
- The cohort view always displays cohorts newest-to-oldest, with the oldest cohort marked as the next one served.
- When users take more creators than are waiting, the UI reports the actual number removed.
- Taking zero creators leaves the list unchanged and reports zero removed.
- Resetting the waiting list clears the visible waiting state and recently removed creators.
- Recently removed creators stay visible in the current browser session so users can confirm who was removed and why.
