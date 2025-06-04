const mongoose  = require('mongoose');
const Schema = mongoose.Schema;

const ReportsSchema = new Schema({
    userid: {
        type: Number,
        required: true
    },
    year:{
        type: Number,
        required: true
    },
    month:{
        type: Number,
        required: true
    },
    costs:{
        type: Array,
        required: true
    },
    createdAt:{
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model('Report', ReportsSchema);