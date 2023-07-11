const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');

module.exports = function (passport) {

    passport.use(new LocalStrategy(function (username, password, done) {

        User.findOne({
            username: username
        }, function (err, user) {
            if (err)
                console.log(err);

            if (!user) {
                return done(null, false, {
                    message: 'No user found!'
                });
            }

            // Make sure the user has been verified
            if (!user.isVerified) {
                return done(null, false, {
                    message: 'Your account has not been verified. Verify account!'
                });
            }

        });

    }));

    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

}
