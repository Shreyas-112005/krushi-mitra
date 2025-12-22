const express = require('express');
const router = express.Router();
const weatherService = require('../services/weather.service');

// GET /weather/:city - Get current weather and 7-day forecast
router.get('/:city', async (req, res) => {
  try {
    const { city } = req.params;

    if (!city || city.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'City name is required'
      });
    }

    const weatherData = await weatherService.getWeatherByLocation(city);
    res.json(weatherData);
    
  } catch (error) {
    console.error('Weather route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather data',
      error: error.message
    });
  }
});

    // Get coordinates for the city
    const coords = await getCoordinates(city);
    
    if (!coords) {
      return res.status(404).json({
        success: false,
        message: `Location '${city}' not found. Please check the city name.`
      });
    }

    // Fetch current weather
    const currentWeatherUrl = `${BASE_URL}/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${WEATHER_API_KEY}`;
    const currentResponse = await axios.get(currentWeatherUrl);
    const currentData = currentResponse.data;

    // Fetch 7-day forecast
    const forecastUrl = `${BASE_URL}/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${WEATHER_API_KEY}`;
    const forecastResponse = await axios.get(forecastUrl);
    const forecastData = forecastResponse.data;

    // Format current weather
    const current = {
      temperature: Math.round(currentData.main.temp),
      feelsLike: Math.round(currentData.main.feels_like),
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
      humidity: currentData.main.humidity,
      pressure: currentData.main.pressure,
      windSpeed: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
      windDirection: currentData.wind.deg,
      cloudiness: currentData.clouds.all,
      visibility: currentData.visibility / 1000, // Convert to km
      sunrise: new Date(currentData.sys.sunrise * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      sunset: new Date(currentData.sys.sunset * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date(currentData.dt * 1000)
    };

    // Format 7-day forecast (group by day and take one reading per day)
    const dailyForecasts = {};
    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = {
          date,
          day: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
          tempMax: item.main.temp_max,
          tempMin: item.main.temp_min,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
          windSpeed: Math.round(item.wind.speed * 3.6),
          rainfall: item.pop ? Math.round(item.pop * 100) : 0
        };
      } else {
        dailyForecasts[date].tempMax = Math.max(dailyForecasts[date].tempMax, item.main.temp_max);
        dailyForecasts[date].tempMin = Math.min(dailyForecasts[date].tempMin, item.main.temp_min);
      }
    });

    const forecast = Object.values(dailyForecasts).slice(0, 7).map(day => ({
      ...day,
      tempMax: Math.round(day.tempMax),
      tempMin: Math.round(day.tempMin)
    }));

    // Try to fetch alerts (requires One Call API 3.0 - paid feature)
    let alerts = [];
    try {
      const alertsUrl = `${ONE_CALL_URL}?lat=${coords.lat}&lon=${coords.lon}&exclude=current,minutely,hourly,daily&appid=${WEATHER_API_KEY}`;
      const alertsResponse = await axios.get(alertsUrl);
      if (alertsResponse.data.alerts) {
        alerts = alertsResponse.data.alerts.map(alert => ({
          event: alert.event,
          description: alert.description,
          start: new Date(alert.start * 1000),
          end: new Date(alert.end * 1000)
        }));
      }
    } catch (error) {
      // Alerts API might not be available in free tier
      console.log('Alerts not available:', error.message);
    }

    res.json({
      success: true,
      data: {
        location: {
          name: coords.name,
          state: coords.state,
          country: coords.country
        },
        current,
        forecast,
        alerts
      }
    });

  } catch (error) {
    console.error('Weather API error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key. Please check OPENWEATHER_API_KEY in .env file'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather data',
      error: error.message
    });
  }
});

module.exports = router;
