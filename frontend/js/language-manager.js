/**
 * KRUSHI MITHRA - Simple Language Manager
 * Fresh implementation - English, Kannada, Hindi
 */

class KrushiLanguageManager {
    constructor() {
        this.currentLang = 'en';
        this.translations = {};
        this.isReady = false;
    }

    async initialize() {
        console.log('🌐 Initializing Language System...');
        
        // Load saved preference
        const saved = localStorage.getItem('krushi_language');
        if (saved) {
            this.currentLang = saved;
        }
        
        // Load all translations
        try {
            await this.loadAllTranslations();
            this.isReady = true;
            
            // Setup selector
            this.setupSelector();
            
            // Apply current language
            this.applyLanguage(this.currentLang);
            
            console.log('✅ Language System Ready - Current:', this.currentLang);
        } catch (error) {
            console.error('❌ Language System Error:', error);
        }
    }

    async loadAllTranslations() {
        const langs = ['en', 'kn', 'hi'];

        for (const code of langs) {
            try {
                const response = await fetch(`/frontend/languages/${code}.json`);
                if (response.ok) {
                    this.translations[code] = await response.json();
                    console.log(`✅ Loaded ${code}`);
                } else {
                    console.warn(`⚠️ Failed to load ${code}: ${response.status}`);
                }
            } catch (err) {
                console.warn(`⚠️ Failed to load ${code}:`, err.message);
            }
        }
        
        if (Object.keys(this.translations).length === 0) {
            console.error('❌ No translations loaded!');
        }
    }

    setupSelector() {
        const selector = document.getElementById('languageSelect');
        if (!selector) {
            console.warn('⚠️ Language selector not found');
            return;
        }

        // Set current value
        selector.value = this.currentLang;

        // Check if already has a change listener (e.g., from dashboard.js)
        if (selector.dataset.langListenerAdded === 'true') {
            console.log('✅ Language selector already has listener (from page script)');
            return;
        }

        // Add event listener and mark it
        selector.addEventListener('change', (e) => {
            const newLang = e.target.value;
            console.log('🔄 Language changed to:', newLang);
            this.changeLanguage(newLang);
        });
        selector.dataset.langListenerAdded = 'true';

        console.log('✅ Language selector ready');
    }

    changeLanguage(lang) {
        if (!this.translations[lang]) {
            console.error('❌ Language not available:', lang);
            return;
        }

        this.currentLang = lang;
        localStorage.setItem('krushi_language', lang);
        
        this.applyLanguage(lang);
        
        console.log('✅ Changed to:', lang);
    }

    applyLanguage(lang) {
        console.log('🔄 Applying language:', lang);
        
        let updatedCount = 0;
        
        // Update all elements with data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        console.log(`Found ${elements.length} elements to translate`);
        
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.getText(key, lang);
            
            if (text && text !== key) {
                // Check for attribute translation
                const attr = el.getAttribute('data-i18n-attr');
                if (attr) {
                    el.setAttribute(attr, text);
                    updatedCount++;
                } else {
                    // Handle text content - FORCE UPDATE
                    if (el.children.length > 0) {
                        // Has child elements - update first text node or create one
                        let textNode = null;
                        for (let child of el.childNodes) {
                            if (child.nodeType === Node.TEXT_NODE) {
                                textNode = child;
                                break;
                            }
                        }
                        if (textNode) {
                            textNode.textContent = text + ' ';
                        } else {
                            // Create new text node at beginning
                            el.insertBefore(document.createTextNode(text + ' '), el.firstChild);
                        }
                    } else {
                        // No children - direct text update
                        el.textContent = text;
                    }
                    updatedCount++;
                }
                console.log(`✓ Updated: ${key} → "${text}"`);
            }
        });

        // Update placeholders
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const text = this.getText(key, lang);
            if (text && text !== key) {
                el.placeholder = text;
                updatedCount++;
            }
        });

        // Update titles
        const titles = document.querySelectorAll('[data-i18n-title]');
        titles.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const text = this.getText(key, lang);
            if (text && text !== key) {
                el.title = text;
                updatedCount++;
            }
        });

        // Update selector
        const selector = document.getElementById('languageSelect');
        if (selector) {
            selector.value = lang;
        }

        console.log(`✅ Language applied - Updated ${updatedCount} elements`);
    }

    getText(key, lang) {
        if (!key) return '';
        
        const translation = this.translations[lang || this.currentLang];
        if (!translation) {
            console.warn(`⚠️ No translations for language: ${lang || this.currentLang}`);
            return key;
        }

        // Support nested keys with dot notation (e.g., "header.dashboard")
        const keys = key.split('.');
        let value = translation;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`⚠️ Translation not found: ${key} in ${lang || this.currentLang}`);
                return key; // Return key if not found
            }
        }

        return typeof value === 'string' ? value : key;
    }

    // Helper method for dynamic content
    translate(key) {
        return this.getText(key, this.currentLang);
    }
}

// Create global instance
window.krushiLang = new KrushiLanguageManager();

// Auto-initialize ONLY if not already initialized by page scripts
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to let page scripts run first
        setTimeout(() => {
            if (!window.krushiLang.isReady) {
                console.log('🔄 Auto-initializing language manager');
                window.krushiLang.initialize();
            }
        }, 100);
    });
} else {
    // Document already loaded - only init if not ready
    setTimeout(() => {
        if (!window.krushiLang.isReady) {
            console.log('🔄 Auto-initializing language manager (immediate)');
            window.krushiLang.initialize();
        }
    }, 100);
}

// Keep old reference for compatibility
window.languageManager = window.krushiLang;
