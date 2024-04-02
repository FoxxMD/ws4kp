// let audioFiles = process.env.AUDIO_FILES;
let audioFiles = [];

const howlAudio = new Howl({
	src: AUDIO_FILES,
	autoplay: true,
});

export {
	howlAudio,
};
