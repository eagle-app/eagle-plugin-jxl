module.exports = async ({ src, dest, item, startAt, plugin }) => {

	global.plugin = plugin;

	const fs = require('fs');
	const jxl2canvas = require(plugin.path + '/jxl2canvas.js');

	return new Promise(async (resolve, reject) => {

		try {
			const { canvas, width, height } = await jxl2canvas(src, plugin);

			const base64 = canvas.toDataURL();

			// check base64 is valid and not empty
			if (!base64 || base64.length < 10) {
				return reject('Invalid base64');
			}

			fs.writeFileSync(dest, base64.replace(/^data:image\/png;base64,/, ''), 'base64');

			item.height = height || item.height;
			item.width = width || item.width;
			
			resolve(item);
		}
		catch (err) {
			return reject(err);
		}
	});
}