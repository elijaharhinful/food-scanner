const express = require("express");
const router = express.Router();
const db = require("../config/database");
const cron = require("node-cron");

const { DateTime, Duration } = require("luxon");
const voucher = require("voucher-code-generator");

router.get("/index/:coupon", (req, res, next) => {
  let coupon = req.params.coupon;
  try {
    getQuery = "SELECT * FROM coupons WHERE coupon = ?";
    postQuery = "UPDATE coupons SET scans = ? WHERE coupon = ?";

    // if the coupon length is invalid redirect to absent page
    if (coupon.length !== 6) {
      res.redirect("/absent");
    } else {
      // get db connection
      db.getConnection(async (err, connection) => {
        if (err) throw err;
        // get coupon data from coupon table that matches the coupon in the url
        await connection.query(getQuery, [coupon], async (err, result) => {
          if (err) throw err;
          if (result === null || result.length === 0) {
            // redirect to absent if there is no coupon like that in the db
            res.redirect("/absent");
            connection.release();
          } else {
            // if there is a coupon and it is not expired do the ff
            if (result[0].coupon && result[0].isExpired == false) {
              // check if the coupon hasn't been used more than 5 times
              if (result[0].scans <= 5) {
                let scans = result[0].scans + 1;
                // increment the scan value and update the coupon with it
                await connection.query(
                  postQuery,
                  [scans, coupon],
                  (err, result) => {
                    if (err) throw err;
                    // if the coupon is not already in session, add it to the session
                    if (typeof req.session.coupon == "undefined") {
                      req.session.coupon = [];
                      req.session.coupon = coupon;
                      res.redirect("/ad");
                    connection.release();
                    } else {
                      // if the coupon is in the session update it with the new coupon details
                      req.session.coupon = coupon;
                      res.redirect("/ad");
                    connection.release();
                    }
                  }
                );
              } else {
              // if coupon has been used more than five times redirect to the limit page
                res.redirect("/limit");
                connection.release();
              }
            } else if (result[0].coupon && result[0].isExpired == true) {
              // if coupon is present but expired, delete coupon details and redirect to the add page
              req.session.coupon = [];
              res.redirect("/ad");
              connection.release();
            } else {
              res.redirect("/absent");
              connection.release();
            }
          }
        });
      });
    }
  } catch (err) {
    next(err);
  }
});

router.get("/ad", (req, res, next) => {
  res.render("ad", { title: "Ad Homepage" });
});

// GET win page
router.get("/win", (req, res, next) => {
  const coupon = req.session.coupon;
  if (coupon === null || coupon === undefined){
    res.render("absent", { title: "Wrong" });
  } else {
    res.render("win", { title: "Winner" });
  }
});

// GET lose page
router.get("/lose", (req, res, next) => {
  const coupon = req.session.coupon;
  if (coupon === null || coupon === undefined){
    res.render("absent", { title: "Wrong" });
  } else {
    res.render("lose", { title: "Sorry" });
  }
});

// GET early page
router.get("/early", (req, res, next) => {
  res.render("early", { title: "Early" });
});

// GET limit page
router.get("/limit", (req, res, next) => {
  res.render("limit", { title: "Limit" });
});

// GET absent page
router.get("/absent", (req, res, next) => {
  res.render("absent", { title: "Wrong" });
});

// GET limit page
router.get("/expired", (req, res, next) => {
  res.render("expired", { title: "Expired" });
});

//GET confirm page
router.get("/confirm", (req, res, next) => {
  const coupon = req.session.coupon;
  if (coupon === null || coupon === undefined){
    res.render("absent", { title: "Wrong" });
  } else {
    res.render("confirm", { title: "OK", credit: 0 });
  }
});

const couponGenerator = () => {
  try{
    const startTime = DateTime.fromObject({ hour: 8 });
  const endTime = DateTime.fromObject({ hour: 19 });

  const timeRange = endTime.diff(startTime);
  const randomDuration = Duration.fromMillis(
    Math.floor(Math.random() * timeRange.as("milliseconds"))
  );

  // generate random times
  const randomTimes = [];
  let previousTime = startTime;
  for (let i = 0; i < 5; i++) {
    const minTime = previousTime.plus({ minutes: 40 });
    const maxTime = endTime;
    const randomTime = DateTime.fromMillis(
      Math.floor(
        Math.random() * maxTime.diff(minTime, "minutes").minutes * 60 * 1000
      ) + minTime.toMillis()
    );
    randomTimes.push(randomTime);
    previousTime = randomTime;
  }

  // generate random coupons
  const randomCoupons = voucher.generate({
    length: 6,
    count: 5,
    charset: "0123456789",
  });

  // assign coupons to time periods
  const timeCouponPairs = [];
  for (let i = 0; i < 5; i++) {
    const time = randomTimes[i];
    const coupon = randomCoupons[i];

    const expirationTime = time.plus({ minutes: 30 });

    // Check if there are any overlapping time periods
    let overlap = false;
    for (const pair of timeCouponPairs) {
      if (pair.expirationTime > time && pair.time < expirationTime) {
        overlap = true;
        break;
      }
    }

    if (!overlap) {
      timeCouponPairs.push({
        time: time.toISO(),
        coupon,
        expirationTime: expirationTime.toISO(),
      });
    }
  }

  // store data in mysql database
  db.getConnection(async (err, connection) => {
    if (err) throw err;

    let isExpired = "false";
    let scans = 0;
    let isRedeemed = "false";
    const createTableQuery = `CREATE TABLE IF NOT EXISTS coupons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      time DATETIME,
      coupon VARCHAR(10),
      expirationTime DATETIME,
      isExpired VARCHAR(10),
      scans INT(1),
      isRedeemed VARCHAR(10)
    )`;
    const postCouponQuery =
      "INSERT INTO coupons (time, coupon, expirationTime,isExpired,scans,isRedeemed) VALUES (?, ?, ? , ? ,? , ?)";

    await connection.query(createTableQuery, async (err, result) => {
      if (err) throw err;
      for (const pair of timeCouponPairs) {
        connection.query(postCouponQuery, [
          pair.time,
          pair.coupon,
          pair.expirationTime,
          isExpired,
          scans,
          isRedeemed,
        ], (err)=>{
          if (err) throw err;
        });
      }
      console.log("tokens generated and database updated!");
    });
    connection.release();
  });
  } catch (err){
    console.log(err);
  }
  // set start and end time for the day
};

const couponExpirer = () => {
  try{
    isExpired = true;
  db.getConnection(async (err, connection) => {
    if (err) {
      throw err;
    } else {
      await connection.query(`UPDATE coupons SET isExpired = ${isExpired}`);
      console.log("coupons expired!")
    }
    connection.release();
  });
  }catch (err) {
    console.log(err);
  }
};

// Schedule the task to run at 6am every day
cron.schedule("0 6 * * *", couponGenerator);

// Schedule the task to run at 8pm every day
cron.schedule("0 20 * * *", couponExpirer);

module.exports = router;