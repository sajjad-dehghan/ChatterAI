import { createRetriever } from './retriever.mjs';
const $=id=>document.getElementById(id);
const messages=$('messages'),input=$('message'),send=$('send'),connection=$('connection');
const welcome=messages.firstElementChild.cloneNode(true);
const suggestions=[...document.querySelectorAll('[data-message]')];
const number=new Intl.NumberFormat('fa-IR');
let model=null;
function updateCounter(){ $('counter').textContent=`${number.format(input.value.length)} / ۵۰۰`;send.disabled=!model||!input.value.trim(); }
function addMessage(text,user,result){
 const item=document.createElement('div');item.className=`message ${user?'user':'assistant'}`;
 const bubble=document.createElement('div');bubble.className='bubble';bubble.dir='auto';bubble.textContent=text;
 const meta=document.createElement('small');meta.textContent=user?'شما':result?.intent?`پاسخ دیتاست · ${result.label}`:'ChatterAI · نیاز به سؤال روشن‌تر';
 item.append(bubble,meta);messages.append(item);
 while(messages.children.length>40)messages.firstElementChild.remove();
 messages.scrollTop=messages.scrollHeight;
}
function submit(text){
 text=text.trim().slice(0,500);if(!model||!text)return;
 messages.querySelector('.welcome')?.remove();addMessage(text,true);
 const result=model.respond(text);addMessage(result.text,false,result);
 $('intent').textContent=result.intent?`موضوع تشخیص‌داده‌شده: ${result.label}`:'پاسخ مطمئنی پیدا نشد؛ یک موضوع مشخص بپرس.';
 $('tokens').textContent=result.tokens.length?`کلمه‌ها: ${result.tokens.join(' · ')}`:'کلمهٔ مشترک کافی با نمونه‌های دیتاست پیدا نشد.';
 $('score').textContent=result.intent?`شباهت متنی: ${number.format(Math.round(result.score*100))}٪ · نه احتمال درستی پاسخ`:'پاسخ نامطمئن نمایش داده نمی‌شود؛ ChatGPT متصل نیست.';
 input.value='';updateCounter();
}
$('composer').addEventListener('submit',event=>{event.preventDefault();submit(input.value);input.focus();});
input.addEventListener('input',updateCounter);
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();submit(input.value);}});
for(const button of suggestions){button.disabled=true;button.addEventListener('click',()=>submit(button.dataset.message));}
$('reset').addEventListener('click',()=>{messages.replaceChildren(welcome.cloneNode(true));input.value='';updateCounter();$('intent').textContent='منتظر اولین پیام';$('tokens').textContent='کلمه‌های شناخته‌شده اینجا نمایش داده می‌شوند.';$('score').textContent='شباهت متنی، احتمال صحت پاسخ نیست.';input.focus();});
async function load(){
 try{const response=await fetch('./dataset.json');if(!response.ok)throw new Error('Dataset unavailable');model=createRetriever(await response.json());connection.textContent=`دیتاست فارسی ${model.version} · آمادهٔ گفت‌وگو`;for(const [id,value] of Object.entries(model.stats))if($(id+'-count'))$(id+'-count').textContent=number.format(value);input.disabled=false;for(const button of suggestions)button.disabled=false;updateCounter();}
 catch{connection.textContent='دیتاست بارگذاری نشد؛ دوباره تلاش کن.';const retry=document.createElement('button');retry.type='button';retry.textContent='بارگذاری دوباره';retry.addEventListener('click',()=>{retry.remove();connection.textContent='در حال بارگذاری دیتاست…';load();});connection.append(' ',retry);}
}
load();
