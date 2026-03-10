const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const routes = require('./routes/index.js');
const errorMiddleware = require("./middleware/error.middleware");

const app = express();
app.use(express.json());

app.use("/api", routes);

app.use(errorMiddleware);
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API on http://localhost:${port}`));