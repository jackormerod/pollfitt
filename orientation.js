// Device orientation, rather than viewport aspect ratio, avoids blocking typing
// when the iPhone keyboard temporarily makes a portrait viewport wider than tall.
export function isLandscapeDevice(win){
 const type=win.screen?.orientation?.type;
 if(type)return type.startsWith('landscape');
 if(typeof win.orientation==='number')return Math.abs(win.orientation)===90;
 return win.matchMedia('(orientation: landscape)').matches;
}
export function installPortrait(win,doc){
 const panel=doc.querySelector('#portrait-message');
 const content=[...doc.querySelectorAll('header,nav,main,#timer,#confirm')];
 const mobile=()=>win.matchMedia('(pointer: coarse)').matches||win.navigator?.standalone===true;
 const update=()=>{const blocked=mobile()&&isLandscapeDevice(win);panel.hidden=!blocked;content.forEach(el=>{el.inert=blocked;});doc.documentElement.classList.toggle('portrait-required',blocked);};
 const lock=()=>{if(!mobile())return;try{Promise.resolve(win.screen?.orientation?.lock?.('portrait')).catch(()=>{});}catch{}update();};
 win.addEventListener('orientationchange',()=>{update();lock();});
 win.screen?.orientation?.addEventListener?.('change',update);
 win.addEventListener('resize',update);
 doc.addEventListener('fullscreenchange',lock);
 doc.addEventListener('pointerdown',lock,{passive:true});
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden){update();lock();}});
 update();lock();
}
