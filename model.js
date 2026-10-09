export const programme=[
 [['goblet-squat','Goblet Squat',4,10,90],['wide-pulldown','Wide-Grip Lat Pulldown',4,8,90],['lying-leg-curl','Lying Leg Curl',4,12,75],['dumbbell-shoulder-press','Dumbbell Shoulder Press',3,10,90],['standing-calf-raise','Standing Calf Raise',4,12,60],['crunches','Crunches',4,15,45]],
 [['leg-press','Leg Press',4,10,120],['seated-row','Seated Row',4,8,90],['dumbbell-rdl','Dumbbell Romanian Deadlift',4,10,120],['tricep-pushdown','Tricep Cable Pushdown',3,12,60],['dumbbell-curls','Dumbbell Bicep Curls',3,10,60],['decline-sit-ups','Decline Sit-Ups',4,15,60]],
 [['sumo-goblet-squat','Sumo Goblet Squat',4,10,90],['narrow-pulldown','Narrow-Grip Lat Pulldown',4,10,90],['standing-lunges','Standing Lunges',3,8,90,true],['leg-extension','Leg Extension',4,10,75],['calf-press','45° Calf Press',4,12,60],['plank','Plank',3,null,60,false,'time']]
].map(day=>day.map(([id,name,sets,reps,rest,unilateral=false,kind='reps'])=>({id,name,sets,reps,rest,unilateral,kind})));
export const exerciseCatalog=programme.flat();
export const STORAGE_KEY='pollfitt-workouts-v1';
export const fresh=()=>({app:'PollFitt',version:1,nextDay:0,activeDay:null,drafts:{},history:[],settings:{rest:{},plankSeconds:60},timer:null});
export const exerciseName=e=>e.name;
export const complete=set=>set.sides.every(a=>a.done);
export const count=s=>s.exercises.reduce((n,e)=>n+e.sets.filter(x=>!x.warmup&&complete(x)).length,0);
export const total=s=>s.exercises.reduce((n,e)=>n+e.sets.filter(x=>!x.warmup).length,0);
export function lastPerformance(state,id){
 const sessions=state.history.slice().sort((a,b)=>Date.parse(b.endedAt)-Date.parse(a.endedAt));
 for(const workout of sessions){const exercise=workout.exercises.find(e=>e.id===id);if(exercise?.sets.some(s=>s.sides.some(a=>a.done||a.recorded)))return {workout,exercise};}
 return null;
}
export const previous=(state,id)=>lastPerformance(state,id)?.exercise;
export function makeSession(state,day){return {id:globalThis.crypto.randomUUID(),day,startedAt:new Date().toISOString(),exercises:programme[day].map(ex=>{const prev=previous(state,ex.id);return {...ex,prescribedSets:ex.sets,sets:Array.from({length:ex.sets},(_,i)=>({warmup:false,sides:(ex.unilateral?['Left','Right']:['Both']).map((side,j)=>ex.kind==='time'?{side,seconds:state.settings.plankSeconds??60,done:false,recorded:false}:{side,weight:prev?.sets[i]?.sides[j]?.weight??'',reps:ex.reps,done:false,recorded:false})}))};})};}
export function finish(state,day){const s=state.drafts[day];if(!s)throw Error('No workout started');state.history.unshift({...s,endedAt:new Date().toISOString(),endedEarly:count(s)!==total(s)});delete state.drafts[day];state.nextDay=(day+1)%programme.length;state.activeDay=state.drafts[state.nextDay]?state.nextDay:Object.keys(state.drafts).map(Number)[0]??null;state.timer=null;return state.nextDay;}
export function remaining(timer,now=Date.now()){return !timer?0:timer.paused?timer.remaining:Math.max(0,Math.ceil((timer.endsAt-now)/1000));}
export function validate(data){
 const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 const int=(v,min,max)=>num(v,min,max)&&Number.isInteger(v);
 const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 if(!object(data)||data.app!=='PollFitt'||data.version!==1||!int(data.nextDay,0,2)||!Array.isArray(data.history)||!object(data.drafts)||!object(data.settings)||!object(data.settings.rest)||!int(data.settings.plankSeconds,30,90))throw Error('This is not a valid PollFitt backup.');
 for(const s of [...data.history,...Object.values(data.drafts)]){
  if(!object(s)||!int(s.day,0,2)||!date(s.startedAt)||typeof s.id!=='string'||!Array.isArray(s.exercises)||s.exercises.length!==programme[s.day].length)throw Error('Invalid workout.');
  if(s.workoutStartedAt!==undefined&&!date(s.workoutStartedAt))throw Error('Invalid workout start.');
  if(s.endedAt!==undefined&&(!date(s.endedAt)||typeof s.endedEarly!=='boolean'))throw Error('Invalid workout finish.');
  if(new Set(s.exercises.map(e=>e.id)).size!==s.exercises.length)throw Error('Duplicate exercise.');
  for(const e of s.exercises){const spec=programme[s.day].find(x=>x.id===e.id);
   if(!spec||e.name!==spec.name||e.kind!==spec.kind||e.reps!==spec.reps||e.unilateral!==spec.unilateral||e.prescribedSets!==spec.sets||!int(e.rest,15,900)||!Array.isArray(e.sets)||e.sets.length!==spec.sets)throw Error('Invalid exercise.');
   for(const set of e.sets){if(set.warmup!==false||!Array.isArray(set.sides)||set.sides.length!==(spec.unilateral?2:1)||set.completionOrder!==undefined&&!int(set.completionOrder,1,1e9))throw Error('Invalid set.');
    set.sides.forEach((a,j)=>{if(a.side!==(spec.unilateral?['Left','Right'][j]:'Both')||typeof a.done!=='boolean'||typeof a.recorded!=='boolean')throw Error('Invalid set status.');
     if(spec.kind==='time'){if(!int(a.seconds,30,90)||'weight' in a||'reps' in a)throw Error('Plank seconds must be a whole number from 30 to 90.');}
     else if(!(a.weight===''||num(a.weight,0,2000))||!int(a.reps,0,1000)||a.done&&a.weight==='')throw Error('Invalid weight or reps.');
    });
   }
  }
 }
 for(const [key,s]of Object.entries(data.drafts))if(String(s.day)!==key||s.endedAt)throw Error('Invalid saved session.');
 if(data.history.some(s=>!s.endedAt))throw Error('Missing workout finish.');
 if(data.activeDay!==null&&(!int(data.activeDay,0,2)||!data.drafts[data.activeDay]))throw Error('Invalid active day.');
 for(const [id,v]of Object.entries(data.settings.rest))if(!exerciseCatalog.some(e=>e.id===id)||!int(v,15,900))throw Error('Invalid rest duration.');
 if(data.timer!==null){const t=data.timer;if(!object(t)||!int(t.duration,15,900)||!num(t.endsAt,0,1e15)||!int(t.remaining,0,86400)||typeof t.paused!=='boolean'||typeof t.label!=='string'||!exerciseCatalog.some(e=>e.name===t.label))throw Error('Invalid rest timer.');}
 return data;
}
