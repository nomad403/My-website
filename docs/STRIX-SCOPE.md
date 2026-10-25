# Périmètre de l'audit local

Audit the supplied local Next.js source repository. Focus on route handlers,
input validation, authentication and authorization where present, injection,
XSS, accidental secret exposure, and abuse of the contact form.

Run any dynamic verification against an isolated local instance using test
data and mocked external services. Do not test the deployed website or any
third-party service. Do not send real emails through Resend, use AWS services,
or use production credentials. Do not read local .env files, .aws, .codex,
.agents, .git, node_modules, .next, .tools, or existing strix_runs reports.

Report findings with file locations, impact, reproduction steps, and proposed
remediation. Do not modify the original working tree.
