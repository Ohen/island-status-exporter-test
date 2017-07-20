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
	it('should save to measure Data', spec(async () => {
    const type = 'rpc';
    
    StatusExporter.collectRequestCount(type);
    StatusExporter.collectRequestCount(type);
    StatusExporter.collectRequestCount(type);
		StatusExporter.collectMeasureData(type, 1000);
		StatusExporter.collectMeasureData(type, 1000);
    StatusExporter.collectMeasureData(type, 1000);

		const event_type = 'event';
		StatusExporter.collectMeasureData(event_type, 100);
		StatusExporter.collectMeasureData(event_type, 13000);
		StatusExporter.collectMeasureData(event_type, 100);

		const push_type = 'push';
		StatusExporter.collectMeasureData(push_type, 100);
		StatusExporter.collectMeasureData(push_type, 13000);
		StatusExporter.collectMeasureData(push_type, 100);

		await StatusExporter.saveStatusJsonFile();
		const result1 = await fs.readFileSync(fileName, 'utf8');
	}));

	afterAll(async (done) => {
		// await fs.removeSync(fileName);
		done();
	});
});
