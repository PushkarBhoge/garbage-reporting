const translate = require('google-translate-api-x');

const translateToMarathi = async (name) => {
  try {
    const result = await translate(name, { from: 'en', to: 'mr' });
    return result.text;
  } catch (error) {
    return name;
  }
};

module.exports = { translateToMarathi };
