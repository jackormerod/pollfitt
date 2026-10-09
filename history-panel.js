import {personalBest} from './workout-features.js';
import {lastPerformance,exerciseName} from './model.js';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const checkGraphic='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 12.5 9.5 17 19.5 6.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const pbBadge='<span class="pb-badge" role="img" aria-label="New personal best"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm0 2H3v3a5 5 0 0 0 5 5m9-8h4v3a5 5 0 0 1-5 5M12 14v5m-4 2h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>PB</span></span>';
export const completionStatus=done=>`<span class="set-status ${done?'completed':''}"><span class="status-check" aria-hidden="true">${checkGraphic}</span>${done?'Completed':'Not completed'}</span>`;

export function historyPanel(state,exercise){
 const previous=lastPerformance(state,exercise.id);
 const id=`last-session-${exercise.id}`;
 if(!previous)return `<section class="last-session" id="${id}" role="region" aria-label="${exerciseName(exercise)} last session" hidden><h3>Last session</h3><p>No recorded sets yet. Your last performance will appear here after you save a workout.</p></section>`;
 const {workout,exercise:ex}=previous,pb=personalBest(state,workout,ex);
 const date=new Date(workout.endedAt).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
 let working=0,warmup=0;
 return `<section class="last-session" id="${id}" role="region" aria-label="${exerciseName(exercise)} last session" hidden><div class="last-session-title"><h3>Last session</h3><span class="badge">${workout.endedEarly?'Finished early':'Fully completed'}</span></div><p class="muted"><time datetime="${escape(workout.endedAt)}">${date}</time> · Day ${workout.day+1}</p>${ex.sets.map((set,si)=>`<div class="last-session-set"><strong>${set.warmup?`Warm-up ${++warmup}`:`Set ${++working}`}</strong>${pb?.setIndex===si?pbBadge:''}${set.sides.map(arm=>`<p class="${arm.done?'history-set-completed':''}">${ex.unilateral?`<span class="arm-label">${arm.side}:</span> `:''}${ex.kind==='time'?`${arm.seconds} seconds`:`${arm.weight===''?'Weight not recorded':`${arm.weight} kg`} × ${arm.reps} reps`} ${completionStatus(arm.done)}</p>`).join('')}</div>`).join('')}</section>`;
}

// Pointer capture keeps release/cancel reliable even outside the button.
// A short press toggles; a sustained press is visible only while held.
export function installHistoryControls(root){
 let gesture=null,suppressed=null;
 const buttonFor=event=>event.target.closest?.('[data-last-session]');
 const panelFor=button=>root.querySelector(`#${button.getAttribute('aria-controls')}`);
 const setOpen=(button,open)=>{const panel=panelFor(button);if(panel){panel.hidden=!open;button.setAttribute('aria-expanded',String(open));}};
 function closeAll(){root.querySelectorAll('[data-last-session]').forEach(b=>setOpen(b,false));gesture=null;}
 function start(button,key){const wasOpen=button.getAttribute('aria-expanded')==='true';closeAll();suppressed=null;gesture={button,key,started:performance.now(),wasOpen};setOpen(button,true);}
 function end(cancelled=false){if(!gesture)return;const g=gesture;gesture=null;setOpen(g.button,!cancelled&&performance.now()-g.started<350&&!g.wasOpen);suppressed={button:g.button,until:performance.now()+1000};}
 root.addEventListener('pointerdown',event=>{const button=buttonFor(event);if(!button||event.button!==0||!event.isPrimary)return;start(button,event.pointerId);try{button.setPointerCapture(event.pointerId);}catch{}});
 root.addEventListener('pointerup',event=>{if(gesture?.key===event.pointerId)end();});
 root.addEventListener('pointercancel',event=>{if(gesture?.key===event.pointerId)end(true);});
 root.addEventListener('lostpointercapture',event=>{if(gesture?.key===event.pointerId)end(true);});
 root.addEventListener('contextmenu',event=>{if(buttonFor(event))event.preventDefault();});
 root.addEventListener('selectstart',event=>{if(buttonFor(event))event.preventDefault();});
 root.addEventListener('click',event=>{const button=buttonFor(event);if(!button)return;event.preventDefault();if(event.detail!==0&&suppressed?.button===button&&performance.now()<suppressed.until){suppressed=null;return;}const open=button.getAttribute('aria-expanded')!=='true';closeAll();setOpen(button,open);});
 root.addEventListener('keydown',event=>{const button=buttonFor(event);if(event.key==='Escape'){end(true);closeAll();return;}if(button&&event.key===' '){event.preventDefault();if(!event.repeat)start(button,'Space');}});
 root.addEventListener('keyup',event=>{if(event.key===' '&&gesture?.key==='Space'){event.preventDefault();end();}});
 window.addEventListener('blur',()=>{end(true);closeAll();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){end(true);closeAll();}});
 return closeAll;
}
