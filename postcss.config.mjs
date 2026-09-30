/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Flattens the nested rules in globals.css (e.g. `&:hover`, nested
    // `@media`) before Tailwind processes `@apply`.
    'tailwindcss/nesting': {},
    tailwindcss: {},
  },
};

export default config;
