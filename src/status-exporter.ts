require('source-map-support').install();
import * as _ from 'lodash';
import * as usage from 'usage';
import fs = require('fs-extra');

interface CollectData {
  totalTime?: number,
  count?: number,
  transactionCount?: number,
  startAt: number
}

let fileName: string;
let statusExport: boolean;
let cacheData: { [type: string]: { [name: string]: CollectData } } = {};
let tmpData = {};
let calculatedData = {};

async function moveJsonFile(oldPath, newPath): Promise<any> {
  console.log('move ', oldPath, newPath);
  return await fs.move(oldPath, newPath, { clobber: true });
}

function clearData() {
  cacheData = {};
  calculatedData = {};
}

function setDecimalPoint(int: number): number {
  return Number(int.toFixed(2));
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
    if (!option.name) option.name = option.hostname + '.' + option.servicename + '.' + 'status.json';
    console.log('file name', option.name);
    if (option.name && !option.name.match('.json')) option.name += '.json';
    fileName = (option.name || 'status.json');
    return fileName;
  }

  export async function saveStatusJsonFile() {
    await calculateAvgStatus();
    calculatedData['saveAt'] = new Date();
    await fs.writeFileSync(fileName + '.tmp', JSON.stringify(calculatedData, null, 2), 'utf8');
    return await moveJsonFile(fileName + '.tmp', fileName);
  }

  export async function calculateAvgStatus() {
    if (!statusExport) return;
    tmpData = _.clone(cacheData);
    clearData();
    await lookupProcess();
    return await _.forEach(tmpData, async (value, type) => {
      await _.forEach(value, (v, k) => {
        const transactionCount = v.transctionCount || v.count;
        const measuringTime = ((+new Date() - v.startAt) / 1000) || 0.001;
        const TPS = setDecimalPoint(transactionCount / measuringTime);
        if (!calculatedData[type]) calculatedData[type] = {};

        calculatedData[type][k] = {
          TPS
        };

        if (!v.totalTime) return;
        const avgTime = v.totalTime / v.count;
        switch (type) {
          case 'event':
            calculatedData[type][k]['AvgReceiveMessageTimeByMQ'] = setDecimalPoint(avgTime);
            break;
          case 'rpc':
            calculatedData[type][k]['AvgResponseTime'] = setDecimalPoint(avgTime);
            break;
          default:
            calculatedData[type][k]['AvgTime'] = setDecimalPoint(avgTime);
        }
      });
    });
  }

  export async function pushTransactionData(type, key) {
    if (!statusExport) return;
    if (!cacheData[type] || !cacheData[type][key]) {
      cacheData[type] = cacheData[type] || {};
      if (!cacheData[type][key]) cacheData[type][key] = { transactionCount: 1, startAt: +new Date() };
      return;
    }
    cacheData[type][key]['transactionCount'] = Number(cacheData[type][key]['transactionCount'] || 0) + 1;
  };

  export async function pushTimeData(type, key, time) {
    if (!statusExport) return;
    if (!cacheData[type] || !cacheData[type][key]) {
      cacheData[type] = cacheData[type] || {};
      if (!cacheData[type][key]) cacheData[type][key] = { totalTime: time, count: 1, startAt: +new Date() };
      return;
    }

    cacheData[type][key]['count'] = Number(cacheData[type][key]['count'] || 0) + 1;
    cacheData[type][key]['totalTime'] = Number(cacheData[type][key]['totalTime'] || 0) + time;
  }

  export async function pushTransactionAndTimeData(type, key, time) {
    if (!statusExport) return;
    if (!cacheData[type] || !cacheData[type][key]) {
      cacheData[type] = cacheData[type] || {};
      if (!cacheData[type][key]) cacheData[type][key] = { totalTime: time, count: 1, startAt: +new Date() };
      return;
    }

    ++cacheData[type][key]['count'];
    cacheData[type][key]['totalTime'] = Number(cacheData[type][key]['totalTime'] || 0) + time;
  }
}
