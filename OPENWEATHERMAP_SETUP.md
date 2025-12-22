# OpenWeatherMap API Setup Guide

## 🌦️ Getting Your FREE API Key

The KRUSHI MITHRA platform uses OpenWeatherMap API to provide real-time weather updates to farmers. Follow these simple steps to get your free API key:

## Step-by-Step Instructions

### 1. Sign Up for OpenWeatherMap
- Visit: https://home.openweathermap.org/users/sign_up
- Fill in the registration form:
  - Username
  - Email address
  - Password
- Accept the terms and conditions
- Click "Create Account"

### 2. Verify Your Email
- Check your email inbox for a verification email from OpenWeatherMap
- Click the verification link in the email
- Your account will be activated

### 3. Get Your API Key
- Log in to your OpenWeatherMap account
- Go to: https://home.openweathermap.org/api_keys
- You'll see a default API key already created for you
- **Copy this API key** - it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 4. Add API Key to Your Project
- Open the file: `backend/.env`
- Find the line: `OPENWEATHER_API_KEY=demo_key`
- Replace `demo_key` with your actual API key
- Example:
  ```
  OPENWEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
  WEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
  ```
- Save the file

### 5. Restart Your Server
- Stop the running server (Ctrl+C)
- Start it again: `npm start` (from the backend folder)
- The server will now use real weather data!

## 🎉 Free Tier Includes

✅ **60 calls per minute**
✅ **1,000,000 calls per month** (more than enough!)
✅ **Current weather data** for any location
✅ **5-day / 3-hour forecast**
✅ **Weather alerts**
✅ **Sunrise/sunset times**
✅ **Humidity, wind speed, and more**

## 📍 What Weather Data You'll Get

### Current Weather:
- Temperature (°C)
- "Feels like" temperature
- Weather description (sunny, cloudy, rainy, etc.)
- Humidity (%)
- Wind speed (km/h)
- Visibility
- Sunrise & sunset times
- Weather icons

### 7-Day Forecast:
- Daily high and low temperatures
- Weather conditions for each day
- Humidity levels
- Expected rainfall
- Wind speed

### Agricultural Alerts & Advice:
- High temperature warnings
- Heavy rainfall alerts
- Strong wind advisories
- Irrigation recommendations
- Planting advice
- Pest control alerts
- Fertilizer application timing

## 🔧 Troubleshooting

### API Key Not Working?
1. Make sure you've verified your email
2. Wait 10-15 minutes after creating your account (API keys take a few minutes to activate)
3. Check that you copied the entire API key
4. Ensure there are no extra spaces before or after the API key in the .env file

### Still Getting Demo Data?
1. Restart your server after adding the API key
2. Check the server logs for any error messages
3. Make sure the .env file is in the `backend` folder
4. Verify the API key is correct on OpenWeatherMap dashboard

## 📚 API Documentation

For more information about OpenWeatherMap API:
- API Documentation: https://openweathermap.org/api
- Current Weather API: https://openweathermap.org/current
- Forecast API: https://openweathermap.org/forecast5
- Weather Conditions: https://openweathermap.org/weather-conditions

## 🌐 Supported Locations

The weather API supports:
- All cities in Karnataka
- All districts and taluks
- Works in English, Hindi, and Kannada
- Automatically detects location from farmer's profile

## 💡 Tips

- The free API key is sufficient for this project
- Weather data is cached to reduce API calls
- Location is determined from the farmer's registered address
- Weather updates every time the dashboard is loaded
- Forecasts show 7-day predictions

---

**Need Help?**
If you face any issues setting up the API, check the server console for error messages or refer to the OpenWeatherMap documentation.
