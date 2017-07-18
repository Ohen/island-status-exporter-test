import fs = require('fs-extra');
import { StatusExporter } from '../status-exporter';

const fileName = (process.env.STATUS_FILE_NAME || 'status') + '.json';

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

describe('StatusExporter', () => {
	it('should push currently tps', spec(async () => {
		const name = 'getToken';
		const name2 = 'setProperty';
		const type = 'rpc';
		StatusExporter.pushData(type, name, 10);
		StatusExporter.pushData(type, name, 10);
		StatusExporter.pushData(type, name, 10);
		StatusExporter.pushData(type, name, 1000);
		StatusExporter.pushData(type, name, 1000);
		StatusExporter.pushData(type, name, 1000);
		StatusExporter.pushData(type, name2, 20);
		StatusExporter.pushData(type, name2, 20);
		StatusExporter.pushData(type, name2, 20);
		await StatusExporter.saveStatusJsonFile();
		const result = await fs.readFileSync(fileName, 'utf8');
		expect(result).toBeDefined();
	}));

	it('clear Data after Save Status.json', spec(async () => {
		const name = 'getToken';
		const name2 = 'setProperty';
		const type = 'rpc';
		StatusExporter.pushData(type, name, 10);
		StatusExporter.pushData(type, name, 10);
		StatusExporter.pushData(type, name, 10);
		StatusExporter.pushData(type, name, 1000);
		StatusExporter.pushData(type, name, 1000);
		StatusExporter.pushData(type, name, 1000);
		StatusExporter.pushData(type, name2, 20);
		StatusExporter.pushData(type, name2, 20);
		StatusExporter.pushData(type, name2, 20);
		await StatusExporter.saveStatusJsonFile();
		const result1 = await fs.readFileSync(fileName, 'utf8');

		await StatusExporter.saveStatusJsonFile();
		const result2 = await fs.readFileSync(fileName, 'utf8');
	}));

	it('should save json type Status.json', spec(async () => {
		const name = 'getToken';
		const name2 = 'setProperty';
		const type = 'rpc';
		StatusExporter.pushData(type, name, 10);
		StatusExporter.pushData(type, name, 10);
		StatusExporter.pushData(type, name, 10);
		StatusExporter.pushData(type, name, 1000);
		StatusExporter.pushData(type, name, 1000);
		StatusExporter.pushData(type, name, 1000);
		StatusExporter.pushData(type, name2, 20);
		StatusExporter.pushData(type, name2, 20);
		StatusExporter.pushData(type, name2, 20);
		await StatusExporter.saveStatusJsonFile();
		const result1 = await fs.readFileSync(fileName, 'utf8');
	}));
});
