
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, ValidationError

from sqlalchemy import (
    create_engine,
    select,
    func,
    Float,
    String,
    DateTime,
    text,
)
from sqlalchemy.engine import URL
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    Session,
)


# Configuration
MQTT_HOST = os.getenv("MQTT_HOST", "host.docker.internal")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = "smart-iot/esp32s3/telemetry"

DB_URL = URL.create(
    "postgresql+psycopg",
    username=os.getenv("DB_USER", "smartiot"),
    password=os.environ["DB_PASSWORD"],
    host=os.getenv("DB_HOST", "db"),
    port=5432,
    database=os.getenv("DB_NAME", "smart_iot"),
)

engine = create_engine(DB_URL, pool_pre_ping=True)


# Database model
class Base(DeclarativeBase):
    pass


class SensorRecord(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[str] = mapped_column(String(64), index=True)

    temperature_c: Mapped[float] = mapped_column(Float)
    humidity_pct: Mapped[float] = mapped_column(Float)
    pressure_hpa: Mapped[float] = mapped_column(Float)
    light_lux: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20))

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )


# MQTT JSON validation
class SensorReading(BaseModel):
    device_id: str
    temperature_c: float
    humidity_pct: float
    pressure_hpa: float
    light_lux: float
    status: str


def record_to_dict(record):
    return {
        "id": record.id,
        "device_id": record.device_id,
        "temperature_c": record.temperature_c,
        "humidity_pct": record.humidity_pct,
        "pressure_hpa": record.pressure_hpa,
        "light_lux": record.light_lux,
        "status": record.status,
        "received_at": record.received_at.isoformat(),
    }


# MQTT callbacks
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code.is_failure:
        print(f"MQTT connection failed: {reason_code}", flush=True)
        return

    print("MQTT connected!", flush=True)
    client.subscribe(MQTT_TOPIC)
    print(f"Subscribed to {MQTT_TOPIC}", flush=True)


def on_message(client, userdata, msg):
    try:
        reading = SensorReading.model_validate_json(msg.payload)
    except ValidationError as error:
        print(f"Invalid MQTT payload: {error}", flush=True)
        return

    try:
        with Session(engine) as session:
            record = SensorRecord(**reading.model_dump())

            session.add(record)
            session.commit()

        print("Sensor reading saved to PostgreSQL", flush=True)

    except SQLAlchemyError as error:
        print(f"Database error: {error}", flush=True)


mqtt_client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id="smart-iot-fastapi",
)

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)

    print("Database tables ready!", flush=True)

    mqtt_client.connect_async(MQTT_HOST, MQTT_PORT, 60)
    mqtt_client.loop_start()

    yield

    mqtt_client.disconnect()
    mqtt_client.loop_stop()
    engine.dispose()


app = FastAPI(
    title="Smart IoT Environmental Monitoring API",
    version="1.1.0",
    lifespan=lifespan,
)


@app.get("/")
def home():
    return {
        "project": "Smart IoT Environmental Monitor",
        "database": "PostgreSQL",
        "message": "Backend is running",
    }


@app.get("/health")
def health():
    try:
        with Session(engine) as session:
            session.execute(text("SELECT 1"))
        database_connected = True
    except SQLAlchemyError:
        database_connected = False

    return {
        "api": "running",
        "mqtt_connected": mqtt_client.is_connected(),
        "database_connected": database_connected,
    }


@app.get("/api/readings/latest")
def latest():
    with Session(engine) as session:
        record = session.scalars(
            select(SensorRecord)
            .order_by(SensorRecord.id.desc())
            .limit(1)
        ).first()

        if record is None:
            raise HTTPException(
                status_code=404,
                detail="No readings stored yet",
            )

        return record_to_dict(record)


@app.get("/api/readings/history")
def history(limit: int = Query(50, ge=1, le=200)):
    with Session(engine) as session:
        records = session.scalars(
            select(SensorRecord)
            .order_by(SensorRecord.id.desc())
            .limit(limit)
        ).all()

        return [record_to_dict(record) for record in records]


@app.get("/api/readings/count")
def count_readings():
    with Session(engine) as session:
        total = session.scalar(
            select(func.count()).select_from(SensorRecord)
        )

        return {"total_readings": total}
