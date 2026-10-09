/* ===================================================================================================
   THE BOT (50-bot) — personalities, brain, mercy, newbie mercy, sleep.
   PLAN §6: every bot gets a visible personality (hash of its character id, weighted by level), the brain is the
   original updateAI plus goal-aware shooting (one aimY argument on doKick), a goal-line guard, scissors / ice / fire
   use, and two visible mercies (coach mercy when the human trails, newbie mercy for the first 3 matches at Easy).
   Impossible is one fixed ☠️ BOSS profile (speed 1.45 instead of 1.65, no mercy ever).
   Online guests never run the AI (the host does) — the loop structure is untouched; only updateAI / doKick are replaced.
   =================================================================================================== */
Object.assign(ECON, { bot:{
  shootRange:220,            // px from the human goal line inside which the bot aims at a corner
  aimBand:.25,               // the aim may move vy by ±25% of the original launch
  aimSpeedBand:.10,          // ...and never changes the ball speed by more than 10%
  aimNoise:.5,               // Easy/Medium: ±err×this px of noise on the aim point
  sniperLow:.3, sniperLowVy:.5,   // 🎯 flat drive: vy×0.5, 30% of its shots
  guardOff:90, guardSpeed:250,    // goal-line guard: own goal + 90 px, when the ball comes faster than 250 px/s
  scissorsRange:120, scissorsRate:.05, tricksterScissors:.08, scissorsMinLevel:2,   // Hard+ 5%/s (Trickster 8%)
  powersMinLevel:4, powersLast:30, powerRate:.6,                                    // ice/fire: Master+, once each, trailing or last 30 s
  mercyTrail:2, mercySpeed:.9, mercyErr:30, mercyReact:.1,                          // coach mercy: human trails by 2
  wakeLead:3, wakeSpeed:1.05,                                                       // the bot wakes up: human leads by 3
  newbieMatches:3, newbieReact:.2, newbieSpeed:.85,                                 // newbie mercy (Easy only)
  sleepDefault:9,                                                                   // onboarding: the bot sleeps 8–10 s
  bossSpeed:1.45,
  easyTrickster:.4,
  /* personality multipliers / offsets over the level parameters (§6.4) */
  profiles:{
    wall:     { icon:'🧱', speed:.95, err:1,   kick:0,   power:0,  slide:.6, blockJump:1.3, hops:1, predict:0, defendAnywhere:true },
    sprinter: { icon:'⚡', speed:1.08,err:1,   kick:-.1, power:0,  slide:1,  blockJump:1,   hops:1, predict:0 },
    sniper:   { icon:'🎯', speed:1,   err:1,   kick:0,   power:.1, slide:1,  blockJump:1,   hops:1, predict:0, patient:true, lowShot:true },
    trickster:{ icon:'🤪', speed:1,   err:1.4, kick:0,   power:0,  slide:1,  blockJump:1,   hops:2, predict:0, emotes:true },
    turtle:   { icon:'🐢', speed:.9,  err:0,   kick:0,   power:0,  slide:1,  blockJump:1,   hops:1, predict:1 },
    boss:     { icon:'☠️', speed:1,   err:1,   kick:0,   power:0,  slide:1,  blockJump:1,   hops:1, predict:0, boss:true },
  },
}});
const BOT_IDS=['wall','sprinter','sniper','trickster','turtle'];

I18N_ADD({
 'bot.wall':['החומה','The Wall','الجدار','Стена'],
 'bot.wall.d':['מגן בכל חצי המגרש','Defends all over its half','يدافع في نصفه كله','Защищает всю свою половину'],
 'bot.sprinter':['הספרינטר','The Sprinter','العدّاء','Спринтер'],
 'bot.sprinter.d':['מהיר, בועט פחות','Fast, kicks less','سريع، يركل أقل','Быстрый, бьёт реже'],
 'bot.sniper':['הצלף','The Sniper','القنّاص','Снайпер'],
 'bot.sniper.d':['בועט חזק ונמוך','Strong low shots','تسديدات قوية ومنخفضة','Сильные низкие удары'],
 'bot.trickster':['השובב','The Trickster','المشاغب','Проказник'],
 'bot.trickster.d':['קופץ המון, מספרות','Hops a lot, bicycle kicks','يقفز كثيرًا، مقصيات','Много прыгает, удары через себя'],
 'bot.turtle':['הצב','The Turtle','السلحفاة','Черепаха'],
 'bot.turtle.d':['איטי אבל מדויק','Slow but precise','بطيء لكنه دقيق','Медленный, но точный'],
 'bot.boss':['BOSS','BOSS','BOSS','BOSS'],
 'bot.boss.d':['בלי רחמים','No mercy','بلا رحمة','Без пощады'],
 'bot.line.wall':['🎙️ מולך החומה 🧱 – קשה לעבור אותה!','🎙️ You face the Wall 🧱 – hard to get past!','🎙️ أمامك الجدار 🧱 – من الصعب تجاوزه!','🎙️ Перед тобой Стена 🧱 – её трудно пройти!'],
 'bot.line.sprinter':['🎙️ הספרינטר ⚡ על המגרש – מהיר כמו ברק!','🎙️ The Sprinter ⚡ is here – fast as lightning!','🎙️ العدّاء ⚡ في الملعب – سريع كالبرق!','🎙️ Спринтер ⚡ на поле – быстрый как молния!'],
 'bot.line.sniper':['🎙️ זהירות, הצלף 🎯 בועט נמוך וחזק!','🎙️ Careful, the Sniper 🎯 shoots low and hard!','🎙️ انتبه، القنّاص 🎯 يسدد منخفضًا وبقوة!','🎙️ Осторожно, Снайпер 🎯 бьёт низко и сильно!'],
 'bot.line.trickster':['🎙️ השובב 🤪 הגיע – מי יודע מה הוא יעשה!','🎙️ The Trickster 🤪 is here – who knows what he will do!','🎙️ المشاغب 🤪 وصل – من يدري ماذا سيفعل!','🎙️ Проказник 🤪 здесь – кто знает, что он выкинет!'],
 'bot.line.turtle':['🎙️ הצב 🐢 איטי, אבל לא מפספס!','🎙️ The Turtle 🐢 is slow, but never misses!','🎙️ السلحفاة 🐢 بطيئة، لكنها لا تخطئ!','🎙️ Черепаха 🐢 медленная, но не промахивается!'],
 'bot.line.boss':['🎙️ ☠️ ה-BOSS! בלי רחמים היום!','🎙️ ☠️ The BOSS! No mercy today!','🎙️ ☠️ الـBOSS! بلا رحمة اليوم!','🎙️ ☠️ БОСС! Сегодня без пощады!'],
 'bot.tired':['🎙️ המאמן: הבוט קצת עייף 😉','🎙️ Coach: the bot is a bit tired 😉','🎙️ المدرب: الروبوت متعب قليلًا 😉','🎙️ Тренер: бот немного устал 😉'],
 'bot.awake':['🎙️ הבוט מתעורר! 😤','🎙️ The bot wakes up! 😤','🎙️ الروبوت يستيقظ! 😤','🎙️ Бот просыпается! 😤'],
 'bot.sleeping':['🎙️ 😴 היריב ישן... זה הזמן לתרגל!','🎙️ 😴 The opponent is asleep... time to practise!','🎙️ 😴 الخصم نائم... حان وقت التدريب!','🎙️ 😴 Соперник спит... время тренироваться!'],
 'bot.wake':['🎙️ {0} מתעורר! ⏰','🎙️ {0} wakes up! ⏰','🎙️ {0} يستيقظ! ⏰','🎙️ {0} просыпается! ⏰'],
 'bot.ice':['🎙️ ❄️ {0} הקפיא אותך!','🎙️ ❄️ {0} froze you!','🎙️ ❄️ {0} جمّدك!','🎙️ ❄️ {0} заморозил тебя!'],
 'bot.fire':['🎙️ 🔥 {0} שרף את הכדור! כדור חדש באמצע!','🎙️ 🔥 {0} burned the ball! New ball at the centre!','🎙️ 🔥 {0} أحرق الكرة! كرة جديدة في المنتصف!','🎙️ 🔥 {0} сжёг мяч! Новый мяч в центре!'],
 'bot.nextHarder':['נסה רמה קשה יותר: {0}','Try a harder level: {0}','جرّب مستوى أصعب: {0}','Попробуй уровень сложнее: {0}'],
 'bot.nextEasier':['נסה רמה קלה יותר: {0}','Try an easier level: {0}','جرّب مستوى أسهل: {0}','Попробуй уровень полегче: {0}'],
 'bot.endTag':['היריב: {0} {1}','Opponent: {0} {1}','الخصم: {0} {1}','Соперник: {0} {1}'],
});

/* ---------- personalities: deterministic per character id (and level weighting) ---------- */
function botHash(s){ let h=5381; s=String(s||''); for(let i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0; return h; }
/* pure: which profile a character plays at a level. Level 5 (Impossible) is always the BOSS. */
function botProfileFor(charId, levelI){
  if((levelI|0)>=5) return 'boss';
  const h=botHash(charId), u=(h%1000)/1000;
  if((levelI|0)===0 && u<ECON.bot.easyTrickster) return 'trickster';           // Easy: 40% Tricksters
  const rest = (levelI|0)===0 ? BOT_IDS.filter(x=>x!=='trickster') : BOT_IDS;
  return rest[(h>>>10)%rest.length];
}
function botProfileInfo(id){ const P=ECON.bot.profiles[id]||ECON.bot.profiles.wall; return {id, icon:P.icon, name:T('bot.'+id), desc:T('bot.'+id+'.d')}; }
/* the personality of the main opponent bot in the current match: null online against humans, in training, or with no bot */
function botPersonality(){
  if(training) return null;
  const p = (P2.bot && players.includes(P2)) ? P2 : (v2 && P4.bot && players.includes(P4)) ? P4 : null;
  return p ? botProfileInfo(p.bot.prof) : null;
}
/* what the end card may show: the opponent's personality plus which mercies ran */
function botMatchReport(){ const b=botPersonality(); if(!b) return null; return Object.assign(b, {mercy:botState.mercy, newbie:botState.newbie, boss:b.id==='boss'}); }

/* ---------- match state ---------- */
const botState={ ready:false, mercy:null, saidTired:false, saidAwake:false, newbie:false, sleepT:0, sleepStamp:-1, sleepPlayers:[], partyBots:false, kickoffMercy:false };
let botLastAim=null;                                   // diagnostics for tests: the last aimed kick {aimY, vy0, vy1, s0, s1}
/* is this match one where the mercies apply? offline or party-vs-bots, not Impossible, not training, never against humans only */
function botMercyAllowed(){
  if(training || !level || level.i>=5) return false;
  if(mp) return !!(P2.bot || (v2 && P4.bot));          // party: only when a bot sits on the other side
  return true;
}
/* the match is live: a delayed commentator line may still show (never over the result card or the penalty screen) */
function botLive(){ return state==='play' || state==='celebrate' || state==='replay'; }
/* the commentator, relay-safe: a guest on a build without this module would read the raw key, so with such a guest in the
   party the line shows only on the host (say() relays the key to every guest; the core knows each guest's version in c.ver) */
function botOldGuest(){ return !!(mp && mp.role==='host' && mp.conns && mp.conns.some(c=>!c.ver || c.ver<GAME_VERSION)); }
function botSay(key, ...args){ if(botOldGuest()) showLine(T(key, ...args), false); else say(key, ...args); }
/* called after beginMatch: hand every AI seat its personality and reset the match state.
   A sleep requested while beginMatch ran (the onboarding module calls botSleep from the 'screen' hook, before the seats exist) is kept:
   it is re-applied once the bots are set up, so the 😴 marker, the frozen bot and the commentator line all work on the first match. */
function botSetupMatch(){
  const pend=botState.sleepT;
  botState.ready=true; botState.mercy=null; botState.saidTired=botState.saidAwake=false; botState.sleepT=0; botState.sleepPlayers=[]; botState.kickoffMercy=false;
  botState.newbie = !mp && !training && !!level && level.i===0 && (prog.matches|0)<ECON.bot.newbieMatches;
  // three straight losses at this level: mercy numbers from kick-off
  if(!mp && !training && level && level.i<5){ const a=((prog.recent||{})[level.i])||[]; if(a.length>=3 && a.slice(-3).every(x=>x==='l')){ botState.mercy='tired'; botState.kickoffMercy=true; } }
  for(const p of [P1,P2,P3,P4]){
    p.el.classList.remove('bot-sleep','bot-emote');
    // a spectated 1v1 is always human vs human (online play has no AI opponent outside 2v2, where the host forwards src): the host's setup
    // message carries src:null for it, so P2.src falls back to 'ai' on the spectator — never give that seat a personality
    const isBot = players.includes(p) && p.src==='ai' && !training && !(spectating && !v2);
    p.bot = isBot ? { prof:botProfileFor(p.ch ? p.ch.id : p.slot, level ? level.i : 1), side:p===P3 ? -1 : 1, used:{ice:false,fire:false}, E:null, guard:false, mode:'hunt' } : null;
    if(p.bot) p.bot.E=botParams(p);
  }
  const tag=$('#bot-tag'); if(tag) tag.hidden=true;
  if(pend>0) botSleep(pend);
}
/* the effective decision parameters of one bot: level × personality × mercy × newbie mercy */
function botParams(ai){
  const L=level||LEVELS[1], B=ai.bot, P=(B && ECON.bot.profiles[B.prof])||ECON.bot.profiles.wall, C=ECON.bot;
  const E={ speed:L.speed*P.speed, react:L.react, kick:Math.max(.05, L.kick+P.kick), jump:L.jump, err:L.err*P.err, power:L.power+P.power, smart:L.smart,
            predict:Math.max(L.smart, P.predict), slide:P.slide, blockJump:P.blockJump, hops:P.hops, defendAnywhere:!!P.defendAnywhere, patient:!!P.patient, lowShot:!!P.lowShot,
            scissors: B && B.prof==='trickster' ? C.tricksterScissors : C.scissorsRate, boss:!!P.boss };
  if(P.boss){ E.speed=C.bossSpeed; return E; }                                   // ☠️ BOSS: fixed speed, everything else as the level, no mercy
  const opponentBot = !B || B.side>0;                                            // the human's partner bot never gets weaker or stronger
  if(opponentBot && botState.newbie){ E.react+=C.newbieReact; E.speed*=C.newbieSpeed; }
  if(opponentBot && botState.mercy==='tired'){ E.speed*=C.mercySpeed; E.err+=C.mercyErr; E.react+=C.mercyReact; }
  else if(opponentBot && botState.mercy==='awake'){ const nxt=LEVELS[Math.min(5, L.i+1)]; E.speed=Math.min(E.speed*C.wakeSpeed, nxt.speed*P.speed); }
  return E;
}
/* coach mercy, checked after every goal: the human trails by 2 → tired bot; leads by 3 → the bot wakes up */
function botCheckMercy(){
  if(!botMercyAllowed()) return botState.mercy;
  const tgt=matchTarget();
  if(score.me>=tgt || score.op>=tgt || (overtime && score.me!==score.op)) return botState.mercy;   // this goal decides the match: no mercy (and no line over the result card)
  const C=ECON.bot, trail=score.op-score.me, lead=score.me-score.op;
  const want = trail>=C.mercyTrail ? 'tired' : lead>=C.wakeLead ? 'awake' : null;
  if(want!==botState.mercy){
    botState.mercy=want;
    if(want==='tired' && !botState.saidTired){ botState.saidTired=true; setTimeout(()=>{ if(botState.mercy==='tired' && botLive()) botSay('bot.tired'); }, 2200); }
    if(want==='awake' && !botState.saidAwake){ botState.saidAwake=true; setTimeout(()=>{ if(botState.mercy==='awake' && botLive()) botSay('bot.awake'); }, 2200); }
    for(const p of players) if(p.bot) p.bot.E=botParams(p);
  }
  return botState.mercy;
}
/* the onboarding overlay: every bot stands still for `sec` seconds of play (😴), then wakes up with a commentator line */
function botSleep(sec){
  sec = sec==null ? ECON.bot.sleepDefault : Math.max(0, +sec||0);
  botState.sleepT=sec; botState.sleepStamp=-1; botState.sleepPlayers=[];
  for(const p of players) if(p.bot && p.src==='ai'){ p.el.classList.toggle('bot-sleep', sec>0); if(sec>0) botState.sleepPlayers.push(p); p.vx=0; p.el.classList.remove('running'); }
  // the "asleep" line 1.5 s into play; a sleep started before kick-off (the seats are set up before the countdown even starts) waits for play first, up to 12 s
  if(sec>0 && !training){ const line=n=>{ if(botState.sleepT<=0 || n<=0) return; if(state==='play') setTimeout(()=>{ if(botState.sleepT>0 && state==='play') botSay('bot.sleeping'); }, 1500); else setTimeout(()=>line(n-1), 300); }; line(40); }
}
function botAsleep(){ return botState.sleepT>0; }
function botWake(){
  botState.sleepT=0; const ps=botState.sleepPlayers.slice(); botState.sleepPlayers=[];
  for(const p of ps) p.el.classList.remove('bot-sleep');
  const who=ps.find(p=>p.bot && p.bot.side>0) || ps[0]; if(who && state==='play') botSay('bot.wake', pname(who));
}

/* ---------- aiming: the far corner of the goal the bot attacks (canonical frame: the bot attacks the LEFT goal) ---------- */
/* returns the y the bot should aim at, or null when it is too far from the goal line to aim */
function botAimY(ai, side, opps){
  const B=ai.bot, E=(B && B.E)||botParams(ai), cx = x => side>0 ? x : FIELD_W-x;
  const ax=cx(ai.x); if(ax-GOAL_W > ECON.bot.shootRange) return null;
  const goalX = side>0 ? 0 : FIELD_W;                                                  // the goal it attacks
  const keeper = opps.reduce((a,b)=>Math.abs(a.x-goalX)<Math.abs(b.x-goalX)?a:b, opps[0]);  // the human nearest its own goal
  const low=GOAL_BOT+R+10, high=GOAL_H-R-14;
  let y = (keeper && keeper.y>30) ? low : high;                                         // human in the air → low corner; on the ground → upper corner
  if(level && level.i<=1) y += (Math.random()*2-1)*E.err*ECON.bot.aimNoise;              // Easy/Medium: noisy aim
  return clamp(y, low-6, high+6);
}
/* doKick gains an aimY argument: after the original kick, a bot's launch angle is nudged toward aimY — ±25% of vy, speed within 10%, never the physics */
const _botDoKick=doKick;
doKick=function(p, power, aimY){
  const lt=lastTouch;
  _botDoKick(p, power===undefined ? 1 : power);
  if(aimY==null || !p.bot || lastTouch===lt) return;                                   // no ball contact: nothing to aim
  const C=ECON.bot, vx0=ball.vx, vy0=ball.vy, s0=Math.hypot(vx0,vy0);
  const goalX = p.bot.side>0 ? GOAL_W : FIELD_W-GOAL_W;
  const t=clamp(Math.abs(goalX-ball.x)/Math.max(120, Math.abs(vx0)), .08, 1.2);
  let vy;
  if(p.bot.E && p.bot.E.lowShot && Math.random()<C.sniperLow) vy=vy0*C.sniperLowVy;    // 🎯 flat drive
  else { const want=(aimY-ball.y+G*t*t/2)/t; vy=clamp(want, vy0*(1-C.aimBand), vy0*(1+C.aimBand)); }
  let vx=vx0, s1=Math.hypot(vx,vy); const k=clamp(s1/s0, 1-C.aimSpeedBand, 1+C.aimSpeedBand)*s0/s1;
  vx*=k; vy*=k;
  ball.vx=vx; ball.vy=vy;
  botLastAim={aimY, vy0, vy1:vy, s0, s1:Math.hypot(vx,vy)};
};

/* ---------- powers for bots ---------- */
function botIce(ai){
  if(state!=='play' || training) return false;
  const victims = ai.bot && ai.bot.side>0 ? teamL : teamR;
  for(const o of victims){ o.frozenT=ICE_DUR; o.vx=0; o.slideT=0; o.el.classList.remove('sliding'); o.el.classList.add('frozen'); const ic=o.el.querySelector('.ice'); if(ic) ic.innerHTML=iceSVG(); }
  ai.bot.used.ice=true; sfx.ice(); botSay('bot.ice', pname(ai)); return true;
}
function botFire(ai){
  if(state!=='play' || training || fireBusy) return false;
  fireBusy=true; fireT=.9; ai.bot.used.fire=true;
  sfx.ice(); botSay('bot.fire', pname(ai)); netEv('fire'); fireFx();
  ball.vx=0; ball.vy=Math.min(ball.vy,-300); return true;
}

/* ---------- the brain: the original updateAI plus personality, guard, aim, powers, mercy, sleep ---------- */
updateAI=function(dt, ai, side, opps, mate){
  const B=ai.bot, E=(B && B.E)||botParams(ai), C=ECON.bot;
  const cx = x => side>0 ? x : FIELD_W-x, cv = v => side>0 ? v : -v;
  const bx=cx(ball.x), bvx=cv(ball.vx), ax=cx(ai.x);
  // asleep (onboarding): stand still, face the ball, count the sleep once per frame
  if(botState.sleepT>0){
    if(botState.sleepStamp!==lastT){ botState.sleepStamp=lastT; botState.sleepT-=dt; if(botState.sleepT<=0) botWake(); }
    ai.vx=0; ai.facing=cv(bx<ax ? -1 : 1); return;
  }
  const opp = opps.length ? opps.reduce((a,b)=>Math.abs(a.x-ball.x)<Math.abs(b.x-ball.x)?a:b) : ai, ox=cx(opp.x);
  const support = !!mate && Math.abs(mate.x-ball.x) < Math.abs(ai.x-ball.x)-10;
  const myDist=Math.hypot(ai.x-ball.x, ai.y-ball.y), closest=players.every(o=>o===ai || Math.hypot(o.x-ball.x,o.y-ball.y)>=myDist);
  const ownHalf = bx>FIELD_W/2, incoming = bvx>C.guardSpeed;
  ai.reactT-=dt;
  if(ai.reactT<=0){
    ai.reactT=E.react;
    if(B) B.E=botParams(ai);                                                          // refresh the numbers for the next frames (mercy may have changed)
    const err=(Math.random()*2-1)*E.err, smart=Math.random()<E.predict;
    const pw = smart ? predictBall(bvx>150 ? .35 : .22) : ball, px=cx(pw.x);
    let t;
    const guard = B && ownHalf && incoming && !closest && !support && Math.random()<E.smart;
    if(guard){ ai.mode='guard'; t = FIELD_W-GOAL_W-C.guardOff; }                             // goal-line guard: back to guardX, mirror the ball
    else if(support){ ai.mode='support'; t = Math.min(Math.max(px, bx) + 150, MAXX-40); }     // cover behind the ball
    else if(bx>ax+20 && bx>FIELD_W/2+(E.defendAnywhere ? 0 : 60)){ ai.mode='defend'; t = Math.max(px, bx) + 60; }   // ball slipped behind it: get goal-side fast
    else { ai.mode='hunt'; t = px + 26; }                                                // run straight at the ball, slightly goal-side
    ai.targetX=clamp(cx(clamp(t, MINX, MAXX))+err, MINX, MAXX);
    ai.wantKick=Math.random()<Math.min(1, E.kick+.35);
  }
  const diff=ai.targetX-ai.x, dir=Math.abs(diff)>6 ? Math.sign(diff) : 0;
  if(ai.slideT>0 || ai.stunT>0 || ai.frozenT>0) return;   // mid-slide, knocked down or frozen: no control
  ai.vx=dir*MOVE*E.speed*st(ai).speed;
  const cf = bx<ax ? -1 : 1; ai.facing=cv(cf);     // cf = canonical facing (-1 = toward the goal it attacks)
  const dx=bx-ax, adx=Math.abs(dx), near=inReach(ai);
  const aheadBall = ball.y<40 && adx>50 && adx<170 && Math.sign(dx)===cf;
  const aheadOpp = opp!==ai && opp.y<40 && Math.abs(ox-ax)<130 && Math.sign(ox-ax)===cf && Math.abs(bx-ox)<80;
  if(ai.y===0 && !support && ai.mode!=='guard' && (aheadBall || aheadOpp) && Math.random()<(.15+E.kick*.5)*dt*3*E.slide) doSlide(ai);
  const oppInWay = opp!==ai && ox<bx && bx-ox<230 && ox>GOAL_W+60;                          // opponent between the ball and the goal → lob over
  if(ai.y===0){
    const blocked = dir!==0 && players.some(o=>o!==ai && overlaps(ai, ai.x+dir*12, o));
    const ballHigh = ball.y>45 && adx<150;
    const shotComing = bvx>300 && dx<0 && dx>-300 && ball.y>40;
    const hopOver = ai.mode==='defend' && dx>0 && dx<110 && ball.y<45 && ax<MAXX-30;
    const lobSetup = oppInWay && adx<90 && ball.y<60;
    let guardJump=false;
    if(ai.mode==='guard' && bvx>0 && bx<ax){                                             // the ball arrives at my x in tArr seconds: jump if it would pass over my body
      const tArr=(ax-bx)/bvx, py=ball.y+ball.vy*tArr-G*tArr*tArr/2;
      guardJump = tArr<.45 && py>PH*.7 && py<GOAL_H+40;
    }
    if((blocked && Math.random()<E.jump*dt*8) || (ballHigh && Math.random()<E.jump*E.blockJump*dt*10) ||
       (shotComing && Math.random()<E.jump*E.blockJump*dt*12) || (guardJump && Math.random()<E.jump*E.blockJump*dt*16) ||
       (hopOver && Math.random()<(.3+E.smart*.7)*dt*10) ||
       (lobSetup && !support && Math.random()<(.4+E.smart*.6)*dt*9) || (adx<120 && !support && Math.random()<E.jump*dt*1.6*E.hops)) ai.vy=JUMP*st(ai).jump;
  }
  if(near && bx<ax+8){                              // kick the moment it can (in the air too – that's the lob / header-kick)
    const airborne = ai.y>25, eager = ai.mode==='defend' && bx>FIELD_W/2+100;
    const patient = E.patient && !eager && dx>-20;    // 🎯 waits for the ball to be properly ahead of it
    if(!patient && (airborne ? Math.random()<(.5+E.kick*.5)*dt*18 : (eager && Math.random()<(.5+E.kick*.5)*dt*16) || (ai.wantKick && Math.random()<(.25+E.kick*.75)*dt*14)))
      doKick(ai, E.power, B ? botAimY(ai, side, opps) : null);
  }
  if(!B) return;
  // bicycle kick: the ball sits between the bot and its own goal, close → flick it the other way (Hard+)
  if(level && level.i>=C.scissorsMinLevel && ai.y===0 && cf===1 && adx<C.scissorsRange && ball.y<PH+70 && Math.random()<E.scissors*dt) doScissors(ai);
  // ice / fire: Master+, opponent bots only, once each per match, when trailing or in the last 30 s
  if(level && level.i>=C.powersMinLevel && B.side>0 && !training){
    const trailing = score.op<score.me, late = timeLeft<=C.powersLast;
    if(trailing || late){
      if(!B.used.ice && ownHalf && !closest && opp!==ai && Math.abs(opp.x-ball.x)<140 && Math.random()<C.powerRate*dt) botIce(ai);
      else if(!B.used.fire && bx>FIELD_W/2+100 && bvx>100 && !closest && !fireBusy && Math.random()<C.powerRate*dt) botFire(ai);
    }
  }
};

/* ---------- wiring into the core ---------- */
/* the host's countdown starts inside beginMatch, so the seats are set up from the startCountdown wrapper (seats and sources are final by then);
   guests and spectators never start a countdown, so they are set up right after beginMatch */
const _botBeginMatch=beginMatch;
beginMatch=function(c1,c2,opts){
  botState.ready=false; botState.sleepT=0; botState.sleepPlayers=[];   // a sleep left over from a match quit mid-sleep never carries over; only one requested during beginMatch is kept
  _botBeginMatch(c1,c2,opts); if(!botState.ready) botSetupMatch();
};
/* the countdown: the personality tag over the number for the 3 seconds (every client), the commentator line (the host) */
const _botShowCount=showCount;
showCount=function(n){
  _botShowCount(n);
  if(botState.sleepT>0 && n<3) botState.sleepT=Math.max(.5, botState.sleepT-1);   // a sleep started before kick-off also counts the countdown seconds (it always ends in play, so the wake line shows)
  const tag=$('#bot-tag'); if(!tag) return;
  const b=botPersonality();
  if(n===3 && b){ $('#bot-tag-ico').textContent=b.icon; $('#bot-tag-name').textContent=b.name; $('#bot-tag-desc').textContent=b.desc; tag.classList.toggle('boss', b.id==='boss'); tag.hidden=false; }
  else if(n===0 || !b) setTimeout(()=>{ tag.hidden=true; }, 700);
};
const _botStartCountdown=startCountdown;
startCountdown=function(done){
  if(!botState.ready) botSetupMatch();
  _botStartCountdown(done);
  const b=botPersonality(); if(!b) return;
  setTimeout(()=>{ if(state==='countdown' || state==='play') botSay('bot.line.'+b.id); }, 350);
  if(botState.kickoffMercy) setTimeout(()=>{ if(state==='play' && botState.mercy==='tired' && !botState.saidTired){ botState.saidTired=true; botSay('bot.tired'); } }, 5200);
};
/* every goal: mercy check + the Trickster laughs when it scores */
const _botScoreGoal=scoreGoal;
scoreGoal=function(who){
  const s0=state; _botScoreGoal(who);
  if(s0!=='play' || state!=='celebrate' || training) return;
  botCheckMercy();
  if(who==='op') for(const p of teamR) if(p.bot && p.bot.E && ECON.bot.profiles[p.bot.prof].emotes){ p.el.classList.remove('bot-emote'); void p.el.offsetWidth; p.el.classList.add('bot-emote'); setTimeout(()=>p.el.classList.remove('bot-emote'), 1500); }
};
/* the end card learns the personality: info.bot on the matchEnd hook + a small line under the title */
const _botEmit=Hooks.emit.bind(Hooks);
Hooks.emit=function(n,...a){
  if(n==='matchEnd' && a[0] && typeof a[0]==='object' && !('bot' in a[0])){
    const r=botMatchReport(); a[0].bot=r;
    if(r && typeof endcardRow!=='function'){ const sub=$('#end-sub'); if(sub && !sub.textContent.includes(r.icon)) sub.textContent += '  ·  ' + T('bot.endTag', r.icon, r.name); }   // the end-card module shows the personality itself
  }
  return _botEmit(n,...a);
};
/* home: the level recommendation as a "next up" suggestion (three straight losses → easier, three big wins → harder) */
NextUp.add(()=>{
  if(mp || (prog.matches|0)<3) return null;
  const cur = ECON._lastLevel!=null ? ECON._lastLevel : (settings.lastLevel|0), rec=recommendLevel();
  if(rec===cur || rec<0 || rec>4) return null;
  return { prio:2, icon: rec>cur ? LEVEL_ICON[rec] : '🌱', text:T(rec>cur ? 'bot.nextHarder' : 'bot.nextEasier', T('lvl.'+rec)), action:()=>startOfflineMatch(rec) };
});
Hooks.on('screen', id=>{ if(id!=='game'){ const tag=$('#bot-tag'); if(tag) tag.hidden=true; } });
applyLang();
