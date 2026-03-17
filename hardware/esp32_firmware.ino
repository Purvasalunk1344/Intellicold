// ================================================================
//  IntelliCold ESP32 Firmware - SIMPLIFIED VERSION
//  File: esp32_firmware_SIMPLE.ino
//
//  Hardware Used:
//  ✓ ESP32 30-pin DevKit
//  ✓ DHT22 (Temperature & Humidity)
//  ✓ MQ-135 (Gas sensor)
//  ✓ IRLZ44N MOSFET (PWM control)
//  ✓ Peltier Module TEC1-12706
//  ✓ 12V 10A Power Supply
//
//  NO Relay, NO External LED
//  Direct MOSFET control only!
// ================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ----------------------------------------------------------------
//  ⚙️  CHANGE THESE BEFORE UPLOADING
// ----------------------------------------------------------------

const char* WIFI_SSID      = "1103";
const char* WIFI_PASSWORD  = "om@1532006";

// Your PC IP - run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
const char* BACKEND_IP     = "10.106.16.147";      // ← CHANGE THIS!
const int   BACKEND_PORT   = 5000;

// Must match your backend shipments_db
const char* SHIPMENT_ID    = "S001";
const char* DEVICE_ID      = "ESP32_DEMO_001";

// ----------------------------------------------------------------
//  PIN DEFINITIONS
// ----------------------------------------------------------------
#define DHT_PIN       4    // GPIO 4  → DHT22 Data (with 10kΩ pull-up)
#define MOSFET_PIN    25   // GPIO 25 → IRLZ44N Gate (PWM control)
#define MQ135_PIN     35   // GPIO 35 → MQ-135 Analog Out (A0)

// ----------------------------------------------------------------
//  SETTINGS
// ----------------------------------------------------------------
#define DHT_TYPE       DHT22
#define SEND_INTERVAL  30000   // Send every 30 seconds
#define PWM_FREQ       5000    // 5 kHz PWM frequency
#define PWM_RESOLUTION 8       // 8-bit: 0-255
#define PWM_CHANNEL    0       // PWM channel for Core 2.x

// ----------------------------------------------------------------
//  GLOBALS
// ----------------------------------------------------------------
DHT dht(DHT_PIN, DHT_TYPE);

int  currentPWM = 0;
unsigned long lastSendTime = 0;

// ----------------------------------------------------------------
//  SETUP
// ----------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n╔════════════════════════════════╗");
  Serial.println("║   IntelliCold ESP32 Starting  ║");
  Serial.println("╚════════════════════════════════╝");

  // PWM setup - Support both Arduino Core 2.x and 3.x
  #if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
    // Core 3.x syntax (newer boards)
    Serial.println("[PWM] Using Arduino Core 3.x");
    ledcAttach(MOSFET_PIN, PWM_FREQ, PWM_RESOLUTION);
  #else
    // Core 2.x syntax (most common)
    Serial.println("[PWM] Using Arduino Core 2.x");
    ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
    ledcAttachPin(MOSFET_PIN, PWM_CHANNEL);
  #endif
  
  ledcWrite(MOSFET_PIN, 0);  // Peltier OFF at start
  Serial.println("[OK] MOSFET PWM ready on GPIO 25");

  // DHT22 sensor
  dht.begin();
  delay(2000);  // DHT22 needs time to stabilize
  
  float testTemp = dht.readTemperature();
  if (isnan(testTemp)) {
    Serial.println("[WARN] DHT22 not responding!");
    Serial.println("       Check: 3.3V, GND, Data→GPIO4, 10kΩ pull-up");
  } else {
    Serial.printf("[OK] DHT22 ready - Test reading: %.1f°C\n", testTemp);
  }

  // MQ-135 sensor
  int mq135Test = analogRead(MQ135_PIN);
  Serial.printf("[OK] MQ-135 ready on GPIO 35 (raw: %d)\n", mq135Test);
  Serial.println("     Note: MQ-135 needs 24-48hr warm-up for accuracy");

  // WiFi
  connectWiFi();

  // Verify backend
  checkBackendHealth();

  Serial.println("\n[READY] System initialized!");
  Serial.printf("        Shipment : %s\n", SHIPMENT_ID);
  Serial.printf("        Device   : %s\n", DEVICE_ID);
  Serial.printf("        Backend  : http://%s:%d\n", BACKEND_IP, BACKEND_PORT);
  Serial.println("        Interval : 30 seconds\n");
}

// ----------------------------------------------------------------
//  MAIN LOOP
// ----------------------------------------------------------------
void loop() {
  // Reconnect WiFi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Reconnecting...");
    connectWiFi();
  }

  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();

    // 1. Read DHT22
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();

    // Validate readings
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("[ERROR] DHT22 read failed!");
      Serial.println("        Check wiring and 10kΩ pull-up resistor");
      delay(5000);
      return;
    }

    // Sanity check
    if (temperature < -40 || temperature > 80) {
      Serial.printf("[ERROR] Invalid temp: %.1f°C (sensor issue?)\n", temperature);
      return;
    }
    if (humidity < 0 || humidity > 100) {
      Serial.printf("[ERROR] Invalid humidity: %.1f%% (sensor issue?)\n", humidity);
      return;
    }

    // 2. Read MQ-135 (average 10 samples)
    long gasSum = 0;
    for (int i = 0; i < 10; i++) {
      gasSum += analogRead(MQ135_PIN);
      delay(10);
    }
    int gasRaw = gasSum / 10;

    // Convert to gas concentrations
    float gasVoltage  = (gasRaw / 4095.0) * 3.3;
    float ethylene    = 5.0;              // Default (no ethylene sensor)
    float co2         = mapGasToCO2(gasRaw);
    float nh3         = mapGasToNH3(gasRaw);
    float h2s         = 0.2;              // Default (no H2S sensor)

    // 3. Print readings
    printReadings(temperature, humidity, gasRaw, gasVoltage, co2, nh3);

    // 4. Safety: Pre-emptive cooling if very hot
    if (temperature > 15.0) {
      Serial.println("[SAFETY] Temp > 15°C → Pre-cooling at 60%");
      setPeltier(153);  // 60% power
    }

    // 5. Send to backend
    sendSensorData(temperature, humidity, ethylene, co2, nh3, h2s);
  }

  delay(100);
}

// ----------------------------------------------------------------
//  SEND SENSOR DATA TO BACKEND
// ----------------------------------------------------------------
void sendSensorData(float temperature, float humidity,
                    float ethylene, float co2, float nh3, float h2s) {

  String url = String("http://") + BACKEND_IP + ":" + BACKEND_PORT + "/api/sensor";

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  // Build JSON
  StaticJsonDocument<400> doc;
  doc["shipment_id"] = SHIPMENT_ID;
  doc["device_id"]   = DEVICE_ID;
  doc["temperature"] = round(temperature * 10) / 10.0;
  doc["humidity"]    = round(humidity * 10) / 10.0;
  doc["ethylene"]    = round(ethylene * 100) / 100.0;
  doc["co2"]         = round(co2 * 10) / 10.0;
  doc["nh3"]         = round(nh3 * 100) / 100.0;
  doc["h2s"]         = round(h2s * 100) / 100.0;

  String payload;
  serializeJson(doc, payload);

  Serial.println("\n[HTTP] → Sending to backend...");
  Serial.println(payload);

  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("[HTTP] ✓ Success");

    // Parse response
    StaticJsonDocument<1024> resp;
    DeserializationError err = deserializeJson(resp, response);

    if (!err) {
      JsonObject prediction = resp["prediction"];
      
      if (prediction.isNull()) {
        Serial.println("[WARN] No 'prediction' in response");
        Serial.println(response);
        return;
      }

      // Extract prediction
      int   riskIndex        = prediction["risk_index"]       | 0;
      const char* riskLevel  = prediction["risk_level"]       | "Low";
      float quality          = prediction["quality_remaining"] | 100.0;
      float hoursLeft        = prediction["hours_to_spoilage"] | 100.0;

      // Display
      Serial.println("\n  ╔══ ML PREDICTION ══════════════════╗");
      Serial.printf("  ║ Risk    : %-24s║\n", riskLevel);
      Serial.printf("  ║ Quality : %.1f%%%-20s║\n", quality, "");
      Serial.printf("  ║ Hours   : %.1f hrs%-18s║\n", hoursLeft, "");
      Serial.println("  ╚═══════════════════════════════════╝");

      // Check for cooling_action
      JsonObject coolingAction = resp["cooling_action"];
      
      int pwmValue;
      if (!coolingAction.isNull()) {
        // Backend sent explicit command
        pwmValue = coolingAction["pwm_value"] | 51;
        Serial.printf("  Mode: %s\n", coolingAction["mode"].as<const char*>());
      } else {
        // Calculate from risk_index
        pwmValue = riskIndexToPWM(riskIndex, quality);
      }

      setPeltier(pwmValue);

    } else {
      Serial.println("[ERROR] JSON parse failed");
      Serial.println(response);
    }

  } else if (httpCode > 0) {
    Serial.printf("[HTTP] ✗ Error %d\n", httpCode);
    String body = http.getString();
    Serial.println(body);
    
    if (httpCode == 404) {
      Serial.println("  → Shipment not found! Check SHIPMENT_ID");
    } else if (httpCode == 403) {
      Serial.println("  → Device mismatch! Check DEVICE_ID");
    }
  } else {
    Serial.printf("[HTTP] ✗ Connection failed: %s\n", 
                  http.errorToString(httpCode).c_str());
    Serial.println("  Troubleshooting:");
    Serial.println("  1. Is backend running? (python app.py)");
    Serial.printf("  2. Can ping? (ping %s)\n", BACKEND_IP);
    Serial.println("  3. Firewall allows port 5000?");
  }

  http.end();
}

// ----------------------------------------------------------------
//  RISK INDEX → PWM VALUE
//  0=Low(20%), 1=Medium(50%), 2=High(80%), 3=Critical(100%)
// ----------------------------------------------------------------
int riskIndexToPWM(int riskIndex, float quality) {
  int pwm;

  switch (riskIndex) {
    case 0:  pwm = 51;  break;  // Low      = 20%
    case 1:  pwm = 128; break;  // Medium   = 50%
    case 2:  pwm = 204; break;  // High     = 80%
    case 3:  pwm = 255; break;  // Critical = 100%
    default: pwm = 51;  break;
  }

  // Quality override
  if (quality < 10 && pwm < 255) {
    Serial.println("  [OVERRIDE] Quality < 10% → 100%");
    pwm = 255;
  } else if (quality < 30 && pwm < 204) {
    Serial.println("  [OVERRIDE] Quality < 30% → 80%");
    pwm = 204;
  } else if (quality < 50 && pwm < 128) {
    Serial.println("  [OVERRIDE] Quality < 50% → 50%");
    pwm = 128;
  }

  return pwm;
}

// ----------------------------------------------------------------
//  SET PELTIER POWER (MOSFET PWM ONLY)
// ----------------------------------------------------------------
void setPeltier(int pwmValue) {
  pwmValue = constrain(pwmValue, 0, 255);
  float percent = (pwmValue / 255.0) * 100.0;

  ledcWrite(MOSFET_PIN, pwmValue);
  currentPWM = pwmValue;

  Serial.println("\n  ╔══ PELTIER CONTROL ════════════════╗");
  Serial.printf("  ║ PWM     : %3d / 255%-15s║\n", pwmValue, "");
  Serial.printf("  ║ Power   : %.0f%%%-22s║\n", percent, "");
  
  if (pwmValue == 0) {
    Serial.println("  ║ Status  : OFF                      ║");
  } else if (pwmValue < 128) {
    Serial.println("  ║ Status  : MAINTAIN                 ║");
  } else if (pwmValue < 204) {
    Serial.println("  ║ Status  : MODERATE COOLING         ║");
  } else {
    Serial.println("  ║ Status  : STRONG COOLING           ║");
  }
  
  Serial.println("  ╚═══════════════════════════════════╝\n");
}

// ----------------------------------------------------------------
//  GAS SENSOR CONVERSIONS
// ----------------------------------------------------------------
float mapGasToCO2(int rawADC) {
  float voltage = (rawADC / 4095.0) * 3.3;
  float co2 = 400.0 + (voltage - 1.0) * (1600.0 / 1.5);
  return max(400.0f, min(5000.0f, co2));
}

float mapGasToNH3(int rawADC) {
  float voltage = (rawADC / 4095.0) * 3.3;
  float nh3 = voltage * 3.0;
  return max(0.1f, min(50.0f, nh3));
}

// ----------------------------------------------------------------
//  BACKEND HEALTH CHECK
// ----------------------------------------------------------------
void checkBackendHealth() {
  String url = String("http://") + BACKEND_IP + ":" + BACKEND_PORT + "/api/health";
  HTTPClient http;
  http.begin(url);
  http.setTimeout(5000);

  Serial.print("[Health] Testing backend... ");
  int code = http.GET();

  if (code == 200) {
    Serial.println("✓ Online");
    String body = http.getString();
    Serial.println(body);
  } else if (code < 0) {
    Serial.println("✗ UNREACHABLE");
    Serial.println("  → Start: python app.py");
    Serial.printf("  → IP: %s\n", BACKEND_IP);
  } else {
    Serial.printf("✗ Error %d\n", code);
  }

  http.end();
}

// ----------------------------------------------------------------
//  WIFI CONNECTION
// ----------------------------------------------------------------
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ✓");
    Serial.printf("[WiFi] IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println(" ✗ FAILED");
    Serial.println("        Check SSID/password");
    Serial.println("        Must be 2.4GHz WiFi");
  }
}

// ----------------------------------------------------------------
//  PRINT SENSOR READINGS
// ----------------------------------------------------------------
void printReadings(float temp, float hum, int gasRaw, float gasV, 
                   float co2, float nh3) {
  Serial.println("\n═══════════════════════════════════");
  Serial.println("     SENSOR READINGS");
  Serial.println("───────────────────────────────────");
  Serial.printf("  Temperature : %.1f °C\n", temp);
  Serial.printf("  Humidity    : %.1f %%\n", hum);
  Serial.printf("  MQ135 Raw   : %d / 4095\n", gasRaw);
  Serial.printf("  MQ135 Volt  : %.2f V\n", gasV);
  Serial.printf("  CO2 (est.)  : %.0f ppm\n", co2);
  Serial.printf("  NH3 (est.)  : %.2f ppm\n", nh3);
  Serial.println("───────────────────────────────────");
  Serial.printf("  Current PWM : %d (%.0f%%)\n", 
                currentPWM, (currentPWM/255.0)*100.0);
  Serial.println("═══════════════════════════════════");
}