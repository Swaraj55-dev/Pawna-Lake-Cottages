# Pawna Lake Cottages

## Security rules

- Calculate prices and booking totals on the server; never trust amounts supplied by the client.
- Keep row-level security enabled on every database table and add appropriate policies in migrations.
- Check authentication and the admin email allow-list in every admin route, Server Action and data handler; a proxy redirect is not authorization.
- Never put secrets in `NEXT_PUBLIC_*` variables or expose server credentials to browser code.
- Add a focused regression test for every security fix.
