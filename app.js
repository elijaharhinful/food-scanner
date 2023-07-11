require("dotenv").config();
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const mysql = require("mysql");
const session = require("express-session");
const passport = require("passport");
const MySqlStore = require("express-mysql-session")(session);
const database_config = require("./config/database");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Express Session middleware
const options = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
}

const sessionConnection = mysql.createConnection(options);
const sessionStore = new MySqlStore({
  expiration: 1800000, // 30 minutes]
  clearExpired: true,
  createDatabaseTable: true,
  schema: {
    tableName: "sessions",
    columnNames: {
      session_id: "session_id",
      expires: "expires",
      data: "data",
    },
  }
}, sessionConnection);

if (process.env.NODE_ENV === "development"){
  app.use(session({
    secret: process.env.SESS_KEY,
    resave: true,
    saveUninitialized: true,
    store: sessionStore,
  }));
}else if (process.env.NODE_ENV === "production"){
  app.set('trust proxy', 1); // trust first proxy
  app.use(session({
    secret: process.env.SESS_KEY,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: true },
    store: sessionStore,
  }));
}

//set routes
var pagesRouter = require("./routes/pages");
var usersRouter = require("./routes/users");

//routing or using routes set above
app.use("/", pagesRouter);
app.use("/users", usersRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404);
  res.render("404",{title:"404 error"});
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
