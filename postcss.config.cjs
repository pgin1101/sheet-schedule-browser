// postcss.config.cjs
module.exports = {
  plugins: {
    // Tailwind CSS V3 之後必須這樣寫
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  }
}