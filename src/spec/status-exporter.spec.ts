import fs = require('fs-extra');
import { StatusExporter } from '../status-exporter';

function spec(fn) {
	return async (done) => {
		try {
			await fn();
			done();
		} catch (e) {
			done(e);
		}
	}
}
const fileName = StatusExporter.initialize(true, { servicename: 'STATUS_EXPORTER', hostname: 'TEST' });

describe('StatusExporter', () => {
	it('clear Data after Save Status.json', spec(async () => {
		const name = 'getRpc';
		const type = 'rpc';

		StatusExporter.pushTransactionData(type, name);
		StatusExporter.pushTransactionData(type, name);
		StatusExporter.pushTransactionData(type, name);

		StatusExporter.pushTimeData(type, name, 200);
		StatusExporter.pushTimeData(type, name, 200);
		StatusExporter.pushTimeData(type, name, 200);
		await StatusExporter.saveStatusJsonFile();
		const result1 = await fs.readFileSync(fileName, 'utf8');

		await StatusExporter.saveStatusJsonFile();
		const result2 = await fs.readFileSync(fileName, 'utf8');
	}));

	it('should different cache Data', spec(async () => {
		const name = 'getRpc';
		const type = 'rpc';
		
		StatusExporter.pushTransactionData(type, name);
		StatusExporter.pushTransactionData(type, name);
		StatusExporter.pushTransactionData(type, name);

		StatusExporter.pushTimeData(type, name, 200);
		StatusExporter.pushTimeData(type, name, 200);
		StatusExporter.pushTimeData(type, name, 200);

		const name2 = 'eventName';
		const type2 = 'event';
		StatusExporter.pushTransactionAndTimeData(type2, name2, 1000);
		StatusExporter.pushTransactionAndTimeData(type2, name2, 1000);
		StatusExporter.pushTransactionAndTimeData(type2, name2, 1000);

		await StatusExporter.saveStatusJsonFile();
		const result1 = await fs.readFileSync(fileName, 'utf8');
	}));

	afterAll(async (done) => {
		// await fs.removeSync(fileName);
		done();
  });
});
