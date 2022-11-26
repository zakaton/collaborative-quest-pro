/* global THREE */

// to remove that stupid THREE.js warning
THREE.Quaternion.prototype.inverse = THREE.Quaternion.prototype.invert;

{
  const eventDispatcherAddEventListener =
    THREE.EventDispatcher.prototype.addEventListener;
  THREE.EventDispatcher.prototype.addEventListener = function (
    type,
    listener,
    options
  ) {
    if (options) {
      if (options.once) {
        function onceCallback(event) {
          listener.apply(this, arguments);
          this.removeEventListener(type, onceCallback);
        }
        eventDispatcherAddEventListener.call(this, type, onceCallback);
      }
    } else {
      eventDispatcherAddEventListener.apply(this, arguments);
    }
  };
}

class BaseMission extends THREE.EventDispatcher {
  constructor() {
    super();

    this.isLoggingEnabled = !true;
    this._reconnectOnDisconnection = true;

    this._batteryLevel = null;
    this._name = null;
    this._type = null;

    this._sensorDataConfigurations = null;

    this._isUsingBNO080 = false;
    this._isUsingBNO085 = true;

    this.motion = {
      acceleration: new THREE.Vector3(),
      gravity: new THREE.Quaternion(),
      linearAcceleration: new THREE.Vector3(),
      rotationRate: new THREE.Euler(),
      magnetometer: new THREE.Quaternion(),
      quaternion: new THREE.Quaternion(),
      euler: new THREE.Euler(),

      calibration: null,
    };

    this.pressure = Object.assign([], {
      sum: 0,
      mass: 0,
      heelToToe: 0,
      centerOfMass: { x: 0, y: 0 },
    });
    this._weightDataDelay = null;
    this._weight = null;

    this._sensorDataTimestampOffset = 0;
    this._lastRawSensorDataTimestamp = 0;

    this.disableSensorsBeforeUnload = false;
    window.addEventListener("beforeunload", async (event) => {
      if (this.isConnected && this.disableSensorsBeforeUnload) {
        const sensorDataConfigurations = {};
        for (const sensorType in this.SensorDataTypeStrings) {
          sensorDataConfigurations[sensorType.toLowerCase()] = {};
          this.SensorDataTypeStrings[sensorType].forEach((sensorDataType) => {
            sensorDataConfigurations[sensorType.toLowerCase()][
              sensorDataType
            ] = 0;
          });
        }
        await this.setSensorDataConfigurations(sensorDataConfigurations);
      }
    });
  }

  async _getFileBuffer(file) {
    let fileBuffer;
    if (file instanceof Array) {
      fileBuffer = file;
    } else if (file.buffer) {
      fileBuffer = file.buffer;
    } else if (typeof file == "string") {
      const response = await fetch(file);
      fileBuffer = await response.arrayBuffer();
    } else if (file instanceof File) {
      fileBuffer = await file.arrayBuffer();
    } else if (file instanceof ArrayBuffer) {
      fileBuffer = file;
    } else {
      throw { error: "not a valid file type", file };
    }
    return fileBuffer;
  }

  log() {
    if (this.isLoggingEnabled) {
      console.groupCollapsed(`[${this.constructor.name}]`, ...arguments);
      console.trace(); // hidden in collapsed group
      console.groupEnd();
    }
  }

  _assertConnection() {
    if (!this.isConnected) {
      throw "Not connected";
    }
  }

  get textEncoder() {
    return this.constructor.textEncoder;
  }
  get textDecoder() {
    return this.constructor.textDecoder;
  }

  _concatenateArrayBuffers(...arrayBuffers) {
    arrayBuffers = arrayBuffers.filter((arrayBuffer) => arrayBuffer);
    arrayBuffers = arrayBuffers.map((arrayBuffer) => {
      if (arrayBuffer instanceof ArrayBuffer) {
        return arrayBuffer;
      } else if (
        "buffer" in arrayBuffer &&
        arrayBuffer.buffer instanceof ArrayBuffer
      ) {
        return arrayBuffer.buffer;
      } else if (arrayBuffer instanceof DataView) {
        return arrayBuffer.buffer;
      } else if (arrayBuffer instanceof Array) {
        return Uint8Array.from(arrayBuffer).buffer;
      } else {
        return arrayBuffer;
      }
    });
    arrayBuffers = arrayBuffers.filter(
      (arrayBuffer) => arrayBuffer && "byteLength" in arrayBuffer
    );
    //this.log("concatenating array buffers", arrayBuffers);
    const length = arrayBuffers.reduce(
      (length, arrayBuffer) => length + arrayBuffer.byteLength,
      0
    );
    const uint8Array = new Uint8Array(length);
    let offset = 0;
    arrayBuffers.forEach((arrayBuffer) => {
      uint8Array.set(new Uint8Array(arrayBuffer), offset);
      offset += arrayBuffer.byteLength;
    });
    return uint8Array.buffer;
  }

  getTypeString() {
    return this.TypeStrings[this._type];
  }
  _onTypeUpdate() {
    this.isInsole =
      this._type == this.Types.LEFT_INSOLE ||
      this._type == this.Types.RIGHT_INSOLE;
    if (this.isInsole) {
      this.isRightInsole = this._type == this.Types.RIGHT_INSOLE;
      this.insoleSide = this.isRightInsole ? "right" : "left";
    }
    this.log(`type: ${this.getTypeString()}`);
    this.dispatchEvent({ type: "type", message: { type: this._type } });
  }
  _onNameUpdate() {
    this.log(`name: "${this._name}"`);
    this.dispatchEvent({ type: "name", message: { name: this._name } });
  }
  _onWeightDataDelayUpdate() {
    this.log(`weight data delay: ${this._weightDataDelay}`);
    this.dispatchEvent({
      type: "weightdatadelay",
      message: { weightDataDelay: this._weightDataDelay },
    });
  }
  _onWeightDataUpdate() {
    this.log(`weight: ${this._weight}`);
    this.dispatchEvent({ type: "weight", message: { weight: this._weight } });
  }

  get _isUsingBNO08x() {
    return this._isUsingBNO080 || this._isUsingBNO085;
  }
  _parseMotionCalibration(dataView, byteOffset = 0) {
    let isFullyCalibrated = true;
    const motionCalibration = {};
    this.MotionCalibrationTypeStrings.forEach((motionCalibrationTypeString) => {
      const value = dataView.getUint8(byteOffset++);
      motionCalibration[motionCalibrationTypeString] = value;
      isFullyCalibrated = isFullyCalibrated && value == 3;
    });

    if (!this._isUsingBNO08x) {
      motionCalibration.isFullyCalibrated = isFullyCalibrated;
    }

    //this.log("received motion calibration data", motionCalibration);
    this.motion.calibration = motionCalibration;

    this.dispatchEvent({
      type: "motioncalibration",
      message: { motionCalibration },
    });
    if (isFullyCalibrated) {
      this.dispatchEvent({
        type: "motionisfullycalibrated",
      });
    }

    return byteOffset;
  }

  _parseSensorDataConfigurations(dataView, byteOffset = 0) {
    this._sensorDataConfigurations = {};
    this.SensorTypeStrings.forEach((sensorTypeString, sensorType) => {
      byteOffset = this._parseSensorDataConfiguration(
        dataView,
        byteOffset,
        sensorType
      );
    });
    this.dispatchEvent({
      type: "sensordataconfigurations",
      message: { sensorDataConfigurations: this._sensorDataConfigurations },
    });
    return byteOffset;
  }
  _parseSensorDataConfiguration(dataView, byteOffset, sensorType) {
    const sensorDataConfiguration = {};
    if (!this.isValidSensorType(sensorType)) {
      throw `undefined sensor type ${sensorType}`;
    }
    const sensorTypeString = this.SensorTypeStrings[sensorType];
    const sensorDataTypeStrings = this.SensorDataTypeStrings[sensorTypeString];
    const sensorDataTypes = this.SensorDataTypes[sensorTypeString];

    sensorDataTypeStrings.forEach((sensorDataTypeString, index) => {
      sensorDataConfiguration[sensorDataTypeString] = dataView.getUint16(
        byteOffset,
        true
      );
      byteOffset += 2;
    });

    const lowerCaseSensorTypeString = sensorTypeString.toLowerCase();
    this._sensorDataConfigurations[lowerCaseSensorTypeString] =
      sensorDataConfiguration;
    return byteOffset;
  }

  _flattenSensorConfigurations(configurations) {
    let flattenedConfigurations = new ArrayBuffer();

    this.SensorTypeStrings.forEach((sensorTypeString, sensorType) => {
      sensorTypeString = sensorTypeString.toLowerCase();
      if (
        sensorTypeString in configurations &&
        (sensorType != this.SensorTypes.PRESSURE || this.isInsole)
      ) {
        flattenedConfigurations = this._concatenateArrayBuffers(
          flattenedConfigurations,
          this._flattenSensorConfiguration(
            configurations[sensorTypeString],
            sensorType
          )
        );
      }
    });
    return flattenedConfigurations;
  }
  _flattenSensorConfiguration(configuration, sensorType) {
    const _configuration = {};
    if (!this.isValidSensorType(sensorType)) {
      throw `undefined sensor type ${sensorType}`;
    }
    const sensorTypeString = this.SensorTypeStrings[sensorType];
    const sensorDataTypeStrings = this.SensorDataTypeStrings[sensorTypeString];
    const sensorDataTypes = this.SensorDataTypes[sensorTypeString];

    for (const sensorDataTypeString in configuration) {
      if (sensorDataTypeStrings.includes(sensorDataTypeString)) {
        let delay = configuration[sensorDataTypeString];
        if (Number.isInteger(delay) && delay >= 0) {
          delay -= delay % 20;
          _configuration[sensorDataTypeString] = delay;
        }
      }
    }

    const numberOfSensorDataTypes = Object.keys(_configuration).length;
    if (numberOfSensorDataTypes > 0) {
      const flattenedConfiguration = new DataView(
        new ArrayBuffer(numberOfSensorDataTypes * 3)
      );
      let byteOffset = 0;
      for (const sensorDataType in _configuration) {
        flattenedConfiguration.setUint8(
          byteOffset,
          sensorDataTypes[sensorDataType]
        );
        flattenedConfiguration.setUint16(
          byteOffset + 1,
          _configuration[sensorDataType],
          true
        );
        byteOffset += 3;
      }
      return this._concatenateArrayBuffers(
        Uint8Array.from([sensorType, flattenedConfiguration.byteLength]),
        flattenedConfiguration.buffer
      );
    } else {
      return new ArrayBuffer();
    }
  }

  _parseSensorData(dataView, byteOffset = 0) {
    const rawTimestamp = dataView.getUint16(byteOffset, true);
    if (rawTimestamp < this._lastRawSensorDataTimestamp) {
      this._sensorDataTimestampOffset += 2 ** 16;
    }
    this._lastRawSensorDataTimestamp = rawTimestamp;
    const timestamp = rawTimestamp + this._sensorDataTimestampOffset;
    byteOffset += 2;

    while (byteOffset < dataView.byteLength) {
      const sensorType = dataView.getUint8(byteOffset++);
      byteOffset = this._parseSensorDataType(
        dataView,
        byteOffset,
        timestamp,
        sensorType
      );
    }

    return byteOffset;
  }
  _parseSensorDataType(dataView, byteOffset, timestamp, sensorType) {
    const dataSize = dataView.getUint8(byteOffset++);
    const finalByteOffset = byteOffset + dataSize;
    if (finalByteOffset > dataView.byteLength) {
      throw `data size is larger than data view size`;
    }

    if (!this.isValidSensorType(sensorType)) {
      throw `undefined sensor type ${sensorType}`;
    }

    switch (sensorType) {
      case this.SensorTypes.MOTION:
        byteOffset = this._parseMotionSensorData(
          dataView,
          byteOffset,
          finalByteOffset,
          timestamp
        );
        break;
      case this.SensorTypes.PRESSURE:
        byteOffset = this._parsePressureSensorData(
          dataView,
          byteOffset,
          finalByteOffset,
          timestamp
        );
        break;
    }

    return byteOffset;
  }
  defaultEulerOrder = "YXZ";
  _parseMotionSensorData(dataView, byteOffset, finalByteOffset, timestamp) {
    while (byteOffset < finalByteOffset) {
      const motionSensorDataType = dataView.getUint8(byteOffset++);
      const motionSensorDataTypeString =
        this.MotionDataTypeStrings[motionSensorDataType];
      this.log(`got motion sensor data type "${motionSensorDataTypeString}"`);

      const scalar = this.MotionDataScalars[motionSensorDataTypeString];
      let byteSize = 0;
      let vector, quaternion, euler;
      switch (motionSensorDataType) {
        case this.MotionDataTypes.acceleration:
        case this.MotionDataTypes.gravity:
        case this.MotionDataTypes.linearAcceleration:
        case this.MotionDataTypes.magnetometer:
          vector = this._parseMotionVector(dataView, byteOffset, scalar);
          this.motion[motionSensorDataTypeString].copy(vector);

          byteSize = 6;
          break;
        case this.MotionDataTypes.rotationRate:
          euler = this._parseMotionEuler(dataView, byteOffset, scalar);
          this.motion[motionSensorDataTypeString].copy(euler);

          byteSize = 6;
          break;
        case this.MotionDataTypes.quaternion:
          quaternion = this._parseMotionQuaternion(
            dataView,
            byteOffset,
            scalar
          );
          this.motion[motionSensorDataTypeString].copy(quaternion);

          byteSize = 8;

          euler = new THREE.Euler().setFromQuaternion(quaternion);
          euler.reorder(this.defaultEulerOrder);
          this.motion.euler.copy(euler);
          this.dispatchEvent({
            type: "euler",
            message: { timestamp, euler },
          });
          break;
        default:
          throw `undefined motion sensor data type ${motionSensorDataType}`;
          break;
      }

      const rawData = this._getRawMotionData(dataView, byteOffset, byteSize);
      this.dispatchEvent({
        type: motionSensorDataTypeString,
        message: {
          timestamp,
          [motionSensorDataTypeString]:
            motionSensorDataTypeString == "quaternion"
              ? quaternion
              : vector || euler,
          rawData,
        },
      });
      byteOffset += byteSize;
    }
    return byteOffset;
  }
  _parsePressureSensorData(dataView, byteOffset, finalByteOffset, timestamp) {
    while (byteOffset < finalByteOffset) {
      const pressureSensorDataType = dataView.getUint8(byteOffset++);
      const pressureSensorDataTypeString =
        this.PressureDataTypeStrings[pressureSensorDataType];
      this.log(
        `got pressure sensor data type "${pressureSensorDataTypeString}"`
      );

      const scalar = this.PressureDataScalars[pressureSensorDataTypeString];
      let byteSize = 0;

      switch (pressureSensorDataType) {
        case this.PressureDataTypes.pressureSingleByte:
        case this.PressureDataTypes.pressureDoubleByte:
          const pressure = [];
          pressure.sum = 0;
          for (let index = 0; index < 16; index++) {
            let value;
            if (
              pressureSensorDataType ==
              this.PressureDataTypes.pressureSingleByte
            ) {
              value = dataView.getUint8(byteOffset++);
            } else {
              value = dataView.getUint16(byteOffset, true);
              byteOffset += 2;
            }
            pressure.sum += value;

            const { x, y } = this.getPressurePosition(
              index,
              this.isRightInsole
            );
            pressure[index] = { x, y, value };
          }

          const centerOfMass = pressure.reduce(
            (centerOfMass, sensor) => {
              const { value } = sensor;
              const weight = value / pressure.sum || 0;
              sensor.weight = weight;

              const { x, y } = sensor;
              centerOfMass.x += x * weight;
              centerOfMass.y += y * weight;

              return centerOfMass;
            },
            { x: 0, y: 0 }
          );

          const heelToToe = 1 - centerOfMass.y;

          let mass = pressure.sum;
          if (
            pressureSensorDataType == this.PressureDataTypes.pressureSingleByte
          ) {
            mass /= 2 ** 8 * 16;
          } else {
            mass /= 2 ** 12 * 16;
          }

          Object.assign(pressure, { mass, centerOfMass, heelToToe });
          this.pressure = pressure;

          this.dispatchEvent({
            type: "pressure",
            message: {
              timestamp,
              pressure,
            },
          });

          this.dispatchEvent({
            type: pressureSensorDataTypeString,
            message: {
              timestamp,
              [pressureSensorDataTypeString]: pressure,
              pressure,
            },
          });

          this.dispatchEvent({
            type: "mass",
            message: {
              timestamp,
              mass,
            },
          });
          this.dispatchEvent({
            type: "centerOfMass",
            message: {
              timestamp,
              centerOfMass,
            },
          });
          this.dispatchEvent({
            type: "heelToToe",
            message: {
              timestamp,
              heelToToe,
            },
          });
          break;
        case this.PressureDataTypes.centerOfMass:
          {
            const centerOfMass = {
              x: dataView.getFloat32(byteOffset, true),
              y: dataView.getFloat32(byteOffset + 4, true),
            };

            this.pressure.centerOfMass = centerOfMass;
            byteOffset += 4 * 2;

            this.dispatchEvent({
              type: "centerOfMass",
              message: {
                timestamp,
                centerOfMass,
              },
            });
            break;
          }
          break;
        case this.PressureDataTypes.mass:
          {
            let mass = dataView.getUint32(byteOffset, true);
            mass *= scalar;
            this.pressure.mass = mass;
            byteOffset += 4;

            this.dispatchEvent({
              type: "mass",
              message: {
                timestamp,
                mass,
              },
            });
          }
          break;
        case this.PressureDataTypes.heelToToe:
          {
            const heelToToe = 1 - dataView.getFloat64(byteOffset, true);
            this.pressure.heelToToe = heelToToe;
            byteOffset += 8;

            this.dispatchEvent({
              type: "heelToToe",
              message: {
                timestamp,
                heelToToe,
              },
            });
          }
          break;
        default:
          throw `undefined pressure sensor data type ${pressureSensorDataType}`;
          break;
      }
    }
    return byteOffset;
  }

  get Types() {
    return this.constructor.Types;
  }
  get TypeStrings() {
    return this.constructor.TypeStrings;
  }

  get SensorTypes() {
    return this.constructor.SensorTypes;
  }
  get SensorTypeStrings() {
    return this.constructor.SensorTypeStrings;
  }

  get SensorDataTypes() {
    return this.constructor.SensorDataTypes;
  }
  get SensorDataTypeStrings() {
    return this.constructor.SensorDataTypeStrings;
  }

  isValidType(type) {
    return type in this.TypeStrings;
  }
  isValidSensorType(sensorType) {
    return sensorType in this.SensorTypeStrings;
  }
  isValidSensorDataType(sensorDataType, sensorType) {
    return (
      this.isValidSensorType(sensorType) &&
      sensorDataType in this.SensorDataTypes[this.SensorTypeStrings[sensorType]]
    );
  }

  get MotionCalibrationTypes() {
    return this.constructor.MotionCalibrationTypes;
  }
  get MotionCalibrationTypeStrings() {
    return this._isUsingBNO08x
      ? this.constructor._MotionCalibrationTypeStrings
      : this.constructor.MotionCalibrationTypeStrings;
  }

  get MotionCalibrationValues() {
    return this.constructor.MotionCalibrationValues;
  }
  get MotionCalibrationValueStrings() {
    return this.constructor.MotionCalibrationValueStrings;
  }

  get MotionDataTypes() {
    return this.constructor.MotionDataTypes;
  }
  get MotionDataTypeStrings() {
    return this.constructor.MotionDataTypeStrings;
  }

  get MotionDataScalars() {
    return this._isUsingBNO08x
      ? this.constructor._MotionDataScalars
      : this.constructor.MotionDataScalars;
  }

  get PressureDataTypes() {
    return this.constructor.PressureDataTypes;
  }
  get PressureDataTypeStrings() {
    return this.constructor.PressureDataTypeStrings;
  }

  get PressureDataScalars() {
    return this.constructor.PressureDataScalars;
  }

  get PressurePositions() {
    return this.constructor.PressurePositions;
  }
  getPressurePosition(index, isRight = false) {
    let { x, y } = this.PressurePositions[index];
    if (isRight) {
      x = 1 - x;
    }
    return { x, y };
  }

  get InsoleCorrectionQuaternions() {
    return this.constructor.InsoleCorrectionQuaternions;
  }
  get insoleCorrectionQuaternion() {
    let side;
    if (this._isUsingBNO080) {
      side = !this.isRightInsole ? "right" : "left";
    } else {
      side = this.isRightInsole ? "right" : "left";
    }
    return this.InsoleCorrectionQuaternions[side];
  }

  get bno080CorrectionQuaternion() {
    return this.constructor.bno080CorrectionQuaternion;
  }
  get bno085CorrectionQuaternions() {
    return this.constructor.bno085CorrectionQuaternions;
  }
  get bno085CorrectionQuaternion() {
    if (this.isInsole) {
      return this.isRightInsole
        ? this.bno085CorrectionQuaternions.insoles.right
        : this.bno085CorrectionQuaternions.insoles.left;
    } else {
      return this.bno085CorrectionQuaternions.motionModule;
    }
  }

  _getRawMotionData(dataView, offset, size) {
    return Array.from(
      new Int16Array(dataView.buffer.slice(offset, offset + size))
    );
  }

  _parseMotionVector(dataView, offset, scalar = 1) {
    const vector = new THREE.Vector3();
    const x = dataView.getInt16(offset, true);
    const y = dataView.getInt16(offset + 2, true);
    const z = dataView.getInt16(offset + 4, true);

    if (this._isUsingBNO080) {
      if (this.isInsole) {
        if (this.isRightInsole) {
          vector.set(z, -x, y);
        } else {
          vector.set(-z, -x, -y);
        }
      } else {
        vector.set(-y, z, x);
      }
    } else if (this._isUsingBNO085) {
      if (this.isInsole) {
        if (this.isRightInsole) {
          vector.set(z, x, y);
        } else {
          vector.set(-z, x, -y);
        }
      } else {
        vector.set(-y, -z, -x);
      }
    } else {
      if (this.isInsole) {
        if (this.isRightInsole) {
          vector.set(z, y, x);
        } else {
          vector.set(-z, y, -x);
        }
      } else {
        vector.set(x, -z, -y);
      }
    }

    vector.multiplyScalar(scalar);
    return vector;
  }
  _parseMotionEuler(dataView, offset, scalar = 1) {
    const euler = new THREE.Euler();

    let x = dataView.getInt16(offset, true) * scalar;
    let y = dataView.getInt16(offset + 2, true) * scalar;
    let z = dataView.getInt16(offset + 4, true) * scalar;

    if (!this._isUsingBNO08x) {
      x = THREE.Math.degToRad(x);
      y = THREE.Math.degToRad(y);
      z = THREE.Math.degToRad(z);
    }

    if (this._isUsingBNO080) {
      if (this.isInsole) {
        if (this.isRightInsole) {
          euler.set(-z, x, -y, "YXZ");
        } else {
          euler.set(z, x, y, "YXZ");
        }
      } else {
        euler.set(y, -z, -x, "YXZ");
      }
    } else if (this._isUsingBNO085) {
      if (this.isInsole) {
        if (this.isRightInsole) {
          euler.set(z, y, x, "YXZ");
        } else {
          euler.set(-z, y, -x, "YXZ");
        }
      } else {
        euler.set(y, -z, x, "YXZ");
      }
    } else {
      if (this.isInsole) {
        if (this.isRightInsole) {
          euler.set(-z, -y, -x, "YXZ");
        } else {
          euler.set(z, -y, x, "YXZ");
        }
      } else {
        euler.set(-x, z, y, "YXZ");
      }
    }

    return euler;
  }

  _parseMotionQuaternion(dataView, offset, scalar = 1) {
    const quaternion = new THREE.Quaternion();
    const w = dataView.getInt16(offset, true) * scalar;
    const x = dataView.getInt16(offset + 2, true) * scalar;
    const y = dataView.getInt16(offset + 4, true) * scalar;
    const z = dataView.getInt16(offset + 6, true) * scalar;

    if (this._isUsingBNO080) {
      quaternion.set(-z, -y, -w, -x);
      //quaternion.multiply(this.bno080CorrectionQuaternion);
    } else if (this._isUsingBNO085) {
      quaternion.set(-y, -w, -x, z);
    } else {
      quaternion.set(-y, -w, -x, z);
    }

    if (this.isInsole) {
      quaternion.multiply(this.insoleCorrectionQuaternion);
    }

    if (this._isUsingBNO085) {
      quaternion.multiply(this.bno085CorrectionQuaternion);
    }

    return quaternion;
  }

  _parseBatteryLevel(dataView, byteOffset = 0) {
    this._batteryLevel = dataView.getUint8(byteOffset++);
    this._onBatteryLevel();
    return byteOffset;
  }
  _onBatteryLevel() {
    this.log(`Got battery level`, this._batteryLevel);
    this.dispatchEvent({
      type: "batterylevel",
      message: { batteryLevel: this._batteryLevel },
    });
  }

  // file transfer
  static FILE_TRANSFER_COMMANDS = {
    START_FILE_SEND: 0,
    START_FILE_RECEIVE: 1,
    CANCEL_FILE_TRANSFER: 2,
    REMOVE_FILE: 3,
    FORMAT_FILESYSTEM: 4,
  };
  get FILE_TRANSFER_COMMANDS() {
    return this.constructor.FILE_TRANSFER_COMMANDS;
  }
  isValidFileTransferCommand(command) {
    return command in this.FILE_TRANSFER_COMMANDS;
  }

  static FILE_TRANSFER_STATUSES = {
    IDLE: 0,
    SENDING_FILE: 1,
    RECEIVING_FILE: 2,
    REMOVING_FILE: 3,
    FORMATTING_FILESYSTEM: 4,
  };
  get FILE_TRANSFER_STATUSES() {
    return this.constructor.FILE_TRANSFER_STATUSES;
  }

  _onFileTransferStatusUpdate() {
    this.log(`file transfer status: ${this._fileTransferStatus}`);
    this.dispatchEvent({
      type: "filetransferstatus",
      message: { fileTransferStatus: this._fileTransferStatus },
    });
  }
  _onFileTransferTypeUpdate() {
    this.log(`file transfer type: "${this._fileTransferType}"`);
    this.dispatchEvent({
      type: "filetransfertype",
      message: { fileTransferType: this._fileTransferType },
    });
  }

  _throttle(functionToThrottle, minimumInterval, optionalContext) {
    var lastTime;
    if (optionalContext) {
      functionToThrottle = module.exports.bind(
        functionToThrottle,
        optionalContext
      );
    }
    return function () {
      var time = Date.now();
      var sinceLastTime =
        typeof lastTime === "undefined" ? minimumInterval : time - lastTime;
      if (typeof lastTime === "undefined" || sinceLastTime >= minimumInterval) {
        lastTime = time;
        functionToThrottle.apply(null, arguments);
      }
    };
  }
}
Object.assign(BaseMission, {
  textEncoder: new TextEncoder(),
  textDecoder: new TextDecoder(),

  SensorTypeStrings: ["MOTION", "PRESSURE"],

  TypeStrings: ["MOTION_MODULE", "LEFT_INSOLE", "RIGHT_INSOLE"],

  MotionCalibrationTypeStrings: [
    "system",
    "gyroscope",
    "accelerometer",
    "magnetometer",
  ],
  _MotionCalibrationTypeStrings: [
    "accelerometer",
    "gyroscope",
    "magnetometer",
    "quaternion",
  ],
  MotionCalibrationValueStrings: ["unreliable", "low", "medium", "high"],

  MotionDataTypeStrings: [
    "acceleration",
    "gravity",
    "linearAcceleration",
    "rotationRate",
    "magnetometer",
    "quaternion",
  ],

  MotionDataScalars: {
    acceleration: 1 / 100,
    gravity: 1 / 100,
    linearAcceleration: 1 / 100,
    rotationRate: 1 / 16,
    magnetometer: 1 / 16,
    quaternion: 1 / (1 << 14),
  },
  _MotionDataScalars: {
    acceleration: 2 ** -8,
    gravity: 2 ** -8,
    linearAcceleration: 2 ** -8,
    rotationRate: 2 ** -9,
    magnetometer: 2 ** -4,
    quaternion: 2 ** -14,
  },

  PressureDataTypeStrings: [
    "pressureSingleByte",
    "pressureDoubleByte",
    "centerOfMass",
    "mass",
    "heelToToe",
  ],

  PressureDataScalars: {
    pressureSingleByte: 1 / 2 ** 8,
    pressureDoubleByte: 1 / 2 ** 12,
    mass: 1 / 2 ** 16,
  },

  PressurePositions: [
    [59.55, 32.3],
    [33.1, 42.15],

    [69.5, 55.5],
    [44.11, 64.8],
    [20.3, 71.9],

    [63.8, 81.1],
    [41.44, 90.8],
    [19.2, 102.8],

    [48.3, 119.7],
    [17.8, 130.5],

    [43.3, 177.7],
    [18.0, 177.0],

    [43.3, 200.6],
    [18.0, 200.0],

    [43.5, 242.0],
    [18.55, 242.1],

    /*
    Right Insole
       0 1
      2 3 4
       5 6 7
        8 9
    
        10 11
        12 13
    
        1$ 15
    */

    /*
    Left Insole
       1 0
      4 3 2
     7 6 5
     9 8
    
    11 10
    13 12
    
    15 14
    */
  ].map(([x, y]) => {
    x /= 93.257; // width (mm)
    y /= 265.069; // height (mm)
    return { x, y };
  }),

  InsoleCorrectionQuaternions: {
    left: new THREE.Quaternion(),
    right: new THREE.Quaternion(),
  },
  bno080CorrectionQuaternion: new THREE.Quaternion(),
  bno085CorrectionQuaternions: {
    motionModule: new THREE.Quaternion(),
    insoles: {
      left: new THREE.Quaternion(),
      right: new THREE.Quaternion(),
    },
  },
});

[
  "Type",
  "MotionCalibrationType",
  "MotionCalibrationValue",
  "MotionDataType",
  "PressureDataType",
  "SensorType",
].forEach((name) => {
  BaseMission[name + "s"] = BaseMission[name + "Strings"].reduce(
    (object, name, index) => {
      object[name] = index;
      return object;
    },
    {}
  );
});
BaseMission.SensorDataTypes = {
  MOTION: BaseMission.MotionDataTypes,
  PRESSURE: BaseMission.PressureDataTypes,
};
BaseMission.SensorDataTypeStrings = {
  MOTION: BaseMission.MotionDataTypeStrings,
  PRESSURE: BaseMission.PressureDataTypeStrings,
};
//Object.assign(BaseMission.prototype, THREE.EventDispatcher.prototype);

{
  const bno080CorrectionEuler = new THREE.Euler();
  bno080CorrectionEuler.set(0, -Math.PI / 2, 0, "YXZ");
  BaseMission.bno080CorrectionQuaternion.setFromEuler(bno080CorrectionEuler);

  const insoleCorrectionEuler = new THREE.Euler();
  insoleCorrectionEuler.set(0, Math.PI / 2, -Math.PI / 2);
  BaseMission.InsoleCorrectionQuaternions.right.setFromEuler(
    insoleCorrectionEuler
  );

  insoleCorrectionEuler.set(-Math.PI / 2, -Math.PI / 2, 0);
  BaseMission.InsoleCorrectionQuaternions.left.setFromEuler(
    insoleCorrectionEuler
  );
}
{
  const bno085CorrectionEuler = new THREE.Euler();
  bno085CorrectionEuler.set(0, -Math.PI / 2, 0);
  BaseMission.bno085CorrectionQuaternions.motionModule.setFromEuler(
    bno085CorrectionEuler
  );

  bno085CorrectionEuler.set(0, Math.PI, 0);
  BaseMission.bno085CorrectionQuaternions.insoles.left.setFromEuler(
    bno085CorrectionEuler
  );
  bno085CorrectionEuler.set(0, Math.PI, 0);
  BaseMission.bno085CorrectionQuaternions.insoles.right.setFromEuler(
    bno085CorrectionEuler
  );
}

class BaseMissions extends THREE.EventDispatcher {
  log() {
    if (this.isLoggingEnabled) {
      console.groupCollapsed(`[${this.constructor.name}]`, ...arguments);
      console.trace(); // hidden in collapsed group
      console.groupEnd();
    }
  }

  constructor() {
    super();

    this.left = new this.constructor.MissionDevice();
    this.right = new this.constructor.MissionDevice();

    this.isLoggingEnabled = !true;

    this.sides = ["left", "right"];

    this.pressure = {
      sum: 0,
      centerOfMass: { x: 0, y: 0 },
      mass: { left: 0, right: 0 },
    };

    this.sides.forEach((side) => {
      this[side].addEventListener("pressure", (event) => {
        const { timestamp } = event.message;
        this._updatePressure({ side, timestamp });
      });
    });
  }

  replaceInsole(device) {
    if (device.isInsole) {
      const side = device.insoleSide;
      const existingDevice = this[side];
      if (existingDevice != device) {
        this[side] = device;
        device.addEventListener("pressure", (event) => {
          const { timestamp } = event.message;
          this._updatePressure({ side, timestamp });
        });
      }
    }
  }

  _updatePressure({ side, timestamp }) {
    const pressure = {
      sum: 0,
      centerOfMass: { x: 0, y: 0 },
      mass: { left: 0, right: 0 },
    };
    pressure.sum = this.left.pressure.sum + this.right.pressure.sum;

    this.sides.forEach((side) => {
      pressure.mass[side] = this[side].pressure.sum / pressure.sum || 0;
    });

    pressure.centerOfMass.x = pressure.mass.right;
    pressure.centerOfMass.y =
      this.left.pressure.centerOfMass.y * pressure.mass.left +
        this.right.pressure.centerOfMass.y * pressure.mass.right || 0;
    this.pressure = pressure;
    this.dispatchEvent({
      type: "pressure",
      message: { timestamp, side, pressure },
    });
  }
}
//Object.assign(BaseMissions.prototype, THREE.EventDispatcher.prototype);
