// ============================================================
//  AngaWatch Greenhouse - 7-in-1 Soil Probe + on-device Dashboard
//  ESP32-S3 | RS485 (Modbus) soil sensor + WiFi web UI
//
//  Flash this, then on your phone/laptop:
//    1. Join WiFi  "AngaWatch-GH01"  (password below)
//    2. Open       http://192.168.4.1
//  A live glass dashboard (served from the ESP, no internet needed) shows
//  temp / moisture / pH / EC / N / P / K.
//
//  Same look as firmware/soil_dashboard.html (open that file in any browser to
//  preview the UI without the hardware).
// ============================================================
#include <WiFi.h>
#include <WebServer.h>
#include <HardwareSerial.h>

// ---------- RS485 PINS (your wiring) ----------
#define RXD2  16
#define TXD2  17
#define DE_RE 4

// ---------- WiFi access point ----------
const char* AP_SSID = "AngaWatch-GH01";
const char* AP_PASS = "greenhouse123";   // must be >= 8 chars
// To join an existing WiFi instead of making a hotspot, see the STA note in setup().

HardwareSerial RS485(2);
WebServer server(80);

byte request[]  = {0x01, 0x03, 0x00, 0x00, 0x00, 0x07, 0x04, 0x08};
byte response[32];

// latest readings
float soilTemp = 0, soilMoist = 0, ph = 0;
int   ec = 0, nitrogen = 0, phos = 0, potass = 0;
bool  sensorOk = false;
unsigned long lastRead = 0;

// ---------- embedded dashboard (served at "/") ----------
const char INDEX_HTML[] PROGMEM = R"HTML(<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>AngaWatch · Soil Probe</title>
<style>
:root{--good:#7ed957;--watch:#ffc24b;--act:#ff6f61;--neutral:#9fe3c6;--ink:#eaf6ea;--muted:#9fb7a4;--lime:#b6e34a}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif;color:var(--ink);min-height:100%;
background:radial-gradient(60% 50% at 15% 10%,rgba(120,210,90,.22),transparent 60%),radial-gradient(55% 45% at 90% 20%,rgba(60,200,150,.18),transparent 60%),radial-gradient(60% 50% at 70% 95%,rgba(80,180,120,.16),transparent 60%),linear-gradient(160deg,#0f2417,#123018 45%,#0b1d12);background-attachment:fixed;-webkit-font-smoothing:antialiased}
.wrap{max-width:920px;margin:0 auto;padding:22px 16px 40px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}
.brand{display:flex;align-items:center;gap:10px}.brand h1{font-size:20px;margin:0;font-weight:800;letter-spacing:-.02em}.brand h1 span{color:var(--lime)}.brand p{margin:2px 0 0;font-size:12px;color:var(--muted)}
.live{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);padding:7px 12px;border-radius:999px;backdrop-filter:blur(8px)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--good);animation:pulse 1.8s infinite}.dot.off{background:var(--act);animation:none}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(126,217,87,.5)}70%{box-shadow:0 0 0 7px rgba(126,217,87,0)}100%{box-shadow:0 0 0 0 rgba(126,217,87,0)}}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}@media(min-width:620px){.grid{grid-template-columns:repeat(3,1fr)}}
.card{position:relative;overflow:hidden;border-radius:20px;padding:15px 16px 16px;background:linear-gradient(160deg,rgba(255,255,255,.10),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);box-shadow:0 14px 34px -16px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.16)}
.card .glow{position:absolute;right:-26px;top:-26px;width:80px;height:80px;border-radius:50%;filter:blur(26px);opacity:.5}
.top{display:flex;align-items:center;justify-content:space-between}.label{font-size:12px;color:var(--muted);font-weight:600}
.pill{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:3px 8px;border-radius:999px}
.val{margin-top:8px;font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1}.val .u{font-size:13px;font-weight:600;color:var(--muted);margin-left:3px}
.bar{margin-top:12px;height:6px;border-radius:999px;background:rgba(255,255,255,.12);position:relative;overflow:hidden}
.bar i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;transition:width .6s cubic-bezier(.2,.7,.3,1)}
.hint{margin-top:8px;font-size:10.5px;color:var(--muted);line-height:1.3}
footer{margin-top:22px;text-align:center;font-size:11px;color:var(--muted)}
</style></head><body><div class="wrap">
<header><div class="brand">
<svg width="34" height="34" viewBox="0 0 36 36" fill="none"><path d="M18 3C10 3 4 9 4 18c0 8 6 15 14 15 1.2 0 1.4-1.2 1.4-2.3C19.4 23 24 17 31 15c1.3-.4 1.2-1.4.6-2.4C28 6.5 23.6 3 18 3Z" fill="#b6e34a"/><path d="M11 22c4-7 9-11 17-13" stroke="#3f8e2f" stroke-width="1.6" stroke-linecap="round"/></svg>
<div><h1>Anga<span>Watch</span></h1><p>Greenhouse GH-01 · soil probe</p></div></div>
<div class="live"><span class="dot" id="dot"></span><span id="status">connecting…</span></div></header>
<div class="grid" id="grid"></div>
<footer>7-in-1 soil probe · live from the node · AngaWatch Greenhouse</footer></div>
<script>
const METRICS=[
{key:'temp',label:'Soil Temp',unit:'°C',min:0,max:40,good:[18,26],warn:[14,30],hint:'Roots happiest 18–26 °C.'},
{key:'moist',label:'Moisture',unit:'%',min:0,max:100,good:[60,80],warn:[45,90],hint:'Hold 60–80%; avoid swings.'},
{key:'ph',label:'pH',unit:'',min:3,max:9,good:[6.0,6.8],warn:[5.5,7.3],hint:'6.0–6.8 keeps nutrients available.'},
{key:'ec',label:'EC',unit:'µS/cm',min:0,max:2000,good:[200,1500],warn:[100,1800],hint:'Salts/fertility · calibrate to soil.'},
{key:'n',label:'Nitrogen',unit:'mg/kg',min:0,max:300,hint:'Leaf & canopy growth.'},
{key:'p',label:'Phosphorus',unit:'mg/kg',min:0,max:150,hint:'Roots, flowering & fruit set.'},
{key:'k',label:'Potassium',unit:'mg/kg',min:0,max:400,hint:'Fruit fill, quality & resistance.'}];
const TONE={good:'#7ed957',watch:'#ffc24b',act:'#ff6f61',neutral:'#9fe3c6'};
function verdict(v,m){if(v==null||isNaN(v))return{level:'neutral',text:'—'};if(!m.good)return{level:'neutral',text:'reading'};
const[g1,g2]=m.good,[w1,w2]=m.warn;if(v>=g1&&v<=g2)return{level:'good',text:'Ideal'};if(v>=w1&&v<=w2)return{level:'watch',text:v<g1?'Low':'High'};return{level:'act',text:v<g1?'Too low':'Too high'}}
const grid=document.getElementById('grid'),refs={};
for(const m of METRICS){const c=document.createElement('div');c.className='card';
c.innerHTML='<div class="glow"></div><div class="top"><span class="label">'+m.label+'</span><span class="pill"></span></div><div class="val"><span class="num">--</span><span class="u">'+m.unit+'</span></div><div class="bar"><i></i></div><div class="hint">'+(m.hint||'')+'</div>';
grid.appendChild(c);refs[m.key]={num:c.querySelector('.num'),pill:c.querySelector('.pill'),bar:c.querySelector('.bar i'),glow:c.querySelector('.glow')}}
function render(d){for(const m of METRICS){const r=refs[m.key];let v=d?d[m.key]:null;const vd=verdict(v,m),tone=TONE[vd.level];
r.num.textContent=(v==null||isNaN(v))?'--':(Number.isInteger(v)?v:Number(v).toFixed(1));
r.pill.textContent=vd.text;r.pill.style.background=tone+'22';r.pill.style.color=tone;
const pct=v==null?0:Math.max(0,Math.min(100,((v-m.min)/(m.max-m.min))*100));r.bar.style.width=pct+'%';
r.bar.style.background='linear-gradient(90deg,'+tone+','+tone+'cc)';r.glow.style.background=tone}}
function setStatus(ok){const dot=document.getElementById('dot'),s=document.getElementById('status');
if(ok){dot.classList.remove('off');s.textContent='live · '+new Date().toLocaleTimeString()}else{dot.classList.add('off');s.textContent='reconnecting…'}}
async function tick(){try{const res=await fetch('./data',{cache:'no-store'});if(!res.ok)throw 0;const d=await res.json();render(d);setStatus(!!d.ok)}catch(e){setStatus(false)}}
tick();setInterval(tick,2500);
</script></body></html>)HTML";

// ---------- RS485 ----------
void preTransmit()  { digitalWrite(DE_RE, HIGH); delay(5); }
void postTransmit() { delay(5); digitalWrite(DE_RE, LOW); }

void readSensor() {
  while (RS485.available()) RS485.read();           // flush
  preTransmit();
  RS485.write(request, sizeof(request));
  RS485.flush();
  postTransmit();

  int i = 0; unsigned long start = millis();
  while (i < 19 && (millis() - start) < 500) {
    if (RS485.available()) response[i++] = RS485.read();
  }
  if (i == 19 && response[0] == 0x01 && response[1] == 0x03) {
    soilTemp  = ((response[3]  << 8) | response[4])  / 10.0;
    soilMoist = ((response[5]  << 8) | response[6])  / 10.0;
    ec        =  (response[7]  << 8) | response[8];
    ph        = ((response[9]  << 8) | response[10]) / 10.0;
    nitrogen  =  (response[11] << 8) | response[12];
    phos      =  (response[13] << 8) | response[14];
    potass    =  (response[15] << 8) | response[16];
    sensorOk = true;
    Serial.printf("T=%.1f M=%.1f EC=%d pH=%.1f N=%d P=%d K=%d\n",
                  soilTemp, soilMoist, ec, ph, nitrogen, phos, potass);
  } else {
    sensorOk = false;
    Serial.printf("Bad frame, got %d bytes\n", i);
  }
}

// ---------- HTTP handlers ----------
void handleRoot() { server.send_P(200, "text/html", INDEX_HTML); }

void handleData() {
  char buf[200];
  snprintf(buf, sizeof(buf),
    "{\"ok\":%s,\"temp\":%.1f,\"moist\":%.1f,\"ph\":%.1f,\"ec\":%d,\"n\":%d,\"p\":%d,\"k\":%d}",
    sensorOk ? "true" : "false", soilTemp, soilMoist, ph, ec, nitrogen, phos, potass);
  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json", buf);
}

void setup() {
  Serial.begin(115200);
  RS485.begin(9600, SERIAL_8N1, RXD2, TXD2);
  pinMode(DE_RE, OUTPUT);
  digitalWrite(DE_RE, LOW);

  // ---- WiFi hotspot (plug-and-play, no router needed) ----
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.print("AP IP: "); Serial.println(WiFi.softAPIP());   // 192.168.4.1
  // To join an existing network instead:
  //   WiFi.mode(WIFI_STA); WiFi.begin("YourSSID","YourPass");
  //   while (WiFi.status()!=WL_CONNECTED){delay(400);Serial.print('.');}
  //   Serial.println(WiFi.localIP());   // browse to this IP

  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.begin();
  Serial.println("Web UI ready -> http://192.168.4.1");

  delay(800);
  readSensor();
}

void loop() {
  server.handleClient();
  if (millis() - lastRead > 2000) {
    lastRead = millis();
    readSensor();
  }
}
