const translate = require("google-translate-api-x");

const languageMiddleware = (req, res, next) => {
  if (!req.session.language) {
    req.session.language = 'en';
  }
  res.locals.language = req.session.language;
  res.locals.subscriberEmail = req.session.subscriberEmail || null;
  next();
};

const translateText = async (text, targetLang) => {
  if (targetLang === 'en' || !text) return text;
  try {
    const result = await translate(text, { to: targetLang });
    return result.text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
};

module.exports = { languageMiddleware, translateText };
