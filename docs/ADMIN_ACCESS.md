# LAZA Admin Panel access

The Admin Panel is protected by server-side credential validation and an
eight-hour HttpOnly session cookie. Anonymous requests to
`/api/admin/session` return HTTP 401.

The credential configuration is stored outside the repository at:

`D:\LAZA_DATA\config\laza-admin-auth.json`

Only the PBKDF2 salt and password hash are stored. The clear-text password is
not written to the project or configuration file.

The API supports both the original single-administrator format and the current
multi-user test format.

## Generate the LAZA test users

Run this from the project root to create the first controlled test profiles:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\admin\Set-LazaTestUsers.ps1
```

The script creates:

| Username | Role | Current purpose |
| --- | --- | --- |
| `admin` | `admin` | Full Admin Panel validation |
| `reviewer` | `reviewer` | Data quality, pipeline and catalog review persona |
| `portal-demo` | `portal_tester` | Public portal/subscription validation persona |

The generated passwords are printed once in the terminal. Store them securely
before closing the window.

Today, the Admin Panel uses the authenticated session to grant access to the
protected operational views. Fine-grained permission enforcement by role,
subscription, or data domain is planned separately under LAZA-044.

## Reset the administrator credential

Run the reset script from the project root. Omitting `Password` generates a
new strong password and prints it once:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\admin\Set-LazaAdminCredential.ps1 `
  -Username admin
```

Restart `LAZA Production Site` after changing the credential. Existing
sessions are held in memory and are invalidated whenever the API restarts.

After five failed attempts from the same client within fifteen minutes, new
login attempts are temporarily blocked for the remainder of that window.
