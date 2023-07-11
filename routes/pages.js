const express = require("express");
const router = express.Router();
const db = require("../config/database");
const cron = require("node-cron");

const { DateTime, Duration } = require("luxon");
const voucher = require("voucher-code-generator");

// router.get("/:coupon", (req, res, next) => {
//   let coupon = req.params.coupon;

//   try {
//     getQuery = "SELECT * FROM coupons WHERE coupon = ?";
//     postQuery = "UPDATE coupons SET scans = ? WHERE coupon = ?";

//     if (coupon.length !== 6) {
//       res.redirect("/absent");
//     } else {
//       db.getConnection(async (err, connection) => {
//         if (err) throw err;
//         await connection.query(getQuery, [coupon], async (err, result) => {
//           if (result === null || result.length === 0) {
//             res.redirect("/absent");
//             connection.release();
//           } else {
//             if (result[0].coupon && result[0].isExpired === "false") {
//               if (result[0].scans <= 5) {
//                 let scans = result[0].scans + 1;
//                 await connection.query(
//                   postQuery,
//                   [scans, coupon],
//                   (err, result) => {
//                     if (err) throw err;
//                     if (typeof req.session.coupon == "undefined"){
//                       req.session.coupon = [];
//                       req.session.coupon = coupon;
//                     } else {
//                       req.session.coupon = coupon;
//                     }

//                     res.redirect("/ad");
//                     connection.release();
//                   }
//                 );
//               } else {
//                 res.redirect("/limit");
//                 connection.release();
//               }
//             } else if (result[0].coupon && result[0].isExpired === "true") {
//               req.session.coupon = [];
//               res.redirect("/ad");
//               connection.release();
//             } else {
//               res.redirect("/absent");
//               connection.release();
//             }
//           }
//         });
//       });
//     }
//   } catch (err) {
//     next(err);
//   }
// });

router.get("/index/:coupon", (req, res, next) => {
  let coupon = req.params.coupon;

  try {
    getQuery = "SELECT * FROM coupons WHERE coupon = ?";
    postQuery = "UPDATE coupons SET scans = ? WHERE coupon = ?";

    if (coupon.length !== 6) {
      res.redirect("/absent");
    } else {
      db.getConnection(async (err, connection) => {
        if (err) throw err;
        await connection.query(getQuery, [coupon], async (err, result) => {
          if (result === null || result.length === 0) {
            res.redirect("/absent");
            connection.release();
          } else {
            if (result[0].coupon && result[0].isExpired === "false") {
              if (result[0].scans <= 5) {
                let scans = result[0].scans + 1;
                await connection.query(
                  postQuery,
                  [scans, coupon],
                  (err, result) => {
                    if (err) throw err;
                    if (typeof req.session.coupon == "undefined") {
                      req.session.coupon = [];
                      req.session.coupon = coupon;
                      res.redirect("/ad");
                    connection.release();
                    } else {
                      req.session.coupon = coupon;
                      res.redirect("/ad");
                    connection.release();
                    }
                  }
                );
              } else {
                res.redirect("/limit");
                connection.release();
              }
            } else if (result[0].coupon && result[0].isExpired === "true") {
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
  res.render("win", { title: "Winner" });
});

// GET lose page
router.get("/lose", (req, res, next) => {
  res.render("lose", { title: "Sorry" });
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
  res.render("confirm", { title: "OK", credit: 0 });
});

const couponGenerator = () => {
  // set start and end time for the day
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
      isRedeemed VARCHAR(10),
    )`;
    const postCouponQuery =
      "INSERT INTO coupons (time, coupon, expirationTime,isExpired,scans) VALUES (?, ?, ? ,? ,? , ?)";

    await connection.query(createTableQuery, async (err, result) => {
      for (const pair of timeCouponPairs) {
        connection.query(postCouponQuery, [
          pair.time,
          pair.coupon,
          pair.expirationTime,
          isExpired,
          scans,
          isRedeemed,
        ]);
      }
    });

    const now = DateTime.now();
    if (now.hour === 19) {
      connection.query("UPDATE coupons SET isExpired = true");
    }

    res.send(timeCouponPairs);
    connection.release();
  });
};

const couponExpirer = () => {
  const now = DateTime.now();

  db.getConnection(async (err, connection) => {
    if (err) {
      throw err;
    } else if (now.hour === 19) {
      await connection.query("UPDATE coupons SET isExpired = true");
    }
  });
};

// Schedule the task to run at 6am every day
cron.schedule("0 6 * * *", couponGenerator);

// Schedule the task to run at 8pm every day
cron.schedule("0 20 * * *", couponExpirer);

module.exports = router;
