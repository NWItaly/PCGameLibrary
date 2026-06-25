/**
 * Punto di ingresso chiamato dall'Execution API.
 * Restituisce il JSON grezzo di Steam per l'appId richiesto.
 * Il mapping dei campi è responsabilità dell'app Angular.
 *
 * @param {string} appId — Steam App ID come stringa
 * @returns {object} — dati grezzi restituiti da Steam appdetails
 */
function getSteamData(appId) {
  if (!appId || isNaN(parseInt(appId))) {
    throw new Error('Parametro appId mancante o non valido');
  }
  console.log(`appId: ${appId}`);

  const url = 'https://store.steampowered.com/api/appdetails?cc=it&l=italian&appids=' + appId;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

  if (response.getResponseCode() !== 200) {
    throw new Error('Steam ha risposto con HTTP ' + response.getResponseCode());
  }

  const json = JSON.parse(response.getContentText());
  const gameData = json[appId];

  if (!gameData?.success || !gameData?.data) {
    throw new Error('Nessun dato trovato per appId ' + appId);
  } else {
    console.info(json);
  }
  

  return gameData.data;
}

function searchSteamGames(term) {
  const url = `https://store.steampowered.com/search/results/?` +
    `term=${encodeURIComponent(term)}&json=1&cc=it&l=italian&category1=998`; // category1=998 = solo giochi
  
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    return { success: false, results: [] };
  }
  
  const data = JSON.parse(response.getContentText());
  const items = (data.items || []).map(item => {
    // estrai appId dall'URL del logo
    const match = item.logo ? item.logo.match(/steam\/\w+\/(\d+)/) : null;
    return {
      appId: match ? match[1] : null,
      name:  item.name,
      logo:  item.logo,
      price: item.price  // stringa già localizzata
    };
  }).filter(i => i.appId !== null);
  
  return { success: true, results: items };
}