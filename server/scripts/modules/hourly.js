// hourly forecast list
/* globals WeatherDisplay, utils, STATUS, UNITS, navigation, icons, luxon */

// eslint-disable-next-line no-unused-vars
class Hourly extends WeatherDisplay {
	constructor(navId, elemId, defaultActive) {
		// special height and width for scrolling
		super(navId, elemId, 'Hourly Forecast', defaultActive);

		// set up the timing
		this.timing.baseDelay = 20;
		// 24 hours = 6 pages
		const pages = 4; // first page is already displayed, last page doesn't happen
		const timingStep = 75 * 4;
		this.timing.delay = [150 + timingStep];
		// add additional pages
		for (let i = 0; i < pages; i += 1) this.timing.delay.push(timingStep);
		// add the final 3 second delay
		this.timing.delay.push(150);
	}

	async getData(weatherParameters) {
		// super checks for enabled
		if (!super.getData(weatherParameters)) return;
		let forecast;
		try {
			// get the forecast
			forecast = await utils.fetch.json(weatherParameters.forecastGridData);
		} catch (e) {
			console.error('Get hourly forecast failed');
			console.error(e.status, e.responseJSON);
			this.setStatus(STATUS.failed);
			return;
		}

		this.data = await Hourly.parseForecast(forecast.properties);

		this.setStatus(STATUS.loaded);
		this.drawLongCanvas();
	}

	// extract specific values from forecast and format as an array
	static async parseForecast(data) {
		const temperature = Hourly.expand(data.temperature.values);
		const apparentTemperature = Hourly.expand(data.apparentTemperature.values);
		const windSpeed = Hourly.expand(data.windSpeed.values);
		const windDirection = Hourly.expand(data.windDirection.values);
		const skyCover = Hourly.expand(data.skyCover.values);	// cloud icon
		const weather = Hourly.expand(data.weather.values);	// fog icon
		const iceAccumulation = Hourly.expand(data.iceAccumulation.values); 	// ice icon
		const probabilityOfPrecipitation = Hourly.expand(data.probabilityOfPrecipitation.values);	// rain icon
		const snowfallAmount = Hourly.expand(data.snowfallAmount.values);	// snow icon

		const icons = await Hourly.determineIcon(skyCover, weather, iceAccumulation, probabilityOfPrecipitation, snowfallAmount, windSpeed);

		return temperature.map((val, idx) => {
			if (navigation.units === UNITS.metric) {
				return {
					temperature: temperature[idx],
					apparentTemperature: apparentTemperature[idx],
					windSpeed: windSpeed[idx],
					windDirection: utils.calc.directionToNSEW(windDirection[idx]),
					icon: icons[idx],
				};
			}

			return {
				temperature: utils.units.celsiusToFahrenheit(temperature[idx]),
				apparentTemperature: utils.units.celsiusToFahrenheit(apparentTemperature[idx]),
				windSpeed: utils.units.kilometersToMiles(windSpeed[idx]),
				windDirection: utils.calc.directionToNSEW(windDirection[idx]),
				icon: icons[idx],
			};
		});
	}

	// given forecast paramaters determine a suitable icon
	static async determineIcon(skyCover, weather, iceAccumulation, probabilityOfPrecipitation, snowfallAmount, windSpeed) {
		const startOfHour = luxon.DateTime.local().startOf('hour');
		const sunTimes = (await navigation.getSun()).sun;
		const overnight = luxon.Interval.fromDateTimes(luxon.DateTime.fromJSDate(sunTimes[0].sunset), luxon.DateTime.fromJSDate(sunTimes[1].sunrise));
		const tomorrowOvernight = luxon.DateTime.fromJSDate(sunTimes[1].sunset);
		return skyCover.map((val, idx) => {
			const hour = startOfHour.plus({ hours: idx });
			const isNight = overnight.contains(hour) || (hour > tomorrowOvernight);
			return icons.getHourlyIcon(skyCover[idx], weather[idx], iceAccumulation[idx], probabilityOfPrecipitation[idx], snowfallAmount[idx], windSpeed[idx], isNight);
		});
	}

	// expand a set of values with durations to an hour-by-hour array
	static expand(data) {
		const startOfHour = luxon.DateTime.utc().startOf('hour').toMillis();
		const result = []; // resulting expanded values
		data.forEach((item) => {
			let startTime = Date.parse(item.validTime.substr(0, item.validTime.indexOf('/')));
			const duration = luxon.Duration.fromISO(item.validTime.substr(item.validTime.indexOf('/') + 1)).shiftTo('milliseconds').values.milliseconds;
			const endTime = startTime + duration;
			// loop through duration at one hour intervals
			do {
				// test for timestamp greater than now
				if (startTime >= startOfHour && result.length < 24) {
					result.push(item.value); // push data array
				} // timestamp is after now
				// increment start time by 1 hour
				startTime += 3600000;
			} while (startTime < endTime && result.length < 24);
		}); // for each value

		return result;
	}

	async drawLongCanvas() {
		// get the list element and populate
		const list = this.elem.querySelector('.hourly-lines');
		list.innerHTML = '';

		const startingHour = luxon.DateTime.local();

		const lines = this.data.map((data, index) => {
			const fillValues = {};
			// hour
			const hour = startingHour.plus({ hours: index });
			const formattedHour = hour.toLocaleString({ weekday: 'short', hour: 'numeric' });
			fillValues.hour = formattedHour;

			// temperatures, convert to strings with no decimal
			const temperature = Math.round(data.temperature).toString().padStart(3);
			const feelsLike = Math.round(data.apparentTemperature).toString().padStart(3);
			fillValues.temp = temperature;
			// only plot apparent temperature if there is a difference
			// if (temperature !== feelsLike) line.querySelector('.like').innerHTML = feelsLike;
			if (temperature !== feelsLike) fillValues.like = feelsLike;

			// wind
			let wind = 'Calm';
			if (data.windSpeed > 0) {
				const windSpeed = Math.round(data.windSpeed).toString();
				wind = data.windDirection + (Array(6 - data.windDirection.length - windSpeed.length).join(' ')) + windSpeed;
			}
			fillValues.wind = wind;

			// image
			fillValues.icon = { type: 'img', src: data.icon };

			return this.fillTemplate('hourly-row', fillValues);
		});

		list.append(...lines);
	}

	drawCanvas() {
		super.drawCanvas();
		this.finishDraw();
	}

	showCanvas() {
		// special to hourly to draw the remainder of the canvas
		this.drawCanvas();
		super.showCanvas();
	}

	// screen index change callback just runs the base count callback
	screenIndexChange() {
		this.baseCountChange(this.navBaseCount);
	}

	// base count change callback
	baseCountChange(count) {
		// calculate scroll offset and don't go past end
		let offsetY = Math.min(this.elem.querySelector('.hourly-lines').getBoundingClientRect().height - 289, (count - 150));

		// don't let offset go negative
		if (offsetY < 0) offsetY = 0;

		// copy the scrolled portion of the canvas
		this.elem.querySelector('.main').scrollTo(0, offsetY);
	}

	static getTravelCitiesDayName(cities) {
		const { DateTime } = luxon;
		// effectively returns early on the first found date
		return cities.reduce((dayName, city) => {
			if (city && dayName === '') {
				// today or tomorrow
				const day = DateTime.local().plus({ days: (city.today) ? 0 : 1 });
				// return the day
				return day.toLocaleString({ weekday: 'long' });
			}
			return dayName;
		}, '');
	}
}
