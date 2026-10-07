import {normalize} from './engine.mjs';
const stop=new Set(['چی','چیه','چیست','چه','چطور','چگونه','یعنی','را','رو','از','به','با','در','و','یا','برای','یک','یه','این','آن','اون','من','تو','ما','شما','هم','که','تا','آیا','است','هست','هستی','میشه','شود','میشود','کن','بده','بگو','کنم','کنیم','کنید','بدهم','کنند','کنه','میکنه','لطفا','توضیح','معنی','میتونم','میتونی','می','هر','خود','خودت','بر','کمکت','متوجه','میشوی','تر','روشی','میکنی','میفهمی','انجام','می دهد','میدهد','باید','باشد','هستین','هستید']);
const forms={میتوانم:'میتونم',میتوانی:'میتونی',گفتگو:'گفتگو',گفتوگو:'گفتگو',دیتاست:'دیتاست',دادهها:'داده',پیامها:'پیام',سوالات:'سوال',کاربران:'کاربر',میکند:'میکنه',کاربری:'کاربر',کارها:'کار',میخواهم:'میخوام',ارزی:'ارز',خریداری:'خرید',خریدن:'خرید',خدافظ:'خداحافظ',چتبات:'چتبات'};
export function clean(text){return normalize(text).toLowerCase().replace(/[\p{P}\p{S}]+/gu,' ').replace(/\s+/g,' ').trim();}
const aliases={اسمت:'نام',اسم:'نام',نامت:'نام',چتم:'چت',چتت:'چت',خوبی:'خوب',حالتم:'حال',جوابت:'پاسخ',پاسخت:'پاسخ',جواب:'پاسخ',جوابهات:'پاسخ',پاسخها:'پاسخ',کارت:'کار',کاریتون:'کاری',دیتاستم:'دیتاست',پرسونای:'پرسونا',پرسونایم:'پرسونا',بکلاگ:'بکلاگ',بک:'بک',ارسال:'فرستادن',میفرستی:'فرستادن',میفرستم:'فرستادن',پوش:'push',کامیت:'commit',معرفی:'معرفی',مجموعه:'داده',روشی:'روش',ساختت:'ساخته',ساخت:'ساخته',سازنده:'سازنده',برنامهها:'برنامه',همیشه:'همیشه'};
export function words(text){return clean(text).replace(/اچ تی ام ال/g,'html').replace(/سی اس اس/g,'css').replace(/ال اس تی ام/g,'lstm').replace(/تی اف ای دی اف/g,'tfidf').replace(/بک لاگ/g,'بکلاگ').replace(/می دهد/g,'میدهد').split(' ').map(w=>aliases[forms[w]??w]??forms[w]??w).filter(w=>w&&!stop.has(w));}
function grams(text){const s=clean(text);const out=[];for(let i=0;i<s.length-2;i++)out.push(s.slice(i,i+3));return out;}
function counts(items){const m=new Map();for(const x of items)m.set(x,(m.get(x)||0)+1);return m;}
function vector(items,idf){const v=new Map();let norm=0;for(const [key,n] of counts(items)){if(!idf.has(key))continue;const weight=(1+Math.log(n))*idf.get(key);v.set(key,weight);norm+=weight*weight;}norm=Math.sqrt(norm);if(norm)for(const [k,vv] of v)v.set(k,vv/norm);return v;}
function cosine(a,b){let score=0;for(const [key,value] of a)score+=value*(b.get(key)||0);return score;}
function idfs(docs){const df=new Map();for(const doc of docs)for(const token of new Set(doc))df.set(token,(df.get(token)||0)+1);return new Map([...df].map(([token,n])=>[token,1+Math.log((docs.length+1)/(n+1))]));}
export function createRetriever(dataset){
 if(dataset.schemaVersion!==2||!Array.isArray(dataset.intents)||!dataset.intents.length)throw new Error('Invalid dataset');
 const docs=[],exact=new Map();
 for(const intent of dataset.intents){
  if(!intent.tag||!intent.label||!Array.isArray(intent.patterns)||!intent.patterns.length||!Array.isArray(intent.responses)||!intent.responses.length||intent.responses.some(x=>typeof x!=='string'))throw new Error('Invalid intent');
  for(const text of intent.patterns){const key=clean(text);if(exact.has(key))throw new Error('Duplicate normalized pattern');const d={text,intent,words:words(text),grams:grams(text)};docs.push(d);exact.set(key,d);}
 }
 const wordIdf=idfs(docs.map(d=>d.words)),gramIdf=idfs(docs.map(d=>d.grams));
 for(const doc of docs){doc.wv=vector(doc.words,wordIdf);doc.gv=vector(doc.grams,gramIdf);}
 const fallback='برای این سؤال پاسخ مطمئنی در دیتاست ندارم. کوتاه‌تر و دربارهٔ یک موضوع مشخص بپرس؛ مثلا «MVP چیست؟» یا «تست کاربردپذیری چیه؟».';
 function respond(text,random=()=>0){
  text=normalize(text);const tokens=words(text),known=tokens.filter(t=>wordIdf.has(t));
  const direct=exact.get(clean(text));
  let winner=direct,score=direct?1:0,margin=1;
  if(!direct&&tokens.length){
   const wv=vector(tokens,wordIdf),gv=vector(grams(text),gramIdf),ranked=new Map();
   for(const doc of docs){const s=.75*cosine(wv,doc.wv)+.25*cosine(gv,doc.gv);if(s>(ranked.get(doc.intent.tag)?.score??-1))ranked.set(doc.intent.tag,{doc,score:s});}
   const rankedIntents=[...ranked.values()].sort((a,b)=>b.score-a.score);const first=rankedIntents[0];score=first.score;margin=score-(rankedIntents[1]?.score??0);
   const coverage=new Set(known).size/new Set(tokens).size;
   const medicalContext=first.doc.intent.tag!=='medical_boundary'||/پزشک|دارو|قرص|درمان|بیمار|علائم|دوز|تشخیص/.test(clean(text));
   if(score>=.50&&margin>=.04&&coverage>=.5&&medicalContext)winner=first.doc;
  }
  if(!winner)return {intent:null,label:null,score,margin,tokens:[...new Set(known)],text:fallback,matchedPattern:null};
  const responses=winner.intent.responses,index=Math.max(0,Math.min(responses.length-1,Math.floor(random()*responses.length)));
  return {intent:winner.intent.tag,label:winner.intent.label,score,margin,tokens:[...new Set(known)],text:responses[index],matchedPattern:winner.text};
 }
 return {respond,stats:{intents:dataset.intents.length,patterns:docs.length,responses:dataset.intents.reduce((n,i)=>n+i.responses.length,0),categories:new Set(dataset.intents.map(i=>i.category)).size},version:dataset.version};
}
