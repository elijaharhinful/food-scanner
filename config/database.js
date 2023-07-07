const mysql = require("mysql");

//create connection to database
const db = mysql.createPool({
  connectionLimit: 100,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

//conect to database
main().catch((err) => console.log(err));

async function main() {
  if (process.env.NODE_ENV === "development") {
    await db.getConnection((err) => {
      if (err) throw err;

      console.log("Connected to MySQL DB local");
    });
  } else if (process.env.NODE_ENV === "production") {
    await db.getConnection((err) => {
      if (err) throw err;

      console.log("Connected to MySQL DB online");
    });
  }
}

module.exports = db;
