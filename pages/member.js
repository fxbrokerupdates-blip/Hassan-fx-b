
(() => {
'use strict';
const root=document.getElementById('main');
const client=window.supabase?.createClient(window.FX_CONFIG.url,window.FX_CONFIG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const base=location.origin+location.pathname;
const loginLink=document.getElementById('member-login-link'),signupLink=document.getElementById('member-signup-link');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const go=path=>{if(location.hash==='#'+path)render();else location.hash=path;};
const message=(text,bad=false)=>{const el=root.querySelector('[data-message]');if(el){el.textContent=text;el.classList.toggle('bad',bad);}};
const field=(name,label,opts='')=>'<label>'+label+'<input name="'+name+'" '+opts+' required></label>';
const textarea=(name,label,opts='')=>'<label>'+label+'<textarea name="'+name+'" '+opts+' required></textarea></label>';
const select=(name,label,values)=>'<label>'+label+'<select name="'+name+'">'+values.map(v=>'<option value="'+safe(v[0])+'">'+safe(v[1])+'</option>').join('')+'</select></label>';
const box=(title,sub,body)=>'<section class="wrap member-shell"><div class="member-auth"><div class="member-eyebrow">FX BROKER UPDATES · FREE DEMO</div><h1>'+title+'</h1><p class="member-sub">'+sub+'</p>'+body+'<div data-message role="status" aria-live="polite"></div></div></section>';
function nav(session){if(!loginLink||!signupLink)return;loginLink.textContent=session?'Dashboard':'Login';loginLink.href=session?'#/dashboard':'#/login';signupLink.textContent=session?'Log Out':'Sign Up';signupLink.href=session?'#/logout':'#/signup';}
let recovering=false;
const initial=client?client.auth.getSession().then(({data})=>{nav(data.session);return data.session;}).catch(()=>null):Promise.resolve(null);
if(client)client.auth.onAuthStateChange((event,session)=>{nav(session);if(event==='PASSWORD_RECOVERY'){recovering=true;setTimeout(()=>go('/reset-password'),0);}});
const authError=()=>box('Account service unavailable','The login service could not load.','<a href="#/" class="btn outline">Back to home</a>');
function authForm(path){
 if(!client){root.innerHTML=authError();return;}
 const signup=path==='/signup',forgot=path==='/forgot-password',reset=path==='/reset-password';
 const title=signup?'Create your free account':forgot?'Reset your password':reset?'Set a new password':'Welcome back';
 const sub=signup?'Free demo access. No subscription or payment required.':forgot?'Enter your registered email address.':reset?'Choose a strong new password.':'Sign in to your free member dashboard.';
 const inputs=(signup?field('full_name','Full name','autocomplete="name" maxlength="120"'):'')+(!reset?field('email','Email address','type="email" autocomplete="email" maxlength="254"'):'')+(!forgot?field('password','Password','type="password" minlength="8" maxlength="128" autocomplete="'+(signup||reset?'new-password':'current-password')+'"'):'')+(signup?'<label class="member-check"><input type="checkbox" name="terms" required> <span>I agree to the <a href="#/terms" target="_blank" rel="noopener">Terms</a> and <a href="#/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>':'');
 root.innerHTML=box(title,sub,'<form data-auth-form class="member-form">'+inputs+'<button class="btn gold" type="submit">'+(signup?'Create Free Account':forgot?'Send reset email':reset?'Save password':'Login')+'</button></form><div class="member-links">'+(signup?'<a href="#/login">Already registered? Login</a>':forgot||reset?'<a href="#/login">Back to login</a>':'<a href="#/signup">Create free account</a><a href="#/forgot-password">Forgot password?</a>')+'</div>');
 const form=root.querySelector('form');
 form.addEventListener('submit',async e=>{
  e.preventDefault();const button=form.querySelector('button');button.disabled=true;message('Please wait…');
  const f=new FormData(form),email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
  try{
   if(signup){
    const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:base,data:{full_name:String(f.get('full_name')).trim(),terms_accepted:true,terms_version:'1.0',marketing_consent:false}}});if(error)throw error;
    if(data.session){go('/dashboard');return;}
    form.reset();message('Check your email for the confirmation link. Then return here and log in.');
   }else if(forgot){
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:base});if(error)throw error;message('If the email is registered, a reset link will be sent.');
   }else if(reset){
    if(!recovering)throw new Error('Open a valid password reset link first.');
    const {error}=await client.auth.updateUser({password});if(error)throw error;recovering=false;go('/dashboard');
   }else{
    const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;go('/dashboard');
   }
  }catch(e){message(e.message||'Authentication failed. Please try again.',true);}finally{button.disabled=false;}
 });
}
async function identity(){
 await initial;if(!client)return null;
 const {data,error}=await client.auth.getUser();if(error||!data.user)return null;
 const user=data.user;
 const [pr,rr]=await Promise.all([client.from('profiles').select('id,full_name,email,status,email_verified_at').eq('id',user.id).maybeSingle(),client.from('user_roles').select('role_key').eq('user_id',user.id)]);
 if(pr.error||rr.error)throw new Error('Account permissions could not be loaded.');
 if(!pr.data||pr.data.status!=='active')throw new Error('Your account is not active. Contact support.');
 return {user,profile:pr.data,roles:rr.data.map(x=>x.role_key),admin:rr.data.some(x=>['super_admin','administrator'].includes(x.role_key))};
}

let wsContext;
const memberLinks=[['/dashboard','Dashboard','⌂'],['/dashboard/broker','Broker Updates','▤'],['/dashboard/trading','Trading Updates','▥'],['/free-tools/banner-prompts','Banner Prompts','▧'],['/free-tools/video-scripts','Video Scripts','▷'],['/dashboard/studio','AI Creator Studio','✦'],['/dashboard/brokers','Broker Reviews','☆'],['/dashboard/saved','Saved Content','◇'],['/dashboard/notifications','Notifications','♧'],['/dashboard/profile','My Profile','♙'],['/dashboard/settings','Account Settings','⚙'],['/logout','Logout','↪']];
const adminLinks=[['/admin/overview','Dashboard','▦'],['/admin/users','Users & Members','♙'],['/admin/news?type=broker','Broker Updates','▤'],['/admin/news?type=trading','Trading Updates','▥'],['/admin/banners','Banner Prompts','▧'],['/admin/scripts','Video Scripts','▷'],['/admin/studio','AI Creator Studio','✦'],['/admin/brokers','Broker Reviews','☆'],['/admin/categories','Categories & Tags','◇'],['/admin/notifications','Notifications','♧'],['/admin/site','Site Management','▣'],['/admin/analytics','Reports & Analytics','▥'],['/admin/settings','Settings','⚙'],['/dashboard','Member Panel','⌂'],['/logout','Logout','↪']];
function workspace(title,sub,content,adminMode=false){
 document.body.classList.add('reference-workspace');
 const ctx=wsContext;const route=location.hash.slice(1);
 const links=adminMode?adminLinks:memberLinks;
 const person=adminMode?(ctx?.roles.includes('super_admin')?'Super Admin':'Administrator'):(ctx?.profile.full_name||'Member');
 return '<div class="ws"><div class="ws-top"><a class="ws-brand" href="#/"><img src="images/logo.png" alt="FX Broker Updates"></a>'+(adminMode?'<span class="ws-admin-tag">⚙ Admin Panel</span>':'')+'<form class="ws-search" onsubmit="event.preventDefault();location.hash=\'/news?q=\'+encodeURIComponent(this.q.value)"><span>⌕</span><input name="q" placeholder="Search news, prompts, scripts..." aria-label="Search news"></form><a class="ws-bell" href="#'+(adminMode?'/admin/notifications':'/dashboard/notifications')+'" aria-label="Notifications">♧</a><a class="ws-person" href="#/dashboard/profile"><i>♙</i><span><b>'+safe(person)+'</b><small>'+(adminMode?'Administrator':'Member')+'</small></span></a></div><aside class="ws-side">'+links.map(([u,l,k])=>'<a href="#'+u+'" class="'+((route===u||(route==='/admin'&&u==='/admin/overview'))?'active':'')+'"><i>'+k+'</i><span>'+l+'</span></a>').join('')+(ctx?.admin&&!adminMode?'<a href="#/admin">⚙ Admin Panel</a>':'')+'<div class="ws-demo">♛ <div><b>'+(adminMode?'Demo Version':'Free Demo Access')+'</b><small>No payment required</small></div></div></aside><div class="ws-main">'+(title?'<h1>'+safe(title)+'</h1><p class="member-sub">'+safe(sub)+'</p>':'')+content+'<div data-message role="status" aria-live="polite"></div></div></div>';
}
const shell=(title,sub,body)=>workspace(title,sub,body,location.hash.startsWith('#/admin'));
const tile=(u,t,d,k='▦')=>'<a class="ws-tile" href="#'+u+'"><i>'+k+'</i><div><h3>'+safe(t)+'</h3><p>'+safe(d)+'</p></div><span>→</span></a>';
const hero=(t,d,free=false)=>'<div class="ws-hero"><div><h1>'+t+'</h1><p>'+d+'</p></div>'+(free?'<div class="ws-free"><b>♛ Free Access</b><small>✓ News &amp; Market Updates<br>✓ Banner Prompts<br>✓ Video Scripts</small></div>':'')+'</div>';
const panelBox=(title,body,link='')=>'<section class="ws-panel"><div class="ws-panel-head"><h2>'+title+'</h2>'+link+'</div>'+body+'</section>';
async function dashboard(ctx,path,id){
 if(path==='/dashboard/profile'||path==='/dashboard/settings'){root.innerHTML=workspace(path.endsWith('profile')?'My Profile':'Account Settings','Free demo access','<section class="ws-panel"><p>Name: '+safe(ctx.profile.full_name)+'</p><p>Email: '+safe(ctx.profile.email)+'</p><p>Email '+(ctx.profile.email_verified_at?'verified':'not verified')+'</p><a href="#/forgot-password" class="btn gold">Reset password</a></section>');return;}
 if(path==='/dashboard/broker'||path==='/dashboard/trading'){let k=path.endsWith('broker')?'broker':'trading';root.innerHTML=workspace(k==='broker'?'Broker Updates':'Trading Updates','Latest updates','<section class="ws-panel" data-ws-news>Loading…</section>');try{let rows=await news({news_type:'eq.'+k,limit:50});if(id===run)root.querySelector('[data-ws-news]').innerHTML=rows.length?rows.map(item).join(''):empty('No published updates yet.');}catch{if(id===run)root.querySelector('[data-ws-news]').textContent='Unable to load news.';}return;}
 if(path!=='/dashboard'){let name=memberLinks.find(x=>x[0]===path)?.[1]||'Workspace';root.innerHTML=workspace(name,'Free demo','<div class="ws-panel">'+safe(name)+' is not connected in this demo build yet.</div>');return;}
 const cards=tile('/dashboard/broker','Broker Updates','Latest broker news, policies & promotions','▤')+tile('/dashboard/trading','Trading Updates','Gold, Forex, Crypto & market insights','▥')+tile('/free-tools/banner-prompts','Banner Prompts','Daily ready-to-use banner prompts','▧')+tile('/free-tools/video-scripts','Video Scripts','Short video scripts for trading','▷');
 const studio='<div class="ws-studio"><img src="images/studio-art.webp" alt=""><div><h2>✦ AI Creator Studio</h2><p>Create trading banners, video scripts, social posts and more.</p><a href="#/dashboard/studio" class="btn gold">Open Creator Studio →</a></div><div class="ws-studio-icons">'+['Banner','Script','Post','Ideas'].map((x,i)=>'<a href="#/dashboard/studio"><i>'+['▧','▷','T','✦'][i]+'</i>'+x+'</a>').join('')+'</div></div>';
 const filters='<div class="ws-filters">'+[['all','All'],['gold','Gold'],['forex','Forex'],['crypto','Crypto'],['global_economy','Economy'],['central_banks','Central Banks'],['geopolitics','Geopolitics'],['hot','HOT']].map(([v,l],i)=>'<button data-filter="'+v+'" class="'+(i===0?'selected':'')+'">'+l+'</button>').join('')+'</div><div data-ws-news>Loading news…</div>';
 const market='<div class="ws-filters"><span class="selected">Forex</span><span>Commodities</span><span>Indices</span><span>Crypto</span></div><div class="ws-market"><div>'+['XAUUSD','EURUSD','GBPUSD','USDJPY','BTCUSD'].map(x=>'<p><b>'+x+'</b><span>—</span></p>').join('')+'</div><div class="ws-market-empty">▥<small>Live market feed not connected</small></div></div>';
 root.innerHTML=workspace('','',hero('Welcome Back, <span>'+safe(ctx.profile.full_name?.split(' ')[0]||'Member')+'!</span>','Your financial news, trading updates and<br>content creator workspace.',true)+'<div class="ws-tiles">'+cards+'</div>'+studio+'<div class="ws-lower">'+panelBox('▤ Latest News Updates',filters,'<a href="#/dashboard/broker">View All →</a>')+panelBox('▥ Market Overview',market)+'</div>');
 async function load(f){try{const rows=await news({limit:6,...(f==='all'?{}:f==='hot'?{priority:'eq.hot'}:{market:'eq.'+f})});if(id===run)root.querySelector('[data-ws-news]').innerHTML=rows.length?rows.map(item).join(''):empty('No published updates yet.');}catch{if(id===run)root.querySelector('[data-ws-news]').textContent='Unable to load news.';}}
 root.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{root.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));load(b.dataset.filter);});await load('all');
}
async function resources(ctx,path,id){
 const banner=path.endsWith('banner-prompts');
 root.innerHTML=shell(banner?'Daily Banner Prompts':'Daily Video Scripts','Free demo resources.','<a class="member-back" href="#/dashboard">← Dashboard</a><div class="member-grid" data-resources><p>Loading resources…</p></div>');
 const cols=banner?'id,title,prompt_text,language,aspect_ratio,copy_enabled,published_at':'id,title,hook,body,closing,cta,language,duration_seconds,copy_enabled,published_at';
 const {data,error}=await client.from(banner?'banner_prompts':'video_scripts').select(cols).eq('status','published').eq('is_sample',false).lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).limit(50);
 if(id!==run)return;const el=root.querySelector('[data-resources]');if(!el)return;
 if(error){el.textContent='Unable to load resources. Please refresh.';return;}
 if(!data.length){el.innerHTML='<p class="empty">No published resources yet.</p>';return;}
 el.innerHTML=data.map((n,i)=>'<article class="member-tile"><h3>'+safe(n.title)+'</h3><p class="member-copy">'+safe(banner?n.prompt_text:[n.hook,n.body,n.closing,n.cta].filter(Boolean).join('\n\n'))+'</p>'+(n.copy_enabled?'<button class="btn outline" data-copy="'+i+'">Copy</button>':'')+'</article>').join('');
 el.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const n=data[Number(b.dataset.copy)];try{await navigator.clipboard.writeText(banner?n.prompt_text:[n.hook,n.body,n.closing,n.cta].filter(Boolean).join('\n\n'));b.textContent='Copied';}catch{message('Copy unavailable in this browser.',true);}}));
}
const definitions={
 news:{table:'news_articles',label:'News articles',cols:'id,title,slug,news_type,summary,content,source_name,original_url,featured_image_url,category_id,priority,status,published_at,show_on_home',fields:['title','news_type','summary','content','source_name','original_url','featured_image_url','category_id','priority','status','show_on_home']},
 banners:{table:'banner_prompts',label:'Banner prompts',cols:'id,title,prompt_text,language,aspect_ratio,status,published_at,access_level',fields:['title','prompt_text','language','aspect_ratio','status','access_level']},
 scripts:{table:'video_scripts',label:'Video scripts',cols:'id,title,hook,body,closing,cta,duration_seconds,language,status,published_at,access_level',fields:['title','hook','body','closing','cta','duration_seconds','language','status','access_level']}
};
function optional(name,label,type='text'){return '<label>'+label+'<input name="'+name+'" type="'+type+'" maxlength="500"></label>';}
function editor(type){
 const title=field('title','Title','minlength="3" maxlength="'+(type==='news'?300:200)+'"');
 const status=select('status','Status',[['draft','Draft'],['published','Published'],['archived','Archived']]);
 const language=select('language','Language',[['en','English'],['roman_ur','Roman Urdu'],['ur','Urdu'],['hi','Hindi'],['ar','Arabic']]);
 const access=select('access_level','Access',[['members','Free members'],['public','Public']]);
 if(type==='news')return title+select('news_type','News type',[['broker','Broker update'],['trading','Trading update']])+textarea('summary','Summary','maxlength="2000"')+textarea('content','Article text')+optional('source_name','Source name')+optional('original_url','Original source URL','url')+optional('featured_image_url','Image URL','url')+select('category_id','Category',[['','Uncategorized'],...categories.map(c=>[c.id,c.name])])+select('priority','Priority',[['normal','Normal'],['warm','Warm'],['hot','Hot']])+status+'<label class="member-check"><input name="show_on_home" type="checkbox" checked> Show on homepage</label>';
 if(type==='banners')return title+textarea('prompt_text','Full prompt','minlength="10" maxlength="8000"')+language+select('aspect_ratio','Aspect ratio',[['1:1','1:1'],['4:5','4:5'],['9:16','9:16'],['16:9','16:9']])+access+status;
 return title+textarea('hook','Hook')+textarea('body','Script body')+optional('closing','Closing')+optional('cta','Call to action')+select('duration_seconds','Duration',[15,30,40,60,90,120].map(v=>[String(v),v+' sec']))+language+access+status;
}
async function admin(ctx,path,id){
 const type=path.split('/')[2]||'overview';
 if(!ctx.admin){root.innerHTML=shell('Access denied','Admin access is restricted.','<a href="#/dashboard" class="btn gold">Back to Dashboard</a>');return;}
 const tabs='<div class="admin-tabs">'+[['overview','Overview'],['news','News'],['banners','Banner Prompts'],['scripts','Video Scripts'],['users','Members']].map(([k,l])=>'<a class="btn '+(type===k?'gold':'outline')+'" href="#/admin/'+k+'">'+l+'</a>').join('')+'</div>';
 root.innerHTML=shell('Admin Panel','Manage published content and free demo accounts.',tabs+'<div data-admin-area class="admin-area"><p>Loading…</p></div>');
 const area=root.querySelector('[data-admin-area]');

 if(type==='overview'){
 const defs=[['profiles','Total Users','♙','/admin/users'],['news_articles','Broker Updates','▤','/admin/news?type=broker','broker'],['news_articles','Trading Updates','▥','/admin/news?type=trading','trading'],['banner_prompts','Banner Prompts','▧','/admin/banners'],['video_scripts','Video Scripts','▷','/admin/scripts']];
 const quick=tile('/admin/news?type=broker','+ Add Broker Update','','▤')+tile('/admin/news?type=trading','+ Add Trading Update','','▥')+tile('/admin/banners','+ Add Banner Prompt','','▧')+tile('/admin/scripts','+ Add Video Script','','▷');
 root.innerHTML=workspace('','',hero('Admin <span>Dashboard</span>','Manage content, users, updates and<br>grow FX Broker Updates.')+'<div class="ws-kpis">'+defs.map(([t,l,k,u],i)=>'<a href="#'+u+'" class="ws-kpi tone-'+i+'"><i>'+k+'</i><div><span>'+l+'</span><strong data-kpi="'+i+'">—</strong><small>Database count</small></div></a>').join('')+'</div><div class="ws-admin-middle">'+panelBox('▥ Content Performance','<div data-chart>Loading publishing activity…</div>')+panelBox('ϟ Quick Actions','<div class="ws-actions">'+quick+'</div>')+panelBox('♙ Recent Members','<div data-people>Loading members…</div>','<a href="#/admin/users">View All →</a>')+'</div><div class="ws-admin-bottom">'+panelBox('▦ Recent Content','<div class="ws-filters"><span class="selected">All</span><a href="#/admin/news?type=broker">Broker Updates</a><a href="#/admin/news?type=trading">Trading Updates</a><a href="#/admin/banners">Banner Prompts</a><a href="#/admin/scripts">Video Scripts</a></div><div data-recent>Loading content…</div>')+panelBox('ϟ System Status','<div class="ws-systems"><div>▦<small>Database</small><b data-health>Checking</b></div><div>▣<small>Website</small><b>Loaded</b></div><div>◇<small>Storage</small><b>Not checked</b></div></div>')+'</div>',true);
 const counts=Promise.all(defs.map(async ([t,l,k,u,kind])=>{let q=client.from(t).select('id',{count:'exact',head:true});if(kind)q=q.eq('news_type',kind);return await q;}));
 const cutoff=new Date(Date.now()-29*86400000).toISOString();
 const rr=await Promise.allSettled([counts,client.from('profiles').select('full_name,created_at').order('created_at',{ascending:false}).limit(5),...['news_articles','banner_prompts','video_scripts'].map(t=>client.from(t).select(t==='news_articles'?'title,status,news_type,created_at':'title,status,created_at').order('created_at',{ascending:false}).limit(6)),...['news_articles','banner_prompts','video_scripts'].map(t=>client.from(t).select(t==='news_articles'?'published_at,news_type':'published_at').eq('status','published').gte('published_at',cutoff).limit(1000))]);
 if(id!==run)return;const val=i=>rr[i].status==='fulfilled'?rr[i].value:null;
 (val(0)||[]).forEach((x,i)=>root.querySelector('[data-kpi="'+i+'"]').textContent=x.error?'—':String(x.count??0));root.querySelector('[data-health]').textContent=val(0)?.every(x=>!x.error)?'Online':'Check required';
 const people=val(1);root.querySelector('[data-people]').innerHTML=people&&!people.error?(people.data.length?people.data.map(x=>'<div class="ws-person-row"><i>'+safe((x.full_name||'M').slice(0,2).toUpperCase())+'</i><b>'+safe(x.full_name||'Member')+'</b><small>'+safe(date(x.created_at))+'</small></div>').join(''):'<p class="ws-empty">No registered members yet.</p>'):'Unavailable';
 const rows=[2,3,4].flatMap(i=>val(i)&&!val(i).error?val(i).data.map(x=>({...x,type:i===2?x.news_type:i===3?'Prompt':'Script'})):[]).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,8);
 root.querySelector('[data-recent]').innerHTML=rows.length?'<div class="admin-table"><table><thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Date</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+safe(x.title)+'</td><td>'+safe(x.type)+'</td><td>'+safe(x.status)+'</td><td>'+safe(date(x.created_at))+'</td></tr>').join('')+'</tbody></table></div>':'<p class="ws-empty">No content added yet.</p>';
 const chart=root.querySelector('[data-chart]');if(![5,6,7].every(i=>val(i)&&!val(i).error)){chart.textContent='Publishing activity unavailable.';return;}
 const days=Array.from({length:30},(_,i)=>new Date(Date.now()-(29-i)*86400000).toISOString().slice(0,10));
 const groups=[val(5).data.filter(x=>x.news_type==='broker'),val(5).data.filter(x=>x.news_type==='trading'),val(6).data,val(7).data], colors=['#f0c94c','#51a8ff','#bb8cf5','#e96cbd'];
 const series=groups.map(g=>days.map(d=>g.filter(x=>String(x.published_at).slice(0,10)===d).length)),max=Math.max(1,...series.flat());
 chart.innerHTML='<div class="ws-legend">'+['Broker','Trading','Prompts','Scripts'].map((l,i)=>'<span style="color:'+colors[i]+'">● '+l+'</span>').join('')+'</div><svg viewBox="0 0 600 155" role="img" aria-label="30-day published content count"><g stroke="#29445d" stroke-width="1">'+[12,45,78,111,144].map(y=>'<path d="M12 '+y+'H590"/>').join('')+'</g>'+series.map((s,i)=>'<polyline stroke="'+colors[i]+'" stroke-width="2.5" fill="none" points="'+s.map((v,j)=>(12+j*578/29)+','+(144-v*132/max)).join(' ')+'"/>').join('')+'</svg><small>Last 30 days · published content</small>';return;
 }
 if(type==='users'){
  const {data,error}=await client.from('profiles').select('id,full_name,email,status,email_verified_at,created_at').order('created_at',{ascending:false}).limit(100);
  if(id!==run)return;if(error){area.textContent=error.message;return;}
  area.innerHTML='<h2>Registered Members</h2><div class="admin-table"><table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Verified</th></tr></thead><tbody>'+data.map(n=>'<tr><td>'+safe(n.full_name)+'</td><td>'+safe(n.email)+'</td><td>'+safe(n.status)+'</td><td>'+(n.email_verified_at?'Yes':'No')+'</td></tr>').join('')+'</tbody></table></div>'+(data.length?'':'<p>No registered members yet.</p>');return;
 }
 const def=definitions[type];if(!def){area.textContent='This module is not connected in the demo build yet.';return;}
 const newsType=new URLSearchParams(location.hash.split('?')[1]||'').get('type');let query=client.from(def.table).select(def.cols).order('created_at',{ascending:false}).limit(100);if(type==='news'&&['broker','trading'].includes(newsType))query=query.eq('news_type',newsType);const {data,error}=await query;
 if(id!==run)return;if(error){area.textContent=error.message;return;}
 area.innerHTML='<div class="admin-layout"><div class="member-tile"><h2>'+safe(def.label)+'</h2><button class="btn outline" data-new>New entry</button><div class="admin-records">'+data.map((n,i)=>'<button data-edit="'+i+'"><strong>'+safe(n.title)+'</strong><small>'+safe(n.status)+'</small></button>').join('')+(data.length?'':'<p class="member-sub">No entries yet.</p>')+'</div></div><div class="member-tile"><h2 data-editor-title>New entry</h2><form class="member-form" data-editor>'+editor(type)+'<button class="btn gold" type="submit">Save entry</button></form></div></div>';
 const form=area.querySelector('[data-editor]');let editing=null;
 const load=n=>{editing=n||null;form.reset();if(!n&&type==='news'&&['broker','trading'].includes(newsType))form.elements.namedItem('news_type').value=newsType;area.querySelector('[data-editor-title]').textContent=n?'Edit entry':'New entry';if(n)for(const key of def.fields){const el=form.elements.namedItem(key);if(el){if(el.type==='checkbox')el.checked=Boolean(n[key]);else el.value=n[key]??'';}}};
 load(null);area.querySelector('[data-new]').addEventListener('click',()=>load(null));area.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>load(data[Number(b.dataset.edit)])));
 form.addEventListener('submit',async e=>{
  e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;message('Saving…');
  try{
   const f=new FormData(form),payload={};
   for(const key of def.fields){const val=f.get(key);payload[key]=key==='show_on_home'?f.has(key):key==='duration_seconds'?Number(val):String(val??'').trim();}
   for(const key of ['source_name','original_url','featured_image_url','category_id','closing','cta'])if(key in payload&&!payload[key])payload[key]=null;
   payload.published_at=payload.status==='published'?(editing?.published_at||new Date().toISOString()):null;
   if(type==='news'&&!editing)payload.slug=(payload.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120)||'article')+'-'+crypto.randomUUID().slice(0,8);
   const q=editing?client.from(def.table).update(payload).eq('id',editing.id):client.from(def.table).insert(payload);
   const result=await q.select('id').single();if(result.error)throw result.error;
   if(id!==run)return;await admin(ctx,path,id);message('Saved successfully.');
  }catch(e){message(e.message||'Save failed.',true);}finally{button.disabled=false;}
 });
}
window.FXMember={async route(path,id){
 const auth=['/login','/signup','/forgot-password','/reset-password'].includes(path);
 const privateRoute=path.startsWith('/dashboard')||path.startsWith('/admin')||path==='/logout';
 const resource=path==='/free-tools/banner-prompts'||path==='/free-tools/video-scripts';
 if(!auth&&!privateRoute&&!resource)return false;
 if(auth){authForm(path);return true;}
 if(!client){if(resource)return false;root.innerHTML=authError();return true;}
 if(path==='/logout'){const {error}=await client.auth.signOut();if(error){root.innerHTML=box('Logout failed','Please retry.','<a href="#/logout" class="btn outline">Try again</a>');return true;}go('/login');return true;}
 try{
  if(resource){const session=await initial;const current=await client.auth.getSession();if(!current.data.session)return false;}
  else root.innerHTML='<p class="wrap loading">Checking account access…</p>';
  const ctx=await identity();if(id!==run)return true;
  if(!ctx){if(resource)return false;go('/login');return true;}
  wsContext=ctx;if(resource)await resources(ctx,path,id);else if(path.startsWith('/admin'))await admin(ctx,path,id);else await dashboard(ctx,path,id);
 }catch(e){if(id===run)root.innerHTML=box('Account access unavailable',safe(e.message||'Please try again.'),'<a href="#/logout" class="btn outline">Log Out</a>');}
 return true;
}};
initial.then(session=>{if(session&&/access_token=|type=recovery/.test(location.hash)&&!recovering)go('/dashboard');else if(ready)render();});
})();
