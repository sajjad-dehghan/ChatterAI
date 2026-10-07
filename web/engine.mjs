// Inference-only port of the original 28 → 128 → 64 → 4 Dense network.
// Dropout is inactive at inference. No weights are retrained or substituted.
export function normalize(text) {
  return String(text).slice(0,500).normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/‌/g,' ').trim();
}
const aliases={هستین:'#هست',هستید:'#هست',هستی:'#هست',است:'#هست',اومده:'آمد#آ',آمده:'آمد#آ',برام:'برایم',میتونم:'توانست#توان',توانم:'توانست#توان',می:'',آقای:'آقا',هایی:'هایی',سوالاتی:'سوال',ساعتهایی:'ساعت',ساعتتون:'ساعت',پشتیبانیتون:'پشتیبان',پشتیبانی:'پشتیبان',مشکلی:'مشکل',کدوم:'کدام',بپرسیم:'پرسید#پرس',بپرسم:'پرسید#پرس',ساعتتان:'ساعت'};
export function vectorize(text, words) {
  const tokens=normalize(text).match(/[\p{L}\p{N}#]+/gu)||[];
  const normalized=new Set(tokens.map(t=>aliases[t]??t));
  return words.map(w=>normalized.has(w)?1:0);
}
export function forward(input,layers) {
  let value=input;
  for(const layer of layers) {
    const [rows,cols]=layer.shape;
    if(value.length!==rows||layer.kernel.length!==rows*cols||layer.bias.length!==cols) throw new Error('Invalid model dimensions');
    const output=layer.bias.slice();
    for(let i=0;i<rows;i++) for(let j=0;j<cols;j++) output[j]+=value[i]*layer.kernel[i*cols+j];
    if(layer.activation==='relu') value=output.map(v=>Math.max(0,v));
    else if(layer.activation==='softmax') {
      const max=Math.max(...output),exp=output.map(v=>Math.exp(v-max)),sum=exp.reduce((a,b)=>a+b,0);
      value=exp.map(v=>v/sum);
    } else throw new Error('Unsupported activation');
  }
  return value;
}
export function classify(text,model) {
  const vector=vectorize(text,model.words);
  if(!vector.some(Boolean)) return {intent:null,score:0,tokens:[]};
  const probabilities=forward(vector,model.layers);
  const index=probabilities.indexOf(Math.max(...probabilities));
  return {intent:probabilities[index]>.20?model.classes[index]:null,score:probabilities[index],tokens:model.words.filter((_,i)=>vector[i])};
}
export function answer(text,model,random=Math.random) {
  const result=classify(text,model);
  const responses=model.intents.find(i=>i.tag===result.intent)?.responses;
  return {...result,text:responses?.length?responses[Math.min(responses.length-1,Math.max(0,Math.floor(random()*responses.length)))]: 'برای این پیام پاسخی در مدل نمونه پیدا نکردم. یکی از موضوع‌های پیشنهادی را امتحان کن.'};
}
