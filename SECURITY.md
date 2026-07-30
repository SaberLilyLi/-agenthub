# Secret handling

Production secrets must be injected by the deployment platform's secret manager,
not committed to the repository or supplied as Docker build arguments.

The service refuses to start without a non-placeholder `PAYLOAD_SECRET` of at
least 32 characters and a database connection string. Tencent credentials may be
passed as environment variables for local development, or mounted as files using
`TENCENT_SECRET_ID_FILE` and `TENCENT_SECRET_KEY_FILE` in production. The same
`_FILE` form is supported for `PAYLOAD_SECRET`.

Before the next deployment, rotate the previous Payload secret, PostgreSQL
password, and Tencent CAM key if they have ever been used outside a protected
secret store. Rotating `PAYLOAD_SECRET` invalidates existing sessions.
