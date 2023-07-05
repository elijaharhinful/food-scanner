var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res, next)=> {
  res.render('index', { title: 'Ad Homepage' });
});

// GET win page
router.get('/win', (req,res,next)=>{
    res.render('win', { title: 'Winner' });
});

// GET coupon from winner
router.get('/win/:coupon', (req,res,next)=>{
  // check if coupon is in the database
  // if coupon is in the database check if it is valid
  // if it is valid redirect to form page and ask user to fill form
  res.redirect('index')
});

// GET lose page
router.get('/lose', (req,res,next)=>{
    res.render('lose', { title: 'Sorry' });
});

// GET early page
router.get('/early', (req,res,next)=>{
  res.render('early', {title: 'Early'})
});

module.exports = router;
