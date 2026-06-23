// ============================================================
//  AngaWatch Greenhouse field node
//  ESP32-S3 | DHT11 + Soil + OLED + SIM7670G (Safaricom)
//  - Shows readings on OLED
//  - SMS alert on risk (blight RH / heat / dry soil)
//  - POSTs readings to the live dashboard:  POST /api/ingest
//
//  Add the 7-in-1 soil probe later (RS485/Modbus): read EC, pH, moisture,
//  temp, N, P, K and drop them into buildJson() — the dashboard already
//  accepts ec / ph / soilMoisturePct (see CONTRACT below).
//
//  CONTRACT (JSON the dashboard accepts at /api/ingest):
//    { "gh":"GH-01", "temp":24.5, "hum":71, "soilMoisturePct":68,
//      "soilRaw":2100, "ec":2.4, "ph":6.5, "co2":650 }
//  Only send what you have; missing fields fall back to demo values.
// ============================================================
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---------- PINS ----------
#define DHTPIN       4
#define SOIL_PIN     36
#define SDA_PIN      8
#define SCL_PIN      9
#define OLED_ADDR    0x3C
#define MODEM_TX     17
#define MODEM_RX     18
#define MODEM_PWRKEY 16

// ---------- SETTINGS ----------
#define PHONE_NUMBER "+254753534484"
#define SIM_PIN      "8949"
#define BLIGHT_RH     85
#define HEAT_TEMP     35
#define DRY_SOIL_RAW  3000

// ---------- LIVE FEED ----------
#define WEBHOOK_URL   "https://angawatch-greenhouse-tomatoes.vercel.app/api/ingest"
#define INGEST_KEY    ""            // leave "" while testing; set to match Vercel INGEST_KEY later
#define GREENHOUSE_ID "GH-01"
#define APN           "safaricom"   // Safaricom Kenya APN
#define POST_EVERY_MS 30000UL       // push to website every 30 s

// soil calibration (capacitive: lower raw = wetter). MEASURE & TUNE:
//   SOIL_DRY_RAW = reading in air / bone-dry soil
//   SOIL_WET_RAW = reading in a glass of water / saturated soil
#define SOIL_DRY_RAW  3000
#define SOIL_WET_RAW  1200

Adafruit_SSD1306 display(128, 64, &Wire, -1);
HardwareSerial modem(1);

bool alertActive = false;
uint32_t lastPost = 0;

// ---------- DHT11 (no library) ----------
bool waitLevel(int pin, int level, uint32_t timeout) {
  uint32_t start = micros();
  while (digitalRead(pin) != level) {
    if (micros() - start > timeout) return false;
  }
  return true;
}

bool readDHT11(int pin, float &temp, float &hum) {
  uint8_t data[5] = {0, 0, 0, 0, 0};
  pinMode(pin, OUTPUT);
  digitalWrite(pin, LOW);  delay(20);
  digitalWrite(pin, HIGH); delayMicroseconds(40);
  pinMode(pin, INPUT_PULLUP);
  if (!waitLevel(pin, LOW, 100))  return false;
  if (!waitLevel(pin, HIGH, 100)) return false;
  if (!waitLevel(pin, LOW, 100))  return false;
  for (int i = 0; i < 40; i++) {
    if (!waitLevel(pin, HIGH, 100)) return false;
    uint32_t start = micros();
    if (!waitLevel(pin, LOW, 100))  return false;
    if (micros() - start > 40) data[i / 8] |= 1;
    if (i % 8 != 7) data[i / 8] <<= 1;
  }
  if (data[4] != ((data[0] + data[1] + data[2] + data[3]) & 0xFF)) return false;
  hum  = data[0];
  temp = data[2];
  return true;
}

int soilPercent(int raw) {
  long p = map(raw, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100);
  return (int)constrain(p, 0, 100);
}

// ---------- MODEM ----------
void modemPowerOn() {
  pinMode(MODEM_PWRKEY, OUTPUT);
  digitalWrite(MODEM_PWRKEY, HIGH); delay(100);
  digitalWrite(MODEM_PWRKEY, LOW);  delay(1200);
  digitalWrite(MODEM_PWRKEY, HIGH);
}

String sendAT(String cmd, uint32_t wait = 1000) {
  while (modem.available()) modem.read();
  modem.print(cmd);
  modem.print("\r\n");
  String resp = "";
  uint32_t start = millis();
  while (millis() - start < wait) {
    while (modem.available()) resp += (char)modem.read();
  }
  Serial.print(cmd); Serial.print(" -> "); Serial.println(resp);
  return resp;
}

bool waitFor(const char* token, uint32_t ms) {
  uint32_t start = millis();
  String r = "";
  while (millis() - start < ms) {
    while (modem.available()) r += (char)modem.read();
    if (r.indexOf(token) >= 0) { Serial.print(r); return true; }
  }
  Serial.print(r);
  return false;
}

void modemInit() {
  sendAT("AT", 1000);
  sendAT("AT+CPIN=" SIM_PIN, 2000);   // unlock SIM (safe if already unlocked)
  delay(3000);
  sendAT("AT+CMGF=1", 1000);          // SMS text mode
}

// bring up the cellular data context (run once after registration)
void dataAttach() {
  sendAT("AT+CGDCONT=1,\"IP\",\"" APN "\"", 1000);
  sendAT("AT+CGATT=1", 6000);
  sendAT("AT+CNACT=0,1", 4000);       // activate PDP; harmless if firmware ignores it
  delay(1000);
}

void sendSMS(String number, String message) {
  sendAT("AT+CMGF=1", 1000);
  sendAT("AT+CMGS=\"" + number + "\"", 1000);
  modem.print(message);
  delay(100);
  modem.write(26);                    // Ctrl+Z
  delay(8000);
  Serial.println("SMS send attempted");
}

// HTTP(S) POST via SIM7670G app commands
bool httpPost(const String &url, const String &body) {
  sendAT("AT+HTTPTERM", 500);                 // clean any previous session
  sendAT("AT+HTTPINIT", 2000);
  sendAT("AT+HTTPPARA=\"URL\",\"" + url + "\"", 1000);
  sendAT("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 1000);

  while (modem.available()) modem.read();
  modem.print("AT+HTTPDATA=" + String(body.length()) + ",10000\r\n");
  if (!waitFor("DOWNLOAD", 3000)) { sendAT("AT+HTTPTERM", 500); return false; }
  modem.print(body);
  waitFor("OK", 3000);

  String act = sendAT("AT+HTTPACTION=1", 15000);   // 1 = POST
  sendAT("AT+HTTPTERM", 1000);
  bool ok = act.indexOf(",200,") >= 0;
  Serial.println(ok ? "[HTTP] 200 OK" : "[HTTP] POST failed (check APN / signal)");
  return ok;
}

String buildJson(float t, float h, int soilRaw) {
  // add 7-in-1 fields here later, e.g.:  + ",\"ec\":" + String(ec,2) + ",\"ph\":" + String(ph,1)
  return String("{\"gh\":\"") + GREENHOUSE_ID + "\",\"temp\":" + String(t, 1) +
         ",\"hum\":" + String(h, 1) +
         ",\"soilMoisturePct\":" + String(soilPercent(soilRaw)) +
         ",\"soilRaw\":" + String(soilRaw) + "}";
}

void postReading(float t, float h, int soilRaw) {
  String url = String(WEBHOOK_URL);
  if (strlen(INGEST_KEY) > 0) url += "?key=" INGEST_KEY;
  String body = buildJson(t, h, soilRaw);
  Serial.print("[HTTP] POST "); Serial.println(body);
  httpPost(url, body);
}

// ---------- OLED ----------
void showOLED(float t, float h, int soilRaw, bool ok, String status) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.setTextSize(1);
  display.println("AngaWatch Greenhouse");
  display.drawLine(0, 11, 127, 11, SSD1306_WHITE);
  display.setCursor(0, 15);
  if (ok) {
    display.print("Temp:  "); display.print(t, 0); display.print((char)247); display.println("C");
    display.print("Humid: "); display.print(h, 0); display.println("%");
  } else {
    display.println("DHT read failed");
    display.println("");
  }
  display.print("SoilRAW: "); display.println(soilRaw);
  display.drawLine(0, 44, 127, 44, SSD1306_WHITE);
  display.setCursor(0, 48);
  display.print(status);
  display.display();
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  Wire.begin(SDA_PIN, SCL_PIN);
  display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("AngaWatch Greenhouse");
  display.println("Booting modem...");
  display.display();

  modem.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  modemPowerOn();
  delay(12000);
  modemInit();
  dataAttach();                        // bring up data for the live feed

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("AngaWatch Greenhouse");
  display.println("Ready.");
  display.display();
  delay(1500);
}

// ---------- LOOP ----------
void loop() {
  float t, h;
  bool ok = readDHT11(DHTPIN, t, h);
  int soilRaw = analogRead(SOIL_PIN);

  String status = "Status: OK";
  bool risk = false;
  if (ok) {
    if (h >= BLIGHT_RH)              { status = "! BLIGHT RISK"; risk = true; }
    else if (t >= HEAT_TEMP)         { status = "! HEAT ALERT";  risk = true; }
    else if (soilRaw > DRY_SOIL_RAW) { status = "! SOIL DRY";    risk = true; }
  }

  showOLED(t, h, soilRaw, ok, status);
  Serial.print("Soil raw: "); Serial.println(soilRaw);

  // push to the live website on an interval
  if (ok && (lastPost == 0 || millis() - lastPost > POST_EVERY_MS)) {
    lastPost = millis();
    postReading(t, h, soilRaw);
  }

  // SMS alert (unchanged)
  if (ok && risk && !alertActive) {
    String msg = "AngaWatch Greenhouse ALERT: " + status.substring(2) +
                 ". Temp " + String(t, 0) + "C, Humidity " + String(h, 0) +
                 "%, SoilRaw " + String(soilRaw) + ". Action needed.";
    sendSMS(PHONE_NUMBER, msg);
    alertActive = true;
  } else if (!risk && alertActive) {
    alertActive = false;
  }

  delay(3000);
}
