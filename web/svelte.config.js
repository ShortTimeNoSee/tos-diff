import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';

export default {
  preprocess: preprocess(),
  kit: {
    // tell adapter-static to emit a SPA fallback "200.html"
    // and not error out on dynamic routes
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '200.html',
      strict: false
    })
  }
};
