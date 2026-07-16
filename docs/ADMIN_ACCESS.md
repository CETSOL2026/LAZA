# LAZA Admin Panel access

The Admin Panel is protected by server-side credential validation and an
eight-hour HttpOnly session cookie. Anonymous requests to
`/api/admin/session` return HTTP 401.

The credential configuration is stored outside the repository at:

`D:\LAZA_DATA\config\laza-admin-auth.json`

Only the PBKDF2 salt and password hash are stored. The clear-text password is
not written to the project or configuration file.

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
