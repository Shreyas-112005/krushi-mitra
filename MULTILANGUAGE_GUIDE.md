# KRUSHI MITHRA - Multi-Language System Guide

## Overview
KRUSHI MITHRA now supports three languages:
- **English** (en)
- **Hindi** (हिन्दी - hi)
- **Kannada** (ಕನ್ನಡ - kn)

## How It Works

### Language Manager
The `language-manager.js` file provides automatic translation for all pages using the `data-i18n` attribute system.

### Usage in HTML

#### 1. Include the Language Manager
```html
<script src="../js/language-manager.js"></script>
```

#### 2. Add Translation Keys to Elements
```html
<!-- Text content translation -->
<h1 data-i18n="home.heroTitle">Default Text</h1>

<!-- Placeholder translation -->
<input type="text" data-i18n-placeholder="forms.enterName" placeholder="Enter name">

<!-- Attribute translation -->
<button data-i18n="buttons.save" data-i18n-attr="title" title="Save">Save</button>
```

#### 3. Language Selector Dropdown
```html
<select id="languageSelect" class="language-dropdown">
    <option value="english">🌐 English</option>
    <option value="kannada">🌐 ಕನ್ನಡ</option>
    <option value="hindi">🌐 हिन्दी</option>
</select>
```

### JavaScript API

#### Get Current Language
```javascript
const currentLang = languageManager.getCurrentLanguage();
```

#### Change Language Programmatically
```javascript
languageManager.setLanguage('kannada');
```

#### Translate a Key Dynamically
```javascript
const translatedText = languageManager.t('welcome.title');
```

#### Listen to Language Changes
```javascript
window.addEventListener('languageChanged', (e) => {
    console.log('New language:', e.detail.language);
});
```

## Translation Keys Structure

All translations are stored in `frontend/languages/` folder:
- `en.json` - English translations
- `hi.json` - Hindi translations
- `kn.json` - Kannada translations

### Available Translation Categories

1. **header** - Navigation items
2. **welcome** - Welcome messages
3. **sections** - Section titles
4. **weather** - Weather-related terms
5. **buttons** - Action buttons
6. **farmer** - Farmer profile fields
7. **forms** - Form labels and placeholders
8. **auth** - Authentication pages
9. **admin** - Admin dashboard
10. **market** - Market-related terms
11. **subsidy** - Subsidy information
12. **notifications** - Notification messages
13. **messages** - System messages
14. **home** - Home page content

## Adding New Translations

### Step 1: Add to English (en.json)
```json
{
  "newSection": {
    "title": "New Section Title",
    "description": "Section description"
  }
}
```

### Step 2: Add to Hindi (hi.json)
```json
{
  "newSection": {
    "title": "नया अनुभाग शीर्षक",
    "description": "अनुभाग विवरण"
  }
}
```

### Step 3: Add to Kannada (kn.json)
```json
{
  "newSection": {
    "title": "ಹೊಸ ವಿಭಾಗದ ಶೀರ್ಷಿಕೆ",
    "description": "ವಿಭಾಗದ ವಿವರಣೆ"
  }
}
```

### Step 4: Use in HTML
```html
<h2 data-i18n="newSection.title">New Section Title</h2>
<p data-i18n="newSection.description">Section description</p>
```

## Testing the Language System

Visit the language test page to see all translations in action:
**http://localhost:3000/frontend/html/language-test.html**

## Features

- ✅ Automatic page translation on load
- ✅ Persistent language preference (saved in localStorage)
- ✅ Dynamic content translation
- ✅ Support for nested translation keys
- ✅ Fallback to key name if translation missing
- ✅ Event system for language changes
- ✅ Easy integration with existing pages

## Pages with Language Support

All major pages now support multi-language:
- ✅ Home Page (index.html)
- ✅ Farmer Dashboard (farmer-dashboard.html)
- ✅ Farmer Login (farmer-login.html)
- ✅ Registration (register.html)
- ✅ Admin Login (admin-login.html)
- ✅ Language Test Page (language-test.html)
- ✅ All other farmer pages (profile, crops, market, support)

## Browser Support

Works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Implementation Notes

1. **Automatic Initialization**: Language manager initializes automatically on page load
2. **Language Persistence**: Selected language is saved in browser localStorage
3. **Performance**: All language files are loaded once on initialization
4. **Fallback**: If a translation is missing, the key itself is displayed
5. **HTML Lang Attribute**: The `<html lang="">` attribute updates automatically

## Troubleshooting

### Translations Not Showing
1. Check browser console for errors
2. Verify JSON files are valid (use JSON validator)
3. Ensure script is loaded before DOM content
4. Check that translation keys match exactly

### Language Selector Not Working
1. Verify element has `id="languageSelect"`
2. Check console for initialization errors
3. Ensure language files are accessible

### Missing Translations
1. Add missing keys to all three language files
2. Reload the page
3. Clear browser cache if needed

## Future Enhancements

- [ ] Add more regional languages (Tamil, Telugu, Malayalam)
- [ ] Voice translation support
- [ ] Right-to-left (RTL) language support
- [ ] Language-specific number and date formatting
- [ ] Automatic language detection based on browser settings
