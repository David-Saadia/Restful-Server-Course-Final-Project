require('dotenv').config(); // environment variables import
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

//Setup app instance
const apiRouter = require('./routes/api');
const app = express();

//Connect to MongoDB
mongoose.connect(process.env.MONGOOSE_URI)
    .then( () => console.log('Connected to MongoDB Atlas successfully'))
    .catch( (err) => console.log('MongoDB Atlas connection error:',err)
);

// Configuration setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRouter);


module.exports = app;
