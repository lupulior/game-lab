/* ===== small polish owned by the integrator: training drills pay coins (first 3 a day) ===== */
I18N_ADD({ 'train.drill':['🏋️ אימון הושלם! +{0} 🪙','🏋️ Drill done! +{0} 🪙','🏋️ اكتمل التدريب! +{0} 🪙','🏋️ Тренировка выполнена! +{0} 🪙'],
           'train.drillMax':['🏋️ מחר יש עוד מטבעות על אימונים','🏋️ More training coins tomorrow','🏋️ المزيد من عملات التدريب غدًا','🏋️ Завтра снова монеты за тренировки'] });
function trainDrillCheck(){
  if(!training) return;
  const done = training==='shoot' ? (trainStats.g|0) : (trainStats.n|0);
  if(done<=0 || done%ECON.trainDrill!==0) return;
  const d=dayCounter('trainDay');
  if(d.n>=ECON.trainPerDay){ if(d.n===ECON.trainPerDay){ d.n++; saveProg(); toast(T('train.drillMax'),'warn'); } return; }
  d.n++; saveProg(); prog.coins=(prog.coins|0)+ECON.trainCoins; saveProg(); updateXpBadge(); toast(T('train.drill', ECON.trainCoins),'xp'); try{ sfx.win(); }catch(e){}
  // #32: practice has no result card, so the XP must not be parked in matchEarn — with it null a level-up toasts right away
  if(typeof addXP==='function'){ const me=matchEarn; matchEarn=null; try{ addXP(10, true); } finally{ matchEarn=me; } }
}
