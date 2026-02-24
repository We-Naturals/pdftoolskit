import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

// Statically import English for immediate availability (fixes hydration errors)
import commonEn from '../public/locales/en/common.json';
import seoEn from '../public/locales/en/seo.json';

const supportedLngs = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ru', 'ko', 'zh-CN', 'zh-TW',
    'ar', 'bg', 'ca', 'nl', 'el', 'hi', 'id', 'ms', 'pl', 'sv', 'th', 'tr',
    'uk', 'vi', 'ur'
];

i18n
    .use(initReactI18next)
    .use(resourcesToBackend((language: string, namespace: string) => {
        // Only use dynamic import for non-English languages
        if (language === 'en') return Promise.resolve({});

        return import(`../public/locales/${language}/${namespace}.json`)
            .catch((err) => {
                console.warn(`Failed to load i18n resource: ${language}/${namespace}`, err);
                return {};
            });
    }))
    .init({
        lng: 'en',
        fallbackLng: 'en',
        supportedLngs,
        defaultNS: 'common',
        ns: ['common', 'seo'],
        fallbackNS: 'common',
        resources: {
            en: {
                common: commonEn,
                seo: seoEn,
            },
        },
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        }
    });

export default i18n;

