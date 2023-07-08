var express = require("express");
var router = express.Router();
const mysql = require("mysql");
const db = require("../config/database");

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

// POST win form
router.post("/win", (req, res, next) => {
  const INITIAL_CREDIT = 0;
  const INITIAL_FOOD_WINS = 0;
  const INITIAL_DIRECT_FOOD_WINS = 1;

  const { firstname, surname, number } = req.body;
  const fullname = `${firstname} ${surname}`;

  try {
    db.getConnection(async (err, connection) => {
      if (err) throw err;

      const getQuery = "SELECT * FROM users WHERE name = ? AND number = ?";
      const postQuery = "INSERT INTO users VALUES (0,?,?,0,0,0)";
      const postFoodWinsDirectQuery =
        "UPDATE users SET food_wins_direct = ? WHERE id = ? AND name = ?";

      await connection.query(
        getQuery,
        [fullname, number],
        async (err, result) => {
          if (result === null || result.length === 0) {
            await connection.query(
              postQuery,
              [fullname, number, INITIAL_CREDIT, INITIAL_FOOD_WINS,INITIAL_DIRECT_FOOD_WINS],
              (err, result) => {
                if (err) throw err;
                connection.release();
                res.redirect("/confirm");
              }
            );
          } else {
            const foodWinsDirect = result[0].food_wins_direct + 1;

            await connection.query(
              postFoodWinsDirectQuery,
              [foodWinsDirect, result[0].id, result[0].name],
              (err) => {
                if (err) throw err;
                connection.release();
                res.redirect("/confirm");
              }
            );
          }
        }
      );
    });
  } catch (err) {
    next(err);
  }
  
});

// POST lose form
router.post("/lose", (req, res, next) => {
  const CREDIT_LIMIT = 50;
  const INITIAL_CREDIT = 10;
  const INITIAL_FOOD_WINS = 0;

  const { firstname, surname, number } = req.body;
  const fullname = `${firstname} ${surname}`;

  try {
    db.getConnection(async (err, connection) => {
      if (err) throw err;

      const getQuery = "SELECT * FROM users WHERE name = ? AND number = ?";
      const postQuery = "INSERT INTO users VALUES (0,?,?,0,0)";
      const postCreditQuery =
        "UPDATE users SET credit = ? WHERE id = ? AND name = ?";
      const postFoodWinsQuery =
        "UPDATE users SET food_wins = ?, credit = ? WHERE id = ? AND name = ?";

      await connection.query(
        getQuery,
        [fullname, number],
        async (err, result) => {
          if (result === null || result.length === 0) {
            await connection.query(
              postQuery,
              [fullname, number, INITIAL_CREDIT, INITIAL_FOOD_WINS],
              (err, result) => {
                if (err) throw err;
                connection.release();
                res.render("confirm", {
                  title: "OK",
                  credit: INITIAL_CREDIT,
                });
              }
            );
          } else if (result[0].credit == CREDIT_LIMIT) {
            const foodWins = result[0].food_wins + 1;
            const updatedCredit = result[0].credit - CREDIT_LIMIT;

            await connection.query(
              postFoodWinsQuery,
              [foodWins, updatedCredit, result[0].id, result[0].name],
              (err) => {
                if (err) throw err;
                connection.release();
                res.render("confirm", {
                  title: "OK",
                  credit: CREDIT_LIMIT,
                });
              }
            );
          } else {
            const updatedCredit = result[0].credit + INITIAL_CREDIT;

            await connection.query(
              postCreditQuery,
              [updatedCredit, result[0].id, result[0].name],
              (err) => {
                if (err) throw err;
                connection.release();
                res.render("confirm", {
                  title: "OK",
                  credit: updatedCredit,
                });
              }
            );
          }
        }
      );
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
