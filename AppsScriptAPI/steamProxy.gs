// steamProxy.gs
// Invocato tramite Apps Script Execution API:
//   POST https://script.googleapis.com/v1/scripts/{scriptId}:run
// Body: { "function": "getSteamData", "parameters": ["1091500"] }

/**
 * Punto di ingresso chiamato dall'Execution API.
 * @param {string} appId — Steam App ID come stringa
 * @returns {{ appId, genres, features, italianSupport, vR, releaseDate, image, requiredAge }}
 */
function getSteamData(appId) {
  if (!appId || isNaN(parseInt(appId))) {
    throw new Error('Parametro appId mancante o non valido');
  }
  const data = fetchSteamData(parseInt(appId));
  if (!data) {
    throw new Error('Nessun dato trovato per appId ' + appId);
  }
  return data;
}

/**
 * Chiama l'API Steam appdetails e restituisce i campi necessari all'app Angular.
 *
 * @param {number} appId
 * @returns {object|null}
 */
function fetchSteamData(appId) {
  const url = 'https://store.steampowered.com/api/appdetails?appids=' + appId;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

  if (response.getResponseCode() !== 200) {
    throw new Error('Steam ha risposto con HTTP ' + response.getResponseCode());
  }

  const json = JSON.parse(response.getContentText());
  const gameData = json[appId];

  if (!gameData?.success || !gameData?.data) {
    return null;
  }

  const d = gameData.data;

  return {
    appId:          d.steam_appid,
    genres:         d.genres?.map(function(g) { return g.description; }) ?? [],
    features:       d.categories?.map(function(c) { return c.description; }) ?? [],
    italianSupport: d.supported_languages?.indexOf('Italian') >= 0 ? 'Sì' : 'No',
    vR:             d.categories?.some(function(c) { return c.description === 'VR Only'; }) ? 'Sì' : 'No',
    releaseDate:    convertDateToItalian(d.release_date?.date),
    image:          d.header_image ?? '',
    requiredAge:    d.required_age ? String(d.required_age) : '',
  };
}

/**
 * Converte una stringa data inglese in formato italiano gg/mm/aaaa.
 *
 * @param {string|undefined} dateString
 * @returns {string}
 */
function convertDateToItalian(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day   = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year  = date.getFullYear();
  return day + '/' + month + '/' + year;
}