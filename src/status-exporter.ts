require('source-map-support').install();
import * as _ from 'lodash';
import * as usage from 'usage';
import fs = require('fs-extra');

let fileName: string;
let statusExport: boolean;
let cacheData: { [type: string]: { [name: string]: { totalTime?: number, count?: number, startAt: number } } } = {};
let data = {};

export namespace StatusExporter {
  export function initialize(using: boolean, name?: string){
    statusExport = using;
    if(name && !name.match('.json')) name += '.json';
    fileName = (name || 'status.json');
  }

  export async function saveStatusJsonFile() {
    console.log('============================ SVAE FILE ====================', fileName);
    await lookupProcess();
    await calculateAvgStatus();
    await fs.writeFileSync(fileName + '.tmp', JSON.stringify(data, null, 2), 'utf8');
    clearData();
    return await moveJsonFile(fileName + '.tmp', fileName);
  }

  async function lookupProcess() {
    const usageOptions = { keepHistory: true };
    return new Promise((res, rej) => {
        usage.lookup(process.pid, usageOptions, function(err, result) {
          if (err) {
              console.log("error:" + err + '\n');
              return;
          }
          data['cpu'] = (result.cpu).toFixed(2);
          data['memory'] = (result.memory / 1024 / 1024).toFixed(2); //MB
          return res();
      });
    })
  }

  async function moveJsonFile(oldPath, newPath) {
    console.log('move ', oldPath, newPath);
    return await fs.move(oldPath, newPath, { clobber: true });
  }

  function clearData() {
    cacheData = {};
    data = {};
  }

  export async function calculateAvgStatus() {
    if (!statusExport) return;
    return await _.forEach(cacheData, async (value, type) => {
      await _.forEach(value, (v, k) => {
        let AvgTime;
        if(v.totalTime) AvgTime = v.totalTime / v.count;
        console.log('=================================== spend Time Ms: ', (+new Date() - v.startAt))
        const measuringTime = ((+new Date() - v.startAt) / 1000) || 0.001;
        const TPS = v.count / measuringTime;
        if(!data[type]) data[type] = {};

        data[type][k] = {
          TPS
        };
        switch (type){
          case 'event':
            data[type][k]['AvgReceiveMessageTimeByMQ'] = AvgTime;
            break;
          case 'rpc':
            data[type][k]['AvgResponseTime'] = AvgTime;
            break;
          default:
            data[type][k]['AvgTime'] = AvgTime;
        }
      });
    });
  }

  export async function pushTransactionData(type, name) {
    if (!statusExport) return;
    if (!cacheData[type] || !cacheData[type][name]) {
      cacheData[type] = cacheData[type] || {};
      if (!cacheData[type][name]) cacheData[type][name] = { count: 1, startAt: +new Date() };
      return;
    }
    cacheData[type][name]['count'] = cacheData[type][name]['count'] + 1;
  };

  export async function pushTimeData(type, name, time){
    if (!statusExport) return;
    if (!cacheData[type] || !cacheData[type][name]) {
      cacheData[type] = cacheData[type] || {};
      if (!cacheData[type][name]) cacheData[type][name] = { totalTime: time, startAt: +new Date() };
      return;
    }

    cacheData[type][name]['totalTime'] = Number(cacheData[type][name]['totalTime'] || 0) + time;
  }
 
  export async function pushTransactionAndTimeData(type, name, time){
    if (!statusExport) return;
    if (!cacheData[type] || !cacheData[type][name]) {
      cacheData[type] = cacheData[type] || {};
      if (!cacheData[type][name]) cacheData[type][name] = { totalTime: time, count: 1, startAt: +new Date() };
      return;
    }

    ++cacheData[type][name]['count'];
    cacheData[type][name]['totalTime'] = Number(cacheData[type][name]['totalTime'] || 0) + time;
  }
}
