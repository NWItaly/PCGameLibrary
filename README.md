# PC Games List

App Angular per gestire la lista dei tuoi giochi PC, con Google Sheets come database e autenticazione Google.

---

## Setup Google Cloud Console (~10 min)

1. Vai su [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un nuovo progetto (es. `pc-game-library`)
3. **API & Services → Library** → abilita **Google Sheets API**
4. **API & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:4200`
     - `https://TUO-USERNAME.github.io`
5. Copia il **Client ID**
6. **OAuth consent screen** → modalità External, aggiungi te stesso come test user

---

## Setup Google Sheet

TODO: Generazione di un template

---

## Sviluppo locale con Docker

Non serve installare Node.js sul PC. E' sufficiente Docker Desktop.

**1.** Configura `src/environments/environment.ts` con i valori reali:

```ts
export const environment = {
  production: false,
  googleClientId: 'IL_TUO_CLIENT_ID.apps.googleusercontent.com',
  spreadsheetId: 'IL_TUO_SPREADSHEET_ID',
  sheetName: 'Sheet1',
};
```

**2.** Avvia il container:

```bash
docker compose up
```

L'app è disponibile su `http://localhost:4200` con live reload.

**3.** Per fermare:

```bash
docker compose down
```

---

## Deploy su GitHub Pages

Il deploy è **automatico** a ogni push su `main` tramite GitHub Actions.

### Configurazione secrets (una tantum)

Nel repository GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Nome | Valore |
|------|--------|
| `GOOGLE_CLIENT_ID` | Il tuo Client ID OAuth |
| `SPREADSHEET_ID` | L'ID del tuo foglio Google |

Il workflow `.github/workflows/deploy.yml` inietta i secrets nel build e pubblica su `gh-pages`.

### Abilitare GitHub Pages

**Settings → Pages → Source**: seleziona branch `gh-pages`, cartella `/ (root)`.

---

## Note di sicurezza

- `environment.ts` (sviluppo locale) contiene valori reali ma non è un problema pubblicarlo: il Client ID OAuth è by design pubblico per le SPA, e lo Spreadsheet ID da solo non dà accesso al foglio privato
- `environment.prod.ts` contiene solo placeholder — i valori reali vengono iniettati solo durante il build in CI tramite GitHub Secrets e non sono mai visibili nel repository
