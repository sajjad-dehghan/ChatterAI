import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {answer,classify,normalize,vectorize,forward} from '../engine.mjs';
const model=JSON.parse(await readFile(new URL('../model.json',import.meta.url),'utf8'));
test('ChatterAI exports the original trained BoW network, not substituted weights',()=>{
 assert.equal(model.sourceSha256,'b5f109b893967836b1e3f3fb9263410fced08cd8beebf53cd8babbaf239245d1');
 assert.equal(model.words.length,28);assert.equal(model.classes.length,4);
 assert.deepEqual(model.layers.map(l=>l.shape),[[28,128],[128,64],[64,4]]);
 assert.deepEqual(model.layers.map(l=>l.activation),['relu','relu','softmax']);
});
test('all four example intents use actual model inference and original corpus responses',()=>{
 for(const [text,intent] of [['سلام','خوش آمدگویی'],['شما کی هستین؟','اسم و فامیل'],['ممنون خدانگهدار','خداحافظی'],['ساعت پشتیبانیتون به چه صورته؟','ساعت کاری']]){
  const result=answer(text,model,()=>0);assert.equal(result.intent,intent);assert(result.score>.2&&result.score<=1);
  assert(model.intents.find(i=>i.tag===intent).responses.includes(result.text));
 }
});
test('Persian browser normalization is bounded and handles Arabic forms and diacritics',()=>{
 assert.equal(normalize('  سَلام كی يک  '),'سلام کی یک');assert.equal(normalize('ا'.repeat(700)).length,500);
 assert.deepEqual(vectorize('سَلام!',model.words),vectorize('سلام',model.words));
});
test('unknown and blank inputs do not hallucinate a trained or ChatGPT response',()=>{
 for(const input of ['','   ','فضاپیمای بنفش','<script>alert(1)</script>']){const result=answer(input,model);assert.equal(result.intent,null);assert.equal(result.score,0);}
});
test('stable softmax sums to one and network rejects mismatched dimensions',()=>{
 const probs=forward(vectorize('سلام',model.words),model.layers);assert(Math.abs(probs.reduce((a,b)=>a+b,0)-1)<1e-12);
 assert.throws(()=>forward([1],model.layers),/dimensions/);
 assert.equal(classify('سلام',model).score,0.43817451904665294);
});
test('UI exposes honest model limits and renders text safely without external chat calls',async()=>{
 const dir=new URL('../',import.meta.url),html=await readFile(new URL('index.html',dir),'utf8'),app=await readFile(new URL('app.mjs',dir),'utf8');
 assert.match(html,/ChatGPT متصل نیست/);assert.match(html,/TF-IDF/);assert.match(html,/نمونه‌های تألیفی فارسی/);assert.match(html,/maxlength="500"/);
 assert.doesNotMatch(app,/innerHTML|localStorage|sessionStorage|api\.openai|setTimeout/);assert.match(app,/bubble\.textContent=text/);assert.match(app,/event\.isComposing/);
});
