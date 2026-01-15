export const environment = {
  production: true,
  // Pridal som /api na koniec, ak tvoj backend tie cesty takto má
  apiUrl: 'https://fitmind-production-21d5.up.railway.app/api',

  // TOTO JE PROBLÉM: localhost na webe nebude fungovať
  llamaApiUrl: 'https://fitmind-production-21d5.up.railway.app/api/generate', // Skús to smerovať cez tvoj Railway backend
  llamaModel: 'llama3.2:3b'
};