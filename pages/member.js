
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
const shell=(title,sub,body)=>'<section class="wrap member-shell"><div class="member-top"><div><div class="member-eyebrow">FREE DEMO ACCESS</div><h1>'+safe(title)+'</h1><p class="member-sub">'+safe(sub)+'</p></div><a href="#/logout" class="btn outline">Log Out</a></div>'+body+'<div data-message role="status" aria-live="polite"></div></section>';
const tile=(href,title,sub)=>'<a class="member-tile" href="#'+href+'"><h3>'+title+'</h3><p>'+sub+'</p><span>Open →</span></a>';
function dashboard(ctx){
 root.innerHTML=shell('Welcome, '+(ctx.profile.full_name||'Member'),'All published demo resources are free.','<div class="member-status"><strong>Free Demo</strong><span>'+ (ctx.profile.email_verified_at?'Email verified':'Email not yet verified')+'</span></div><div class="member-grid">'+tile('/free-tools/banner-prompts','Daily Banner Prompts','Read and copy published prompts.')+tile('/free-tools/video-scripts','Daily Video Scripts','Read and copy published scripts.')+tile('/news','Latest News','Broker and market updates.')+(ctx.admin?tile('/admin','Admin Panel','Manage news, content and members.'):'')+'</div>');
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
  const results=await Promise.all([['profiles','Members'],['news_articles','News Articles'],['banner_prompts','Banner Prompts'],['video_scripts','Video Scripts']].map(async([table,label])=>{const r=await client.from(table).select('id',{count:'exact',head:true});return [label,r.error?'Unavailable':r.count];}));
  if(id!==run)return;area.innerHTML='<div class="member-grid">'+results.map(([label,n])=>'<div class="member-tile"><h3>'+safe(label)+'</h3><strong class="admin-number">'+safe(n)+'</strong></div>').join('')+'</div>';return;
 }
 if(type==='users'){
  const {data,error}=await client.from('profiles').select('id,full_name,email,status,email_verified_at,created_at').order('created_at',{ascending:false}).limit(100);
  if(id!==run)return;if(error){area.textContent=error.message;return;}
  area.innerHTML='<h2>Registered Members</h2><div class="admin-table"><table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Verified</th></tr></thead><tbody>'+data.map(n=>'<tr><td>'+safe(n.full_name)+'</td><td>'+safe(n.email)+'</td><td>'+safe(n.status)+'</td><td>'+(n.email_verified_at?'Yes':'No')+'</td></tr>').join('')+'</tbody></table></div>'+(data.length?'':'<p>No registered members yet.</p>');return;
 }
 const def=definitions[type];if(!def){area.textContent='Unknown admin section.';return;}
 const {data,error}=await client.from(def.table).select(def.cols).order('created_at',{ascending:false}).limit(100);
 if(id!==run)return;if(error){area.textContent=error.message;return;}
 area.innerHTML='<div class="admin-layout"><div class="member-tile"><h2>'+safe(def.label)+'</h2><button class="btn outline" data-new>New entry</button><div class="admin-records">'+data.map((n,i)=>'<button data-edit="'+i+'"><strong>'+safe(n.title)+'</strong><small>'+safe(n.status)+'</small></button>').join('')+(data.length?'':'<p class="member-sub">No entries yet.</p>')+'</div></div><div class="member-tile"><h2 data-editor-title>New entry</h2><form class="member-form" data-editor>'+editor(type)+'<button class="btn gold" type="submit">Save entry</button></form></div></div>';
 const form=area.querySelector('[data-editor]');let editing=null;
 const load=n=>{editing=n||null;form.reset();area.querySelector('[data-editor-title]').textContent=n?'Edit entry':'New entry';if(n)for(const key of def.fields){const el=form.elements.namedItem(key);if(el){if(el.type==='checkbox')el.checked=Boolean(n[key]);else el.value=n[key]??'';}}};
 area.querySelector('[data-new]').addEventListener('click',()=>load(null));area.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>load(data[Number(b.dataset.edit)])));
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
  if(resource)await resources(ctx,path,id);else if(path.startsWith('/admin'))await admin(ctx,path,id);else dashboard(ctx);
 }catch(e){if(id===run)root.innerHTML=box('Account access unavailable',safe(e.message||'Please try again.'),'<a href="#/logout" class="btn outline">Log Out</a>');}
 return true;
}};
initial.then(session=>{if(session&&/access_token=|type=recovery/.test(location.hash)&&!recovering)go('/dashboard');else if(ready)render();});
})();
