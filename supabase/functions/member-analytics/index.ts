// FX Broker Updates — authenticated member activity for static GitHub Pages.
// User identity is resolved from Supabase Auth; never from request data.
const allowedOrigins = new Set(["https://fxbrokerupdates-blip.github.io","https://fxbrokerupdates.com","https://www.fxbrokerupdates.com"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedEvents = new Set("page_view session_start session_end news_list_view article_open article_engaged article_progress news_saved news_shared source_link_click broker_view broker_follow broker_unfollow banner_prompt_view banner_prompt_copy banner_prompt_save video_script_view video_script_copy video_script_save ai_studio_open ai_output_copy ai_output_save ai_output_download content_saved search filter_used notification_open external_link_click dott_plus_click facebook_click linkedin_click share_click".split(" "));
const types = new Set(["article","banner_prompt","video_script","broker","ai_generation","notification"]);
const windows: Record<string,number> = {banner_prompt_copy:10,video_script_copy:10,ai_output_copy:10,article_open:1800,article_engaged:86400,banner_prompt_view:1800,video_script_view:1800,broker_view:1800};
const routes: [RegExp,string][] = [[/^\/dashboard\/studio(?:\/|$)/,"ai_studio"],[/^\/admin(?:\/|$)/,"admin"],[/^\/(?:dashboard\/prompts|free-tools\/banner-prompts)(?:\/|$)/,"banner_prompts"],[/^\/(?:dashboard\/scripts|free-tools\/video-scripts)(?:\/|$)/,"video_scripts"],[/^\/broker-updates(?:\/|$)/,"broker_updates"],[/^\/trading-updates(?:\/|$)/,"trading_updates"],[/^\/news\/[a-z0-9-]+\/?$/,"article"],[/^\/(?:news|dashboard\/news)(?:\/|$)/,"news_center"],[/^\/brokers(?:\/|$)/,"broker_directory"],[/^\/dashboard\/saved(?:\/|$)/,"saved_content"],[/^\/dashboard\/history(?:\/|$)/,"content_history"],[/^\/dashboard\/notifications(?:\/|$)/,"notifications"],[/^\/dashboard\/brokers(?:\/|$)/,"favourite_brokers"],[/^\/dashboard(?:\/|$)/,"dashboard"],[/^\/search(?:\/|$)/,"search"],[/^\/category(?:\/|$)/,"category"],[/^\/(?:login|signup|forgot-password|reset-password)(?:\/|$)/,"auth"]];
function safePath(raw: unknown): [string,string] {
  if (typeof raw !== "string" || raw.length>400 || !raw.startsWith("/")) return ["/","home"];
  let p = new URL(raw,"https://fxbrokerupdates.com").pathname.replace(/^\/Hassan-fx-b(?=\/|$)/i,"") || "/";
  if(p==="/") return [p,"home"];
  const feature=routes.find(([rx])=>rx.test(p))?.[1] ?? "other";
  if(feature==="admin") p="/admin"; // Never collect another member's admin record URL.
  else if(feature==="other" || feature==="auth" || feature==="search") p="/"+feature;
  else if(!/^\/[a-z0-9/-]+$/i.test(p)) p="/"+feature;
  return [p.slice(0,250),feature];
}
async function scopedId(user:string,session:string):Promise<string>{
  const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode("fx-member-session:v1:"+user+":"+session)));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const h=Array.from(bytes.slice(0,16),b=>b.toString(16).padStart(2,"0")).join("");
  return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20);
}
Deno.serve(async req=>{
  const origin=req.headers.get("origin")??"";
  const cors={"Access-Control-Allow-Origin":allowedOrigins.has(origin)?origin:"null","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Cache-Control":"no-store"};
  const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
  if(origin && !allowedOrigins.has(origin)) return reply({error:"Origin not allowed"},403);
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST") return reply({error:"Method not allowed"},405);
  const url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!service) return reply({error:"Backend unavailable"},503);
  const authorization=req.headers.get("authorization");
  if(!authorization?.startsWith("Bearer ")) return reply({error:"Sign in required"},401);
  try{
    const userRes=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:authorization}});
    if(!userRes.ok) return reply({error:"Invalid session"},401);
    const user=await userRes.json(); const uid=user.id;
    if(typeof uid!=="string"||!uuid.test(uid)||!user.email_confirmed_at) return reply({error:"Verified account required"},403);
    const headers={apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"};
    const rest=async(path:string,body?:unknown)=>{
      const r=await fetch(url+"/rest/v1/"+path,{method:body===undefined?"GET":"POST",headers,body:body===undefined?undefined:JSON.stringify(body)});
      if(!r.ok) throw new Error("Database request failed");
      return await r.json();
    };
    const [profile,prefs,settings]=await Promise.all([
      rest("profiles?select=status&id=eq."+uid),
      rest("user_preferences?select=analytics_consent&user_id=eq."+uid),
      rest("website_settings?select=value&key=eq.analytics.tracking")
    ]);
    if(profile[0]?.status!=="active") return reply({error:"Account unavailable"},403);
    const config=settings[0]?.value;
    if(prefs[0]?.analytics_consent!==true||config?.enabled!==true) return reply({ok:true,skipped:"consent_or_disabled"},202);
    const reader=req.body?.getReader(); if(!reader) return reply({error:"Body required"},400);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();return reply({error:"Payload too large"},413);}chunks.push(value);}
    const buf=new Uint8Array(size);let offset=0;for(const c of chunks){buf.set(c,offset);offset+=c.byteLength;}
    let b;try{b=JSON.parse(new TextDecoder().decode(buf));}catch{return reply({error:"Invalid JSON"},400);}
    if(!b||typeof b.session_id!=="string"||!uuid.test(b.session_id)||!["track","heartbeat"].includes(b.action)) return reply({error:"Invalid request"},400);
    const sid=await scopedId(uid,b.session_id);
    const ok=await rest("rpc/rate_limit_hit",{p_key:"fx-member-"+b.action+":"+uid,p_window_seconds:b.action==="heartbeat"?30:60,p_max:b.action==="heartbeat"?1:30});
    if(!ok) return reply({error:"Rate limited"},429);
    const agent=req.headers.get("user-agent")??"";
    if(/bot|crawler|spider/i.test(agent))return reply({ok:true,skipped:"bot"},202);
    const device=/mobile|android|iphone/i.test(agent)?"mobile":/ipad|tablet/i.test(agent)?"tablet":"desktop";
    const browser=/edg\//i.test(agent)?"Edge":/firefox/i.test(agent)?"Firefox":/chrome/i.test(agent)?"Chrome":/safari/i.test(agent)?"Safari":"Other";
    const [path,feature]=safePath(b.path??b.landing_path);
    const session={id:sid,user_id:uid,visitor_id:null,landing_path:path,device_category:device,browser,traffic_source:"direct"};
    if(b.action==="track"){
      if(!Array.isArray(b.events)||b.events.length<1||b.events.length>25) return reply({error:"Invalid events"},400);
      const events=[];
      for(const e of b.events){
        if(!e||typeof e.event_id!=="string"||!uuid.test(e.event_id)||!allowedEvents.has(e.event_name))continue;
        const [ep,ef]=safePath(e.path); const cid=typeof e.content_id==="string"&&uuid.test(e.content_id)?e.content_id:undefined;
        const w=windows[e.event_name];
        events.push({event_id:await scopedId(uid,e.event_id),event_name:e.event_name,feature:ef,path:ep,content_type:types.has(e.content_type)?e.content_type:undefined,content_id:cid,engaged_seconds:e.event_name==="article_engaged"?Math.min(120,Math.max(0,Math.trunc(Number(e.engaged_seconds)||0))):0,dedupe_key:w&&cid?e.event_name+"|"+uid+"|"+cid+"|"+Math.floor(Date.now()/1000/w):undefined});
      }
      if(!events.length)return reply({ok:true,inserted:0});
      const inserted=await rest("rpc/analytics_ingest",{p_session:session,p_events:events});
      return reply({ok:true,inserted});
    }
    if(typeof b.tab_id!=="string"||!/^[a-zA-Z0-9-]{4,40}$/.test(b.tab_id)||typeof b.visible!=="boolean"||typeof b.interacted!=="boolean") return reply({error:"Invalid heartbeat"},400);
    // Only one heartbeat per member per 30-second window; no raw form/clipboard data.
    await rest("rpc/analytics_ingest",{p_session:session,p_events:[]});
    const result=await rest("rpc/analytics_heartbeat",{p:{presence_key:"u:"+uid,user_id:uid,session_id:sid,tab_id:b.tab_id,path,feature,visible:b.visible,interacted:b.visible&&b.interacted,engaged_delta:b.visible&&b.interacted?Math.min(30,Math.max(0,Math.trunc(Number(b.engaged_delta)||0))):0,interval_seconds:45,idle_seconds:Math.min(1800,Math.max(30,Number(config.idle_seconds)||120)),device_category:device,browser}});
    return reply(result);
  }catch{return reply({error:"Activity service unavailable"},503);}
});