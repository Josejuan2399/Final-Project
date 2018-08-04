const async = require("async");
const express = require("express");
const okta = require("@okta/okta-sdk-nodejs");
const sequelize = require("sequelize");
const slugify = require("slugify");

const models = require("../models");

const client = new okta.Client({
  orgUrl: "https://dev-661879-admin.oktapreview.com",
  token: "00viLgpPPV9Nm4ILgR_kTeD6DDtu-HfZfL6ANYw20g"
});
const router = express.Router();

// Only let the user access the route if they are authenticated.
function ensureAuthenticated(req, res, next) {
  if (!req.user) {
    return res.status(401).render("unauthenticated");
  }

  next();
}

// Render the home page and list all blog posts
router.get("/", (req, res) => {
  models.Post.findAll({
    order: sequelize.literal("createdAt DESC")
  }).then(posts => {
    let postData = [];

    async.eachSeries(posts, (post, callback) => {
      post = post.get({ plain: true });
      client.getUser(post.authorId).then(user => {
        postData.push({
          title: post.title,
          body: post.body,
          createdAt: post.createdAt,
          authorName: user.profile.firstName + " " + user.profile.lastName,
          slug: post.slug
        });
        callback();
      }).catch(err => {
        postData.push({
          title: post.title,
          body: post.body,
          createdAt: post.createdAt,
          slug: post.slug
        });
        callback();
      });
    }, err => {
      return res.render("index", { posts: postData });
    });
  });
});

// Render the user dashboard
router.get("/dashboard", ensureAuthenticated, (req, res, next) => {
  models.Post.findAll({
    where: {
      authorId: req.user.id
    },
    order: sequelize.literal("createdAt DESC")
  }).then(posts => {
    let postData = [];

    posts.forEach(post => {
      postData.push(post.get({ plain: true }));
    });

    return res.render("dashboard", { posts: postData });
  });
});

// Create a new post
router.post("/dashboard", ensureAuthenticated, (req, res, next) => {
  models.Post.create({
    title: req.body.title,
    body: req.body.body,
    authorId: req.user.id,
    slug: slugify(req.body.title).toLowerCase()
  }).then(newPost => {
    models.Post.findAll({
      where: {
        authorId: req.user.id
      },
      order: sequelize.literal("createdAt DESC")
    }).then(posts => {
      let postData = [];

      posts.forEach(post => {
        postData.push(post.get({ plain: true }));
      });

      res.render("dashboard", { post: newPost, posts: postData });
    });
  });
});




module.exports = router;