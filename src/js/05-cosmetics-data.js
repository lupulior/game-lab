/* ===== cosmetics catalogue (data only; the shop module sells and renders them, the chests module hands them out) =====
   type: kit (jersey/shorts/socks/stripes/numColor colours merged over the character by playerSVG), boots (colour), ball (pattern + colours),
   stadium (a PITCH_THEMES entry), celeb (a goal celebration animation id), title (text shown next to the name).
   price = coins, gems = gem price (then price is 0). rarity: rare | epic | legendary. week: reserved for a future Sunday drop (not sold yet). */
const COSMETICS=[
  {id:'kit_il',     type:'kit', name:['כחול-לבן','Blue & white','أزرق وأبيض','Бело-синяя'], price:600, rarity:'rare', data:{jersey:'#1D6FE8', shorts:'#FFFFFF', socks:'#1D6FE8', stripes:'#FFFFFF', numColor:'#FFFFFF'}, welcome:true},
  {id:'kit_redblack',type:'kit', name:['אדום-שחור','Red & black','أحمر وأسود','Красно-чёрная'], price:600, rarity:'rare', data:{jersey:'#E0282E', shorts:'#111111', socks:'#111111', stripes:'#111111', numColor:'#FFFFFF'}},
  {id:'kit_neon',   type:'kit', name:['ניאון','Neon','نيون','Неон'], price:1200, rarity:'epic', data:{jersey:'#39FF14', shorts:'#111111', socks:'#39FF14', stripes:null, numColor:'#111111'}},
  {id:'kit_gold',   type:'kit', name:['זהב','Gold foil','ذهبي','Золотая'], price:0, gems:60, rarity:'legendary', data:{jersey:'#F5C542', shorts:'#8A5A00', socks:'#F5C542', stripes:'#FFF3B8', numColor:'#8A5A00'}},
  {id:'kit_purple', type:'kit', name:['פסים סגולים','Purple stripes','خطوط بنفسجية','Фиолетовые полосы'], price:800, rarity:'rare', data:{jersey:'#8E5CF6', shorts:'#FFFFFF', socks:'#8E5CF6', stripes:'#FFFFFF', numColor:'#FFFFFF'}},
  {id:'kit_hoops',  type:'kit', name:['חישוקים ירוקים','Green hoops','أطواق خضراء','Зелёные полосы'], price:800, rarity:'rare', data:{jersey:'#1E9E4A', shorts:'#FFFFFF', socks:'#1E9E4A', stripes:'#FFFFFF', numColor:'#FFFFFF'}},
  {id:'kit_pink',   type:'kit', name:['ורוד','Pink','وردي','Розовая'], price:800, rarity:'rare', data:{jersey:'#FF5FA2', shorts:'#FFFFFF', socks:'#FF5FA2', stripes:null, numColor:'#FFFFFF'}},
  {id:'kit_blackgold',type:'kit', name:['שחור-זהב','Black & gold','أسود وذهبي','Чёрно-золотая'], price:1500, rarity:'epic', data:{jersey:'#111111', shorts:'#111111', socks:'#F5C542', stripes:'#F5C542', numColor:'#F5C542'}},
  {id:'kit_sky',    type:'kit', name:['תכלת-לבן','Sky & white','سماوي وأبيض','Голубая'], price:600, rarity:'rare', data:{jersey:'#7ED3FF', shorts:'#FFFFFF', socks:'#7ED3FF', stripes:'#FFFFFF', numColor:'#1B2A4E'}},
  {id:'kit_retro',  type:'kit', name:['רטרו שנות ה-70','Retro 70s','ريترو السبعينات','Ретро 70-х'], price:1200, rarity:'epic', data:{jersey:'#F28C28', shorts:'#5A3A1E', socks:'#F28C28', stripes:'#5A3A1E', numColor:'#FFF3B8'}},
  {id:'boots_white',type:'boots', name:['נעליים לבנות','White boots','حذاء أبيض','Белые бутсы'], price:300, rarity:'rare', data:{boots:'#F4F4F4'}},
  {id:'boots_gold', type:'boots', name:['נעלי זהב','Gold boots','حذاء ذهبي','Золотые бутсы'], price:900, rarity:'epic', data:{boots:'#F5C542'}},
  {id:'boots_neon', type:'boots', name:['נעלי ניאון','Neon boots','حذاء نيون','Неоновые бутсы'], price:500, rarity:'rare', data:{boots:'#39FF14'}},
  {id:'boots_red',  type:'boots', name:['נעליים אדומות','Red boots','حذاء أحمر','Красные бутсы'], price:400, rarity:'rare', data:{boots:'#E0282E'}},
  {id:'ball_il',    type:'ball', name:['כדור דגל ישראל','Israel flag ball','كرة علم إسرائيل','Мяч с флагом'], price:500, rarity:'rare', data:{pattern:'flag', a:'#1D6FE8', b:'#FFFFFF'}},
  {id:'ball_flame', type:'ball', name:['כדור אש','Flame ball','كرة النار','Огненный мяч'], price:1200, rarity:'epic', data:{pattern:'flame', a:'#FF7A3D', b:'#FFD447'}},
  {id:'ball_galaxy',type:'ball', name:['כדור גלקסיה','Galaxy ball','كرة المجرة','Галактический мяч'], price:0, gems:150, rarity:'legendary', data:{pattern:'galaxy', a:'#2B1B6B', b:'#8E5CF6'}},
  {id:'ball_brown', type:'ball', name:['כדור קלאסי חום','Classic brown ball','كرة بنية كلاسيكية','Классический коричневый'], price:300, rarity:'rare', data:{pattern:'classic', a:'#8B5A2B', b:'#5A3A1E'}},
  {id:'stad_beach', type:'stadium', name:['אצטדיון חוף','Beach stadium','ملعب الشاطئ','Пляжный стадион'], price:1500, rarity:'rare', data:{base:'#E8C97A', stripeA:'#E8C97A', stripeB:'#F2D68E', far:'#D4B46A', track:'#5BC8FF', boards:['#FF7A3D','#3D8BFF','#FFD447','#3FC35F','#FF5FA2','#ffffff']}},
  {id:'stad_snow',  type:'stadium', name:['אצטדיון שלג','Snow stadium','ملعب الثلج','Снежный стадион'], price:2000, rarity:'epic', data:{base:'#EAF4FF', stripeA:'#EAF4FF', stripeB:'#DCEBFA', far:'#C9DCF0', track:'#9FB4CC', boards:['#3D8BFF','#ffffff','#7ED3FF','#1B2A4E','#ffffff','#3D8BFF']}},
  {id:'stad_night', type:'stadium', name:['אורות לילה','Night lights','أضواء الليل','Ночные огни'], price:2500, rarity:'epic', data:{base:'#2F9A50', stripeA:'#2F9A50', stripeB:'#3AAE5E', far:'#1E6E36', track:'#4A4F7A', boards:['#FF4E9B','#3D8BFF','#FFD447','#00D3A7','#FF7A3D','#8E5CF6'], night:true}},
  {id:'celeb_slide',type:'celeb', name:['החלקה על הברכיים','Knee slide','انزلاق على الركبتين','На коленях'], price:800, rarity:'rare', data:{anim:'kneeslide'}},
  {id:'title_pack1',type:'title', name:['תארים: הכוכב / המלך / הטיל','Titles: Star / King / Rocket','ألقاب: النجم / الملك / الصاروخ','Титулы: Звезда / Король / Ракета'], price:400, rarity:'rare', data:{titles:[['⭐ הכוכב','⭐ The Star','⭐ النجم','⭐ Звезда'],['👑 המלך','👑 The King','👑 الملك','👑 Король'],['🚀 הטיל','🚀 The Rocket','🚀 الصاروخ','🚀 Ракета']]}},
  {id:'title_pack2',type:'title', name:['תארים: הקוסם / החומה / הצלף','Titles: Wizard / Wall / Sniper','ألقاب: الساحر / الجدار / القناص','Титулы: Маг / Стена / Снайпер'], price:400, rarity:'rare', data:{titles:[['🪄 הקוסם','🪄 The Wizard','🪄 الساحر','🪄 Маг'],['🧱 החומה','🧱 The Wall','🧱 الجدار','🧱 Стена'],['🎯 הצלף','🎯 The Sniper','🎯 القناص','🎯 Снайпер']]}},
  /* reserved for the first Sunday drops (week = how many Sundays after launch) */
  {id:'stad_desert',type:'stadium', name:['אצטדיון מדבר','Desert stadium','ملعب الصحراء','Пустынный стадион'], price:1800, rarity:'rare', week:1, data:{base:'#D9A85C', stripeA:'#D9A85C', stripeB:'#E3B66E', far:'#C2924A', track:'#8C5A2B', boards:['#FF7A3D','#FFD447','#ffffff','#3FC35F']}},
  {id:'stad_space', type:'stadium', name:['אצטדיון חלל','Space stadium','ملعب الفضاء','Космический стадион'], price:3000, rarity:'epic', week:2, data:{base:'#2B2D5B', stripeA:'#2B2D5B', stripeB:'#35386B', far:'#1E2048', track:'#8E5CF6', boards:['#8E5CF6','#00D3A7','#FF4E9B','#ffffff'], night:true}},
  {id:'kit_mint',   type:'kit', name:['מנטה','Mint','نعناع','Мятная'], price:800, rarity:'rare', week:3, data:{jersey:'#7FE3C4', shorts:'#1B2A4E', socks:'#7FE3C4', stripes:null, numColor:'#1B2A4E'}},
  {id:'kit_tiger',  type:'kit', name:['טיגריס','Tiger','نمر','Тигровая'], price:1500, rarity:'epic', week:4, data:{jersey:'#F28C28', shorts:'#111111', socks:'#F28C28', stripes:'#111111', numColor:'#111111'}},
  {id:'boots_blue', type:'boots', name:['נעליים כחולות','Blue boots','حذاء أزرق','Синие бутсы'], price:400, rarity:'rare', week:5, data:{boots:'#1D6FE8'}},
  {id:'boots_pink', type:'boots', name:['נעליים ורודות','Pink boots','حذاء وردي','Розовые бутсы'], price:500, rarity:'rare', week:6, data:{boots:'#FF5FA2'}},
];
const cosById = id => COSMETICS.find(c=>c.id===id);
const cosName = c => { const i=({he:0,en:1,ar:2,ru:3})[lang]||0; return c.name[i]||c.name[0]; };
const cosOwned = id => !!(prog.cos && (prog.cos.items||[]).includes(id));
