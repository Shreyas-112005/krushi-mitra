# API Integration Guide - KRUSHI MITHRA

This guide explains how to integrate real Indian market prices and weather data APIs into the KRUSHI MITHRA platform.

## 🌦️ Weather API Setup (OpenWeatherMap)

### Step 1: Sign Up for Free API Key

1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Click **Sign Up** (top right)
3. Create account with email and password
4. Verify your email address
5. Navigate to **API Keys** section in dashboard
6. Copy your default API key (or generate new one)

### Step 2: Configure in Application

Open `backend/.env` file and update:

```env
OPENWEATHER_API_KEY=your_actual_api_key_here
WEATHER_API_KEY=your_actual_api_key_here
```

### API Limits (Free Tier):
- ✅ 60 calls per minute
- ✅ 1,000,000 calls per month
- ✅ Current weather data
- ✅ 5-day / 3-hour forecast
- ✅ Sufficient for our application

### Features Enabled:
- Real-time weather for any Karnataka location
- 7-day weather forecast
- Agricultural weather alerts
- Farming recommendations based on weather

---

## 📊 Indian Market Prices API

### Option 1: Data.gov.in (Recommended)

#### Step 1: Register for API Access

1. Visit [Data.gov.in](https://data.gov.in/)
2. Click **Sign Up** / **Register**
3. Fill in registration details
4. Verify email and complete profile
5. Navigate to [API Console](https://data.gov.in/ogpl_apis)
6. Request API access for agricultural datasets
7. Copy your API key once approved

#### Step 2: Find Agricultural Datasets

1. Go to [Data Catalog](https://data.gov.in/catalogs)
2. Search for **"agricultural prices"** or **"mandi prices"**
3. Popular datasets:
   - Daily Market Prices of Commodities
   - APMC (Agricultural Produce Market Committee) Prices
   - State-wise Agricultural Statistics

#### Step 3: Configure

```env
DATA_GOV_IN_API_KEY=your_api_key_here
```

#### Available Data:
- ✅ Daily prices from Indian markets
- ✅ State-wise commodity data
- ✅ APMC market information
- ✅ Historical price trends

### Option 2: Agmarknet

#### Step 1: Access Agmarknet API

1. Visit [Agmarknet](https://agmarknet.gov.in/)
2. Navigate to **Services** → **API Services**
3. Register for developer access
4. Get API credentials

#### Step 2: Configure

```env
AGMARKNET_API_KEY=your_api_key_here
```

#### Available Data:
- ✅ Live market prices from 2900+ markets
- ✅ Arrival data
- ✅ Price trends
- ✅ Market-wise commodity info

---

## 🚀 Implementation Details

### Market Price Service

The application automatically:
1. **Fetches data** from government APIs every 6 hours
2. **Caches results** to reduce API calls
3. **Falls back** to demo data if APIs unavailable
4. **Processes data** for Karnataka markets specifically

#### Supported Commodities:

**Vegetables:**
- Tomato, Onion, Potato, Cabbage, Cauliflower
- Carrot, Beans, Brinjal, Capsicum, Peas

**Fruits:**
- Banana, Mango, Grapes, Papaya
- Watermelon, Pomegranate, Guava, Orange

**Grains:**
- Rice, Wheat, Ragi (Finger Millet)
- Jowar, Bajra, Maize

### Weather Service

The application provides:
1. **Current Weather** - Temperature, humidity, wind, rainfall
2. **7-Day Forecast** - Daily min/max temperatures
3. **Agricultural Alerts** - Heat waves, heavy rain, wind warnings
4. **Farming Advice** - Irrigation, planting, pest control recommendations

---

## 🧪 Testing the APIs

### Test Market Prices

```bash
# Test endpoint
curl http://localhost:3000/api/market-prices/vegetables

# Expected response:
{
  "success": true,
  "data": {
    "category": "vegetables",
    "lastUpdated": "2025-12-21T...",
    "source": "Indian Government Market Data APIs",
    "items": [
      {
        "commodity": "Tomato",
        "price": 3500,
        "unit": "per quintal",
        "market": "Bangalore APMC",
        "state": "Karnataka",
        "date": "2025-12-21",
        "trend": "up"
      }
    ]
  }
}
```

### Test Weather API

```bash
# Test endpoint
curl http://localhost:3000/api/weather/Bangalore

# Expected response:
{
  "success": true,
  "location": {
    "name": "Bangalore",
    "state": "Karnataka",
    "country": "IN"
  },
  "current": {
    "temperature": 28,
    "description": "Partly cloudy",
    "humidity": 65,
    "windSpeed": 15
  },
  "forecast": [...]
}
```

---

## 📱 Frontend Integration

### Language Selection

The home page now includes language selector for easy farmer access:

```javascript
// Language automatically initializes on page load
// Supports: English, Kannada (ಕನ್ನಡ), Hindi (हिन्दी)
```

### Market Prices Display

Farmers can view:
- Latest prices from Karnataka markets
- Price trends (up/down/stable)
- Multiple commodities organized by category
- Search and filter options

### Weather Dashboard

Farmers get:
- Real-time weather for their location
- 7-day forecast with icons
- Agricultural alerts and advisories
- Farming recommendations

---

## 🔒 API Security Best Practices

1. **Never commit** API keys to version control
2. **Use .env** files (already in .gitignore)
3. **Rate limit** API calls (implemented)
4. **Cache responses** to minimize calls (6-hour cache)
5. **Monitor usage** to stay within free tier limits

---

## 🆓 Using Demo Mode

If you don't have API keys yet, the application works in demo mode:

- ✅ Demo weather data with realistic values
- ✅ Demo market prices from Karnataka markets
- ✅ All features fully functional
- ✅ Great for development and testing

Just leave the keys as `demo_key` in your `.env` file.

---

## 📞 Support

### OpenWeather API Support:
- Documentation: https://openweathermap.org/api
- Support: support@openweathermap.org

### Data.gov.in Support:
- Help Desk: https://data.gov.in/help
- Email: data.gov[at]nic.in

### Agmarknet Support:
- Website: https://agmarknet.gov.in/
- Contact through their portal

---

## ✅ Verification Checklist

Before deploying to production:

- [ ] OpenWeather API key configured and tested
- [ ] Market price API configured (Data.gov.in or Agmarknet)
- [ ] Weather data fetching correctly for Karnataka cities
- [ ] Market prices showing real data from Karnataka markets
- [ ] Language switching working on all pages
- [ ] Cache system working (check timestamps)
- [ ] Error handling gracefully falls back to demo data
- [ ] Rate limiting configured properly
- [ ] API usage monitored (check dashboard)

---

## 🎉 Success!

Your KRUSHI MITHRA platform now has:
- ✅ Real Indian market prices from government sources
- ✅ Real-time weather data for Karnataka locations
- ✅ Multi-language support (English, Kannada, Hindi)
- ✅ Automatic data caching and updates
- ✅ Graceful fallback to demo data

Farmers can now access authentic, up-to-date information for better decision-making!
