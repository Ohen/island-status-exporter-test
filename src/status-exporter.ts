require('source-map-support').install();
import * as _ from 'lodash';
import fs = require('fs-extra');

const fileName = (process.env.STATUS_FILE_NAME || 'status') + '.json';

let cacheData: { [type: string]: { [name: string]: { totalResponseTime: number, count: number, startAt: number } } } = {};
let data = {};

export namespace StatusExporter {
  export async function saveStatusJsonFile() {
    await calculateAvgStatus();
    await fs.writeFileSync(fileName + '.tmp', JSON.stringify(data, null, 2), 'utf8'); // 쓴게 완료 되면 
    clearData();
    return await moveJsonFile(fileName + '.tmp', fileName);
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
    return await _.forEach(cacheData, async (value, type) => {
      await _.forEach(value, (v, k) => {
        const AvgResponseTime = v.totalResponseTime / v.count;
        const durateTime = (parseInt((+new Date()/1000).toFixed()) - v.startAt) || 1; 
        const TPS = v.count / durateTime;
        if(!data[type]) data[type] = {};

        data[type][k] = {
          AvgResponseTime,
          TPS
        };
      });
    });
  }

  export async function pushData(type, name, time) {
    if (!cacheData[type] || !cacheData[type][name]) {
      cacheData[type] = cacheData[type] || {};
      if (!cacheData[type][name]) cacheData[type][name] = { totalResponseTime: time, count: 1, startAt: parseInt((+new Date()/1000).toFixed()) };
      return;
    }

    const preData = cacheData[type][name];
    cacheData[type][name]['count'] = ++preData.count;
    cacheData[type][name]['totalResponseTime'] = preData.totalResponseTime + time;
  };
}
