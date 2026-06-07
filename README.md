# PC Games List

App Angular per gestire la lista dei tuoi giochi PC, con Google Sheets come database e autenticazione Google.

---

## Setup Google Cloud Console (~10 min)

1. Vai su [console.cloud.google.com](https://console.cloud.google.com)
2. Crea un nuovo progetto (es. `pc-game-library`)
3. **API & Services → Library** → abilita:
    - **Apps Script API**
    - **Google Drive API**
    - **Google Sheets API**
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

## Setup Apps Script
Dal sito di [App Script API](https://script.google.com/)

1. Nuovo progetto (rinominalo)
1. Impostazioni progetto
    - Abilita *'Mostra il file manifest "appscript.json" nell'editor'*.
    - Cambia progetto, specificando il numero Progetto di Google Cloud.
1. Editor
    - Crea il file e copia il contenuto di `steamProxy.gs`
    - Copia il contenuto di `appscript.json`
1. Esegui il deployment -> Nuovo deployment. Copia il Deployment ID nella variabile steamScriptId in `environment.ts`

**P.S.**: Se si fanno modifiche allo script è necessario fare un rilascio: deployment -> Gestisci deployment -> Modifica -> Esegui il deployment.

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
  steamScriptId: 'IL_TUO_DEPLOYMENT_ID'
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
| `SHEET_NAME` | Il nome foglio su Spreadsheet |
| `STEAM_SCRIPT_ID` | L'ID dello App Script API |

Il workflow `.github/workflows/deploy.yml` inietta i secrets nel build e pubblica su `gh-pages`.

### Abilitare GitHub Pages

**Settings → Pages → Source**: seleziona branch `gh-pages`, cartella `/ (root)`.

---

## Note di sicurezza

- `environment.ts` (sviluppo locale) contiene valori reali ma non è un problema pubblicarlo: il Client ID OAuth è by design pubblico per le SPA, e lo Spreadsheet ID da solo non dà accesso al foglio privato
- `environment.prod.ts` contiene solo placeholder — i valori reali vengono iniettati solo durante il build in CI tramite GitHub Secrets e non sono mai visibili nel repository

## Future implementazioni

- Statistiche e grafici
- Modifica dati "Steam"
- Funzionalità massive (aggiornamento dati)