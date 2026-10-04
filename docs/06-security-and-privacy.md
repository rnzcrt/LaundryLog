# Security and Privacy Checklist

**Project:** LaundryLog
**Repository:** https://github.com/rnzcrt/LaundryLog
**Live application:** https://laundrylog.onrender.com
**Last reviewed:** October 4, 2026

## 1. Repository Security

| Checklist                                                          | Status     |
| ------------------------------------------------------------------ | ---------- |
| `.gitignore` excludes `.env`                                       | [x] Added  |
| `git check-ignore -v .env` confirms `.env` is ignored              | [x] Checked |
| No `.env`, `.pem`, or `id_rsa` files are tracked                   | [x] Checked |
| `.env.example` contains placeholder values only                    | [x] Added  |
| No database connection strings, passwords, or API keys are exposed | [x] Checked |
| No `student.json` or unnecessary personal information is committed | [x] No `student.json`; the author name appears in the README, docs and `LICENSE` |
| Screenshots and documentation contain no credentials               | [x] Checked; no credentials visible |

The project uses `.gitignore` to exclude local environment files and `.env.example` to document required environment variables without including actual credentials. I checked these with `git check-ignore`, `git ls-files` and a search of tracked files for connection strings and passwords.

## 2. Application Security

| Checklist                                                                    | Status                                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| SQL queries use parameterized values                                         | [x] Values go through `$1`, `$2` placeholders; dynamic `WHERE` clauses are built only from placeholders |
| Server-side validation is implemented                                        | [x] Implemented for key order, machine, add-on, and inventory operations |
| Text fields have appropriate length limits                                   | [x] Names, phones, notes, units and add-on names are limited; JSON bodies are capped at 32 KB |
| CORS is restricted to allowed origins                                        | N/A: CORS is not enabled; the frontend and API are served from the same origin |
| Production environment is configured on Render                               | [ ] Not verified: check `NODE_ENV` in the Render dashboard |
| Error responses avoid exposing stack traces                                  | [x] Unexpected errors return a generic 500; details go to the server log only |
| Helmet is installed and configured                                           | No: Helmet is not used. Security headers are set manually in `src/app.js` (`nosniff`, a Content Security Policy, `x-powered-by` disabled) |
| Sensitive or costly endpoints are rate limited                               | No: not implemented; listed as a limitation |
| Passwords are securely hashed, if user accounts are supported                | N/A: no user accounts; one shared login whose credentials are environment variables |
| Data-access routes enforce ownership checks, if multiple users are supported | N/A: single shared login, no per-user data |
| `npm audit` has been run and reviewed                                        | [x] `npm audit --omit=dev` reported 0 vulnerabilities |

### Validation and Error Handling

LaundryLog includes backend validation for important operations, including order workflow transitions, machine assignment, machine capacity, add-ons, and inventory product selection.

Server-side validation is important because requests can be sent directly to the API without using the frontend. The backend rejects invalid values and returns JSON error responses (400 for bad input, 413 for oversized bodies, 409 for conflicts).

### Database Security

The application uses PostgreSQL. SQL queries use parameterized values to reduce the risk of SQL injection. Database credentials are stored in environment variables and are not committed to the public repository.

### Deployment Security

The application is hosted on Render. Still to confirm in the Render dashboard: the production `NODE_ENV` setting. The app sets its own security headers and does not enable CORS.

## 3. Privacy

| Checklist                                                          | Status     |
| ------------------------------------------------------------------ | ---------- |
| Seed data is invented and does not identify real customers         | [x] Seed customers use made-up names and 555 phone numbers |
| No real classmates' names, numbers, emails, or photos are included | [ ] To do: remove test customers with real-looking data from the live database |
| Real testers' personal information has been removed                | [ ] To do: see above |
| Screenshots and demo video do not expose personal information      | [ ] To do: retake the screenshots after the data is cleaned |
| The app explains what personal information it collects             | [x] README section 10 explains it; the app collects customer name, phone and notes |
| Only necessary customer information is collected                   | [x] Name, phone and optional notes only |
| No unnecessary personal information is stored in logs              | [x] Request logs record method, path, status and time only |

LaundryLog manages customer and order information. The project should use fictional customer details in seed data, screenshots, and the demonstration video. Any personal information collected during testing should be removed before public submission unless there is a valid reason and appropriate consent to retain it.

The project should clearly explain what customer information is collected and why. Only information necessary for managing laundry orders should be retained.

## 4. Known Risks and Trade-offs

* **Customer information:** The application stores customer and order details. These records should be fictional for the public course demonstration.
* **Public deployment:** The application is accessible through a public URL. Access controls and deployment configuration should be reviewed to prevent unauthorized changes.
* **Authentication:** Basic authentication using environment variables was added during development. Its current production configuration and coverage across routes should be verified.
* **Database hosting:** The hosted PostgreSQL database uses a free tier with a stated expiry date of October 19, 2026. The database should be migrated or upgraded before that date to avoid losing access to the hosted data.

## 5. Security Reflection

The main privacy risk in LaundryLog is the customer information stored with orders, especially because the application is publicly deployed. I used environment variables for configuration and added backend validation and authentication during development. I will use fictional customer data in the public demonstration and review the repository and deployment settings before submission. One trade-off is that this is a course project rather than a fully hardened commercial system, so its authentication, access controls, and privacy protections still need to be reviewed before it is used with real customer information.
