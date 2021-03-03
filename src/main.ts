import './style.scss';
import { App } from './app/index';

new App({
  target: document.body,
  props: {
    text: 'Hello Svelte!',
  },
});
