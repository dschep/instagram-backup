'use strict';

const InstagramPosts = require('instagram-screen-scrape').InstagramPosts;
const Promise = require('bluebird');
const streamToPromise = require('stream-to-promise');
const fetch = require('node-fetch')

const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(require('bluebird'));

const s3 = new AWS.S3();


module.exports.instagramToS3 = (event, context, callback) => {
  var bucketContents;
  s3.listObjects({Bucket: process.env.s3Bucket}).promise()
    .then((resp) => {
      bucketContents = resp.Contents;
      return streamToPromise(new InstagramPosts({
        username: process.env.screenName
      }));
    })
    .then((posts) => Promise.filter(posts, (post) => Boolean(bucketContents.indexOf(`${post.id}.jpg`))))
    .then((posts) => Promise.map(posts, (post) => {
      const fileName = (new Date(post.time * 1000)).toISOString() + '.jpg';
      return fetch(post.media)
        .then((resp) => resp.buffer())
        .then((buffer) => {
          return s3.putObject({
            Bucket: process.env.s3Bucket,
            Key: fileName,
            Body: buffer,
          }).promise();
        })
    }))
    .then((images) => callback(null, {statusCode: 200, body: 'ok'}));
};
