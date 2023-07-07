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
  let firstname = req.body.firstname;
  let surname = req.body.surname;
  let number = req.body.number;

  let fullname = firstname + " " + surname;

  db.getConnection(async (err, connection) => {
    if (err) throw err;

    let query = "INSERT INTO  winners VALUES (0,?,?)";

    await connection.query(query, [fullname, number], (err, result) => {
      connection.release();
      if (err) throw err;
      console.log("details added");
      res.redirect("/confirm");
    });
  });
});

// POST lose form
router.post("/lose", (req, res, next) => {
  let firstname = req.body.firstname;
  let surname = req.body.surname;
  let number = req.body.number;
  let credit = 10;

  let fullname = firstname + " " + surname;

  db.getConnection(async (err, connection) => {
    if (err) throw err;

    let get_query = "SELECT * FROM losers WHERE name = ? AND number = ?";
    let post_query = "INSERT INTO  losers VALUES (0,?,?,0)";
    let post_credit_query = "UPDATE losers SET credit = ? WHERE id = ? AND name = ?"
    let post_foodwins_query = "UPDATE losers SET food_wins = ? , credit = ? WHERE id = ? AND name = ?"

    await connection.query(
      get_query,
      [fullname, number],
      async (err, result) => {
        if (result == null || result == []) {
          await connection.query(
            post_query,
            [fullname, number, credit],
            (err, result) => {
              connection.release();
              if (err) throw err;
              res.redirect("/confirm");
            }
          );
        } else if (result[0].credit == 50) {
          console.log("you qualify for a free meal as you have 50 credits");
          let food_wins = result[0].food_wins + 1;
          let updated_credit = result[0].credit - 50;
          
          await connection.query(post_foodwins_query,[food_wins,updated_credit,result[0].id,result[0].name],(err)=>{
            if (err) throw err;
            connection.release();
            res.redirect("/confirm");
          })
        } else {
          let updated_credit = result[0].credit + 10;
          
          await connection.query(post_credit_query,[updated_credit,result[0].id,result[0].name],(err)=>{
            if (err) throw err;
            connection.release();
            res.render("confirm",{
              title: "OK",
              credit: updated_credit,
            });
          })
          
        }
      }
    );
  });
});


//to load ad page after clicking ok on confirm page
router.post("/confirm", (req, res, next) => {
  res.redirect("../index");
});

module.exports = router;
