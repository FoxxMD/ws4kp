// express
// eslint-disable-next-line import/no-extraneous-dependencies
const express = require('express');

const app = express();
const port = process.env.WS4KP_PORT ?? 8080;
const path = require('path');
// load audio files paths from env
const AUDIO_FILES_STRING = process.env.AUDIO_FILES ?? '';

const fisheryates = (arr) => {
	for (let i = arr.length - 1; i >= 0; i -= 1) {
		const temp = Math.floor(Math.random() * (i + 1));
		[arr[temp], arr[i]] = [arr[i], arr[temp]];
	}
	return arr;
};

// eslint-disable-next-line no-unused-vars
const AUDIO_FILES = fisheryates(AUDIO_FILES_STRING.split(','));
console.log(`audio listing: ${AUDIO_FILES}`);

// template engine
app.set('view engine', 'ejs');

// cors pass through
const fs = require('fs');
const corsPassThru = require('./cors');
const radarPassThru = require('./cors/radar');
const outlookPassThru = require('./cors/outlook');

// cors pass-thru to api.weather.gov
app.get('/stations/*', corsPassThru);
app.get('/Conus/*', radarPassThru);
app.get('/products/*', outlookPassThru);

// version
const { version } = JSON.parse(fs.readFileSync('package.json'));

const index = (req, res) => {
	res.render(path.join(__dirname, 'views/index'), {
		production: false,
		version,
		AUDIO_FILES,
	});
};

// debugging
if (process.env?.DIST === '1') {
	// distribution
	app.use('/audio', express.static(path.join(__dirname, './server/audio')));
	app.use('/images', express.static(path.join(__dirname, './server/images')));
	app.use('/fonts', express.static(path.join(__dirname, './server/fonts')));
	app.use('/scripts', express.static(path.join(__dirname, './server/scripts')));
	app.use('/', express.static(path.join(__dirname, './dist')));
} else {
	// debugging
	app.get('/index.html', index);
	app.get('/', index);
	app.get('*', express.static(path.join(__dirname, './server')));
}

const server = app.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});

// graceful shutdown
process.on('SIGINT', () => {
	server.close(() => {
		console.log('Server closed');
	});
});
