import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import { initSentry } from './lib/sentry';

initSentry();
import './lib/polyfills/cryptoSubtle';
import './lib/i18n';
import './global.css';
import 'expo-router/entry';
