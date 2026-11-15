# Security, CA trust & LAN access — React librespot client

- The media-server mode talks to a self-hosted server over **HTTPS on the LAN** (e.g. `https://192.168.1.11:8000`); the server certificate is usually issued by a private CA.
- `android/app/src/main/res/xml/network_security_config.xml` trusts the **system** and **user** CA stores and permits cleartext, so a user-installed CA (mkcert or your own) works out of the box:
  - Install the CA once on the phone: **Settings → Security → Install a certificate → CA certificate**, pick `rootCA.pem`.
  - The CA is long-lived, so this survives every server-cert reissue and every app update.
- **Personal/CI builds:** `android/app/src/personal/res/` (gitignored) overlays a trust anchor for the owner's local CA (`res/raw/respotit_ca.pem`) so the app reaches the self-hosted HTTPS server with no user CA install. Public/CI builds omit the overlay.
- The server certificate must cover the PC's LAN IP — reissue the leaf with the current IP in the SAN list (`scripts/local-certs.sh <ip>` in the server repo); no app rebuild is needed.
- **Firewall/port:** allow inbound TCP on the chosen port and forward Docker's published port to the LAN if it is bound to loopback only (`netsh interface portproxy`).
- The librespot credentials live in private SharedPreferences; `.env`, `android/keystore.properties` and `*.keystore` are gitignored. Tokens, audio keys and signed CDN URLs are never logged or committed.
- The **phone-storage vault** writes the Spotify refresh token, the server JWT and the librespot credentials in plaintext to `Documents/reSpotIt` / `Android/media/com.spotifydashboard.app.ts/reSpotIt` so a reinstall can restore them (see [`FEATURES.md`](FEATURES.md#-phone-storage-vault-data-survives-a-reinstall)). Those copies are local-only and never committed.
