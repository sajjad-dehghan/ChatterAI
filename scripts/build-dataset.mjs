import {writeFile} from 'node:fs/promises';
import {entries,supplemental} from '../web/dataset-source.mjs';
import {clean} from '../web/retriever.mjs';
const seen=new Map(),tags=new Set();
const intents=entries.map(([tag,category,label,patterns,responses,heldout])=>{
 patterns=[...patterns,...(supplemental[tag]||[])];
 if(tags.has(tag))throw new Error('Duplicate tag: '+tag);tags.add(tag);
 for(const p of patterns){const key=clean(p);if(seen.has(key))throw new Error(`Duplicate pattern ${p}: ${seen.get(key)} / ${tag}`);seen.set(key,tag);}
 if(patterns.length<8||responses.length<2||!heldout||patterns.includes(heldout))throw new Error('Incomplete intent '+tag);
 return {tag,category,label,patterns,responses};
});
const dataset={schemaVersion:2,version:'2.0.0',language:'fa',license:'CC0-1.0',provenance:'Original AI-assisted authored examples for ChatterAI; not scraped or user-conversation data.',scope:'Persian small talk, product, UX, programming and introductory ML. Not an unrestricted LLM or live knowledge service.',intents};
const evaluation={datasetVersion:dataset.version,cases:entries.map(([tag,,,,,text])=>({text,expected:tag})),outOfScope:['پایتخت کشور خیالی نارونستان کجاست','رنگ بنفش چمدان فضایی','بهترین رستوران نزدیک من','دو به علاوه سه چند میشود','این متن طولانی هیچ موضوع مشخص مرتبطی با پرسش های تعریف شده ندارد','حروف الفبا را برعکس بنویس','رزرو پرواز برای فردا','یک شعر بلند تازه بنویس']};
for(const {text,expected} of evaluation.cases)if(seen.has(clean(text))||!tags.has(expected))throw new Error('Evaluation overlap or missing intent: '+text);
await writeFile(new URL('../web/dataset.json',import.meta.url),JSON.stringify(dataset,null,2)+'\n');
await writeFile(new URL('../web/evaluation.json',import.meta.url),JSON.stringify(evaluation,null,2)+'\n');
await writeFile(new URL('../json_file/conversation-v2.json',import.meta.url),JSON.stringify(dataset,null,2)+'\n');
console.log({intents:intents.length,patterns:seen.size,responses:intents.reduce((s,i)=>s+i.responses.length,0),heldOut:evaluation.cases.length,outOfScope:evaluation.outOfScope.length});
