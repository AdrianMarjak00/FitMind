/**
 * Databáza pohybových aktivít. MET = násobok pokojového výdaja energie;
 * spálené kcal ≈ MET × hmotnosť (kg) × čas (h).
 */

export interface ActivityItem {
  name: string;
  aliases: string[];
  met: number;
  /** Predvolené trvanie v minútach, keď ho používateľ neuvedie. */
  defaultMin: number;
  /** Bežné tempo v km/h – na prepočet "5 km" na minúty. */
  speed?: number;
}

function a(name: string, aliases: string, met: number, defaultMin: number, speed?: number): ActivityItem {
  return { name, aliases: aliases.split('|'), met, defaultMin, speed };
}

export const ACTIVITIES: ActivityItem[] = [
  a('Beh', 'beh|behat|behal|behala|bezal|bezala|bezat|zabehal|zabehala|zabehol|zabehla|prebehol|prebehla|odbehal|odbehala|odbehol|odbehla|jogging|bezecky pas|behanie|bezkal', 9.8, 30, 10),
  a('Chôdza', 'chodza|prechadzka|prechadzal|prechadzala|kracal|kracala|isiel pesi|pesi|krokov|venčenie|venceni', 3.5, 40, 5),
  a('Turistika', 'turistika|tura|turu|vystup|vylet do hor', 6, 120, 4),
  a('Bicykel', 'bicykel|bicykloval|bicyklovala|bajk|cyklistika|bicyklovanie|na bicykli', 7.5, 45, 20),
  a('Rotopéd', 'rotoped|stacionarny bicykel|spinning', 7, 30, 22),
  a('Plávanie', 'plavanie|plaval|plavala|plavat|bazen|plavaren', 7, 40),
  a('Silový tréning', 'posilnovna|posilka|posilnoval|posilnovala|posilnovanie|fitko|fitnes|fitness|gym|silovy trening|cinky|cinkami|trening|cvicil|cvicila|odcvicil|odcvicila|cvicenie|workout', 5, 60),
  a('Kalistenika', 'kliky|klikov|drepy|drepov|brusaky|brusakov|zhyby|zhybov|plank|kalistenika|cvicenie s vlastnou vahou|angličáky|anglicaky', 5, 20),
  a('HIIT', 'hiit|intervalovy trening|kruhovy trening|tabata|kruhac', 9, 25),
  a('CrossFit', 'crossfit|krosfit', 9, 45),
  a('Joga', 'joga|jogu|jogy|yoga', 2.8, 45),
  a('Pilates', 'pilates', 3, 45),
  a('Strečing', 'strecing|stretching|natahovanie|rozcvicka|mobilita', 2.3, 15),
  a('Futbal', 'futbal|futbale|fotbal|futsal', 8, 60),
  a('Basketbal', 'basketbal|basket', 7, 60),
  a('Volejbal', 'volejbal', 4, 60),
  a('Hokej', 'hokej|florbal|hokejbal', 8, 60),
  a('Tenis', 'tenis', 7, 60),
  a('Bedminton', 'bedminton|badminton', 5.5, 45),
  a('Squash', 'squash|skvos', 9, 45),
  a('Stolný tenis', 'stolny tenis|pingpong|ping pong', 4, 45),
  a('Tanec', 'tanec|tancoval|tancovala|tancovanie|zumba|aerobik', 5.5, 45),
  a('Box', 'box|boxoval|boxovala|kickbox|bojove sporty|mma|karate|judo', 9, 45),
  a('Švihadlo', 'svihadlo|skakanie cez svihadlo', 11, 10),
  a('Korčuľovanie', 'korculovanie|korculoval|korculovala|korcule|inline', 7, 45, 14),
  a('Lyžovanie', 'lyzovanie|lyzoval|lyzovala|lyzovacka|snowboard|bezky', 6, 120),
  a('Veslovanie', 'veslovanie|veslar|trenazer veslovaci', 7, 20),
  a('Eliptický trenažér', 'eliptical|orbitrek|elipticky trenazer|stepper', 6, 30),
  a('Lezenie', 'lezenie|lezecka stena|boulder|bouldering', 8, 60),
  a('Práca v záhrade', 'zahrada|kosenie|rylovanie|upratovanie|upratoval|upratovala', 3.8, 60)
];
