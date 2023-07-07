require("dotenv").config();
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const mysql = require("mysql");
const session = require("express-session");
const database_config = require("./config/database");

//set routes
var pagesRouter = require("./routes/pages");
var usersRouter = require("./routes/users");

var app = express();


// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

//routing or using routes set above
app.use("/", pagesRouter);
app.use("/users", usersRouter);

// Express Session middleware
// if (process.env.NODE_ENV === "development"){
//   app.use(session({
//     secret: process.env.SESS_KEY,
//     resave: true,
//     saveUninitialized: true,
//     store: MongoStore.create({
//       mongoUrl: config.database,
//       ttl: 5 * 24 * 60 * 60 // = 5 days.
//     })
//     //  cookie: { secure: true }
//   }));
// }else if (process.env.NODE_ENV === "production"){
//   app.set('trust proxy', 1); // trust first proxy
//   app.use(session({
//     secret: process.env.SESS_KEY,
//     resave: true,
//     saveUninitialized: true,
//     cookie: { secure: true },
//     store: MongoStore.create({
//       mongoUrl: process.env.MONGODB_URL,
//       ttl: 1 * 24 * 60 * 60 // = 1 day.
//     })
//   }));
// }


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
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
