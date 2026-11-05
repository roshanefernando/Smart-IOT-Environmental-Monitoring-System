# 🌐 Smart IoT Environmental Monitoring & Alert System

### ESP32-S3 | MQTT | FastAPI | PostgreSQL | Docker

An end-to-end IoT environmental monitoring system that combines embedded hardware, real-time communication, backend development, database management, and an interactive web dashboard.

Developed as a hands-on Computer Engineering project to explore the integration of IoT technologies with modern software engineering and DevOps practices.

---

## 🎥 Project Demonstration

Watch the complete hardware and software demonstration on YouTube.

**▶ [Watch Project Demonstration](https://youtu.be/WJ77T0loQI4)**

The demonstration covers the ESP32-S3 hardware setup, sensor readings, MQTT communication, and the real-time monitoring dashboard.

---

## 📌 Project Overview

The Smart IoT Environmental Monitoring & Alert System continuously collects environmental measurements through sensors connected to an ESP32-S3 microcontroller.

The collected data is transmitted over Wi-Fi using MQTT to an Eclipse Mosquitto broker. A Python FastAPI backend processes the incoming measurements and stores them in a PostgreSQL database.

A web-based dashboard displays live sensor readings, historical trends, environmental warnings, and system connectivity information.

Docker is used to containerize and manage the application services.

## ✨ Key Features

- **Real-Time Environmental Monitoring:** Continuously measures temperature, humidity, atmospheric pressure, and light intensity.
- **ESP32-S3 Integration:** Collects sensor data using the BME280 and BH1750 modules.
- **MQTT Communication:** Transmits sensor readings wirelessly through Eclipse Mosquitto.
- **FastAPI Backend:** Handles sensor data processing and API requests.
- **PostgreSQL Storage:** Stores environmental measurements for historical analysis.
- **Interactive Web Dashboard:** Displays real-time readings, animated visualizations, and sensor trends.
- **Environmental Alerts:** Displays warning statuses when sensor readings cross configured thresholds.
- **System Health Monitoring:** Displays the status of the ESP32-S3 telemetry, MQTT connection, backend, and database.
- **Docker Containerization:** Simplifies deployment and application service management.

---

## 🛠️ Technologies Used

| Category | Technologies |
|---|---|
| Microcontroller | ESP32-S3 N16R8 |
| Sensors | BME280, BH1750 |
| Firmware | C++, PlatformIO |
| Communication | Wi-Fi, MQTT |
| Message Broker | Eclipse Mosquitto |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| Frontend | HTML, CSS, JavaScript |
| Containerization | Docker, Docker Compose |
| Development Tools | VS Code, Git, GitHub |

## 🔌 Hardware Components

| Component | Purpose |
|---|---|
| ESP32-S3 | Main microcontroller |
| BME280 | Temperature, humidity, and pressure measurements |
| BH1750 | Ambient light intensity measurement |
| Breadboard | Circuit prototyping |
| Jumper wires | Hardware connections |
| USB-C cable | Power supply and programming |

Both sensors communicate with the ESP32-S3 using the I²C communication protocol.

---

## 🏗️ System Architecture

**1. Sensor Layer**

BME280 and BH1750 sensors measure environmental conditions and send their readings to the ESP32-S3.

**2. Communication Layer**

The ESP32-S3 transmits sensor data over Wi-Fi using MQTT.

**3. Message Broker**

Eclipse Mosquitto receives MQTT messages from the microcontroller.

**4. Backend Processing**

The FastAPI application subscribes to sensor messages, processes the measurements, and manages database operations.

**5. Data Storage**

PostgreSQL stores incoming sensor measurements and timestamps.

**6. Dashboard**

The web application retrieves data from the backend API and displays live readings, trends, historical records, and system information.

**Data Flow:**

ESP32-S3 + BME280 + BH1750 → Wi-Fi → MQTT → Eclipse Mosquitto → FastAPI → PostgreSQL → Web Dashboard

---

## 📊 Web Dashboard

The monitoring dashboard provides three main sections.

### 1. Environment Overview
- Live temperature, humidity, pressure, and light-intensity readings
- Environmental status indicators
- Automatically refreshed measurements
- Interactive sensor trend graphs

### 2. Reading History
- Historical sensor measurements
- Timestamps for recorded readings
- Measurements retrieved from PostgreSQL

### 3. System Status
- FastAPI backend status
- MQTT connection status
- PostgreSQL database health
- ESP32-S3 telemetry status
- Deployment and configuration information

---

## 🚀 Installation and Setup

### Prerequisites

Ensure the following tools are installed:

- Visual Studio Code
- PlatformIO extension
- Docker Desktop with Docker Compose
- Git
- A compatible ESP32-S3 development board
- BME280 and BH1750 sensors

### Step 1: Clone the Repository

`git clone https://github.com/roshanefernando/Smart-IOT-Environmental-Monitoring-System.git`

`cd Smart-IOT-Environmental-Monitoring-System`

### Step 2: Configure the Application

Configure the backend environment variables and database settings using your local environment configuration.

Never commit actual Wi-Fi passwords, database passwords, or other secrets.

### Step 3: Start Docker Services

From the directory containing your Docker Compose configuration, run:

`docker compose up -d --build`

Verify the containers:

`docker compose ps`

### Step 4: Configure the ESP32-S3

1. Open the firmware project in VS Code using PlatformIO.
2. Configure your Wi-Fi credentials and MQTT broker address in your local private configuration file.
3. Connect the ESP32-S3 using USB-C.
4. Build and upload the firmware.
5. Open the PlatformIO Serial Monitor.
6. Verify that the device connects to Wi-Fi and MQTT and begins publishing sensor data.

### Step 5: Open the Dashboard

Once the application services are running, open:

**http://localhost:8080**

The dashboard should begin showing measurements when sensor data is being received successfully.

*Note: Configuration file locations and startup commands may need adjustment depending on the repository's final folder structure.*

---

## 🧪 Testing and Demonstration

The system was tested by observing live environmental measurements and verifying updates on the web dashboard.

For the light intensity test, the BH1750 sensor was covered and exposed to light to observe changes in lux measurements.

Sensor readings were also monitored through the ESP32-S3 serial output and the dashboard to verify data transmission.

Additional testing included reviewing environmental warning indicators, historical records, and application connectivity status.

---

## 🔐 Security Considerations

- Private Wi-Fi credentials should not be committed to GitHub.
- Database passwords and other sensitive configuration values should remain in local environment files.
- Example configuration files should use placeholder values.
- Local network addresses should be configurable for different deployment environments.

---

## 🔮 Future Improvements

Potential improvements include:

- Cloud deployment for remote environmental monitoring
- Mobile-friendly alert notifications
- Advanced analytics and anomaly detection
- Multi-device ESP32 support
- User authentication and access control
- CI/CD integration for automated application deployment

---

## 🎯 Learning Outcomes

This project provided practical experience in:

- Embedded systems programming
- Sensor integration and I²C communication
- MQTT-based IoT data transmission
- REST API development with FastAPI
- PostgreSQL database integration
- Real-time dashboard development
- Docker containerization
- End-to-end hardware and software integration

---

## 👨‍💻 Developer

**Roshane Fernando**

Computer Engineering Undergraduate  
University of Sri Jayewardenepura, Sri Lanka

**GitHub:** https://github.com/roshanefernando

**LinkedIn:** https://www.linkedin.com/in/roshane-fernando-a649a3217/

---

⭐ If you find this project interesting, feel free to star the repository and share your feedback.