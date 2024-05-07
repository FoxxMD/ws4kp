async function getAudioFiles() {
	try {
		const res = await fetch('/audiolisting');
		if (!res.ok) {
			throw new Error(`HTTP error. status: ${res.status}`);
		}
		let AUDIO_FILES_STRING = '';
		let isJson = res.headers.get('content-type').includes('json');
		if(!isJson) {
			AUDIO_FILES_STRING = await res.text();
			AUDIO_FILES_STRING = AUDIO_FILES_STRING.replace(/'+/g, '');
			if(!AUDIO_FILES_STRING.includes('.json')) {
				console.log('Audio listing:', AUDIO_FILES_STRING);
				return AUDIO_FILES_STRING;
			} else {
				const jsonRes = await (await fetch(AUDIO_FILES_STRING)).json()
				console.log('Audio listing:');
				console.log(jsonRes);
				return jsonRes;
			}
		} else {
			console.log('Audio listing:');
			console.log(jsonRes);
			return res.json();
		}

	} catch (error) {
		console.error('Failed to fetch audio listing:', error);
	}

	return '';
}

const fisheryates = (arr) => {
	for (let i = arr.length - 1; i >= 0; i -= 1) {
		const temp = Math.floor(Math.random() * (i + 1));
		[arr[temp], arr[i]] = [arr[i], arr[temp]];
	}
	return arr;
};

const randomIntFromInterval = (min, max) => { // min and max included
	return Math.floor(Math.random() * (max - min + 1) + min);
}

const setupAudio = () => {
	getAudioFiles().then((data) => {
		let AUDIO_FILES = [];

		if(Array.isArray(data)) {
			AUDIO_FILES = data;
		} else {
			AUDIO_FILES = fisheryates(data.split(','));
		}

		if(AUDIO_FILES.length === 0) {
			return;
		}

		let index = randomIntFromInterval(0, AUDIO_FILES.length);
		let alreadyPlayed = [index];

		const audio = document.querySelector('#twcAudio');
		audio.src = AUDIO_FILES[index];

		audio.addEventListener('ended', () => {
			if(alreadyPlayed.length === AUDIO_FILES.length) {
				alreadyPlayed = [];
			}
			let newIndex = randomIntFromInterval(0, AUDIO_FILES.length);
			while(alreadyPlayed.includes(newIndex)) {
				newIndex = randomIntFromInterval(0, AUDIO_FILES.length);
			}
			audio.src = AUDIO_FILES[newIndex];
			alreadyPlayed.push(newIndex)
			audio.play();
		});
	});
};

setupAudio();
