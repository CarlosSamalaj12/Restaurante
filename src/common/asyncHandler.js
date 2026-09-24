// src/common/asyncHandler.js
// Wrapper para controladores de Express que captura excepciones asíncronas y las pasa a next()

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
