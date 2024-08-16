module.exports = function(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        req.flash('message', 'Please log in to view this page');
        res.redirect('/login');
    }
};
