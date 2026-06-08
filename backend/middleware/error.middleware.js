const multer = require("multer");

module.exports = function errorMiddleware(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "Размер файла превышает допустимый лимит",
      });
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "Можно загрузить не более 4 файлов",
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "Некорректное поле для загрузки файла",
      });
    }

    return res.status(400).json({
      message: "Ошибка загрузки файла",
    });
  }

  const status = err.status || 500;

  res.status(status).json({
    message: err.message || "Внутренняя ошибка сервера",
  });
};