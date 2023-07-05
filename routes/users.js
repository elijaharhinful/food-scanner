var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// GET contact form
router.get('/contact', (req,res,next)=>{
  res.render('contact', {title: 'Contact'})
});

module.exports = router;
