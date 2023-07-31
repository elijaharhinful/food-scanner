var express = require("express");
var router = express.Router();
const mysql = require("mysql");
const db = require("../config/database");

const { DateTime } = require("luxon");

// POST win form
router.post("/win", (req, res, next) => {
  // initialize constant variables
  const INITIAL_CREDIT = 0;
  const INITIAL_FOOD_WINS = 0;
  const INITIAL_DIRECT_FOOD_WINS = 1;
  const coupon = req.session.coupon;
  const isRedeemed = "true"

  // obtain form data
  const { firstname, surname, number } = req.body;
  const fullname = `${firstname} ${surname}`;

  try {
    db.getConnection(async (err, connection) => {
      if (err) throw err;
      // define db queries
      const getQuery = "SELECT * FROM users WHERE name = ? AND number = ?";
      const postQuery = "INSERT INTO users VALUES (0,?,?,?,?,?,?)";
      const postFoodWinsDirectQuery =
        "UPDATE users SET food_wins_direct = ? WHERE id = ? AND name = ?";
      const getCouponQuery = "SELECT * FROM coupons WHERE coupon = ?";
      updateCouponQuery =
        "UPDATE coupons SET isRedeemed = ? WHERE coupon = ?";

      // connect to database and retrieve fullname and number of user
      await connection.query(
        getQuery,
        [fullname, number],
        async (err, result) => {
          // post the ff details to the db when the user is not found
          if (result === null || result.length === 0) {
            await connection.query(
              postQuery,
              [
                fullname,
                number,
                INITIAL_CREDIT,
                INITIAL_FOOD_WINS,
                INITIAL_DIRECT_FOOD_WINS,
                coupon
              ],
              (err, result) => {
                if (err) throw err;
                // get details of coupon from the db
                connection.query(
                  getCouponQuery,
                  [coupon],
                  async (err, result) => {
                    if (err) throw err;
                    //redirect to the coupon absent page if the coupon is not found
                    if (result === null || result.length === 0) {
                      res.redirect("/absent");
                    } else {
                      // else update the db with the isReedemed value as true and redirect to confirm page
                      await connection.query(
                        updateCouponQuery,
                        [isRedeemed, coupon],
                        (err) => {
                          if (err) throw err;

                          connection.release();
                          res.redirect("/confirm");
                        }
                      );
                    }
                  }
                );
              }
            );
          } else {
            // if the user is found do the ff
            const foodWinsDirect = result[0].food_wins_direct + 1;
            // update the db to increment the direct food wins of the user by one
            await connection.query(
              postFoodWinsDirectQuery,
              [foodWinsDirect, result[0].id, result[0].name],
              (err) => {
                if (err) throw err;
                // get the details of the coupon from the coupon table
                connection.query(
                  getCouponQuery,
                  [coupon],
                  async (err, result) => {
                    if (err) throw err;
                    // if there is no coupon, redirect to the coupon absent page
                    if (result === null || result.length === 0) {
                      res.redirect("/absent");
                    } else {
                      // if there is a coupon, update the coupon with the isRedeemed value of true
                      await connection.query(
                        updateCouponQuery,
                        [isRedeemed, coupon],
                        (err) => {
                          if (err) throw err;

                          connection.release();
                          res.redirect("/confirm");
                        }
                      );
                    }
                  }
                );
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
  // initialize constant variables
  const CREDIT_LIMIT = 50;
  const INITIAL_CREDIT = 10;
  const INITIAL_FOOD_WINS = 0;
  const INITIAL_DIRECT_FOOD_WINS = 0;
  const coupon = req.session.coupon;

  // obtain form data
  const { firstname, surname, number } = req.body;
  const fullname = `${firstname} ${surname}`;

  try {
    db.getConnection(async (err, connection) => {
      if (err) throw err;
      // define db queries
      const getQuery = "SELECT * FROM users WHERE name = ? AND number = ?";
      const postQuery = "INSERT INTO users VALUES (0,?,?,?,?,?,?)";
      const postCreditQuery =
        "UPDATE users SET credit = ? , active_coupon = ? WHERE id = ? AND name = ?";
      const postFoodWinsQuery =
        "UPDATE users SET food_wins = ?, credit = ?, active_coupon = ? WHERE id = ? AND name = ?";
      
      // obtain user's name and number from database
      await connection.query(
        getQuery,
        [fullname, number],
        async (err, result) => {
          // send user data to the database if there is no user with the above details in the db
          if (err) throw err;
          if (result === null || result.length === 0) {
            await connection.query(
              postQuery,
              [
                fullname,
                number,
                INITIAL_CREDIT,
                INITIAL_FOOD_WINS,
                INITIAL_DIRECT_FOOD_WINS,
                coupon,
              ],
              (err, result) => {
                if (err) throw err;
                // release database connection render confirmatory page
                connection.release();
                res.render("confirm", {
                  title: "Confirm",
                  credit: INITIAL_CREDIT,
                });
              }
            );
            // the user exists and has credits but has reached the credits limit
          } else if (result[0].credit == CREDIT_LIMIT) {
            // store active coupon in variable and run the ff checks
            const active_coupon = result[0].active_coupon;
            if (active_coupon === null || active_coupon.length === 0 || active_coupon == 0){
              res.redirect('/absent');
            }else if (active_coupon == coupon){
              res.redirect("/early");
            } else {
               // increment the food wins value by 1 and reset the user's credit to 0
            const foodWins = result[0].food_wins + 1;
            const updatedCredit = result[0].credit - CREDIT_LIMIT;
            // update the credits with the updates
              await connection.query(
                postFoodWinsQuery,
                [foodWins, updatedCredit, coupon, result[0].id, result[0].name],
                (err) => {
                  if (err) throw err;
                  // release db connection and send confrimatory page
                  connection.release();
                  res.render("confirm", {
                    title: "OK",
                    credit: CREDIT_LIMIT,
                  });
                }
              );
            }
          } else {
            // the user exists but their credit is not up to the maximum credits
            const active_coupon = result[0].active_coupon;
            if (active_coupon === null || active_coupon.length === 0 || active_coupon == 0){
              res.redirect('/absent');
            }else if (active_coupon == coupon){
              res.redirect("/early");
            } else {
               // add 10 credits to the users credit
            const updatedCredit = result[0].credit + INITIAL_CREDIT;
            // update credit table with updates
              await connection.query(
                postCreditQuery,
                [updatedCredit,coupon, result[0].id, result[0].name],
                (err) => {
                  if (err) throw err;
                  connection.release();
                  res.render("confirm", {
                    title: "Confirm",
                    credit: updatedCredit,
                  });
                }
              );
            }
          }
        }
      );
    });
  } catch (err) {
    next(err);
  }
});

router.get("/close", (req, res, next) => {
  let time = DateTime.now();
  let closeTime = time.toISO();
  let coupon = req.session.coupon;

  try {
    const postQuery = "INSERT INTO times VALUES (0,?,?)";
    const countQuery =
      "SELECT COUNT(*) AS count FROM times WHERE coupon = ? AND ad_time < ?";

    db.getConnection(async (err, connection) => {
      if (err) throw err;

      await connection.query(
        countQuery,
        [coupon, closeTime],
        (err, results) => {
          if (err) {
            console.log(err);
            res.sendStatus(500);
          } else {
            console.log(results);
            const count = results[0].count;

            // Determine the comparison result (win or lose)
            if (count === 0) {
              connection.query(postQuery, [coupon, closeTime], (err) => {
                if (err) throw err;
                res.redirect("/win");
              });
            } else {
              res.redirect("/lose");
            }
          }
        }
      );

      // Perform the comparison with the database
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
