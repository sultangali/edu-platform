import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load translation files
const loadTranslations = () => {
  try {
    const kazPath = join(__dirname, '../../client/src/i18n/locales/kaz.json');
    const rusPath = join(__dirname, '../../client/src/i18n/locales/rus.json');
    const engPath = join(__dirname, '../../client/src/i18n/locales/eng.json');
    
    const kaz = JSON.parse(readFileSync(kazPath, 'utf8'));
    const rus = JSON.parse(readFileSync(rusPath, 'utf8'));
    const eng = JSON.parse(readFileSync(engPath, 'utf8'));
    
    return { kaz, rus, eng };
  } catch (error) {
    console.error('Error loading translations:', error);
    return { kaz: {}, rus: {}, eng: {} };
  }
};

const translations = loadTranslations();

// Default language
const defaultLang = 'kaz';

// Get language from request
export const getLanguage = (req) => {
  // Check Accept-Language header first
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    const lang = acceptLanguage.toLowerCase().split(',')[0].trim();
    if (lang.startsWith('kaz') || lang === 'kk' || lang === 'kk-kz') return 'kaz';
    if (lang.startsWith('rus') || lang === 'ru' || lang === 'ru-ru') return 'rus';
    if (lang.startsWith('eng') || lang === 'en' || lang === 'en-us' || lang === 'en-gb') return 'eng';
  }
  
  // Check query parameter
  if (req.query?.lang) {
    const lang = req.query.lang.toLowerCase();
    if (['kaz', 'rus', 'eng'].includes(lang)) return lang;
  }
  
  // Check body parameter
  if (req.body?.language) {
    const lang = req.body.language.toLowerCase();
    if (['kaz', 'rus', 'eng'].includes(lang)) return lang;
  }
  
  return defaultLang;
};

// Translate function
export const t = (req, key, params = {}) => {
  const lang = getLanguage(req);
  const translation = translations[lang] || translations[defaultLang];
  
  // Navigate through nested keys (e.g., 'common.add')
  const keys = key.split('.');
  let value = translation;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to default language
      value = translations[defaultLang];
      for (const k2 of keys) {
        if (value && typeof value === 'object' && k2 in value) {
          value = value[k2];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }
  
  // Handle string interpolation
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }
  
  return typeof value === 'string' ? value : key;
};

// Middleware to add language to request
export const languageMiddleware = (req, res, next) => {
  req.language = getLanguage(req);
  req.t = (key, params) => t(req, key, params);
  next();
};

