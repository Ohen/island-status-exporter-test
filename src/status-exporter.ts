require('source-map-support').install();
import * as _ from 'lodash';
import * as usage from 'usage';
import fs = require('fs-extra');

export interface CollectData {
  totalUsedTime?: number,
  count?: number,
  requestCount?: number,
  requestStartedAt?: number,
  transactionCount?: number,
  executionStartedAt?: number
}

let fileName: string;
let statusExport: boolean;
let cacheData: { [type: string]: CollectData } = {};
let tmpData: { [type: string]: CollectData } = {};
let calculatedData = {};

async function moveJsonFile(oldPath, newPath): Promise<any> {
  return await fs.move(oldPath, newPath, { clobber: true });
}

function clearData() {
  cacheData = {};
  calculatedData = {};
}

function setDecimalPoint(int: number): number {
  return Number(int.toFixed(2));
}

function makeFileName(args: { name?: string, hostname?: string, servicename?: string }): string {
  args = args || {};
  if (args.name && !args.name.match('.json')) {
    return args.name + '.json';
  }
  if (args.hostname || args.servicename) {
    args.name = _.values(args).join('.') + '.json';
  }
  return args.name || 'status.json';
}

async function lookupProcess(): Promise<any> {
  const usageOptions = { keepHistory: true };
  return new Promise((res, rej) => {
    usage.lookup(process.pid, usageOptions, function (err, result) {
      if (err) {
        throw new Error('Failed lookup process information' + err);
      }

      calculatedData['cpu'] = setDecimalPoint(result.cpu);
      calculatedData['memory'] = setDecimalPoint((result.memory / 1024 / 1024)); //MB
      return res();
    });
  })
}

export namespace StatusExporter {
  export function initialize(using: boolean, option: { name?: string, hostname?: string, servicename?: string }) {
    option = option || {};
    statusExport = using;
    fileName = makeFileName(option);
    return fileName;
  }

  export async function saveStatusJsonFile() {
    await calculateStatus();
    calculatedData['savedAt'] = new Date();
    await fs.writeFileSync(fileName + '.tmp', JSON.stringify(calculatedData, null, 2), 'utf8');
    return await moveJsonFile(fileName + '.tmp', fileName);
  }

  export async function calculateStatus() {
    if (!statusExport) return;
    tmpData = _.clone(cacheData);
    clearData();
    await lookupProcess();
    return await _.forEach(tmpData, async (value, type) => {
      if (!calculatedData[type]) calculatedData[type] = {};
      if (value.count) {
        const measuringTime = ((+new Date() - value.executionStartedAt) / 1000) || 0.001;
        const tps = setDecimalPoint(value.count / measuringTime);
        calculatedData[type]['tps'] = tps;
      }

      if (value.requestCount) {
        const measuringTime = ((+new Date() - value.requestStartedAt) / 1000) || 0.001;
        const rps = setDecimalPoint(value.requestCount / measuringTime);
        calculatedData[type]['rps'] = rps;
      }

      if (!value.totalUsedTime) return;
      const avgTime = value.totalUsedTime / value.count;
      switch (type) {
        case 'event':
          calculatedData[type]['AvgReceiveMessageTimeByMQ'] = setDecimalPoint(avgTime);
          break;
        case 'endpoint':
        case 'rpc':
          calculatedData[type]['AvgExecutionTime'] = setDecimalPoint(avgTime);
          break;
        default:
          calculatedData[type]['AvgTime'] = setDecimalPoint(avgTime);
      }
    });
  }

  export async function collectRequestCount(type) {
    if (!statusExport) return;
    if (!cacheData[type]) {
      cacheData[type] = cacheData[type] || {
        requestCount: 1, requestStartedAt: +new Date()
      };
      return;
    }
    if (!cacheData[type]['requestCount']) {
      cacheData[type]['requestCount'] = 1;
      cacheData[type]['requestStartedAt'] = +new Date();
      return;
    }
    ++cacheData[type]['requestCount'];
  }

  export async function collectPerformanceData(type, time) {
    if (!statusExport) return;
    if (!cacheData[type]) {
      cacheData[type] = cacheData[type] || {
        totalUsedTime: time, count: 1, executionStartedAt: +new Date()
      };
      return;
    }
    if (!cacheData[type]['count']) {
      cacheData[type]['count'] = 1;
      cacheData[type]['executionStartedAt'] = +new Date();
      cacheData[type]['totalUsedTime'] = time;
      return;
    }

    ++cacheData[type]['count'];
    cacheData[type]['totalUsedTime'] += time;
  }
}
