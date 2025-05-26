const mongoose  = require('mongoose');
const Schema = mongoose.Schema;

const CostsSchema = new Schema({
    description:{
        type: String
    },
    category:{
        type: String,
        required: true
    },
    userid:{
        type: String,
        required: true
    },
    sum:{
        type: Number,
    },
    date:{
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Cost', CostsSchema);