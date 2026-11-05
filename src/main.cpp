
#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>
#include "secrets.h"

// I2C pins
#define SDA_PIN 8
#define SCL_PIN 9

// Laptop MQTT broker
const int MQTT_PORT = 1883;

const char* MQTT_TOPIC =
    "smart-iot/esp32s3/telemetry";
// Connect to Wi-Fi
WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

// Configure MQTT broker
mqttClient.setServer(MQTT_HOST, MQTT_PORT);
// Sensors
Adafruit_BME280 bme;
BH1750 lightMeter;

// MQTT
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

bool bmeReady = false;
bool lightReady = false;

unsigned long lastRead = 0;
unsigned long lastMQTTAttempt = 0;
unsigned long lastWiFiRetry = 0;

void connectWiFi() {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial0.print("Connecting to WiFi");

    unsigned long start = millis();

    while (WiFi.status() != WL_CONNECTED &&
           millis() - start < 15000) {
        Serial0.print(".");
        delay(500);
    }

    Serial0.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial0.println("WiFi Connected!");
        Serial0.print("IP: ");
        Serial0.println(WiFi.localIP());
    } else {
        Serial0.println("WiFi connection failed");
    }

    lastWiFiRetry = millis();
}

void connectMQTT() {
    if (WiFi.status() != WL_CONNECTED ||
        mqtt.connected()) {
        return;
    }

    Serial0.print("Connecting to MQTT... ");

    String clientId = "smart-iot-" +
        String((uint32_t)ESP.getEfuseMac(), HEX);

    if (mqtt.connect(clientId.c_str())) {
        Serial0.println("CONNECTED!");
    } else {
        Serial0.print("FAILED, state: ");
        Serial0.println(mqtt.state());
    }
}

void setup() {
    Serial0.begin(115200);
    delay(2000);

    Wire.begin(SDA_PIN, SCL_PIN);

    Serial0.println("SMART IOT MONITOR");

    bmeReady = bme.begin(0x76);

    lightReady = lightMeter.begin(
        BH1750::CONTINUOUS_HIGH_RES_MODE,
        0x23,
        &Wire
    );

    Serial0.println(
        bmeReady ? "BME280 Ready" : "BME280 Failed"
    );

    Serial0.println(
        lightReady ? "BH1750 Ready" : "BH1750 Failed"
    );

    connectWiFi();

    mqtt.setServer(MQTT_SERVER, MQTT_PORT);
    mqtt.setBufferSize(512);

    connectMQTT();
    lastMQTTAttempt = millis();
}

void loop() {
    // Restore WiFi if disconnected
    if (WiFi.status() != WL_CONNECTED) {
        if (millis() - lastWiFiRetry >= 10000) {
            WiFi.reconnect();
            lastWiFiRetry = millis();
        }
    }

    // Restore MQTT connection
    if (WiFi.status() == WL_CONNECTED) {
        if (!mqtt.connected() &&
            millis() - lastMQTTAttempt >= 5000) {
            lastMQTTAttempt = millis();
            connectMQTT();
        }

        if (mqtt.connected()) {
            mqtt.loop();
        }
    }

    // Read sensors every 3 seconds
    if (millis() - lastRead >= 3000) {
        lastRead = millis();

        if (!bmeReady || !lightReady) {
            Serial0.println("SENSOR ERROR");
            return;
        }

        float temperature = bme.readTemperature();
        float humidity = bme.readHumidity();
        float pressure = bme.readPressure() / 100.0F;
        float light = lightMeter.readLightLevel();

        if (isnan(temperature) ||
            isnan(humidity) ||
            isnan(pressure) ||
            light < 0) {
            Serial0.println("Sensor reading failed!");
            return;
        }

        bool warning =
            temperature > 35.0 ||
            humidity > 80.0 ||
            light < 50.0;

        const char* status =
            warning ? "WARNING" : "NORMAL";

        Serial0.println();
        Serial0.println("----- SENSOR DATA -----");

        Serial0.printf("Temperature: %.2f C\n",
                       temperature);
        Serial0.printf("Humidity: %.2f %%\n",
                       humidity);
        Serial0.printf("Pressure: %.2f hPa\n",
                       pressure);
        Serial0.printf("Light: %.2f lux\n", light);
        Serial0.printf("STATUS: %s\n", status);

        // Build JSON message
        char payload[256];

        snprintf(
            payload,
            sizeof(payload),
            "{\"device_id\":\"esp32s3-01\","
            "\"temperature_c\":%.2f,"
            "\"humidity_pct\":%.2f,"
            "\"pressure_hpa\":%.2f,"
            "\"light_lux\":%.2f,"
            "\"status\":\"%s\"}",
            temperature,
            humidity,
            pressure,
            light,
            status
        );

        if (mqtt.connected()) {
            if (mqtt.publish(MQTT_TOPIC, payload)) {
                Serial0.println("MQTT: DATA SENT!");
            } else {
                Serial0.println("MQTT: Publish failed");
            }
        } else {
            Serial0.println("MQTT: DISCONNECTED");
        }

        Serial0.println("----------------------");
    }

    delay(20);
}
