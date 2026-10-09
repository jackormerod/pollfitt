import {programme,complete} from './model.js';
export function durationBreakdown(day,rest={},session=null,plankSeconds=60){
 const exercises=session?session.exercises.map(e=>({...e,sets:e.sets.filter(s=>!s.warmup).length})):programme[day];
 const execution=exercises.reduce((n,e)=>n+(e.kind==='time'?(session?session.exercises.find(x=>x.id===e.id).sets.reduce((t,s)=>t+20+s.sides[0].seconds,0):e.sets*(20+plankSeconds)):e.sets*(20+e.reps*3*(e.unilateral?2:1))),0);
 const transitions=(exercises.length-1)*75,preparation=480;
 const betweenSets=exercises.reduce((n,e)=>n+(e.sets-1)*(rest[e.id]??e.rest),0);
 return {execution,transitions,preparation,rest:betweenSets,minutes:Math.round((execution+transitions+preparation+betweenSets)/60)};
}
export function toggleSet(session,ei,si,ai){
 const set=session.exercises[ei].sets[si],arm=set.sides[ai],wasComplete=complete(set);
 if(!arm.done&&session.exercises[ei].kind==='time'&&(!Number.isInteger(arm.seconds)||arm.seconds<30||arm.seconds>90))throw Error('Enter whole-number seconds from 30 to 90.');
 if(!arm.done&&session.exercises[ei].kind!=='time'&&(arm.weight===''||!Number.isFinite(arm.weight)||arm.weight<0||!Number.isInteger(arm.reps)||arm.reps<0))throw Error('Enter a weight and whole number of reps first.');
 arm.done=!arm.done;arm.recorded=true;
 const nowComplete=complete(set);
 if(!nowComplete)delete set.completionOrder;
 else if(!wasComplete)set.completionOrder=1+Math.max(0,...session.exercises.flatMap(e=>e.sets.map((s,i)=>s.completionOrder??(complete(s)?i+1:0))));
 return {completed:arm.done,startRest:!wasComplete&&nowComplete};
}
export function qualifyingArm(arm,target){return !!arm?.done&&typeof arm.weight==='number'&&Number.isFinite(arm.weight)&&arm.weight>=0&&Number.isInteger(arm.reps)&&arm.reps>=target;}
function olderWorkouts(state,session){
 if(!session.endedAt)return state.history;
 const index=state.history.indexOf(session),time=Date.parse(session.endedAt);
 return state.history.filter((s,i)=>s.id!==session.id&&(Date.parse(s.endedAt)<time||(Date.parse(s.endedAt)===time&&i>index)));
}
// PBs are derived from saved results, never by rewriting old workout records.
export function personalBest(state,session,exercise){
 if(exercise.kind==='time')return null;
 const spec=exercise;
 const baseline=Array(spec.unilateral?2:1).fill(-Infinity);
 for(const workout of olderWorkouts(state,session)){
  const old=workout.exercises.find(e=>e.id===spec.id);if(!old)continue;
  for(const set of old.sets.filter(s=>!s.warmup))set.sides.forEach((arm,i)=>{if(i<baseline.length&&qualifyingArm(arm,old.reps))baseline[i]=Math.max(baseline[i],arm.weight);});
 }
 const ordered=exercise.sets.map((set,index)=>({set,index})).filter(({set})=>!set.warmup).sort((a,b)=>(a.set.completionOrder??a.index+1)-(b.set.completionOrder??b.index+1));
 for(const {set,index}of ordered)if(set.sides.length===baseline.length&&set.sides.every((arm,i)=>qualifyingArm(arm,spec.reps)&&arm.weight>baseline[i]))return {setIndex:index,sideIndex:baseline.length-1,weights:set.sides.map(a=>a.weight)};
 return null;
}
export function swipeDirection(start,end){
 if(!start||!end)return 0;
 const dx=end.x-start.x,dy=end.y-start.y;
 return Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5?(dx<0?1:-1):0;
}
export function animateDay(element,direction,reducedMotion=false){
 element.getAnimations?.().forEach(a=>a.cancel());
 if(reducedMotion||!direction)return;
 element.animate?.([{transform:`translateX(${direction*14}px)`,opacity:.92},{transform:'translateX(0)',opacity:1}],{duration:200,easing:'ease-out'});
}
