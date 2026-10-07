import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRetriever,clean} from '../retriever.mjs';
const root=new URL('../',import.meta.url);
const data=JSON.parse(await readFile(new URL('dataset.json',root),'utf8'));
const evaluation=JSON.parse(await readFile(new URL('evaluation.json',root),'utf8'));
const model=createRetriever(data);
test('curated Persian dataset has documented provenance, consistent schema and no normalized duplicates',()=>{
 assert.equal(data.version,'2.0.0');assert.equal(data.language,'fa');assert.match(data.provenance,/not scraped/);
 assert.deepEqual(model.stats,{intents:67,patterns:552,responses:134,categories:8});
 const seen=new Set();for(const intent of data.intents){assert(intent.patterns.length>=8);assert.equal(intent.responses.length,2);for(const p of intent.patterns){assert(!seen.has(clean(p)));seen.add(clean(p));assert(p.length<=500);}for(const r of intent.responses){assert(r.trim().length>20);assert.doesNotMatch(r,/فروغی هستم|پشتیبانی نداریم|اسدی ام/);}}
});
test('every authored training example retrieves a response from its own intent',()=>{
 for(const intent of data.intents)for(const p of intent.patterns){const r=model.respond(p,()=>0);assert.equal(r.intent,intent.tag,p);assert.equal(r.score,1);assert(intent.responses.includes(r.text));}
});
test('67 non-identical development paraphrases remain correct, without claiming blind accuracy',()=>{
 const train=new Set(data.intents.flatMap(i=>i.patterns.map(clean)));
 for(const c of evaluation.cases){assert(!train.has(clean(c.text)),c.text);assert.equal(model.respond(c.text).intent,c.expected,c.text);}
});
test('unrelated, blank and ambiguous input abstains rather than fabricating a reply',()=>{
 for(const text of [...evaluation.outOfScope,'','   ','MVP چیست و SQL چیست','<script>alert(1)</script>','برای شام چی بخورم؟'])assert.equal(model.respond(text).intent,null,text);
});
test('Arabic letter forms, casing, punctuation, half spaces and repeated whitespace are normalized',()=>{
 for(const text of ['  MVP چیست؟  ','mvp چيه؟','دیتاست  تمیز یعنی چی','دیتاست تمیز یعنی چی؟'])assert(model.respond(text).intent,text);
 assert.equal(model.respond('پایتون چيه؟').intent,'python');
});
test('professional and live-info boundaries return authored limits, not invented advice',()=>{
 for(const tag of ['medical_boundary','financial_boundary','legal_boundary','live_information','unsafe_request']){
  const intent=data.intents.find(i=>i.tag===tag);assert.equal(model.respond(intent.patterns[0]).intent,tag);
 }
});
test('dataset loader rejects malformed schema and duplicate patterns',()=>{
 assert.throws(()=>createRetriever({schemaVersion:7}),/Invalid/);
 const copy=structuredClone(data);copy.intents[1].patterns.push(copy.intents[0].patterns[0]);assert.throws(()=>createRetriever(copy),/Duplicate/);
});
test('active interface loads the v2 corpus and labels retrieval scores truthfully',async()=>{
 const app=await readFile(new URL('app.mjs',root),'utf8'),html=await readFile(new URL('index.html',root),'utf8');
 assert.match(app,/fetch\('\.\/dataset.json'\)/);assert.doesNotMatch(app,/fetch\('\.\/model.json'\)/);assert.match(app,/createRetriever/);
 assert.match(html,/TF-IDF/);assert.match(html,/دریافت دیتاست/);assert.match(app,/نه احتمال درستی پاسخ/);
});
