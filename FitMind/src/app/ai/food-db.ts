/**
 * Databáza jedál a nápojov pre FitMind AI engine.
 * Hodnoty sú orientačné priemery na 100 g (pri nápojoch na 100 ml).
 */

export interface FoodItem {
  name: string;
  /** Aliasy bez diakritiky – porovnávajú sa cez stemmer. */
  aliases: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  /** Bežná porcia v gramoch / ml. */
  portion: number;
  /** Hmotnosť jedného kusu (ak dáva zmysel počítať na kusy). */
  piece?: number;
  /** Hmotnosť plátku / kúska (pizza, šunka). */
  slice?: number;
  /** Množstvo, keď je to len príloha ("káva s mliekom"). */
  side?: number;
  drink?: boolean;
}

interface Opts { pc?: number; sl?: number; sd?: number; d?: boolean; }

function f(
  name: string, aliases: string, kcal: number, protein: number, carbs: number,
  fats: number, portion: number, o: Opts = {}
): FoodItem {
  return {
    name, aliases: aliases.split('|'), kcal, protein, carbs, fats, portion,
    piece: o.pc, slice: o.sl, side: o.sd, drink: o.d
  };
}

export const FOODS: FoodItem[] = [
  // --- Vajcia a mliečne výrobky ---
  f('Vajce', 'vajce|vajcia|vajec|vajicko|vajicka|vajicok|varene vajce|varene vajcia', 143, 12.6, 0.7, 9.5, 55, { pc: 55 }),
  f('Praženica', 'prazenica|miesane vajcia|miesanych vajec|volske oko|volske oka|omeleta', 170, 11.5, 1.5, 13, 150),
  f('Hemendex', 'hemendex|ham and eggs|vajcia so slaninou', 200, 13, 1, 16, 180),
  f('Mlieko', 'mlieko|polotucne mlieko', 47, 3.3, 4.8, 1.5, 250, { d: true, sd: 30 }),
  f('Biely jogurt', 'jogurt|biely jogurt', 62, 4.5, 5, 3, 150, { pc: 150 }),
  f('Grécky jogurt', 'grecky jogurt|skyr', 75, 9.5, 4, 2, 150, { pc: 150 }),
  f('Ovocný jogurt', 'ovocny jogurt|jahodovy jogurt', 95, 3.5, 14, 2.5, 150, { pc: 150 }),
  f('Tvaroh', 'tvaroh|tvaroh mäkky|nizkotucny tvaroh', 85, 13, 4, 2, 125, { pc: 250 }),
  f('Cottage cheese', 'cottage|cottage cheese', 98, 11, 3.4, 4.3, 150, { pc: 180 }),
  f('Syr eidam', 'syr|eidam|tvrdy syr|gouda|ementaler', 330, 26, 1, 25, 40, { pc: 20 }),
  f('Mozzarella', 'mozzarella|mozarela', 250, 18, 2, 19, 60, { pc: 125 }),
  f('Bryndza', 'bryndza', 280, 18, 2, 22, 50),
  f('Parenica', 'parenica|korbacik|korbaciky|ostiepok', 300, 22, 1, 23, 50),
  f('Maslo', 'maslo', 740, 0.6, 0.6, 82, 10),
  f('Smotana', 'smotana|slahacka', 200, 2.5, 3.5, 20, 30, { sd: 20 }),
  f('Kefír', 'kefir|acidko|acidofilne mlieko|zakysanka', 50, 3.3, 4, 2, 250, { d: true }),

  // --- Mäso a ryby ---
  f('Kuracie prsia', 'kuracie prsia|kuracich prs|kuracie maso|kuracieho masa|kura|kurca|kuracina|kuracie|kuraci|kuraci steak|kuraci rezen na prirodno|kuracie platky', 160, 30, 0, 3.6, 150),
  f('Vyprážaný rezeň', 'rezen|vyprazany rezen|vyprazane rezne|rezne|snicla', 280, 20, 12, 17, 150, { pc: 150 }),
  f('Morčacie mäso', 'morcacie prsia|morcacie maso|morcacie|morka', 150, 29, 0, 3, 150),
  f('Hovädzie mäso', 'hovadzie|hovadzie maso|hovadzina|steak|biftek', 220, 26, 0, 13, 150),
  f('Bravčové mäso', 'bravcove|bravcove maso|bravcovina|bravcove karé|panenka|kotleta', 250, 25, 0, 16, 150),
  f('Mleté mäso', 'mlete maso|fasirka|fasirky|karbonatok|karbonatky', 250, 18, 5, 18, 120, { pc: 100 }),
  f('Šunka', 'sunka|sunky', 110, 18, 1.5, 3.5, 40, { pc: 15 }),
  f('Slanina', 'slanina|slaninka', 500, 14, 0.5, 50, 30),
  f('Klobása', 'klobasa|klobasy|klobaska', 330, 15, 1.5, 29, 100, { pc: 100 }),
  f('Párky', 'parok|parky|parkov|parka', 270, 12, 2, 24, 100, { pc: 50 }),
  f('Saláma', 'salama|salamy', 400, 20, 1.5, 35, 30),
  f('Losos', 'losos', 200, 20, 0, 13, 150),
  f('Tuniak', 'tuniak|tuniak v konzerve', 120, 26, 0, 1.5, 100, { pc: 120 }),
  f('Ryba', 'ryba|treska|pstruh|kapor|file|rybie file', 110, 20, 0, 3, 150),
  f('Rybie prsty', 'rybie prsty', 230, 12, 20, 11, 120, { pc: 30 }),

  // --- Prílohy a obilniny ---
  f('Ryža (varená)', 'ryza|ryze', 130, 2.7, 28, 0.3, 180),
  f('Cestoviny (varené)', 'cestoviny|cestovin|spagety|spagiet|rezance|penne', 150, 5.5, 30, 1, 220),
  f('Zemiaky (varené)', 'zemiaky|zemiakov|varene zemiaky|zemiak', 80, 2, 17, 0.1, 200, { pc: 90 }),
  f('Zemiaková kaša', 'zemiakova kasa|pyre|kasa zemiakova', 105, 2, 15, 4, 200),
  f('Hranolky', 'hranolky|hranolceky|hranolcekov', 300, 3.5, 40, 14, 150),
  f('Opekané zemiaky', 'opekane zemiaky|americke zemiaky', 180, 2.5, 26, 7, 200),
  f('Knedľa', 'knedla|knedle|knedli|knedlik', 220, 6, 44, 1.5, 150, { pc: 30 }),
  f('Kuskus', 'kuskus|bulgur', 115, 4, 23, 0.3, 180),
  f('Quinoa', 'quinoa', 120, 4.4, 21, 1.9, 180),
  f('Pohánka', 'pohanka', 110, 4, 21, 1, 180),
  f('Ovsené vločky', 'ovsene vlocky|vlocky|ovos', 370, 13, 60, 7, 50),
  f('Ovsená kaša', 'ovsena kasa|kasa|porridge|ovsenka', 110, 4, 17, 2.5, 250),
  f('Müsli', 'musli|granola|cerealie|cornflakes', 400, 9, 65, 10, 50),
  f('Chlieb', 'chlieb|chleba|chleby|chlebik|krajec|krajce|toast|toasty', 250, 8, 49, 1.5, 50, { pc: 50 }),
  f('Celozrnný chlieb', 'celozrnny chlieb|celozrnneho chleba|razny chlieb', 230, 9, 42, 2.5, 50, { pc: 50 }),
  f('Rožok', 'rozok|rozky|rozkov', 290, 9, 57, 3, 45, { pc: 45 }),
  f('Žemľa', 'zemla|zemle|kaiserka|kaiserky|bageta|houska', 280, 9, 55, 2.5, 60, { pc: 60 }),
  f('Tortilla', 'tortilla|tortila|wrap', 300, 8, 50, 7, 60, { pc: 60 }),
  f('Knäckebrot', 'knackebrot|racio|ryzovy chlebik|ryzove chlebiky', 370, 9, 78, 2, 10, { pc: 10 }),

  // --- Hotové jedlá ---
  f('Bryndzové halušky', 'bryndzove halusky|halusky s bryndzou|halusky', 190, 7, 22, 8, 350),
  f('Pirohy', 'pirohy|bryndzove pirohy', 210, 7, 30, 7, 300),
  f('Guláš', 'gulas|hovadzi gulas|bravcovy gulas|perkelt|paprikas', 130, 10, 6, 7.5, 300),
  f('Kapustnica', 'kapustnica', 70, 4, 4, 4.5, 350),
  f('Slepačí vývar', 'vyvar|slepaci vyvar|slepacia polievka|rezancova polievka s masom', 35, 2.5, 4, 1, 350),
  f('Fazuľová polievka', 'fazulova polievka|fazulovica|sosovicova polievka|gulasova polievka', 80, 5, 10, 2.5, 350),
  f('Paradajková polievka', 'paradajkova polievka|zeleninova polievka', 45, 1.2, 7, 1.3, 350),
  f('Pizza', 'pizza|pizze|pizzu', 265, 11, 33, 10, 350, { sl: 120 }),
  f('Hamburger', 'hamburger|burger|cheeseburger', 250, 13, 25, 11, 220, { pc: 220 }),
  f('Kebab', 'kebab|doner|gyros', 220, 12, 20, 10, 350, { pc: 350 }),
  f('Hot dog', 'hot dog|hotdog', 250, 10, 22, 14, 150, { pc: 150 }),
  f('Lasagne', 'lasagne|lazane', 150, 8, 13, 7.5, 350),
  f('Špagety bolognese', 'spagety bolognese|bolonske spagety|bolognese', 150, 8, 18, 5, 400),
  f('Špagety carbonara', 'carbonara|spagety carbonara', 190, 8, 20, 9, 400),
  f('Rizoto', 'rizoto|kuracie rizoto', 140, 7, 19, 4, 350),
  f('Kura s ryžou', 'kura s ryzou|kurca s ryzou', 145, 14, 15, 2.5, 350),
  f('Vyprážaný syr', 'vyprazany syr|syr v trojobale', 300, 16, 15, 20, 120, { pc: 120 }),
  f('Sushi', 'sushi|susi|maki', 150, 5.5, 28, 1.5, 250, { pc: 30 }),
  f('Palacinky', 'palacinka|palacinky|palaciniek|lievance', 220, 6, 30, 8, 180, { pc: 70 }),
  f('Šúľance', 'sulance|parene buchty|buchty|dukatove buchticky', 260, 7, 45, 6, 300),
  f('Zemiakové placky', 'zemiakove placky|placky|haruľa', 240, 4.5, 25, 13, 200, { pc: 70 }),
  f('Šalát so zeleninou', 'salat|zeleninovy salat|miesany salat', 40, 1.5, 5, 1.5, 250),
  f('Šalát s kuracím mäsom', 'kuraci salat|salat s kuracim masom|caesar salat|cezar', 130, 11, 5, 7.5, 350),
  f('Šopský šalát', 'sopsky salat|grecky salat', 90, 3.5, 4, 6.5, 300),
  f('Zemiakový šalát', 'zemiakovy salat', 160, 2.5, 14, 10.5, 200),
  f('Sendvič', 'sendvic|sendvice|bageta so sunkou|oblozena bageta|oblozeny chlebik|chlebicek', 230, 10, 28, 8.5, 180, { pc: 180 }),
  f('Chlieb s maslom', 'chlieb s maslom|chleba s maslom', 330, 7, 42, 14, 60, { pc: 60 }),
  f('Chlieb so šunkou', 'chlieb so sunkou|chlieb so sunkou a syrom|rozok so sunkou', 250, 12, 32, 8, 90, { pc: 90 }),
  f('Párky s horčicou a chlebom', 'parky s chlebom', 260, 11, 18, 16, 200),
  f('Fazuľa / strukoviny', 'fazula|fazule|sosovica|cicer|strukoviny|hrach', 120, 8, 20, 0.5, 180),
  f('Tofu', 'tofu', 120, 13, 2, 7, 120),
  f('Hummus', 'hummus|humus', 240, 7, 14, 17, 50),

  // --- Zelenina a ovocie ---
  f('Banán', 'banan|banany', 90, 1.1, 21, 0.3, 120, { pc: 120 }),
  f('Jablko', 'jablko|jablka|jablk', 52, 0.3, 13, 0.2, 160, { pc: 160 }),
  f('Hruška', 'hruska|hrusky', 57, 0.4, 14, 0.1, 160, { pc: 160 }),
  f('Pomaranč', 'pomaranc|pomarance|mandarinka|mandarinky', 47, 0.9, 11, 0.1, 150, { pc: 150 }),
  f('Hrozno', 'hrozno', 70, 0.7, 17, 0.2, 150),
  f('Jahody', 'jahody|jahod|maliny|cucoriedky|bobulove ovocie', 40, 0.8, 8, 0.4, 150),
  f('Melón', 'melon|dyna', 30, 0.6, 7.5, 0.2, 300),
  f('Kiwi', 'kiwi', 60, 1.1, 14, 0.5, 80, { pc: 80 }),
  f('Broskyňa', 'broskyna|broskyne|nektarinka|marhula|marhule|slivka|slivky', 42, 0.9, 10, 0.2, 120, { pc: 100 }),
  f('Ananás', 'ananas|mango', 55, 0.5, 13, 0.2, 150),
  f('Avokádo', 'avokado', 160, 2, 8.5, 15, 100, { pc: 150 }),
  f('Paradajka', 'paradajka|paradajky|rajcina|rajciny', 18, 0.9, 3.9, 0.2, 120, { pc: 120 }),
  f('Uhorka', 'uhorka|uhorky', 15, 0.7, 3.6, 0.1, 150, { pc: 300 }),
  f('Paprika', 'paprika|papriky', 27, 1, 6, 0.3, 120, { pc: 150 }),
  f('Mrkva', 'mrkva|mrkvy', 41, 0.9, 10, 0.2, 80, { pc: 80 }),
  f('Brokolica', 'brokolica|karfiol|zelenina|dusena zelenina|spenat', 34, 2.8, 5, 0.4, 200),
  f('Kukurica', 'kukurica', 96, 3.4, 19, 1.5, 100),

  // --- Orechy, sladké a slané ---
  f('Orechy', 'orechy|orech|mandle|kesu|vlasske orechy|lieskovce|arasidy|pistacie', 610, 20, 12, 53, 30),
  f('Arašidové maslo', 'arasidove maslo|orechove maslo', 600, 25, 15, 50, 20),
  f('Med', 'med', 320, 0.3, 80, 0, 15),
  f('Džem', 'dzem|lekvar|marmelada', 250, 0.4, 62, 0.1, 20),
  f('Nutella', 'nutella|nutela|cokoladova natierka', 540, 6, 57, 31, 20),
  f('Čokoláda', 'cokolada|cokolady|cokoladu|milka|horka cokolada', 540, 7, 55, 32, 30, { pc: 100, sl: 15 }),
  f('Čokoládová tyčinka', 'tycinka|snickers|mars|twix|horalka|horalky|kofila|tatranka', 500, 7, 58, 27, 50, { pc: 50 }),
  f('Proteínová tyčinka', 'proteinova tycinka|proteinka', 370, 30, 35, 12, 60, { pc: 60 }),
  f('Keksy', 'keksy|susienky|keks|oreo|bebe', 470, 6.5, 68, 19, 40, { pc: 10 }),
  f('Koláč', 'kolac|kolace|buchta|babovka|strudla|zavin|muffin|croissant|sisla|siska|donut|pagac', 380, 6, 50, 17, 90, { pc: 90 }),
  f('Torta', 'torta|zakusok|kremes|cheesecake|tiramisu', 350, 5, 40, 19, 120, { pc: 120 }),
  f('Zmrzlina', 'zmrzlina|zmrzliny|nanuk|kopcek zmrzliny', 200, 3.5, 24, 10, 100, { pc: 60 }),
  f('Čipsy', 'cipsy|chipsy|chips|chrumky|slane tycinky|krekry', 530, 6, 52, 33, 60),
  f('Popcorn', 'popcorn|pukance', 400, 10, 60, 14, 50),
  f('Gumené cukríky', 'cukriky|gumove cukriky|gumene medvedikov|haribo|zele', 340, 6, 77, 0.2, 50),
  f('Puding', 'puding|ryza na mlieku|krupicova kasa|krupica', 120, 3.2, 20, 3, 200),

  // --- Tuky a dochucovadlá ---
  f('Olivový olej', 'olej|olivovy olej', 880, 0, 0, 100, 10),
  f('Majonéza', 'majoneza|tatarka|tatarska omacka', 650, 1, 3, 70, 25),
  f('Kečup', 'kecup|horcica', 100, 1.5, 23, 0.2, 20),
  f('Cukor', 'cukor', 400, 0, 100, 0, 5, { sd: 5 }),

  // --- Doplnky ---
  f('Proteínový nápoj', 'protein|proteinovy napoj|proteinovy shake|srvatkovy protein|whey|odmerka proteinu', 390, 78, 7, 6, 30, { pc: 30 }),
  f('Gainer', 'gainer', 380, 25, 62, 3.5, 100),

  // --- Nápoje ---
  f('Voda', 'voda|mineralka|sodovka|pohar vody', 0, 0, 0, 0, 300, { d: true }),
  f('Káva (čierna)', 'kava|espresso|presso|cierna kava|kavicka', 2, 0.1, 0.3, 0, 150, { d: true, pc: 150 }),
  f('Káva s mliekom', 'kava s mliekom|capuccino|cappuccino|kapucino|biela kava|flat white', 30, 1.6, 2.5, 1.5, 200, { d: true, pc: 200 }),
  f('Latte', 'latte|caffe latte|latte macchiato', 45, 2.5, 4, 2, 300, { d: true, pc: 300 }),
  f('Čaj', 'caj|zeleny caj|cierny caj|bylinkovy caj', 1, 0, 0.2, 0, 300, { d: true, pc: 300 }),
  f('Čaj s medom', 'caj s medom|sladeny caj|caj s cukrom', 20, 0, 5, 0, 300, { d: true, pc: 300 }),
  f('Kakao', 'kakao|granko|horuca cokolada', 75, 3.4, 10, 2.3, 250, { d: true, pc: 250 }),
  f('Pomarančový džús', 'dzus|juice|pomarancovy dzus|ovocna stava', 45, 0.6, 10, 0.1, 250, { d: true }),
  f('Smoothie', 'smoothie|ovocne smoothie', 60, 1, 13, 0.4, 300, { d: true, pc: 300 }),
  f('Cola', 'cola|coca cola|kola|kofola|pepsi|fanta|sprite|malinovka|limonada|sladeny napoj', 42, 0, 10.5, 0, 330, { d: true, pc: 330 }),
  f('Cola Zero', 'cola zero|zero cola|cola light|pepsi max|nesladena limonada', 0.5, 0, 0, 0, 330, { d: true, pc: 330 }),
  f('Energetický nápoj', 'energetak|energeticky napoj|red bull|redbull|monster|semtex', 46, 0, 11, 0, 250, { d: true, pc: 250 }),
  f('Iontový nápoj', 'iontovy napoj|ionťak|isostar|gatorade', 25, 0, 6, 0, 500, { d: true }),
  f('Pivo', 'pivo|piva|piv|pivko', 43, 0.4, 3.5, 0, 500, { d: true, pc: 500 }),
  f('Nealko pivo', 'nealko pivo|nealkoholicke pivo|nealko|radler', 26, 0.3, 6, 0, 500, { d: true, pc: 500 }),
  f('Víno', 'vino|vina|biele vino|cervene vino|pohar vina|sekt|prosecco', 83, 0.1, 2.5, 0, 200, { d: true, pc: 200 }),
  f('Tvrdý alkohol', 'borovicka|vodka|slivovica|rum|whisky|palenka|panak|poldeci|tvrdy alkohol', 230, 0, 0, 0, 40, { d: true, pc: 40 }),
  f('Rastlinné mlieko', 'ovsene mlieko|mandlove mlieko|sojove mlieko|rastlinne mlieko', 40, 1, 6.5, 1.5, 250, { d: true, sd: 30 }),
  // --- Ďalšie slovenské a bežné jedlá (celé porcie) ---
  f('Segedínsky guláš', 'segedin|segedinsky gulas|segedinsky', 120, 8, 5, 8, 300),
  f('Sviečková na smotane', 'svieckova|svieckova na smotane', 150, 9, 9, 9, 300),
  f('Francúzske zemiaky', 'francuzske zemiaky|zapekane zemiaky', 160, 6, 14, 9, 350),
  f('Granadír', 'granadir|granatiersky pochod|granadirmars', 150, 4.5, 26, 3.5, 350),
  f('Strapačky s kapustou', 'strapacky|strapacky s kapustou|halusky s kapustou', 170, 5, 24, 6, 350),
  f('Plnená paprika', 'plnena paprika|plnene papriky', 110, 6, 9, 5.5, 350),
  f('Lečo', 'leco', 90, 4, 6, 6, 300),
  f('Špenátový prívarok', 'spenatovy privarok|spenat s vajcom', 70, 3, 5, 4, 250),
  f('Šošovicový prívarok', 'sosovicovy privarok|fazulovy privarok|privarok|hrachova kasa', 110, 6, 15, 2.5, 300),
  f('Kuracie stehno', 'kuracie stehno|kuracie stehna|pecene kura|pecene stehno|grilovane kura', 215, 25, 0, 13, 180, { pc: 180 }),
  f('Kuracie krídla', 'kuracie kridla|kridelka|kuracie kridelka', 250, 20, 2, 18, 200, { pc: 35 }),
  f('Kuracie nugety', 'nugety|nugetky|kuracie nugety|stripsy|kuracie stripsy', 280, 15, 18, 17, 150, { pc: 20 }),
  f('Bravčové rebrá', 'rebra|rebierka|bravcove rebra|pecene koleno|koleno', 290, 20, 2, 23, 250),
  f('Pečená kačica', 'kacica|kacka|pecena kacica|hus|husacina', 330, 19, 0, 28, 200),
  f('Lokše', 'loksa|lokse|loksi', 200, 4, 35, 5, 100, { pc: 50 }),
  f('Údené mäso', 'udene|udene maso|udenina', 250, 20, 0, 19, 150),
  f('Sekaná', 'sekana|mleta sekana', 240, 15, 8, 17, 150),
  f('Pečeň', 'pecen|kuracia pecen|pecienka', 170, 25, 1, 7, 150),
  f('Tatarský biftek', 'tatarsky biftek|tatarak', 180, 18, 2, 11, 150),
  f('Hrianka', 'hrianka|hrianky', 330, 8, 45, 13, 40, { pc: 40 }),
  f('Langoš', 'langos|langose', 300, 7, 38, 13, 180, { pc: 180 }),
  f('Trdelník', 'trdelnik', 350, 6, 55, 12, 120, { pc: 120 }),
  f('Žemľovka', 'zemlovka|ryzovy nakyp|nakyp', 190, 6, 30, 5, 300),
  f('Krokety', 'krokety|kroket', 250, 3.5, 32, 12, 150),
  f('Tarhoňa', 'tarhona', 150, 5, 30, 1, 180),
  f('Zapekané cestoviny', 'zapekane cestoviny|cestoviny so syrom|cestoviny so syrovou omackou|mac and cheese|syrove cestoviny', 180, 8, 20, 8, 350),
  f('Kuracie kari', 'kari|curry|kuracie kari|kuracie curry|tikka masala', 140, 10, 7, 8, 300),
  f('Čína (mäso so zeleninou)', 'cina|kung pao|sladkokysle kura|kura na cinsky sposob|cinske jedlo', 160, 10, 15, 7, 350),
  f('Pečené rezance', 'pecene rezance|cinske rezance|nudle|pad thai', 170, 6, 25, 5, 350),
  f('Ramen', 'ramen|pho|rezancova polievka', 60, 4, 7, 2, 500),
  f('Burrito', 'burrito|quesadilla|taco|tacos', 200, 9, 24, 7, 300, { pc: 300 }),
  f('Wrap s kuracím mäsom', 'kuraci wrap|wrap s kuracim masom|tortilla s kuracim masom|twister', 190, 10, 20, 8, 250, { pc: 250 }),
  f('Big Mac', 'big mac|bigmac|whopper|dvojity burger', 240, 12, 20, 12, 215, { pc: 215 }),
  f('Krevety', 'krevety|morske plody', 100, 20, 1, 1.5, 120),
  f('Treska v majonéze', 'treska v majoneze|treska s majonezou|parizsky salat|vlassky salat', 220, 8, 5, 19, 140, { pc: 140 }),
  f('Nátierka', 'natierka|vajickova natierka|pastetka|pasteta|bryndzova natierka', 280, 9, 3, 26, 40),
  f('Ovocný šalát', 'ovocny salat|ovocie', 60, 0.7, 14, 0.2, 200),
  f('Uhorkový šalát', 'uhorkovy salat|kapustovy salat|cviklovy salat|mrkvovy salat|kysla kapusta', 35, 0.8, 7, 0.3, 150),
  f('Müsli tyčinka', 'musli tycinka|cerealna tycinka|flapjack', 420, 6, 65, 14, 30, { pc: 30 }),
  f('Proteínový puding', 'proteinovy puding|proteinovy jogurt|skyr napoj', 75, 10, 6, 1.5, 200, { pc: 200 }),
  f('Ľadová káva', 'ladova kava|frappe|frappuccino|ladove latte', 80, 2, 10, 3.5, 300, { d: true, pc: 300 }),
  f('Miešaný drink', 'aperol|drink|koktejl|koktail|mojito|gin tonic|gin s tonikom|spritz', 100, 0, 10, 0, 200, { d: true, pc: 200 }),

  f('Polievka', 'polievka|polievky|zeleninova polievka s masom|krémová polievka|kremova polievka', 50, 2.5, 5, 2, 350),

  // --- Omáčky ---
  f('Smotanová omáčka', 'smotanova omacka|smotanovou omackou|biela omacka|bešamel|besamel', 150, 2, 6, 13, 100),
  f('Syrová omáčka', 'syrova omacka|syrovou omackou', 190, 6, 5, 16, 100),
  f('Paradajková omáčka', 'paradajkova omacka|paradajkovou omackou|rajcinova omacka|pesto', 60, 1.5, 9, 2, 120),
  f('Omáčka', 'omacka|omackou|stava z masa|vypek', 90, 2, 7, 6, 80)
];
