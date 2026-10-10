/* ===== 07-chars-more: 16 more characters to buy =====
   A pure data module: it APPENDS to CHARS (never inserts – `selected` and online picks are indexes into CHARS, so the
   order of the first 80 must never change), and fills PRICES / CHAR_ST / CHAR_NAMES for the new ids.
   The four Israelis are pushed into ISRAELI_IDS (that is how the gallery badge and the shop's 🇮🇱 filter detect them).
   Rarity (10-shop charRarity): ≤1000 bronze · ≤3000 silver · ≤7200 gold · above = icon.
   Note: the core already ran its "every other price ×1.2" pass, so the prices below are exact.
   Not trophy-road rewards (TROPHY_ROAD was computed from the first 80 at load) – they are simply for sale. */
const CHARS_MORE=[
  /* --- world stars, today --- */
  { id:'mitoma',   name:'מיטומה',          skin:'#F1D3B3', skinDark:'#c9a07a', hair:'short', hairColor:'#111111',
    jersey:'#0057B8', stripes:'#ffffff', numColor:'#ffffff', shorts:'#ffffff', socks:'#0057B8', number:22, beard:false, brows:'round',
    names:['Mitoma','ميتوما','Митома'], price:700,  st:[1.12,.95,1,1] },
  { id:'alvarez',  name:'חוליאן אלווארס',  skin:'#E8B892', skinDark:'#b07a55', hair:'short', hairColor:'#2a1c12',
    jersey:'#CE3524', stripes:'#ffffff', numColor:'#1B2A4E', shorts:'#1B2A4E', socks:'#CE3524', number:19, beard:false, brows:'round',
    names:['Julián Álvarez','خوليان ألفاريز','Хулиан Альварес'], price:1000, st:[1.05,1.05,1.05,1] },
  { id:'raphinha', name:'רפיניה',          skin:'#C68642', skinDark:'#8a5a2a', hair:'short', hairColor:'#161616',
    jersey:'#A50044', stripes:'#004D98', numColor:'#FFD447', shorts:'#004D98', socks:'#A50044', number:11, beard:true, beardColor:'#161616', brows:'sharp',
    names:['Raphinha','رافينيا','Рафинья'], price:1500, st:[1.1,1,1,.95] },
  { id:'odegaard', name:'אודגור',          skin:'#F3D2B3', skinDark:'#c49a72', hair:'short', hairColor:'#C8A060', browColor:'#8a6a1a',
    jersey:'#EF0107', numColor:'#ffffff', shorts:'#ffffff', socks:'#ffffff', number:8, beard:false, brows:'round',
    names:['Ødegaard','أوديغارد','Эдегор'], price:2000, st:[1,1.08,1,.95] },
  { id:'valverde', name:'ואלוורדה',        skin:'#E8B892', skinDark:'#b07a55', hair:'short', hairColor:'#2a1c12',
    jersey:'#ffffff', numColor:'#1B2A4E', shorts:'#ffffff', socks:'#ffffff', number:8, beard:false, brows:'sharp',
    names:['Valverde','فالفيردي','Вальверде'], price:2200, st:[1.05,1.1,1.05,1] },
  { id:'dybala',   name:'דיבאלה',          skin:'#F1C9A5', skinDark:'#b8865f', hair:'wavy', hairColor:'#2a1c12',
    jersey:'#8E1B3B', numColor:'#F5C400', shorts:'#8E1B3B', socks:'#8E1B3B', number:21, beard:true, beardColor:'#2a1c12', brows:'round',
    names:['Dybala','ديبالا','Дибала'], price:2500, st:[1.02,1.08,.95,.95] },
  /* --- world stars, recent legends --- */
  { id:'hazard',   name:'הזאר',            skin:'#F1C9A5', skinDark:'#b8865f', hair:'short', hairColor:'#2a1c12',
    jersey:'#E30613', numColor:'#F5C400', shorts:'#111111', socks:'#E30613', number:10, beard:false, brows:'round',
    names:['Hazard','هازارد','Азар'], price:4000, st:[1.1,1,1,.95] },
  { id:'bale',     name:'בייל',            skin:'#F3D2B3', skinDark:'#c49a72', hair:'bun', hairColor:'#3a2a1a', browColor:'#3a2a1a',
    jersey:'#D30731', numColor:'#ffffff', shorts:'#ffffff', socks:'#D30731', number:11, beard:true, beardColor:'#3a2a1a', brows:'sharp',
    names:['Bale','بيل','Бэйл'], price:4500, st:[1.12,1.1,1,1.05] },
  { id:'puyol',    name:'פויול',           skin:'#E8B892', skinDark:'#b07a55', hair:'curly', hairColor:'#4a3018',
    jersey:'#A50044', stripes:'#004D98', numColor:'#FFD447', shorts:'#004D98', socks:'#004D98', number:5, beard:false, brows:'sharp',
    names:['Puyol','بويول','Пуйоль'], price:5500, st:[.95,.95,1.12,1.12] },
  { id:'robben',   name:'רובן',            skin:'#F3D2B3', skinDark:'#c49a72', hair:'bald', hairColor:'#5a3a1e',
    jersey:'#DC052D', numColor:'#ffffff', shorts:'#ffffff', socks:'#DC052D', number:10, beard:false, brows:'sharp',
    names:['Robben','روبن','Роббен'], price:6500, st:[1.1,1.08,.95,.95] },
  /* --- icons --- */
  { id:'romario',  name:'רומאריו',         skin:'#8D5A3B', skinDark:'#5e3a24', hair:'short', hairColor:'#161616',
    jersey:'#FFDC00', numColor:'#009C3B', shorts:'#1A3DA8', socks:'#ffffff', number:11, beard:false, brows:'round',
    names:['Romário','روماريو','Ромарио'], price:9500, st:[1.08,1.1,1,1.02] },
  { id:'rivaldo',  name:'ריבאלדו',         skin:'#C68642', skinDark:'#8a5a2a', hair:'bald', hairColor:'#161616',
    jersey:'#FFDC00', numColor:'#009C3B', shorts:'#1A3DA8', socks:'#ffffff', number:10, beard:false, brows:'sharp',
    names:['Rivaldo','ريفالدو','Ривалдо'], price:8000, st:[1.02,1.12,1,1.05] },
  /* --- Israeli legends and stars (il:true is informative; the game detects Israelis through ISRAELI_IDS) --- */
  { id:'ohana',    name:'אלי אוחנה',       skin:'#E3B48C', skinDark:'#a97a52', hair:'wavy', hairColor:'#15110e', il:true,
    jersey:'#FFD21F', stripes:'#111111', numColor:'#111111', shorts:'#111111', socks:'#FFD21F', number:10, beard:false, brows:'sharp',
    names:['Eli Ohana','إيلي أوحانا','Эли Охана'], price:4000, st:[1.05,1.08,1,1] },
  { id:'nimni',    name:'אבי נמני',        skin:'#E8B892', skinDark:'#b07a55', hair:'short', hairColor:'#1a1512', il:true,
    jersey:'#FFD21F', numColor:'#0B2A6B', shorts:'#0B2A6B', socks:'#0B2A6B', number:10, beard:false, brows:'round',
    names:['Avi Nimni','آفي نمني','Ави Нимни'], price:3000, st:[1,1.08,1,.95] },
  { id:'dorperetz', name:'דור פרץ',        skin:'#E3B48C', skinDark:'#a97a52', hair:'short', hairColor:'#15110e', il:true,
    jersey:'#ffffff', numColor:'#0B4DBB', shorts:'#0B4DBB', socks:'#0B4DBB', number:8, beard:true, beardColor:'#15110e', brows:'sharp',
    names:['Dor Peretz','دور بيرتس','Дор Перец'], price:600,  st:[1,1.02,1.08,1.05] },
  { id:'baribo',   name:'טאי בריבו',       skin:'#E3B48C', skinDark:'#a97a52', hair:'short', hairColor:'#15110e', il:true,
    jersey:'#0B1F4A', numColor:'#C9A227', shorts:'#0B1F4A', socks:'#C9A227', number:9, beard:true, beardColor:'#15110e', brows:'sharp',
    names:['Tai Baribo','تاي باريبو','Тай Барибо'], price:900,  st:[1.02,1.08,1,1.08] },
];
const CHARS_MORE_IDS=CHARS_MORE.map(c=>c.id);
const CHARS_MORE_LEGENDS=['hazard','bale','puyol','robben','romario','rivaldo','ohana','nimni'];   // retired → the "legends" filter too
(function charsMoreInstall(){
  const push=(arr,id)=>{ if(Array.isArray(arr) && !arr.includes(id)) arr.push(id); };
  for(const d of CHARS_MORE){
    if(CHARS.some(c=>c.id===d.id)) continue;                      // never twice (a double load must not duplicate indexes)
    const {names, price, st, ...c}=d;
    CHARS.push(c);                                                // appended at the END: existing indexes stay valid for saved picks and online friends
    PRICES[c.id]=price; CHAR_ST[c.id]=st; CHAR_NAMES[c.id]=names;
    if(c.il && typeof ISRAELI_IDS!=='undefined') push(ISRAELI_IDS, c.id);
    if(CHARS_MORE_LEGENDS.includes(c.id) && typeof LEGEND_IDS!=='undefined') push(LEGEND_IDS, c.id);
    if(typeof NEW_IDS!=='undefined') push(NEW_IDS, c.id);         // "new" badge in the characters gallery
  }
})();
