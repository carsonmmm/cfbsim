/* ===================== LEAGUE DATA & SHARED HELPERS ===================== */
// Seeded random generator (mulberry32). The position is saved with each career, so a save
// plus the same choices reproduces the same results. Sound effects use Math.random so they
// never disturb the simulation.
const RNG = { s: (Math.random() * 4294967296) >>> 0 };
function R() { let t = (RNG.s = (RNG.s + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function setSeed(seed) { RNG.s = (Number(seed) >>> 0) || 1; }
const freshSeed = () => ((Math.random() * 4294967296) >>> 0) || 1;
const rnd = (a, b) => a + R() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// "a sprain", "an ankle sprain": the article for a lowercase noun phrase
// last name, keeping a suffix with it: "Moore Jr.", not "Jr." (CL-22)
const lastName = n => { const w = String(n).trim().split(/\s+/); return w.length > 1 && /^(Jr\.?|Sr\.?|I{2,3}|IV|V)$/i.test(w[w.length - 1]) ? w.slice(-2).join(' ') : w[w.length - 1]; };
// handles words ("an ankle sprain"), numbers ("an 8-4 season", "an 11-1 season", "an 18-yard kick")
// and abbreviations read letter by letter ("an OL", "an OSU fumble", "a USC fumble")
const aAn = w => { w = String(w); const an = /^\d/.test(w) ? /^(8|1[18](\D|$))/.test(w) : /^[A-Z]+\b/.test(w) ? /^[AEFHILMNORSX]/.test(w) : /^[aeiou]/i.test(w) && !/^(uni|use|usu|uti|uta|eu|one)/i.test(w); return (an ? 'an ' : 'a ') + w; };
const pick = a => a[Math.floor(R() * a.length)];
function gauss() { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
const r1 = x => Math.round(x * 10) / 10;
// A small seeded generator for things that must look the same every time they're viewed (draft
// boards, NFL standings in AD mode) without moving the game's own random sequence.
function lrng(key) { let a = (Math.floor(hash(String(key)) * 4294967295) >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- League data (2026 alignment) ---------- */
const CONF_DEFS = [
  ['B1G', 'Big Ten', 1, 9, 'Illinois|ILL|74;Indiana|IU|87;Iowa|IOWA|77;Maryland|MD|65;Michigan|MICH|80;Michigan State|MSU|66;Minnesota|MINN|70;Nebraska|NEB|72;Northwestern|NW|67;Ohio State|OSU|93;Oregon|ORE|91;Penn State|PSU|79;Purdue|PUR|60;Rutgers|RUTG|67;UCLA|UCLA|64;USC|USC|81;Washington|UW|80;Wisconsin|WIS|66'],
  ['SEC', 'SEC', 1, 9, 'Alabama|ALA|82;Arkansas|ARK|70;Auburn|AUB|74;Florida|FLA|73;Georgia|UGA|90;Kentucky|UK|66;LSU|LSU|83;Ole Miss|MISS|85;Mississippi State|MSST|68;Missouri|MIZ|75;Oklahoma|OU|84;South Carolina|SC|73;Tennessee|TENN|78;Texas|TEX|88;Texas A&M|TAMU|85;Vanderbilt|VAN|74'],
  ['B12', 'Big 12', 1, 9, 'Arizona|ARIZ|71;Arizona State|ASU|73;Baylor|BAY|70;BYU|BYU|81;Cincinnati|CIN|69;Colorado|COLO|64;Houston|HOU|76;Iowa State|ISU|72;Kansas|KU|68;Kansas State|KSU|71;Oklahoma State|OKST|62;TCU|TCU|72;Texas Tech|TTU|83;UCF|UCF|65;Utah|UTAH|77;West Virginia|WVU|64'],
  ['ACC', 'ACC', 1, 8, 'Boston College|BC|60;California|CAL|64;Clemson|CLEM|75;Duke|DUKE|71;Florida State|FSU|69;Georgia Tech|GT|73;Louisville|LOU|76;Miami|MIA|86;NC State|NCST|68;North Carolina|UNC|67;Pittsburgh|PITT|69;SMU|SMU|78;Stanford|STAN|60;Syracuse|SYR|63;Virginia|UVA|70;Virginia Tech|VT|66;Wake Forest|WAKE|64'],
  ['IND', 'Independent', 0, 0, 'Notre Dame|ND|89;UConn|UCONN|64'],
  ['P12', 'Pac-12', 0, 7, 'Boise State|BSU|72;Colorado State|CSU|55;Fresno State|FRES|62;Oregon State|ORST|58;San Diego State|SDSU|60;Texas State|TXST|62;Utah State|USU|57;Washington State|WSU|60'],
  ['AAC', 'American', 0, 8, 'Army|ARMY|62;Charlotte|CLT|48;East Carolina|ECU|62;Florida Atlantic|FAU|52;Memphis|MEM|66;Navy|NAVY|66;North Texas|UNT|65;Rice|RICE|54;South Florida|USF|66;Temple|TEM|52;Tulane|TUL|68;Tulsa|TLSA|52;UAB|UAB|50;UTSA|UTSA|60'],
  ['MW', 'Mountain West', 0, 8, 'Air Force|AF|56;Hawaii|HAW|58;Nevada|NEV|50;New Mexico|UNM|58;North Dakota State|NDSU|64;Northern Illinois|NIU|55;San Jose State|SJSU|58;UNLV|UNLV|66;UTEP|UTEP|50;Wyoming|WYO|52'],
  ['SBC', 'Sun Belt', 0, 8, 'Appalachian State|APP|57;Arkansas State|ARST|56;Coastal Carolina|CCU|52;Georgia Southern|GASO|58;Georgia State|GAST|48;James Madison|JMU|67;Louisiana|ULL|57;Louisiana Tech|LT|56;Marshall|MRSH|56;Old Dominion|ODU|60;South Alabama|USA|55;Southern Miss|USM|58;Troy|TROY|57;UL Monroe|ULM|48'],
  ['MAC', 'MAC', 0, 8, 'Akron|AKR|45;Ball State|BALL|46;Bowling Green|BGSU|52;Buffalo|BUFF|55;Central Michigan|CMU|52;Eastern Michigan|EMU|50;Kent State|KENT|44;Miami (OH)|M-OH|56;Ohio|OHIO|58;Sacramento State|SAC|52;Toledo|TOL|60;UMass|UMASS|42;Western Michigan|WMU|60'],
  ['CUSA', 'Conference USA', 0, 8, 'Delaware|DEL|52;FIU|FIU|50;Jacksonville State|JVST|58;Kennesaw State|KENN|54;Liberty|LIB|60;Middle Tennessee|MTSU|48;Missouri State|MOST|52;New Mexico State|NMSU|47;Sam Houston|SHSU|46;Western Kentucky|WKU|58'],
];
const CONFS = {};
CONF_DEFS.forEach(([id, name, p4, cg, list]) => { CONFS[id] = { id, name, p4: !!p4, confGames: cg, teams: list.split(';').map(s => s.split('|')[1]) }; });
const PRESEASON_AP = ['OSU', 'ORE', 'UGA', 'ND', 'TEX', 'IU', 'MIA', 'TAMU', 'MISS', 'OU', 'LSU', 'TTU', 'ALA', 'BYU', 'USC', 'MICH', 'UW', 'PSU', 'SMU', 'TENN', 'UTAH', 'IOWA', 'HOU', 'LOU', 'MIZ'];
const FCS_NAMES = ['Montana State', 'South Dakota State', 'Idaho State', 'Tarleton State', 'Illinois State', 'Villanova', 'UC Davis', 'Incarnate Word', 'Youngstown State', 'Southern Illinois', 'Lafayette', 'Furman', 'Chattanooga', 'Austin Peay', 'Stephen F. Austin', 'Abilene Christian', 'Eastern Washington', 'Northern Iowa', 'Richmond', 'William & Mary', 'Holy Cross', 'Towson', 'Mercer', 'Samford', 'Western Carolina', 'Murray State', 'Southeast Missouri', 'Weber State', 'Portland State', 'North Alabama'];
const BOWLS = ['Citrus Bowl', 'ReliaQuest Bowl', 'Alamo Bowl', 'Pop-Tarts Bowl', 'Gator Bowl', 'Music City Bowl', 'Holiday Bowl', 'Sun Bowl', 'Las Vegas Bowl', 'Texas Bowl', 'Liberty Bowl', 'Duke\'s Mayo Bowl', 'Pinstripe Bowl', 'Military Bowl', 'Birmingham Bowl', 'Fenway Bowl', 'Armed Forces Bowl', 'First Responder Bowl', 'Independence Bowl', 'Cactus Bowl', 'Arizona Bowl', 'Hawaii Bowl', 'New Mexico Bowl', 'Poinsettia Bowl', 'New Orleans Bowl', 'Frisco Bowl', 'Cure Bowl', 'Puerto Rico Bowl', 'Famous Idaho Potato Bowl', 'Myrtle Beach Bowl', 'Gasparilla Bowl', 'Boca Raton Bowl', 'Frisco Football Classic', 'Salute to Veterans Bowl', '68 Ventures Bowl'];

/* ---------- geography (shared by both modes) ---------- */
const CREGION = { NE: 'ME NH VT MA RI CT NY NJ PA', MA: 'DE MD DC VA WV', SE: 'NC SC GA FL AL MS TN KY', SC: 'LA AR TX OK', MW: 'OH MI IN IL WI MN IA MO', PL: 'KS NE SD ND', MT: 'CO UT WY MT ID NM AZ NV', W: 'CA OR WA AK HI' };
const REGION_OF = {}; Object.entries(CREGION).forEach(([r, s]) => s.split(' ').forEach(st => REGION_OF[st] = r));
const TEAM_STATE = {};
('ILL IL;IU IN;IOWA IA;MD MD;MICH MI;MSU MI;MINN MN;NEB NE;NW IL;OSU OH;ORE OR;PSU PA;PUR IN;RUTG NJ;UCLA CA;USC CA;UW WA;WIS WI;ALA AL;ARK AR;AUB AL;FLA FL;UGA GA;UK KY;LSU LA;MISS MS;MSST MS;MIZ MO;OU OK;SC SC;TENN TN;TEX TX;TAMU TX;VAN TN;' +
  'ARIZ AZ;ASU AZ;BAY TX;BYU UT;CIN OH;COLO CO;HOU TX;ISU IA;KU KS;KSU KS;OKST OK;TCU TX;TTU TX;UCF FL;UTAH UT;WVU WV;BC MA;CAL CA;CLEM SC;DUKE NC;FSU FL;GT GA;LOU KY;MIA FL;NCST NC;UNC NC;PITT PA;SMU TX;STAN CA;SYR NY;UVA VA;VT VA;WAKE NC;ND IN;UCONN CT;' +
  'BSU ID;CSU CO;FRES CA;ORST OR;SDSU CA;TXST TX;USU UT;WSU WA;ARMY NY;CLT NC;ECU NC;FAU FL;MEM TN;NAVY MD;UNT TX;RICE TX;USF FL;TEM PA;TUL LA;TLSA OK;UAB AL;UTSA TX;AF CO;HAW HI;NEV NV;UNM NM;NDSU ND;NIU IL;SJSU CA;UNLV NV;UTEP TX;WYO WY;' +
  'APP NC;ARST AR;CCU SC;GASO GA;GAST GA;JMU VA;ULL LA;LT LA;MRSH WV;ODU VA;USA AL;USM MS;TROY AL;ULM LA;AKR OH;BALL IN;BGSU OH;BUFF NY;CMU MI;EMU MI;KENT OH;M-OH OH;OHIO OH;SAC CA;TOL OH;UMASS MA;WMU MI;DEL DE;FIU FL;JVST AL;KENN GA;LIB VA;MTSU TN;MOST MO;NMSU NM;SHSU TX;WKU KY')
  .split(';').forEach(s => { const [id, st] = s.split(' '); TEAM_STATE[id] = st; });
/* ---------- every FBS school: colors, home stadium, capacity, city (game estimates) ---------- */
const TEAM_INFO = {};
(`ILL|#E84A27|#13294B|Memorial Stadium|60670|Champaign;IU|#990000|#EEEDEB|Memorial Stadium|52626|Bloomington;IOWA|#FFCD00|#000000|Kinnick Stadium|69250|Iowa City;MD|#E03A3E|#FFD520|SECU Stadium|51802|College Park;MICH|#FFCB05|#00274C|Michigan Stadium|107601|Ann Arbor;MSU|#18453B|#FFFFFF|Spartan Stadium|75005|East Lansing;MINN|#7A0019|#FFCC33|Huntington Bank Stadium|50805|Minneapolis;NEB|#E41C38|#F5F1E7|Memorial Stadium|85458|Lincoln;NW|#4E2A84|#FFFFFF|Ryan Field|35000|Evanston;OSU|#BB0000|#666666|Ohio Stadium|102780|Columbus;ORE|#154733|#FEE123|Autzen Stadium|54000|Eugene;PSU|#041E42|#FFFFFF|Beaver Stadium|106572|State College;PUR|#CFB991|#000000|Ross-Ade Stadium|57236|West Lafayette;RUTG|#CC0033|#5F6A72|SHI Stadium|52454|Piscataway;UCLA|#2D68C4|#F2A900|Rose Bowl|88565|Pasadena;USC|#990000|#FFC72C|Los Angeles Memorial Coliseum|77500|Los Angeles;UW|#4B2E83|#B7A57A|Husky Stadium|70083|Seattle;WIS|#C5050C|#FFFFFF|Camp Randall Stadium|76057|Madison;` +
`ALA|#9E1B32|#828A8F|Bryant-Denny Stadium|100077|Tuscaloosa;ARK|#9D2235|#FFFFFF|Razorback Stadium|76212|Fayetteville;AUB|#0C2340|#E87722|Jordan-Hare Stadium|88043|Auburn;FLA|#0021A5|#FA4616|Ben Hill Griffin Stadium|88548|Gainesville;UGA|#BA0C2F|#000000|Sanford Stadium|93033|Athens;UK|#0033A0|#FFFFFF|Kroger Field|61000|Lexington;LSU|#461D7C|#FDD023|Tiger Stadium|102321|Baton Rouge;MISS|#CE1126|#14213D|Vaught-Hemingway Stadium|64038|Oxford;MSST|#660000|#FFFFFF|Davis Wade Stadium|61337|Starkville;MIZ|#F1B82D|#000000|Faurot Field|57321|Columbia;OU|#841617|#FDF9D8|Oklahoma Memorial Stadium|80126|Norman;SC|#73000A|#000000|Williams-Brice Stadium|77559|Columbia;TENN|#FF8200|#FFFFFF|Neyland Stadium|101915|Knoxville;TEX|#BF5700|#FFFFFF|Texas Memorial Stadium|100119|Austin;TAMU|#500000|#FFFFFF|Kyle Field|102733|College Station;VAN|#866D4B|#000000|FirstBank Stadium|35000|Nashville;` +
`ARIZ|#CC0033|#003366|Arizona Stadium|50782|Tucson;ASU|#8C1D40|#FFC627|Mountain America Stadium|53599|Tempe;BAY|#154734|#FFB81C|McLane Stadium|45140|Waco;BYU|#002E5D|#FFFFFF|LaVell Edwards Stadium|62073|Provo;CIN|#E00122|#000000|Nippert Stadium|38088|Cincinnati;COLO|#CFB87C|#000000|Folsom Field|50183|Boulder;HOU|#C8102E|#FFFFFF|TDECU Stadium|40000|Houston;ISU|#C8102E|#F1BE48|Jack Trice Stadium|61500|Ames;KU|#0051BA|#E8000D|Kansas Memorial Stadium|47000|Lawrence;KSU|#512888|#FFFFFF|Bill Snyder Family Stadium|50000|Manhattan;OKST|#FF7300|#000000|Boone Pickens Stadium|53855|Stillwater;TCU|#4D1979|#FFFFFF|Amon G. Carter Stadium|45000|Fort Worth;TTU|#CC0000|#000000|Jones AT&T Stadium|60229|Lubbock;UCF|#000000|#BA9B37|FBC Mortgage Stadium|45301|Orlando;UTAH|#CC0000|#FFFFFF|Rice-Eccles Stadium|51444|Salt Lake City;WVU|#002855|#EAAA00|Milan Puskar Stadium|60000|Morgantown;` +
`BC|#8A100B|#BC9B6A|Alumni Stadium|44500|Chestnut Hill;CAL|#003262|#FDB515|California Memorial Stadium|62467|Berkeley;CLEM|#F56600|#522D80|Memorial Stadium|81500|Clemson;DUKE|#003087|#FFFFFF|Wallace Wade Stadium|40004|Durham;FSU|#782F40|#CEB888|Doak Campbell Stadium|67277|Tallahassee;GT|#B3A369|#003057|Bobby Dodd Stadium|51913|Atlanta;LOU|#AD0000|#000000|L&N Stadium|60800|Louisville;MIA|#F47321|#005030|Hard Rock Stadium|65326|Miami Gardens;NCST|#CC0000|#000000|Carter-Finley Stadium|56919|Raleigh;UNC|#7BAFD4|#13294B|Kenan Stadium|50500|Chapel Hill;PITT|#003594|#FFB81C|Acrisure Stadium|68400|Pittsburgh;SMU|#CC0035|#354CA1|Gerald J. Ford Stadium|32000|Dallas;STAN|#8C1515|#FFFFFF|Stanford Stadium|50424|Stanford;SYR|#F76900|#002D72|JMA Wireless Dome|42784|Syracuse;UVA|#232D4B|#F84C1E|Scott Stadium|61500|Charlottesville;VT|#861F41|#E5751F|Lane Stadium|65632|Blacksburg;WAKE|#9E7E38|#000000|Allegacy Stadium|31500|Winston-Salem;ND|#0C2340|#C99700|Notre Dame Stadium|77622|South Bend;UCONN|#000E2F|#FFFFFF|Pratt & Whitney Stadium|38066|East Hartford;` +
`BSU|#0033A0|#D64309|Albertsons Stadium|36387|Boise;CSU|#1E4D2B|#C8C372|Canvas Stadium|41000|Fort Collins;FRES|#DB0032|#002E6D|Valley Children's Stadium|40727|Fresno;ORST|#DC4405|#000000|Reser Stadium|35548|Corvallis;SDSU|#A6192E|#000000|Snapdragon Stadium|35000|San Diego;TXST|#501214|#8D734A|UFCU Stadium|30000|San Marcos;USU|#0F2439|#8A8D8F|Maverik Stadium|25513|Logan;WSU|#981E32|#5E6A71|Gesa Field|32952|Pullman;` +
`ARMY|#000000|#D4BF91|Michie Stadium|38000|West Point;CLT|#046A38|#B9975B|Jerry Richardson Stadium|15314|Charlotte;ECU|#592A8A|#FDC82F|Dowdy-Ficklen Stadium|51000|Greenville;FAU|#003366|#CC0000|FAU Stadium|29419|Boca Raton;MEM|#003087|#898D8D|Simmons Bank Liberty Stadium|58325|Memphis;NAVY|#00205B|#C5B783|Navy-Marine Corps Memorial Stadium|34000|Annapolis;UNT|#00853E|#FFFFFF|DATCU Stadium|30850|Denton;RICE|#00205B|#7C7E7F|Rice Stadium|47000|Houston;USF|#006747|#CFC493|Raymond James Stadium|65618|Tampa;TEM|#9D2235|#FFFFFF|Lincoln Financial Field|69796|Philadelphia;TUL|#006747|#418FDE|Yulman Stadium|30000|New Orleans;TLSA|#002D72|#C8102E|Chapman Stadium|30000|Tulsa;UAB|#1E6B52|#F4C300|Protective Stadium|47100|Birmingham;UTSA|#0C2340|#F15A22|Alamodome|64000|San Antonio;` +
`AF|#003087|#8A8D8F|Falcon Stadium|46692|Colorado Springs;HAW|#024731|#FFFFFF|Ching Athletics Complex|15194|Honolulu;NEV|#003366|#807F84|Mackay Stadium|27000|Reno;UNM|#BA0C2F|#A7A8AA|University Stadium|39224|Albuquerque;NDSU|#0A5640|#FFC72A|Fargodome|18700|Fargo;NIU|#BA0C2F|#000000|Huskie Stadium|23595|DeKalb;SJSU|#0055A2|#E5A823|CEFCU Stadium|21520|San Jose;UNLV|#CF0A2C|#666666|Allegiant Stadium|65000|Las Vegas;UTEP|#FF8200|#041E42|Sun Bowl|51500|El Paso;WYO|#492F24|#FFC425|War Memorial Stadium|29181|Laramie;` +
`APP|#222222|#FFCC00|Kidd Brewer Stadium|30000|Boone;ARST|#CC092F|#000000|Centennial Bank Stadium|30406|Jonesboro;CCU|#006F71|#A27752|Brooks Stadium|21000|Conway;GASO|#011E41|#87714D|Paulson Stadium|25000|Statesboro;GAST|#0039A6|#C60C30|Center Parc Stadium|24333|Atlanta;JMU|#450084|#CBB677|Bridgeforth Stadium|25000|Harrisonburg;ULL|#CE181E|#0A0A0A|Cajun Field|41426|Lafayette;LT|#002F8B|#E31B23|Joe Aillet Stadium|28562|Ruston;MRSH|#00B140|#FFFFFF|Joan C. Edwards Stadium|38227|Huntington;ODU|#003057|#7C878E|S.B. Ballard Stadium|21944|Norfolk;USA|#00205B|#BF0D3E|Hancock Whitney Stadium|25450|Mobile;USM|#000000|#FFAB00|M. M. Roberts Stadium|36000|Hattiesburg;TROY|#8A2432|#B3B5B8|Veterans Memorial Stadium|30402|Troy;ULM|#840029|#BA9B37|Malone Stadium|27617|Monroe;` +
`AKR|#041E42|#A89968|InfoCision Stadium|30000|Akron;BALL|#BA0C2F|#FFFFFF|Scheumann Stadium|22500|Muncie;BGSU|#FE5000|#4F2C1D|Doyt Perry Stadium|24000|Bowling Green;BUFF|#005BBB|#FFFFFF|UB Stadium|25013|Buffalo;CMU|#6A0032|#FFC82E|Kelly/Shorts Stadium|30255|Mount Pleasant;EMU|#006633|#FFFFFF|Rynearson Stadium|30200|Ypsilanti;KENT|#002664|#EAAB00|Dix Stadium|25319|Kent;M-OH|#C3142D|#FFFFFF|Yager Stadium|24286|Oxford;OHIO|#00694E|#FFFFFF|Peden Stadium|24000|Athens;SAC|#043927|#C4B581|Hornet Stadium|21195|Sacramento;TOL|#15397F|#FFDA00|Glass Bowl|26038|Toledo;UMASS|#881C1C|#000000|McGuirk Alumni Stadium|17000|Amherst;WMU|#6C4023|#B5A167|Waldo Stadium|30200|Kalamazoo;` +
`DEL|#00539F|#FFD200|Delaware Stadium|18800|Newark;FIU|#081E3F|#B6862C|Pitbull Stadium|20000|Miami;JVST|#CC0000|#000000|AmFirst Stadium|24000|Jacksonville;KENN|#FDBB30|#0B1315|Fifth Third Stadium|8300|Kennesaw;LIB|#002D62|#C41230|Williams Stadium|25000|Lynchburg;MTSU|#0066CC|#000000|Floyd Stadium|30788|Murfreesboro;MOST|#5E0009|#FFFFFF|Plaster Stadium|17500|Springfield;NMSU|#861F41|#FFFFFF|Aggie Memorial Stadium|28853|Las Cruces;SHSU|#F56A1F|#002649|Bowers Stadium|14000|Huntsville;WKU|#C60C30|#FFFFFF|Smith Stadium|22113|Bowling Green`)
  .split(';').forEach(s => { const [id, c1, c2, stadium, cap, city] = s.split('|'); TEAM_INFO[id] = { c1, c2, stadium, cap: +cap, city }; });

/* ---------- rivalries: [team, team, name]. The first one listed for a school is its archrival. ---------- */
const RIVALRIES = [
  ['MICH', 'OSU', 'The Game'], ['MICH', 'MSU', 'Paul Bunyan Trophy'], ['MICH', 'MINN', 'Little Brown Jug'],
  ['ALA', 'AUB', 'Iron Bowl'], ['ALA', 'TENN', 'Third Saturday in October'], ['ALA', 'LSU', 'Alabama–LSU'],
  ['UGA', 'FLA', 'Florida–Georgia game'], ['UGA', 'GT', 'Clean, Old-Fashioned Hate'], ['UGA', 'AUB', "Deep South's Oldest Rivalry"],
  ['TEX', 'OU', 'Red River Rivalry'], ['TEX', 'TAMU', 'Lone Star Showdown'], ['OU', 'OKST', 'Bedlam'],
  ['USC', 'UCLA', 'Victory Bell'], ['USC', 'ND', 'Jeweled Shillelagh'], ['ND', 'NAVY', 'Notre Dame–Navy'],
  ['ORE', 'ORST', 'Oregon–Oregon State'], ['UW', 'WSU', 'Apple Cup'], ['ORE', 'UW', 'Oregon–Washington'],
  ['LSU', 'ARK', 'Battle for the Golden Boot'], ['MISS', 'MSST', 'Egg Bowl'], ['MISS', 'LSU', 'Magnolia Bowl'],
  ['TENN', 'UK', 'Kentucky–Tennessee'], ['TENN', 'VAN', 'Tennessee–Vanderbilt'], ['UK', 'LOU', "Governor's Cup"],
  ['FSU', 'FLA', 'Sunshine Showdown'], ['FSU', 'MIA', 'Florida State–Miami'], ['MIA', 'FLA', 'Florida–Miami'],
  ['CLEM', 'SC', 'Palmetto Bowl'], ['UNC', 'NCST', 'North Carolina–NC State'], ['UNC', 'DUKE', 'Victory Bell'],
  ['VT', 'UVA', 'Commonwealth Cup'], ['PITT', 'WVU', 'Backyard Brawl'], ['PSU', 'PITT', 'Keystone Classic'],
  ['IOWA', 'ISU', 'Cy-Hawk Trophy'], ['IOWA', 'MINN', 'Floyd of Rosedale'], ['IOWA', 'NEB', 'Heroes Game'],
  ['MINN', 'WIS', "Paul Bunyan's Axe"], ['IU', 'PUR', 'Old Oaken Bucket'], ['ILL', 'NW', 'Land of Lincoln Trophy'],
  ['MSU', 'PSU', 'Land Grant Trophy'], ['MD', 'RUTG', 'Maryland–Rutgers'], ['NEB', 'COLO', 'Nebraska–Colorado'],
  ['ARK', 'MIZ', 'Battle Line Rivalry'], ['MIZ', 'KU', 'Border Showdown'], ['KU', 'KSU', 'Sunflower Showdown'],
  ['TCU', 'BAY', 'Revivalry'], ['TTU', 'TCU', 'West Texas Championship'], ['BYU', 'UTAH', 'Holy War'], ['ARIZ', 'ASU', 'Territorial Cup'],
  ['COLO', 'CSU', 'Rocky Mountain Showdown'], ['CAL', 'STAN', 'The Big Game'], ['SYR', 'BC', 'Syracuse–Boston College'],
  ['CIN', 'LOU', 'Keg of Nails'], ['HOU', 'RICE', 'Bayou Bucket'], ['UCF', 'USF', 'War on I-4'], ['WVU', 'VT', 'Black Diamond Trophy'],
  ['GT', 'CLEM', 'Clemson–Georgia Tech'], ['WAKE', 'UNC', 'Tobacco Road'], ['SMU', 'TCU', 'Iron Skillet'],
  ['ARMY', 'NAVY', 'Army–Navy Game'], ['AF', 'ARMY', "Commander-in-Chief's Trophy"], ['AF', 'NAVY', "Commander-in-Chief's Trophy"],
  ['M-OH', 'CIN', 'Victory Bell'], ['BGSU', 'TOL', 'Battle of I-75'], ['CMU', 'WMU', 'Michigan MAC Trophy'], ['CMU', 'EMU', 'Michigan MAC Trophy'],
  ['AKR', 'KENT', 'Wagon Wheel'], ['OHIO', 'M-OH', 'Battle of the Bricks'], ['BALL', 'NIU', 'Bronze Stalk'],
  ['FRES', 'SDSU', 'Old Oil Can'], ['NEV', 'UNLV', 'Fremont Cannon'], ['UNM', 'NMSU', 'Rio Grande Rivalry'], ['UTEP', 'NMSU', 'Battle of I-10'],
  ['WYO', 'CSU', 'Bronze Boot'], ['BSU', 'USU', 'Boise State–Utah State'], ['SJSU', 'FRES', 'Valley Trophy'], ['HAW', 'SJSU', "Dick Tomey Legacy Game"],
  ['APP', 'GASO', 'Deeper Than Hate'], ['GASO', 'GAST', 'Modern Day Hate'], ['ULL', 'ULM', 'Battle on the Bayou'],
  ['USA', 'TROY', 'Battle for the Belt'], ['LT', 'USM', 'Rivalry in Dixie'], ['TXST', 'UTSA', 'I-35 Rivalry'], ['UNT', 'SMU', 'Safeway Bowl'],
  ['MTSU', 'WKU', '100 Miles of Hate'], ['FAU', 'FIU', 'Shula Bowl'], ['JMU', 'ODU', 'Royal Rivalry'], ['MRSH', 'ODU', 'Marshall–Old Dominion'],
  ['MEM', 'UAB', 'Battle for the Bones'], ['TUL', 'MEM', 'Tulane–Memphis'], ['ECU', 'NAVY', 'East Carolina–Navy'], ['TLSA', 'UNT', 'Tulsa–North Texas'],
  ['TEM', 'NAVY', 'Temple–Navy'], ['CLT', 'ECU', 'Charlotte–East Carolina'], ['UCONN', 'UMASS', 'UConn–UMass'], ['BUFF', 'KENT', 'Buffalo–Kent State'],
  ['SAC', 'UNLV', 'Sacramento State–UNLV'], ['NDSU', 'WYO', 'North Dakota State–Wyoming'], ['DEL', 'LIB', 'Delaware–Liberty'], ['JVST', 'KENN', 'Jacksonville State–Kennesaw State'],
  ['SHSU', 'NMSU', 'Sam Houston–New Mexico State'], ['MOST', 'LIB', 'Missouri State–Liberty'], ['ARST', 'ULM', 'Arkansas State–UL Monroe'], ['CCU', 'APP', 'Coastal Carolina–Appalachian State'],
  ['ORST', 'WSU', 'Oregon State–Washington State'], ['TXST', 'UNT', 'Texas State–North Texas'],
];
// Rivals for a school: named rivalries first, then the nearest conference opponent if it has none.
function rivalsFor(id, teams, confOf) {
  const out = []; RIVALRIES.forEach(([a, b, nm]) => { if (a === id && teams[b]) out.push([b, nm]); else if (b === id && teams[a]) out.push([a, nm]); });
  if (!out.length) {
    const st = TEAM_STATE[id]; const mates = Object.keys(teams).filter(x => x !== id && confOf(x) === confOf(id));
    const near = mates.sort((x, y) => ((TEAM_STATE[y] === st) - (TEAM_STATE[x] === st)) || ((REGION_OF[TEAM_STATE[y]] === REGION_OF[st]) - (REGION_OF[TEAM_STATE[x]] === REGION_OF[st])) || x.localeCompare(y))[0];
    if (near) out.push([near, teamsName(teams, id) + '–' + teamsName(teams, near)]);
  }
  return out.slice(0, 3);
}
function teamsName(teams, id) { return teams[id] ? teams[id].name : id; }
// The school the player runs in AD mode. Michigan for every save made before v8.
let ME = 'MICH';

const STADIUM_CAP = 107601;
const REV_SHARE_CAP = 20.5;
const ROSTER_LIMIT = 105;

/* ---------- Michigan roster (real 2026 names; ratings are game estimates) ---------- */
const ROSTER_SRC = `0|Kendrick Bell|WR|Sr|6-2|202|Kansas City, Mo.
0|Jyaire Hill|CB|Sr|6-2|190|Kankakee, Ill.
1|Rod Moore Jr.|S|Gr|5-11|190|Dayton, Ohio
2|Shamari Earls|CB|So|6-2|195|Richmond, Va.
3|Andrew Marsh|WR|So|6-1|192|Katy, Texas
3|Smith Snowden|CB|Sr|5-10|188|Lehi, Utah
4|Chase Taylor|LB|So|6-2|222|Ellenwood, Ga.
5|Jacob Oden|S|Jr|6-0|195|Detroit, Mich.
5|Savion Hiter|RB|Fr|5-11|212|Louisa, Va.
6|Jordan Young|S|So|5-11|193|Monroe, N.C.
6|JJ Buchanan|WR|So|6-4|218|Henderson, Nev.
7|Chris Bracy|S|Jr|6-1|200|Mobile, Ala.
8|Dom Nichols|DE|Jr|6-5|245|Frederick, Md.
9|Channing Goodwin|WR|Jr|6-1|192|Charlotte, N.C.
9|Cam Brandt|DE|Sr|6-3|270|Carson, Calif.
10|Zeke Berry|CB|Gr|5-11|188|Pittsburg, Calif.
10|Jaime Ffrench Jr.|WR|So|6-2|185|Jacksonville, Fla.
12|Nathaniel Owusu-Boateng|LB|So|6-1|216|Hyattsville, Md.
12|Salesi Moa|WR|Fr|6-2|186|Ogden, Utah
13|Travis Johnson|WR|Fr|6-3|185|Chesapeake, Va.
13|Aisea Moa|LB|Gr|6-2|235|North Ogden, Utah
14|Tommy Carr|QB|Fr|6-4|195|Saline, Mich.
14|Carter Meadows|DE|Fr|6-7|252|Bethesda, Md.
15|Chase Herbstreit|QB|So|6-1|210|Cincinnati, Ohio
15|Aden Reeder|LB|Fr|6-2|223|Monroe, Ohio
16|Jo'Ziah Edmond|CB|Jr|6-1|185|Indianapolis, Ind.
16|Brayden Fowler-Nicolosi|QB|Gr|6-3|212|Aledo, Texas
17|Enow Etta|DT|Sr|6-5|328|Keller, Texas
17|Brady Smigiel|QB|Fr|6-4|217|Thousand Oaks, Calif.
18|Troy Bowles|LB|Sr|6-0|224|Tampa, Fla.
18|Mason Bonner|TE|Fr|6-7|229|Lakewood, Colo.
19|Bryce Underwood|QB|So|6-4|230|Detroit, Mich.
20|I'Marion Stewart|CB|Jr|5-10|175|Chicago, Ill.
20|Jaylen Pile|WR|Fr|6-0|196|Grapevine, Texas
22|Jordan Deck|S|Fr|6-1|195|Little Elm, Texas
22|Braydon Alford|WR|Jr|5-8|180|Dublin, Ohio
23|Jordan Marshall|RB|Jr|5-10|220|Cincinnati, Ohio
23|Markel Dabney|LB|Fr|6-0|241|Chesterfield, Va.
24|Bryson Kuzdzal|RB|Sr|5-11|205|Grand Rapids, Mich.
24|Jamarion Vincent|CB|Fr|6-2|169|Waco, Texas
25|Mason Curtis|S|Jr|6-4|215|Nashville, Tenn.
25|Micah Ka'apana|RB|Jr|5-10|192|Waianae, Hawaii
26|Donovan Johnson|RB|So|6-0|220|Savannah, Ga.
27|Ernest Nunley|S|Fr|6-1|186|Carson, Calif.
28|Kainoa Winston|S|So|5-10|202|Montgomery Village, Md.
29|Jonathan Brown|RB|Fr|6-0|196|Westerville, Ohio
30|Max Alford|LB|Gr|6-2|235|Park City, Utah
31|Nico Andrighetto|S|Gr|5-9|195|Mountain View, Calif.
32|Jeremiah Lowe|CB|Jr|5-10|182|Lexington, Ky.
32|Gary Stacy|RB|So|6-1|207|Grosse Pointe Woods, Mich.
33|Kaden Catchings|LB|Fr|6-1|220|Jackson, Miss.
33|Cam Brown|P|So|6-3|185|Coolangatta, Australia
34|John Weidenbach|LB|Sr|5-11|216|Naperville, Ill.
35|Stuart Blake|K|Jr|6-1|183|Jenkintown, Pa.
35|Ndi Etta|LB|Fr|6-1|215|Keller, Texas
36|Josh Nichols|CB|Gr|5-10|215|Detroit, Mich.
36|Tomas O'Meara|RB|Jr|5-10|197|Ann Arbor, Mich.
37|Julius Holly|DE|So|6-3|234|Alpharetta, Ga.
38|Bryce Wilcox|WR|Gr|5-10|180|Sharpsburg, Ga.
38|Sam Baron|CB|Sr|6-1|192|Cadillac, Mich.
39|Max Reyes|S|Gr|5-11|195|Southlake, Texas
39|Ayden Schlecht|RB|Fr|5-11|185|Ann Arbor, Mich.
40|Jimmy Pisani|TE|Sr|6-4|236|Clarendon Hills, Ill.
41|Tariq Boney|DE|Fr|6-1|243|Washington, D.C.
42|Jeffrey Chukwu|CB|Jr|6-1|204|Severna Park, Md.
42|Jalen Hoffman|TE|Sr|6-3|247|Burke, Va.
43|Zach Ludwig|LB|Jr|6-2|219|South Park, Pa.
43|Jack Treutelaar|LS|Fr|6-0|210|Libertyville, Ill.
44|Eli Owens|TE|So|6-1|247|Alcoa, Tenn.
44|Nathaniel Staehling|LB|Gr|6-3|241|Baxter, Minn.
46|Crandall Quinn|TE|Sr|6-2|242|Grand Rapids, Mich.
46|Gavin Magorien|LS|So|5-11|210|Erie, Pa.
49|Adam Bazzi|LB|Jr|5-10|220|Rochester Hills, Mich.
49|Nico Crawford|LS|Gr|6-0|230|Dublin, Ohio
50|Luke Hamilton|OL|Jr|6-3|298|Avon, Ohio
51|McHale Blade|DE|Fr|6-4|255|Country Club Hills, Ill.
52|Ace Hamilton|OL|Fr|6-2|288|Clinton, Md.
52|Christian Pierce|LB|So|6-0|225|Chicago, Ill.
53|Jake Guarnera|OL|Jr|6-3|315|Ponte Vedra Beach, Fla.
54|Deyvid Palepale|DT|Jr|6-2|322|Anchorage, Alaska
54|Andrew Sprague|OL|Jr|6-7|310|Kansas City, Mo.
55|Nathan Efobi|OL|Sr|6-4|303|Atlanta, Ga.
56|Alister Vallejo|DT|Fr|6-3|307|Liberty Hill, Texas
57|Travis Moten|DT|So|6-5|330|Louisville, Ky.
58|Malakai Lee|OL|Fr|6-7|359|Kaneohe, Hawaii
60|Brooks Bahr|OL|Sr|6-6|315|Lake Forest, Ill.
64|James Kavouklis|OL|Gr|6-1|288|Tampa, Fla.
65|Andrew Babalola|OL|So|6-6|305|Overland Park, Kan.
66|Dan Taraboi|OL|Gr|6-7|315|Cedarburg, Wis.
67|Trent Middleton|LS|Sr|6-1|215|Fullerton, Calif.
67|Houston Ka'aha'aina-Torres|OL|So|6-4|310|Waimanalo, Hawaii
70|Brady Norton|OL|Sr|6-4|310|Mission Viejo, Calif.
71|Evan Link|OL|Sr|6-6|313|Burke, Va.
72|Peter Donini|OL|So|6-9|288|Summit, N.J.
77|Blake Frazier|OL|Jr|6-6|302|Austin, Texas
78|Marky Walbridge|OL|Fr|6-6|300|Hanover, Mass.
79|Tommy Fraumann|OL|Fr|6-8|279|Wilmette, Ill.
80|Hogan Hansen|TE|Jr|6-6|240|Bellevue, Wash.
81|Jamar Browder|WR|So|6-4|215|Jacksonville, Fla.
83|Zack Marshall|TE|Sr|6-5|245|Carlsbad, Calif.
84|Jacob Washington|WR|So|6-4|198|Harvey, La.
85|Logan Forbes|WR|Gr|6-1|195|Clarkston, Mich.
88|Deakon Tonielli|TE|Sr|6-6|240|Oswego, Ill.
88|Lugard Edokpayi Jr.|DE|Jr|6-7|263|Bowie, Md.
89|Kaleb Schlecht|WR|Sr|6-4|213|Ann Arbor, Mich.
89|Avery Gach|OL|So|6-4|302|Franklin, Mich.
90|Hudson Hollenbeck|P|Gr|6-2|215|Collierville, Tenn.
90|John Henry Daley|DE|Sr|6-5|252|Alpine, Utah
91|Jonah Lea'ea|DT|Sr|6-5|290|San Mateo, Calif.
92|Ted Hammond|DT|Jr|6-4|270|Cincinnati, Ohio
93|Hunter Robertson|P|Sr|6-5|213|Huntington Woods, Mich.
93|Benny Patterson III|DE|So|6-1|257|Newburgh, Ind.
94|Nate Marshall|DE|So|6-3|248|Oak Park, Ill.
95|Trey Pierce|DT|Sr|6-2|310|Chicago, Ill.
96|Manuel Beigel|OL|Jr|6-5|307|Frankfurt, Germany
97|Jacob Baggett|K|Fr|6-1|190|Charlotte, N.C.
97|Titan Davis|DT|Fr|6-4|286|Overland, Mo.
99|Bobby Kanka|DT|So|6-4|295|Howell, Mich.
99|Trey Butkowski|K|So|5-11|179|Orlando, Fla.`;
const KNOWN = {
  'Bryce Underwood': [84, 96], 'Brayden Fowler-Nicolosi': [71, 73], 'Brady Smigiel': [66, 86], 'Chase Herbstreit': [64, 74], 'Tommy Carr': [60, 80],
  'Jordan Marshall': [84, 88], 'Donovan Johnson': [74, 82], 'Savion Hiter': [72, 91], "Micah Ka'apana": [69, 74], 'Bryson Kuzdzal': [67, 68],
  'Andrew Marsh': [83, 92], 'Channing Goodwin': [77, 82], 'JJ Buchanan': [76, 86], 'Kendrick Bell': [76, 78], 'Jaime Ffrench Jr.': [74, 87], 'Jamar Browder': [72, 82], 'Jacob Washington': [70, 80], 'Salesi Moa': [67, 84], 'Travis Johnson': [66, 83],
  'Zack Marshall': [77, 79], 'Hogan Hansen': [75, 84], 'Deakon Tonielli': [72, 74], 'Mason Bonner': [65, 84],
  'Evan Link': [81, 83], 'Andrew Sprague': [80, 86], 'Blake Frazier': [78, 85], 'Jake Guarnera': [78, 83], 'Dan Taraboi': [77, 78], 'Brady Norton': [76, 77], 'Andrew Babalola': [73, 83], 'Brooks Bahr': [72, 74], 'Nathan Efobi': [70, 72], 'Malakai Lee': [68, 90], 'Avery Gach': [66, 78],
  'John Henry Daley': [83, 85], 'Cam Brandt': [78, 80], 'Dom Nichols': [74, 82], 'Lugard Edokpayi Jr.': [73, 82], 'Nate Marshall': [71, 81], 'McHale Blade': [67, 86], 'Carter Meadows': [66, 86], 'Julius Holly': [64, 76], 'Benny Patterson III': [65, 77],
  'Enow Etta': [80, 82], 'Trey Pierce': [78, 80], "Jonah Lea'ea": [76, 78], 'Deyvid Palepale': [74, 80], 'Bobby Kanka': [70, 80], 'Travis Moten': [70, 82], 'Ted Hammond': [66, 74], 'Titan Davis': [62, 82], 'Alister Vallejo': [62, 80],
  'Max Alford': [80, 81], 'Troy Bowles': [79, 80], 'Aisea Moa': [77, 78], 'Chase Taylor': [72, 84], 'Nathaniel Owusu-Boateng': [70, 82], 'Nathaniel Staehling': [68, 69], 'Markel Dabney': [64, 82], 'Aden Reeder': [64, 80], 'Kaden Catchings': [62, 80], 'Zach Ludwig': [62, 68],
  'Jyaire Hill': [81, 85], 'Zeke Berry': [80, 81], 'Smith Snowden': [79, 81], 'Shamari Earls': [72, 84], "Jo'Ziah Edmond": [70, 78], "I'Marion Stewart": [68, 74], 'Jeremiah Lowe': [64, 70], 'Jamarion Vincent': [61, 82], 'Jeffrey Chukwu': [63, 70],
  'Rod Moore Jr.': [81, 82], 'Jacob Oden': [78, 84], 'Mason Curtis': [75, 82], 'Jordan Young': [70, 80], 'Chris Bracy': [70, 77], 'Kainoa Winston': [66, 76], 'Jordan Deck': [62, 80], 'Ernest Nunley': [61, 80],
  'Stuart Blake': [74, 78], 'Jacob Baggett': [70, 80], 'Trey Butkowski': [67, 72], 'Hudson Hollenbeck': [78, 79], 'Hunter Robertson': [65, 68], 'Cam Brown': [64, 74], 'Nico Crawford': [72, 72],
};
const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P', 'LS'];
const START = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DE: 2, DT: 2, LB: 3, CB: 2, S: 2, K: 1, P: 1, LS: 1 };
const POS_NAME = { QB: 'Quarterback', RB: 'Running back', WR: 'Wide receiver', TE: 'Tight end', OL: 'Offensive line', DE: 'Defensive end / Edge', DT: 'Defensive tackle', LB: 'Linebacker', CB: 'Cornerback', S: 'Safety', K: 'Kicker', P: 'Punter', LS: 'Long snapper' };
const SLOT_LABELS = { OL: ['LT', 'LG', 'C', 'RG', 'RT'], WR: ['WR1', 'WR2', 'WR3'], DE: ['EDGE', 'EDGE'], DT: ['DT', 'NT'], LB: ['MIKE', 'WILL', 'SAM'], CB: ['CB1', 'CB2'], S: ['FS', 'SS'] };
const CLASSES = ['Fr', 'So', 'Jr', 'Sr', 'Gr'];

/* ---------- NFL ----------
 * The 32 clubs in their real conferences and divisions. Colors are approximations; `p` is a
 * starting strength (0-100) that drifts season to season. No logos or marks are used. */
const NFL = ('ARI|Arizona|Cardinals|NFC|West|#97233F|#000000|72;ATL|Atlanta|Falcons|NFC|South|#A71930|#000000|72;BAL|Baltimore|Ravens|AFC|North|#241773|#9E7C0C|88;BUF|Buffalo|Bills|AFC|East|#00338D|#C60C30|89;'
  + 'CAR|Carolina|Panthers|NFC|South|#0085CA|#101820|71;CHI|Chicago|Bears|NFC|North|#0B162A|#C83803|78;CIN|Cincinnati|Bengals|AFC|North|#FB4F14|#000000|77;CLE|Cleveland|Browns|AFC|North|#311D00|#FF3C00|62;'
  + 'DAL|Dallas|Cowboys|NFC|East|#003594|#869397|74;DEN|Denver|Broncos|AFC|West|#FB4F14|#002244|82;DET|Detroit|Lions|NFC|North|#0076B6|#B0B7BC|87;GB|Green Bay|Packers|NFC|North|#203731|#FFB612|82;'
  + 'HOU|Houston|Texans|AFC|South|#03202F|#A71930|79;IND|Indianapolis|Colts|AFC|South|#002C5F|#A2AAAD|76;JAX|Jacksonville|Jaguars|AFC|South|#006778|#D7A22A|77;KC|Kansas City|Chiefs|AFC|West|#E31837|#FFB81C|85;'
  + 'LV|Las Vegas|Raiders|AFC|West|#000000|#A5ACAF|64;LAC|Los Angeles|Chargers|AFC|West|#0080C6|#FFC20E|80;LAR|Los Angeles|Rams|NFC|West|#003594|#FFA300|85;MIA|Miami|Dolphins|AFC|East|#008E97|#FC4C02|69;'
  + 'MIN|Minnesota|Vikings|NFC|North|#4F2683|#FFC62F|79;NE|New England|Patriots|AFC|East|#002244|#C60C30|81;NO|New Orleans|Saints|NFC|South|#D3BC8D|#101820|62;NYG|New York|Giants|NFC|East|#0B2265|#A71930|66;'
  + 'NYJ|New York|Jets|AFC|East|#125740|#FFFFFF|63;PHI|Philadelphia|Eagles|NFC|East|#004C54|#A5ACAF|89;PIT|Pittsburgh|Steelers|AFC|North|#FFB612|#101820|75;SF|San Francisco|49ers|NFC|West|#AA0000|#B3995D|79;'
  + 'SEA|Seattle|Seahawks|NFC|West|#002244|#69BE28|85;TB|Tampa Bay|Buccaneers|NFC|South|#D50A0A|#34302B|78;TEN|Tennessee|Titans|AFC|South|#0C2340|#4B92DB|60;WAS|Washington|Commanders|NFC|East|#5A1414|#FFB612|80')
  .split(';').map(r => { const [id, city, nick, conf, div, c1, c2, p] = r.split('|'); return { id, city, nick, name: city + ' ' + nick, conf, div, c1, c2, p: +p }; });
const NFL_BY = Object.fromEntries(NFL.map(t => [t.id, t]));
const NFL_TEAMS = NFL.map(t => t.name); // full names, alphabetical (Player Career saves store these)
const nflName = id => (NFL_BY[id] ? NFL_BY[id].name : id);
const nflId = name => (NFL.find(t => t.name === name) || {}).id;
// 257 picks: 32 a round plus compensatory picks at the end of rounds 3-7
const DRAFT_ROUNDS = [32, 32, 40, 39, 39, 38, 37];
function pickRound(no) { let n = 0; for (let r = 0; r < DRAFT_ROUNDS.length; r++) { n += DRAFT_ROUNDS[r]; if (no <= n) return r + 1; } return 0; }
const DRAFT_PICKS = DRAFT_ROUNDS.reduce((s, n) => s + n, 0);

const FIRST = ['Marcus', 'Jalen', 'Tyler', 'Devin', 'Caleb', 'Isaiah', 'Brandon', 'Elijah', 'Jaden', 'Owen', 'Mason', 'Carter', 'Xavier', 'Darius', 'Nolan', 'Trevor', 'Andre', 'Malik', 'Grant', 'Cole', 'Luke', 'Jonah', 'Micah', 'Dante', 'Keegan', 'Tristan', 'Josiah', 'Aiden', 'Quincy', 'Reid', 'Ty', 'Deshawn', 'Kobe', 'Ryder', 'Bryson', 'Camden', 'Evan', 'Garrett', 'Hunter', 'Jace', 'Kendall', 'Landon', 'Maurice', 'Nate', 'Omar', 'Preston', 'Rashad', 'Silas', 'Terrell', 'Vince', 'Wes', 'Zion', 'Amari', 'Beau', 'Cyrus', 'Dillon', 'Emmett', 'Frank', 'Gavin', 'Hayden'];
const LAST = ['Carter', 'Brooks', 'Hayes', 'Whitfield', 'Mercer', 'Lawson', 'Pryor', 'Kendrick', 'Dawson', 'Ellison', 'Fairley', 'Greer', 'Holloway', 'Ingram', 'Jennings', 'Kirkland', 'Lockett', 'Mayfield', 'Nance', 'Oakley', 'Prescott', 'Quarles', 'Ridley', 'Sampson', 'Tatum', 'Upshaw', 'Vaughn', 'Walton', 'Yates', 'Ziegler', 'Abernathy', 'Bishop', 'Crowder', 'Delaney', 'Easley', 'Fontenot', 'Gaines', 'Harlan', 'Irby', 'Judkins', 'Kessler', 'Lindqvist', 'Monroe', 'Novak', 'Ortega', 'Pemberton', 'Radcliffe', 'Sutton', 'Thibodeaux', 'Underhill', 'Voss', 'Winslow', 'Yarbrough', 'Alcott', 'Barksdale', 'Calloway', 'Dunmore', 'Everett', 'Fitzgerald', 'Galloway', 'Hendrix', 'Iverson', 'Jefferson', 'Kowalski', 'Langford', 'McCray', 'Nwosu', 'Okafor', 'Petrakis', 'Rhodes', 'Stallworth', 'Tillman', 'Valdez', 'Whitaker', 'Adeyemi', 'Boone', 'Castellano', 'Drummond', 'Espinoza', 'Faulkner'];
// hometowns for generated players: [town, state]
const TOWNS = `Detroit, Mich.|MI;Grand Rapids, Mich.|MI;Saginaw, Mich.|MI;Belleville, Mich.|MI;West Bloomfield, Mich.|MI;Ann Arbor, Mich.|MI;Lansing, Mich.|MI;Cincinnati, Ohio|OH;Columbus, Ohio|OH;Cleveland, Ohio|OH;Toledo, Ohio|OH;Chicago, Ill.|IL;Naperville, Ill.|IL;Indianapolis, Ind.|IN;Fort Wayne, Ind.|IN;Atlanta, Ga.|GA;Savannah, Ga.|GA;Valdosta, Ga.|GA;Marietta, Ga.|GA;Miami, Fla.|FL;Tampa, Fla.|FL;Jacksonville, Fla.|FL;Orlando, Fla.|FL;Fort Lauderdale, Fla.|FL;Houston, Texas|TX;Dallas, Texas|TX;Austin, Texas|TX;San Antonio, Texas|TX;Katy, Texas|TX;Allen, Texas|TX;Lubbock, Texas|TX;Los Angeles, Calif.|CA;Santa Ana, Calif.|CA;San Diego, Calif.|CA;Sacramento, Calif.|CA;Oakland, Calif.|CA;Charlotte, N.C.|NC;Raleigh, N.C.|NC;Baltimore, Md.|MD;Washington, D.C.|DC;Philadelphia, Pa.|PA;Pittsburgh, Pa.|PA;Nashville, Tenn.|TN;Memphis, Tenn.|TN;New Orleans, La.|LA;Baton Rouge, La.|LA;Shreveport, La.|LA;St. Louis, Mo.|MO;Kansas City, Mo.|MO;Salt Lake City, Utah|UT;Honolulu, Hawaii|HI;Newark, N.J.|NJ;Richmond, Va.|VA;Virginia Beach, Va.|VA;Phoenix, Ariz.|AZ;Tucson, Ariz.|AZ;Minneapolis, Minn.|MN;Birmingham, Ala.|AL;Mobile, Ala.|AL;Jackson, Miss.|MS;Columbia, S.C.|SC;Greenville, S.C.|SC;Louisville, Ky.|KY;Tulsa, Okla.|OK;Oklahoma City, Okla.|OK;Little Rock, Ark.|AR;Wichita, Kan.|KS;Omaha, Neb.|NE;Des Moines, Iowa|IA;Milwaukee, Wis.|WI;Denver, Colo.|CO;Seattle, Wash.|WA;Tacoma, Wash.|WA;Portland, Ore.|OR;Las Vegas, Nev.|NV;Albuquerque, N.M.|NM;Boise, Idaho|ID;Cheyenne, Wyo.|WY;Fargo, N.D.|ND;Charleston, W.Va.|WV;Buffalo, N.Y.|NY;Rochester, N.Y.|NY;Boston, Mass.|MA;Hartford, Conn.|CT;Wilmington, Del.|DE`.split(';').map(s => s.split('|'));
// a recruit's hometown: about one in five comes from the school's own state
function recruitTown(st) { const local = TOWNS.filter(t => t[1] === st); return local.length && R() < 0.22 ? pick(local) : pick(TOWNS); }
const genName = () => pick(FIRST) + ' ' + pick(LAST);
const POS_BODY = { QB: [74, 78, 200, 230], RB: [69, 73, 190, 225], WR: [70, 76, 175, 215], TE: [75, 79, 230, 255], OL: [75, 80, 290, 330], DE: [74, 79, 235, 275], DT: [73, 77, 280, 330], LB: [72, 75, 215, 245], CB: [70, 74, 170, 200], S: [71, 75, 185, 215], K: [70, 74, 175, 200], P: [72, 76, 190, 220], LS: [71, 74, 210, 235] };
function genBody(pos) { const b = POS_BODY[pos]; const h = ri(b[0], b[1]); return { ht: Math.floor(h / 12) + '-' + (h % 12), wt: ri(b[2], b[3]) }; }

/* ---------- Coaching staff ---------- */
function mkCoach(o) { return Object.assign({ id: 'c' + Math.floor(R() * 1e9), real: true }, o); }
function initialStaff() {
  return {
    HC: mkCoach({ name: 'Kyle Whittingham', role: 'HC', title: 'Head Coach', off: 80, def: 88, rec: 72, dev: 88, gm: 86, salary: 8.0, years: 5, note: 'First season in Ann Arbor after 21 years at Utah' }),
    OC: mkCoach({ name: 'Jason Beck', role: 'OC', title: 'Offensive Coordinator / QBs', ovr: 78, rec: 70, dev: 78, salary: 1.8, years: 3 }),
    DC: mkCoach({ name: 'Jay Hill', role: 'DC', title: 'Defensive Coordinator', ovr: 82, rec: 72, dev: 80, salary: 1.9, years: 3 }),
    ST: mkCoach({ name: 'Kerry Coombs', role: 'ST', title: 'Special Teams Coordinator', ovr: 76, rec: 74, dev: 76, salary: 0.9, years: 2 }),
    OL: mkCoach({ name: 'Jim Harding', role: 'OL', title: 'Asst. Head Coach / Offensive Line', ovr: 82, rec: 72, dev: 84, salary: 1.2, years: 3 }),
    RB: mkCoach({ name: 'Tony Alford', role: 'RB', title: 'Run Game Coordinator / RBs', ovr: 78, rec: 82, dev: 77, salary: 0.9, years: 2 }),
    QB: mkCoach({ name: 'Koy Detmer', role: 'QB', title: 'Quarterbacks', ovr: 72, rec: 68, dev: 74, salary: 0.6, years: 2 }),
    WR: mkCoach({ name: 'Micah Simon', role: 'WR', title: 'Wide Receivers', ovr: 74, rec: 78, dev: 74, salary: 0.7, years: 2 }),
    TE: mkCoach({ name: 'Freddie Whittingham', role: 'TE', title: 'Tight Ends', ovr: 72, rec: 70, dev: 74, salary: 0.5, years: 2 }),
    DE: mkCoach({ name: 'Lewis Powell', role: 'DE', title: 'Run Game Coordinator / DEs', ovr: 76, rec: 76, dev: 77, salary: 0.8, years: 2 }),
    DT: mkCoach({ name: 'Larry Black', role: 'DT', title: 'Defensive Tackles', ovr: 73, rec: 75, dev: 74, salary: 0.6, years: 2 }),
    LB: mkCoach({ name: 'Alex Whittingham', role: 'LB', title: 'Linebackers', ovr: 73, rec: 70, dev: 75, salary: 0.6, years: 2 }),
    CB: mkCoach({ name: 'Jernaro Gilford', role: 'CB', title: 'Cornerbacks', ovr: 75, rec: 77, dev: 76, salary: 0.7, years: 2 }),
    S: mkCoach({ name: 'Tyler Stockton', role: 'S', title: 'Safeties', ovr: 72, rec: 70, dev: 73, salary: 0.5, years: 2 }),
  };
}
const STAFF_ROLES = ['HC', 'OC', 'DC', 'ST', 'QB', 'RB', 'WR', 'TE', 'OL', 'DE', 'DT', 'LB', 'CB', 'S'];
const ROLE_TITLE = { HC: 'Head Coach', OC: 'Offensive Coordinator', DC: 'Defensive Coordinator', ST: 'Special Teams Coordinator', QB: 'Quarterbacks', RB: 'Running Backs', WR: 'Wide Receivers', TE: 'Tight Ends', OL: 'Offensive Line', DE: 'Defensive Ends', DT: 'Defensive Tackles', LB: 'Linebackers', CB: 'Cornerbacks', S: 'Safeties' };
const POS_COACH = { QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', OL: 'OL', DE: 'DE', DT: 'DT', LB: 'LB', CB: 'CB', S: 'S', K: 'ST', P: 'ST', LS: 'ST' };
function coachOvr(c) { if (!c) return 0; return c.role === 'HC' ? Math.round((c.off + c.def + c.rec + c.dev + c.gm) / 5) : c.ovr; }
function genCandidates(role, n) {
  const out = [];
  const bgHC = ['Head coach, Sun Belt program', 'Head coach, MAC program', 'Head coach, American program', 'Head coach, Mountain West program', 'Former Power Four head coach', 'NFL coordinator', 'Big Ten defensive coordinator', 'SEC offensive coordinator', 'Head coach, FCS power', 'Big 12 head coach'];
  const bgC = ['Coordinator, Power Four program', 'Coordinator, Group of Six program', 'NFL position coach', 'Analyst, SEC program', 'Former Big Ten coordinator', 'Position coach, Big 12 program', 'Head coach, Division II'];
  for (let i = 0; i < n; i++) {
    const tier = R();
    if (role === 'HC') {
      const b = tier < 0.2 ? 84 : tier < 0.6 ? 78 : 72;
      const c = mkCoach({ name: genName(), role, title: ROLE_TITLE[role], real: false, bg: pick(bgHC), off: clamp(b + ri(-8, 8), 55, 95), def: clamp(b + ri(-8, 8), 55, 95), rec: clamp(b + ri(-10, 10), 50, 97), dev: clamp(b + ri(-8, 8), 55, 95), gm: clamp(b + ri(-8, 8), 55, 95), age: ri(36, 64), years: ri(4, 7) });
      c.salary = r1(clamp(2.5 + (coachOvr(c) - 70) * 0.4 + rnd(-0.6, 0.6), 2.0, 11) * (typeof state !== 'undefined' && state && state.my ? Math.max(0.3, econ()) : 1));
      out.push(c);
    } else {
      const b = tier < 0.2 ? 82 : tier < 0.6 ? 76 : 70;
      const c = mkCoach({ name: genName(), role, title: ROLE_TITLE[role], real: false, bg: pick(bgC), ovr: clamp(b + ri(-6, 6), 55, 94), rec: clamp(b + ri(-10, 10), 50, 96), dev: clamp(b + ri(-8, 8), 55, 94), age: ri(30, 60), years: ri(2, 4) });
      const baseSal = ['OC', 'DC'].includes(role) ? 1.0 : role === 'ST' ? 0.5 : 0.35;
      c.salary = r1(clamp(baseSal + (c.ovr - 70) * (['OC', 'DC'].includes(role) ? 0.09 : 0.04) + rnd(-0.15, 0.15), 0.25, 3.5) * (typeof state !== 'undefined' && state && state.my ? Math.max(0.3, econ()) : 1));
      out.push(c);
    }
  }
  // now and then a former assistant from your coaching tree is available (coaching tree)
  if (typeof treeCandidate === 'function' && typeof state !== 'undefined' && state && state.staff && state.cands) { const tc = treeCandidate(role); if (tc) out.push(tc); }
  return out.sort((a, b) => coachOvr(b) - coachOvr(a));
}

/* ---------- Facilities ---------- */
const FAC_DEFS = [
  { id: 'stadium', name: 'Michigan Stadium', desc: 'Game-day experience, premium seating, video boards', eff: 'Ticket demand and premium revenue', lvl: 4 },
  { id: 'building', name: 'Schembechler Hall', desc: 'Football building: locker room, meeting rooms, lounge', eff: 'Recruiting pull', lvl: 4 },
  { id: 'indoor', name: 'Al Glick Field House', desc: 'Indoor practice facility', eff: 'Player development', lvl: 4 },
  { id: 'weight', name: 'Strength & Conditioning', desc: 'Weight room and sports science', eff: 'Development, fewer injuries', lvl: 4 },
  { id: 'med', name: 'Sports Medicine & Recovery', desc: 'Training room, recovery, nutrition', eff: 'Injury rate and recovery time', lvl: 3 },
  { id: 'academic', name: 'Player Development Center', desc: 'Academics, career and NIL education', eff: 'Retention and locker-room morale', lvl: 3 },
];
const facCost = lvl => 12 + lvl * 9;


/* ---------- v2 data ---------- */
const r2 = x => Math.round(x * 100) / 100;
const DIFF = {
  easy: { label: 'Easy', opp: -1.8, money: 1.12, fire: 3, neg: 0.7, desc: 'Weaker opponents, more money, a patient board.' },
  normal: { label: 'Normal', opp: 0, money: 1, fire: 8, neg: 1, desc: 'The default balance.' },
  hard: { label: 'Hard', opp: 2, money: 0.92, fire: 15, neg: 1.3, desc: 'Stronger opponents, tighter budget, an impatient board.' },
};
const TRAITS = { QB: ['arm', 'acc', 'mob'], RB: ['spd', 'pow', 'hnd'], WR: ['spd', 'hnd', 'rte'], TE: ['blk', 'hnd'], OL: ['pbk', 'rbk'], DE: ['rsh', 'rnd'], DT: ['rnd', 'rsh'], LB: ['tkl', 'cov', 'rsh'], CB: ['cov', 'spd'], S: ['cov', 'tkl'], K: ['kpw', 'kac'], P: ['kpw', 'kac'], LS: ['snp'] };
const TRAIT_NAME = { arm: 'Arm', acc: 'Accuracy', mob: 'Mobility', spd: 'Speed', pow: 'Power', hnd: 'Hands', rte: 'Routes', blk: 'Blocking', pbk: 'Pass block', rbk: 'Run block', rsh: 'Pass rush', rnd: 'Run defense', tkl: 'Tackling', cov: 'Coverage', kpw: 'Leg power', kac: 'Accuracy', snp: 'Snapping' };
const TRAIT_OVERRIDE = { 'Bryce Underwood': { arm: 88, acc: 78, mob: 87 }, 'Jordan Marshall': { spd: 80, pow: 89, hnd: 83 }, 'Andrew Marsh': { spd: 86, hnd: 84, rte: 80 }, 'John Henry Daley': { rsh: 87, rnd: 79 } };
const SWITCH = { QB: ['WR'], RB: ['WR', 'LB'], WR: ['TE', 'RB', 'CB'], TE: ['WR', 'OL', 'DE'], OL: ['DT', 'TE'], DE: ['LB', 'DT', 'TE'], DT: ['DE', 'OL'], LB: ['DE', 'S'], CB: ['S', 'WR'], S: ['CB', 'LB'], K: ['P'], P: ['K'], LS: [] };
const PAY_MULT = { QB: 2.2, DE: 1.3, OL: 1.1, WR: 1.1, CB: 1.1, RB: 0.9, TE: 0.8, DT: 1.0, LB: 0.9, S: 0.9, K: 0.3, P: 0.3, LS: 0.2 };
const RIVAL_DATA = {
  OSU: { name: 'The Game', trophy: null, w: 62, l: 52, t: 6, note: 'All-time series through 2025' },
  MSU: { name: 'Paul Bunyan Trophy', trophy: 'Paul Bunyan Trophy', w: 42, l: 29, t: 2, note: 'Record in Paul Bunyan Trophy games' },
  MINN: { name: 'Little Brown Jug', trophy: 'Little Brown Jug', w: 74, l: 23, t: 2, note: 'Record in Little Brown Jug games' },
};
const OFF_PLANS = { balanced: { label: 'Balanced', desc: 'No lean either way.' }, run: { label: 'Run-heavy', desc: 'Lean on the backs and the line. Steadier results.' }, air: { label: 'Air raid', desc: 'Spread it out and throw. Bigger swings, more turnovers.' } };
const DEF_PLANS = { balanced: { label: 'Balanced', desc: 'Base defense.' }, box: { label: 'Stop the run', desc: 'Load the box. Great against run teams, risky against passers.' }, blitz: { label: 'Blitz-heavy', desc: 'More sacks and takeaways, more big plays allowed.' }, soft: { label: "Bend, don't break", desc: 'Give up yards, not touchdowns. More field goals allowed.' } };
const NEUTRAL_SITES = ['Atlanta (Mercedes-Benz Stadium)', 'Arlington (AT&T Stadium)', 'Las Vegas (Allegiant Stadium)', 'Charlotte (Bank of America Stadium)', 'Dublin, Ireland (Aviva Stadium)', 'Green Bay (Lambeau Field)', 'Houston (NRG Stadium)'];

/* ---------- v3 data ---------- */
const COLD = new Set(['ILL', 'IU', 'IOWA', 'MD', 'MICH', 'MSU', 'MINN', 'NEB', 'NW', 'OSU', 'PSU', 'PUR', 'RUTG', 'WIS', 'ND', 'BC', 'SYR', 'PITT', 'WVU', 'ISU', 'KSU', 'KU', 'WYO', 'AF', 'CSU', 'BSU', 'UTAH', 'USU', 'NDSU', 'UCONN', 'UMASS', 'ARMY', 'TEM', 'CIN', 'LOU', 'COLO', 'AKR', 'BALL', 'BGSU', 'BUFF', 'CMU', 'EMU', 'KENT', 'M-OH', 'OHIO', 'TOL', 'WMU', 'NIU', 'UNM', 'NEV', 'VT', 'UVA']);
const RAINY = new Set(['ORE', 'ORST', 'UW', 'WSU', 'CAL', 'STAN']);
const HOT = new Set(['ALA', 'ARK', 'AUB', 'FLA', 'UGA', 'LSU', 'MISS', 'MSST', 'SC', 'TEX', 'TAMU', 'OU', 'TENN', 'VAN', 'MIZ', 'MIA', 'FSU', 'GT', 'CLEM', 'SMU', 'TCU', 'BAY', 'TTU', 'HOU', 'UCF', 'ASU', 'ARIZ', 'TXST', 'UTEP', 'NMSU', 'USF', 'FAU', 'FIU', 'TUL', 'RICE', 'UNT', 'UTSA', 'MEM', 'UAB', 'USA', 'USM', 'TROY', 'ULL', 'ULM', 'LT', 'ARST', 'GASO', 'GAST', 'CCU', 'JVST', 'KENN', 'SHSU', 'LIB', 'HAW', 'OKST']);
const WX = {
  clear: { label: 'Clear', icon: '☀' }, rain: { label: 'Rain', pass: -1.2, to: 0.02, kick: -3 }, wind: { label: 'Windy', pass: -1.0, kick: -9 },
  snow: { label: 'Snow', pass: -1.8, run: 0.6, tdx: 0.9, kick: -10, to: 0.015 }, cold: { label: 'Bitter cold', pass: -0.5, kick: -5 }, heat: { label: 'Hot and humid', both: -0.3 },
};
const PERS = {
  leader: { label: 'Leader', desc: 'Lifts the locker room when he starts. Makes a strong captain.' }, worker: { label: 'Hard worker', desc: 'Develops about 30% faster in the offseason.' },
  clutch: { label: 'Clutch', desc: 'Plays better in the fourth quarter and on final drives.' }, steady: { label: 'Steady', desc: 'No surprises either way.' },
  diva: { label: 'Diva', desc: 'Sulks when he is not starting and is quicker to transfer.' }, fragile: { label: 'Injury-prone', desc: 'Gets hurt about twice as often.' },
};
const INJ_TYPES = [['Ankle sprain', 1, 2, 30], ['Hamstring strain', 1, 3, 20], ['Concussion', 1, 2, 12], ['Shoulder sprain', 2, 4, 12], ['High ankle sprain', 3, 6, 9], ['Knee sprain (MCL)', 3, 6, 8], ['Broken hand', 3, 5, 4], ['Torn ACL', 99, 99, 3], ['Torn Achilles', 99, 99, 2]];
const PRACTICE = {
  balanced: { label: 'Balanced', desc: 'No lean. The default.' }, offense: { label: 'Offense', desc: '+1 offense, −0.5 defense this week.' }, defense: { label: 'Defense', desc: '+1 defense, −0.5 offense this week.' },
  special: { label: 'Special teams', desc: '+2 special teams this week.' }, conditioning: { label: 'Conditioning', desc: 'About 40% fewer injuries. No rating bonus.' }, youth: { label: 'Develop young players', desc: '−0.5 on game day, but backups who are freshmen or sophomores grow faster.' },
};
const CALLS = { inside: 'Inside run', outside: 'Outside run', short: 'Short pass', deep: 'Deep shot', screen: 'Screen' };
// approximate conference tie-ins (A vs B), in selection order
const BOWL_TIES = [['Citrus Bowl', 'B1G', 'SEC'], ['ReliaQuest Bowl', 'B1G', 'SEC'], ['Alamo Bowl', 'B12', 'P12'], ['Pop-Tarts Bowl', 'ACC', 'B12'], ['Gator Bowl', 'SEC', 'ACC'], ['Music City Bowl', 'B1G', 'SEC'], ['Holiday Bowl', 'ACC', 'P12'], ['Sun Bowl', 'ACC', 'P12'], ['Las Vegas Bowl', 'B1G', 'SEC'], ['Texas Bowl', 'B12', 'SEC'], ['Liberty Bowl', 'B12', 'SEC'], ['Duke\'s Mayo Bowl', 'ACC', 'B1G'], ['Pinstripe Bowl', 'B1G', 'ACC'], ['Cactus Bowl', 'B1G', 'B12'], ['Military Bowl', 'ACC', 'AAC'], ['Birmingham Bowl', 'SEC', 'AAC'], ['Fenway Bowl', 'ACC', 'AAC'], ['Armed Forces Bowl', 'AAC', 'B12'], ['Gasparilla Bowl', 'SEC', 'AAC'], ['First Responder Bowl', 'AAC', 'CUSA'], ['Independence Bowl', 'SBC', 'AAC'], ['Arizona Bowl', 'MW', 'MAC'], ['Hawaii Bowl', 'MW', 'AAC'], ['New Mexico Bowl', 'MW', 'CUSA'], ['Poinsettia Bowl', 'MW', 'P12'], ['New Orleans Bowl', 'SBC', 'CUSA'], ['Frisco Bowl', 'MW', 'AAC'], ['Cure Bowl', 'SBC', 'AAC'], ['Puerto Rico Bowl', 'MAC', 'CUSA'], ['Famous Idaho Potato Bowl', 'MW', 'MAC'], ['Myrtle Beach Bowl', 'SBC', 'MAC'], ['Boca Raton Bowl', 'AAC', 'MAC'], ['Frisco Football Classic', 'CUSA', 'MAC'], ['Salute to Veterans Bowl', 'SBC', 'MAC'], ['68 Ventures Bowl', 'SBC', 'MAC']];
const ORDER16 = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];
const QF_NAMES = ['Rose Bowl (CFP Quarterfinal)', 'Orange Bowl (CFP Quarterfinal)', 'Sugar Bowl (CFP Quarterfinal)', 'Cotton Bowl (CFP Quarterfinal)'];
const SF_NAMES = ['Fiesta Bowl (CFP Semifinal)', 'Peach Bowl (CFP Semifinal)'];
const ACH = [
  ['first_win', 'First of many', 'Win your first game as AD.', 5], ['ten', 'Double digits', 'Win 10 or more games in a season.', 15], ['beat_osu', 'Beat your archrival', 'Win your archrival game.', 15],
  ['osu5', 'Five straight', 'Beat your archrival five years in a row.', 60], ['triple', 'Trophy sweep', 'Beat every one of your rivals in the same season.', 30], ['no1', 'Number one', 'Reach No. 1 in the AP poll.', 25],
  ['b1g', 'Conference champions', 'Win your conference title game.', 40], ['cfp', 'Playoff bound', 'Make the College Football Playoff.', 20], ['natl', 'National champions', 'Win the national championship.', 100],
  ['undefeated', 'Perfect season', 'Finish a season without a loss.', 80], ['blowout', 'Statement win', 'Beat a top-10 team by 21 or more.', 20], ['comeback', 'Comeback kids', 'Win after trailing by 17 or more.', 20],
  ['heisman', 'Heisman house', 'Coach a Heisman Trophy winner.', 40], ['picks3', 'Draft factory', 'Have three first-round picks in one draft.', 40], ['class5', 'Top-five class', 'Sign a top-five recruiting class.', 25],
  ['walkon', 'Walk-on to starter', 'Start a former walk-on.', 15], ['profit3', 'In the black', 'Turn a football profit three seasons in a row.', 20], ['profit_all', 'Never in the red', 'Turn a profit in each of your first five seasons.', 40],
  ['fullhouse', 'Packed house', 'Sell out every home game in a season.', 15], ['maxfac', 'State of the art', 'Get a facility to level 5.', 15], ['hard', 'Hard mode survivor', 'Finish a season on Hard without being fired.', 20],
  ['clean', 'Squeaky clean', 'Go five seasons without an NCAA investigation.', 20], ['decade', 'Decade in charge', 'Complete ten seasons.', 50],
  ['rec_game', 'Record breaker', 'A player breaks a single-game record in your record book.', 10], ['rec_season', 'Season for the ages', 'A player breaks a single-season record.', 15], ['rec_career', 'All-time leader', 'A player becomes the career leader in a stat, passing the old record holder.', 20],
  ['rec_team', 'Best team ever', 'Break a team record: wins, points, defense, margin of victory or winning streak.', 20], ['rec_five', 'Rewriting the book', 'Break five records in one season.', 30],
];
const LEGACY_MULT = { easy: 0.8, normal: 1, hard: 1.3 };
const TIERS = { power: { label: 'Powerhouse', base: 79 }, mid: { label: 'Middle of the pack', base: 70 }, rebuild: { label: 'Rebuild job', base: 61 } };
const DEAL_DEFS = [{ id: 'apparel', name: 'Apparel & outfitter deal', amt: 14, thru: 2027 }, { id: 'mm', name: 'Multimedia rights (radio, signage, sponsors)', amt: 11, thru: 2029 }, { id: 'stream', name: 'Streaming & shoulder programming', amt: 3, thru: 2026 }];

