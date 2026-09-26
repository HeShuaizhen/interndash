const D=window.COUPLE_DIMS,Q=window.COUPLE_QUESTIONS,$=id=>document.getElementById(id);
const labels=['非常不同意','比较不同意','不确定 / 看情况','比较同意','非常同意'];
let state={role:'A',nick:'A',partner:'B',i:0,ans:Array(Q.length).fill(null),Adata:null};

function encodeData(obj){return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decodeData(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(decodeURIComponent(escape(atob(s))))}
function readInvite(){try{if(!location.hash.startsWith('#pair='))return null;return decodeData(decodeURIComponent(location.hash.slice(6)))}catch(e){return null}}
const incoming=readInvite();
if(incoming&&Array.isArray(incoming.answers)&&incoming.answers.length===Q.length){
 state.role='B';state.Adata=incoming;
 $('roleHint').textContent='你正在接收 '+(incoming.nick||'A')+' 的配对邀请。完成后会立即生成双人报告。';
 $('partnername').value=incoming.nick||'A';$('nickname').placeholder='填写你的昵称（B）';$('startBtn').textContent='我是 B，开始填写';
}else{$('roleHint').textContent='你现在是 A。完成后页面会生成一个专属链接发给 B。'}

$('startBtn').onclick=()=>{state.nick=$('nickname').value.trim()||(state.role==='A'?'A':'B');state.partner=$('partnername').value.trim()||(state.role==='A'?'B':state.Adata?.nick||'A');$('intro').classList.add('hidden');$('quiz').classList.remove('hidden');renderQ()};
function renderQ(){const[d,t]=Q[state.i];$('qcat').textContent=D[d].group+' · '+D[d].name;$('qno').textContent=(state.i+1)+' / '+Q.length;$('question').textContent=t;$('progress').style.width=((state.i+1)/Q.length*100)+'%';$('scale').innerHTML='';labels.forEach((x,k)=>{const b=document.createElement('button');b.className='option'+(state.ans[state.i]===k+1?' sel':'');b.textContent=(k+1)+' · '+x;b.onclick=()=>{state.ans[state.i]=k+1;renderQ()};$('scale').appendChild(b)});$('prevBtn').disabled=state.i===0;$('nextBtn').disabled=state.ans[state.i]==null;$('nextBtn').textContent=state.i===Q.length-1?'提交':'下一题'}
$('prevBtn').onclick=()=>{if(state.i>0){state.i--;renderQ()}};
$('nextBtn').onclick=()=>{if(state.ans[state.i]==null)return;if(state.i<Q.length-1){state.i++;renderQ()}else finish()};

function calcScores(ans){const sum={},n={};Q.forEach((q,i)=>{const[d,,dir]=q,v=dir===1?ans[i]:6-ans[i];sum[d]=(sum[d]||0)+v;n[d]=(n[d]||0)+1});const o={};Object.keys(sum).forEach(d=>o[d]=Math.round(((sum[d]/n[d])-1)/4*100));return o}
function finish(){const data={v:1,nick:state.nick,answers:state.ans,scores:calcScores(state.ans)};$('quiz').classList.add('hidden');if(state.role==='A'){const url=location.href.split('#')[0]+'#pair='+encodeURIComponent(encodeData(data));$('shareUrl').textContent=url;$('share').classList.remove('hidden');$('copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(url);$('copyOk').textContent='已复制';}catch(e){prompt('复制这个链接：',url)}}}else generateReport(state.Adata,data)}

const mean=a=>a.reduce((x,y)=>x+y,0)/a.length,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),gap=(a,b)=>Math.abs(a-b);
function band(v){return v>=76?'高':v>=58?'中高':v>=42?'中等':v>=24?'中低':'低'}
function similarity(a,b,m=1){return clamp(100-gap(a,b)*m,0,100)}
function qualityMatch(a,b){const sim=similarity(a,b,.8),quality=(a+b)/2;return clamp(sim*.48+quality*.52,0,100)}
function compatibility(A,B){
 const parts={};
 parts.communication=qualityMatch(A.communication,B.communication);
 parts.conflict=qualityMatch(A.conflict,B.conflict);
 parts.boundaries=qualityMatch(A.boundaries,B.boundaries);
 parts.trust=clamp(mean([A.attachment,B.attachment,A.stability,B.stability,A.boundaries,B.boundaries])-.32*mean([gap(A.attachment,B.attachment),gap(A.stability,B.stability)]),0,100);
 parts.future=similarity(A.future,B.future,1.15);
 parts.lifestyle=similarity(A.lifestyle,B.lifestyle,1.05);
 parts.intimacy=similarity(A.intimacy,B.intimacy,1.18);
 parts.personality=mean(['openness','conscientious','extraversion','empathy','stability'].map(d=>similarity(A[d],B[d],.72)));
 let total=parts.communication*.13+parts.conflict*.15+parts.boundaries*.12+parts.trust*.13+parts.future*.15+parts.lifestyle*.10+parts.intimacy*.10+parts.personality*.12;
 const penalty=(Math.max(0,42-A.conflict)+Math.max(0,42-B.conflict)+Math.max(0,40-A.boundaries)+Math.max(0,40-B.boundaries)+Math.max(0,38-A.communication)+Math.max(0,38-B.communication))*.22;
 return {parts,total:Math.round(clamp(total-penalty,0,100))}
}
function profileText(s){const a=[];if(s.openness>=68)a.push('对变化和新体验较开放，通常不喜欢长期停滞。');else if(s.openness<=36)a.push('更偏好熟悉、可预测和稳妥的生活。');if(s.conscientious>=68)a.push('责任感与计划性较强，通常重承诺和执行。');else if(s.conscientious<=36)a.push('更随性，可能不喜欢被计划和流程约束。');if(s.extraversion>=68)a.push('社交能量较高，希望生活里有较多互动与共同参与。');else if(s.extraversion<=36)a.push('偏内向，需要较多独处恢复能量。');if(s.empathy>=68)a.push('共情与合作倾向明显，较愿意理解对方的立场。');else if(s.empathy<=36)a.push('更容易先从逻辑或自身立场出发，需要刻意练习换位。');if(s.stability>=68)a.push('压力下相对稳定，通常恢复得较快。');else if(s.stability<=36)a.push('对关系波动更敏感，情绪恢复可能较慢。');if(s.attachment>=68)a.push('亲密中的安全感较高，既能靠近也能允许彼此独立。');else if(s.attachment<=36)a.push('亲密中更容易出现焦虑确认或退缩防御。');return a.length?a.slice(0,6):['整体特征较均衡，不容易被单一性格标签概括。']}
function personCard(name,s){const core=['openness','conscientious','extraversion','empathy','stability','attachment'];return '<div class="person"><h3>'+name+'</h3><div class="mini">个体画像（0–100）</div>'+core.map(d=>'<div class="trait"><div class="traitline"><span>'+D[d].name+'</span><b>'+s[d]+' · '+band(s[d])+'</b></div><div class="bar"><i style="width:'+s[d]+'%"></i></div></div>').join('')+'<ul>'+profileText(s).map(x=>'<li>'+x+'</li>').join('')+'</ul></div>'}
function partName(d){return({communication:'沟通',conflict:'冲突修复',boundaries:'边界',trust:'信任安全',future:'未来规划',lifestyle:'生活方式',intimacy:'亲密需求',personality:'性格协同'})[d]||D[d]?.name||d}
function futureRead(a,b){const g=gap(a,b);return g<15?'对婚姻、生育、迁居、家庭边界与事业优先级的总体取向接近。':g<30?'长期方向存在一些差异，建议把婚姻、生育、城市与事业牺牲具体谈到可执行层面。':'长期取向差距明显，尤其要逐项确认婚姻、生育、定居城市、原生家庭边界与事业优先级。'}
function lifestyleRead(a,b){const g=gap(a,b);return g<15?'对作息整洁、储蓄消费、共同财务与家务分配的总体取向接近。':g<30?'共同生活习惯存在可见差异，需要提前形成财务和家务规则。':'生活方式差距较大，恋爱期可能不明显，但同居/婚后很容易成为高频冲突源。'}
function conflictText(d,a,b){const g=gap(a,b),low=Math.min(a,b);const map={communication:'一方可能更愿意把话说开，另一方更容易沉默、憋着或先下结论。',conflict:'争吵时的处理方式可能不同，尤其要防止羞辱、威胁分手、断联或长期不修复。',boundaries:'你们对隐私、报备、手机、朋友和独处的可接受范围可能不同。',attachment:'一方更需要确认与靠近，另一方可能在压力下更想拉开距离，容易形成“追—逃”循环。',future:futureRead(a,b),lifestyle:lifestyleRead(a,b),intimacy:'对联系频率、陪伴、表达爱和身体亲密的需要可能不同。',stability:'一方在压力下可能更容易情绪化，另一方如果只讲道理，矛盾可能升级。'};return map[d]+' 当前差距 '+g+' 分'+(low<38&&['communication','conflict','boundaries','attachment','stability'].includes(d)?'，且至少一方在该关系能力上偏弱，建议优先处理。':'。')}
function pairInterpret(d,a,b,c){const g=gap(a,b),m=(a+b)/2;if(d==='future')return futureRead(a,b);if(d==='lifestyle')return lifestyleRead(a,b);if(c>=78)return '匹配度较高。两人的'+D[d].name+'节奏接近，而且基础能力/需求也相对稳定。';if(g>=35)return '差距明显（'+g+'分）。如果不把需求说清楚，双方容易把“不同”误解成“不在乎”。';if(m<42&&['communication','conflict','boundaries','attachment','stability'].includes(d))return '你们在这一项较相似，但相似在偏低区间：短期可能少冲突，长期却可能共同回避关键问题。';return '整体处于可协商区间。真正影响结果的是能否形成双方都能长期执行的规则。'}
function discussion(A,B,C){const q=[];if(C.parts.future<78)q.push('我们对结婚、生育、定居城市、事业优先级分别是什么？哪些属于不可妥协项？');if(C.parts.lifestyle<78)q.push('如果共同生活，储蓄/消费、共同账户、个人账户、家务、作息和整洁度具体怎么安排？');if(C.parts.intimacy<75)q.push('我们各自理想的联系频率、陪伴时间、身体亲密和独处时间是多少？');if(C.parts.boundaries<75)q.push('手机隐私、异性朋友、报备、夜生活、社交媒体和原生家庭介入的边界是什么？');if(C.parts.conflict<75)q.push('吵架时哪些行为属于绝对禁区？如果暂停争吵，多久后必须回来把问题谈完？');if(C.parts.communication<75)q.push('当一方说“我需要被理解”时，另一方怎样做才会被真正感受到？');if(C.parts.trust<75)q.push('什么最容易触发我们的不安全感？怎样提供确认而不演变成控制？');q.push('如果未来出现失业、异地、收入差距或照顾父母的压力，我们希望怎样共同承担？');return q.slice(0,7)}
function generateReport(Adata,Bdata){
 $('report').classList.remove('hidden');const A=Adata.scores||calcScores(Adata.answers),B=Bdata.scores||calcScores(Bdata.answers),C=compatibility(A,B);
 $('totalScore').textContent=C.total;$('totalRing').style.setProperty('--v',C.total);
 const title=C.total>=82?'整体基础较稳，但仍需要把现实问题谈具体':C.total>=68?'有较好的相处基础，关键在差异管理':C.total>=52?'吸引与摩擦可能并存，需要建立明确规则':C.total>=38?'核心差异较多，长期关系依赖高质量协商':'多个关键维度存在明显风险信号';
 $('reportTitle').textContent=(Adata.nick||'A')+' × '+(Bdata.nick||'B')+'：'+title;
 const rank=Object.entries(C.parts).sort((x,y)=>y[1]-x[1]),strong=rank.slice(0,2),weak=rank.slice(-2).reverse();
 $('reportSummary').textContent='总适配度 '+C.total+'/100。当前最稳的是 '+strong.map(x=>partName(x[0])).join('、')+'；最值得优先处理的是 '+weak.map(x=>partName(x[0])).join('、')+'。';
 $('headlinePills').innerHTML=strong.map(x=>'<span class="pill">优势：'+partName(x[0])+' '+Math.round(x[1])+'</span>').join('')+weak.map(x=>'<span class="pill">关注：'+partName(x[0])+' '+Math.round(x[1])+'</span>').join('');
 $('people').innerHTML=personCard(Adata.nick||'A',A)+personCard(Bdata.nick||'B',B);
 const pd=['communication','conflict','boundaries','trust','future','lifestyle','intimacy','personality'];
 $('dims').innerHTML=pd.map(d=>'<div class="dim"><div>'+partName(d)+'</div><div class="meter"><i style="width:'+C.parts[d]+'%"></i></div><div class="value">'+Math.round(C.parts[d])+'</div></div>').join('');
 const all=Object.keys(D).map(d=>({d,g:gap(A[d],B[d]),m:(A[d]+B[d])/2}));
 const sim=[...all].sort((x,y)=>x.g-y.g).slice(0,4);
 const comp=[...all].filter(x=>x.g>=18&&x.g<=34).sort((x,y)=>Math.abs(x.g-25)-Math.abs(y.g-25)).slice(0,3);
 $('similar').innerHTML=sim.map(x=>'<li><b>'+D[x.d].name+'</b>：两人仅差 '+x.g+' 分，'+(x.m>=60?'并且都处在相对较高区间。':'节奏接近，彼此更容易预判对方。')+'</li>').join('');
 $('complement').innerHTML=(comp.length?comp:[...all].sort((x,y)=>Math.abs(x.g-24)-Math.abs(y.g-24)).slice(0,3)).map(x=>'<li><b>'+D[x.d].name+'</b>：约 '+x.g+' 分差异，适度不同可能带来补位，但要避免一方长期承担固定角色。</li>').join('');
 const risk=['communication','conflict','boundaries','attachment','future','lifestyle','intimacy','stability'].map(d=>({d,g:gap(A[d],B[d]),m:(A[d]+B[d])/2,min:Math.min(A[d],B[d])})).sort((x,y)=>(y.g+(50-y.m)*.7)-(x.g+(50-x.m)*.7)).slice(0,5);
 $('conflicts').innerHTML=risk.map(x=>'<div class="callout '+(x.g>32||x.min<35?'bad':x.g>22||x.m<50?'warn':'')+'"><b>'+D[x.d].name+'</b>：'+conflictText(x.d,A[x.d],B[x.d])+'</div>').join('');
 const long=[];if(C.parts.future<62)long.push('长期方向是第一优先议题。婚姻、生育、工作城市、照顾父母与职业牺牲，不适合用“以后再说”代替共识。');if(C.parts.lifestyle<62)long.push('共同生活后，钱、家务、作息与整洁度会高频出现。建议在同居或结婚前把规则写到足够具体。');if(C.parts.conflict<62)long.push('主要风险不是“会不会吵”，而是冲突后能否修复。建议明确禁区：羞辱、威胁分手、消失、翻旧账、逼迫表态。');if(C.parts.boundaries<62)long.push('亲密与自主的边界需要重新谈判，尤其是手机隐私、朋友、独处、报备程度和家庭介入。');if(C.parts.intimacy<62)long.push('亲密需求存在差异。高需求的一方容易觉得被冷落，低需求的一方容易觉得被粘住，最好把“需要多少联系/陪伴/身体接触”具体化。');if(!long.length)long.push('长期基础相对不错。下一步不是追求更高分，而是把目前有效的沟通、信任和分工固化成双方都认可的习惯。');
 $('longterm').innerHTML=long.map(x=>'<div class="callout">'+x+'</div>').join('');
 $('questionsToDiscuss').innerHTML=discussion(A,B,C).map(x=>'<li>'+x+'</li>').join('');
 $('thA').textContent=Adata.nick||'A';$('thB').textContent=Bdata.nick||'B';
 $('compareBody').innerHTML=Object.keys(D).map(d=>'<tr><td>'+D[d].name+'</td><td>'+A[d]+'</td><td>'+B[d]+'</td><td>'+gap(A[d],B[d])+'</td><td>'+pairInterpret(d,A[d],B[d],d==='future'?C.parts.future:d==='lifestyle'?C.parts.lifestyle:similarity(A[d],B[d]))+'</td></tr>').join('');
 $('restartBtn').onclick=()=>{location.href=location.href.split('#')[0]};window.scrollTo({top:$('report').offsetTop-8,behavior:'smooth'});
}