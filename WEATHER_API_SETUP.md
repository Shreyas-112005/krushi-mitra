# Weather API Setup Guide

## How to Get OpenWeatherMap API Key

The application uses **OpenWeatherMap API** to provide real-time, location-based weather information to farmers.

### Step 1: Sign Up for OpenWeatherMap

1. Visit [https://openweathermap.org/api](https://openweathermap.org/api)
2. Click on **"Sign Up"** button or go to [https://home.openweathermap.org/users/sign_up](https://home.openweathermap.org/users/sign_up)
3. Fill in your details:
   - Email address
   - Username
   - Password
4. Accept the terms and conditions
5. Click **"Create Account"**

### Step 2: Verify Your Email

1. Check your email inbox
2. Open the verification email from OpenWeatherMap
3. Click the verification link
4. You'll be redirected to the OpenWeatherMap dashboard

### Step 3: Get Your API Key

1. After logging in, go to [https://home.openweathermap.org/api_keys](https://home.openweathermap.org/api_keys)
2. You'll see a default API key already created
3. Copy the API key (looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)
4. Or create a new API key:
   - Enter a name for your key (e.g., "Krushi Mithra")
   - Click **"Generate"**
   - Copy the newly generated key

### Step 4: Add API Key to Your Application

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```

3. Open the `.env` file in a text editor

4. Find these lines:
   ```
   OPENWEATHER_API_KEY=demo_key
   WEATHER_API_KEY=demo_key
   ```

5. Replace `demo_key` with your actual API key:
   ```
   OPENWEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   WEATHER_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

6. Save the file

### Step 5: Restart the Server

1. Stop the server if it's running (press `Ctrl+C` in terminal)
2. Start the server again:
   ```bash
   npm start
   ```

## Free Tier Limits

The **FREE plan** includes:
- ✅ **60 API calls per minute**
- ✅ **1,000,000 calls per month**
- ✅ Current weather data
- ✅ 5-day / 3-hour forecast
- ✅ Historical weather data (from January 1979)
- ✅ Weather maps
- ✅ UV Index
- ✅ Air Pollution data

This is more than enough for the Krushi Mithra application!

## Features Enabled with Real API

Once you set up the API key, farmers will get:

### 1. **Real-Time Weather** 
- Current temperature for their location
- Humidity, wind speed, and pressure
- Weather conditions (sunny, cloudy, rainy, etc.)

### 2. **Accurate 7-Day Forecast**
- Daily high/low temperatures
- Expected rainfall
- Wind conditions

### 3. **Location-Based Data**
- Weather specific to farmer's registered location
- Support for any city/town in Karnataka
- Accurate coordinates-based forecasting

### 4. **Agricultural Alerts**
- Extreme weather warnings
- Heavy rainfall alerts
- Temperature extremes
- Frost warnings (if applicable)

### 5. **Farming Advice**
- Irrigation recommendations based on rainfall
- Best times for fertilizer application
- Crop protection advice during adverse weather

## Testing the Weather API

After setting up the API key, test it:

```bash
cd backend
node scripts/testWeatherAPI.js
```

This will:
- Verify your API key is working
- Show sample weather data
- Confirm the connection to OpenWeatherMap

## Troubleshooting

### Issue: "Invalid API Key"
**Solution:** 
- Wait 10-15 minutes after creating a new API key (activation time)
- Check that you copied the entire key without spaces
- Verify the key in your OpenWeatherMap dashboard

### Issue: "API Key Expired"
**Solution:**
- Free API keys don't expire
- Check if your account is still active
- Generate a new API key if needed

### Issue: "Too Many Requests"
**Solution:**
- You've exceeded 60 calls/minute
- Wait a minute and try again
- Consider caching weather data in production

### Issue: Weather still showing demo data
**Solution:**
- Make sure you saved the `.env` file
- Restart the server after changing `.env`
- Check console logs for any errors
- Verify the API key has no extra spaces or quotes

## Demo Mode

If you don't set up an API key, the application will run in **demo mode**:
- Shows sample weather data
- Works offline
- Good for testing UI/functionality
- Not suitable for production use

## Production Recommendations

For production deployment:

1. **Use Environment Variables:** Store API key in server environment variables, not in `.env` file
2. **Enable Caching:** Cache weather data for 15-30 minutes to reduce API calls
3. **Error Handling:** Gracefully fallback to cached data if API is unavailable
4. **Monitor Usage:** Keep track of API calls in OpenWeatherMap dashboard
5. **Consider Upgrade:** If you exceed free tier limits, consider paid plans

## API Documentation

For more details on the OpenWeatherMap API:
- **API Docs:** [https://openweathermap.org/api](https://openweathermap.org/api)
- **Current Weather:** [https://openweathermap.org/current](https://openweathermap.org/current)
- **Forecast API:** [https://openweathermap.org/forecast5](https://openweathermap.org/forecast5)
- **Support:** [https://openweathermap.org/faq](https://openweathermap.org/faq)

---

**Need help?** Check the `WEATHER_API_DOCUMENTATION.md` in the backend folder for more technical details.
