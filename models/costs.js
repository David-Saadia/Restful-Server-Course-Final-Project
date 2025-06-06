const mongoose  = require('mongoose');
const Schema = mongoose.Schema;

const CostsSchema = new Schema({
    description:{
        type: String,
        required: true
    },
    category:{
        type: String,
        enum:{
            values: ["food", "health", "housing", "sport","education"],
            message: `Category {VALUE} does not fit in given set of categories.`},
        required: true
    },
    userid:{
        type: Number,
        min: [1,"Invalid User ID. Must be greater than 0."],
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