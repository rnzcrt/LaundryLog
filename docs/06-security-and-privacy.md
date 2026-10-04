# Security and Privacy Checklist

**Project:** LaundryLog
**Repository:** https://github.com/rnzcrt/LaundryLog
**Live application:** https://laundrylog.onrender.com
**Last reviewed:** October 2026

## 1. Repository Security

| Checklist                                                          | Status     |
| ------------------------------------------------------------------ | ---------- |
| `.gitignore` excludes `.env`                                       | [x] Added  |
| `git check-ignore -v .env` confirms `.env` is ignored              | [ ] Verify |
| No `.env`, `.pem`, or `id_rsa` files are tracked                   | [ ] Verify |
| `.env.example` contains placeholder values only                    | [x] Added  |
| No database connection strings, passwords, or API keys are exposed | [ ] Verify |
| No `student.json` or unnecessary personal information is committed | [ ] Verify |
| Screenshots and documentation contain no credentials               | [ ] Verify |

The project uses `.gitignore` to exclude local environment files and `.env.example` to document required environment variables without including actual credentials. These protections should be checked again before final submission.

## 2. Application Security

| Checklist                                                                    | Status                                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| SQL queries use parameterized values                                         | [ ] Verify all queries                                                   |
| Server-side validation is implemented                                        | [x] Implemented for key order, machine, add-on, and inventory operations |
| Text fields have appropriate length limits                                   | [ ] Verify all fields                                                    |
| CORS is restricted to allowed origins                                        | [ ] Verify configuration                                                 |
| Production environment is configured on Render                               | [ ] Verify `NODE_ENV`                                                    |
| Error responses avoid exposing stack traces                                  | [x] Error handling was improved; verify all responses                    |
| Helmet is installed and configured                                           | [ ] Verify                                                               |
| Sensitive or costly endpoints are rate limited                               | [ ] Verify                                                               |
| Passwords are securely hashed, if user accounts are supported                | N/A — verify account design                                              |
| Data-access routes enforce ownership checks, if multiple users are supported | N/A — verify account design                                              |
| `npm audit` has been run and reviewed                                        | [ ] Verify                                                               |

### Validation and Error Handling

LaundryLog includes backend validation for important operations, including order workflow transitions, machine assignment, machine capacity, add-ons, and inventory product selection.

Server-side validation is important because requests can be sent directly to the API without using the frontend. The backend should reject invalid values and return appropriate error responses.

### Database Security

The application uses PostgreSQL. SQL queries should use parameterized values to reduce the risk of SQL injection. Database credentials should be stored in environment variables and should not be committed to the public repository.

### Deployment Security

The application is hosted on Render. Before final submission, verify the production environment settings, CORS configuration, security headers, and error responses in the deployed application.

## 3. Privacy

| Checklist                                                          | Status     |
| ------------------------------------------------------------------ | ---------- |
| Seed data is invented and does not identify real customers         | [ ] Verify |
| No real classmates' names, numbers, emails, or photos are included | [ ] Verify |
| Real testers' personal information has been removed                | [ ] Verify |
| Screenshots and demo video do not expose personal information      | [ ] Verify |
| The app explains what personal information it collects             | [ ] Verify |
| Only necessary customer information is collected                   | [ ] Review |
| No unnecessary personal information is stored in logs              | [ ] Verify |

LaundryLog manages customer and order information. The project should use fictional customer details in seed data, screenshots, and the demonstration video. Any personal information collected during testing should be removed before public submission unless there is a valid reason and appropriate consent to retain it.

The project should clearly explain what customer information is collected and why. Only information necessary for managing laundry orders should be retained.

## 4. Known Risks and Trade-offs

* **Customer information:** The application stores customer and order details. These records should be fictional for the public course demonstration.
* **Public deployment:** The application is accessible through a public URL. Access controls and deployment configuration should be reviewed to prevent unauthorized changes.
* **Authentication:** Basic authentication using environment variables was added during development. Its current production configuration and coverage across routes should be verified.
* **Database hosting:** The hosted PostgreSQL database uses a free tier with a stated expiry date of October 19, 2026. The database should be migrated or upgraded before that date to avoid losing access to the hosted data.

## 5. Security Reflection

The main privacy risk in LaundryLog is the customer information stored with orders, especially because the application is publicly deployed. I used environment variables for configuration and added backend validation and authentication during development. I will use fictional customer data in the public demonstration and review the repository and deployment settings before submission. One trade-off is that this is a course project rather than a fully hardened commercial system, so its authentication, access controls, and privacy protections still need to be reviewed before it is used with real customer information.
