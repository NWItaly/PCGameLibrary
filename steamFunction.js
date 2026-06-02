// Funzione per aggiornare i dati nel foglio
function main() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  const colNome = data[0].indexOf('Gioco') + 1;
  const colAppId = data[0].indexOf('SteamId') + 1;
  const colCategories = data[0].indexOf('Caratteristiche') + 1;
  const colGenres = data[0].indexOf('Genere') + 1;
  const colItaliano = data[0].indexOf('In Italiano') + 1;
  const colVr = data[0].indexOf('VR') + 1;
  const colReleaseDate = data[0].indexOf('Data rilascio') + 1;
  const colImageUrl = data[0].indexOf('ImageUrl') + 1;
  const colImage = data[0].indexOf('Immagine') + 1;
  const colRating = data[0].indexOf('Rating') + 1;
  const colError = data[0].indexOf('Errore') + 1;

  let indexStart = 2;
  let maxRow = 3000;
  let indexEnd = Math.min(sheet.getMaxRows(), indexStart + maxRow);
  const elaboraRigheConErrore = true;
  const escludiRigheConImmagine = true;

  for (let i = indexStart; i <= indexEnd; i++) {
    const gameName = data[i - 1][colNome - 1];
    try {
      const appId = data[i - 1][colAppId - 1];
      const immagine = data[i - 1][colImageUrl - 1];
      const rating = data[i - 1][colRating - 1];
      const errore = data[i - 1][colError - 1];
      sheet.getRange(i, colError).setValue('');

      if (appId > 0 && (immagine.length === 0 || !escludiRigheConImmagine || (elaboraRigheConErrore && errore.length > 0))) {
        //let data = appId > 0 ? getSteamDataByAppId(appId) : getSteamData(gameName);
        const data = getSteamDataByAppId(appId);

        if (data) {
          sheet.getRange(i, colAppId).setValue(data.appId ?? '');
          sheet.getRange(i, colCategories).setValue(data.categories ?? '');
          sheet.getRange(i, colGenres).setValue(data.genres ?? '');
          sheet.getRange(i, colItaliano).setValue(data.hasItalian ? 'Sì' : 'No');
          sheet.getRange(i, colVr).setValue(data.categories?.indexOf('VR Only') > 0 ? 'Sì' : 'No');
          sheet.getRange(i, colReleaseDate).setValue(data.releaseDate);
          sheet.getRange(i, colImageUrl).setValue(data.image?.length > 0 ? data.image : 'N/A');
          //sheet.getRange(i, colImage).setValue(data.image?.length > 0 ? `=IMAGE(P"${i}")` : 'N/A');
          if (data.image?.length > 0) {
            sheet.setRowHeight(i, 72);//Se c'è l'immagine alzo la riga affinché si veda meglio
          }
          console.log(`Riga ${i}; Gioco: '${gameName}'; elaborato.`);
        }
        else {
          sheet.getRange(i, colError).setValue('Data not found');
          console.log(`Riga ${i}; Gioco: '${gameName}'; dati non trovati.`);
        }
        //} else if(immagine.length !== 0 && sheet.getRowHeight(i) !== 50){
      } else {
        //sheet.setRowHeight(i, 50);
        console.log(`Riga ${i}; Gioco: '${gameName}'; non elaborato.`);
      }

      // Cerco il rating
      //if (appId > 0 && rating.toString().length === 0) {
      //  sheet.getRange(i, colRating).setValue(fetchSteamPegi(appId));
      //}
    }
    catch (err) {
      sheet.getRange(i, colError).setValue(err.message);
      console.error(`Riga ${i}; Gioco: '${gameName}'; errore: '${err.message}'`);
    }
  }
}

const apiKey = 'Da Modificare';

// Funzione per ottenere dati da Steam API
function getSteamData(gameName) {
  const url = 'https://api.steampowered.com/ISteamApps/GetAppList/v2/';
  const response = UrlFetchApp.fetch(url);
  const appList = JSON.parse(response.getContentText()).applist.apps;

  for (let i = 0; i < appList.length; i++) {
    if (appList[i].name.toLowerCase() === gameName.toLowerCase()) {
      let appId = appList[i].appid;
      return getSteamDataByAppId(appId);
    }
  }
  return null;
}

function getSteamDataByAppId(appId) {
  let appDetailsUrl = 'https://store.steampowered.com/api/appdetails?appids=' + appId + '&key=' + apiKey;
  let appDetailsResponse = UrlFetchApp.fetch(appDetailsUrl);
  let appData = JSON.parse(appDetailsResponse.getContentText())[appId].data;
  if (!appData) {
    return null;
  }
  else {
    return {
      appId: appData.steam_appid
      , releaseDate: convertDateToItalian(appData.release_date?.date) ?? null
      , image: appData.header_image ?? ''
      , hasItalian: appData.supported_languages?.indexOf('Italian') > 0 || false
      , categories: appData.categories?.reduce((prev, current) => prev + (prev.length > 0 ? ', ' : '') + current.description, '') || ''
      , genres: appData.genres?.reduce((prev, current) => prev + (prev.length > 0 ? ', ' : '') + current.description, '') || ''
    };
  }
}

// Funzione per convertire la data
function convertDateToItalian(dateString) {
  // Crea un oggetto data dal formato inglese
  let date = new Date(dateString);

  // Array dei mesi in italiano
  let months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  // Ottieni il giorno, mese e anno dalla data
  let day = date.getDate();
  let month = ('00' + (date.getMonth() + 1)).slice(-2); //;months[date.getMonth()];
  let year = date.getFullYear();

  // Restituisci la data nel formato italiano
  return day + '/' + month + '/' + year;
}