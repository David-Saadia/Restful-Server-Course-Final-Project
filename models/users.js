const mongoose  = require('mongoose');
const Schema = mongoose.Schema;

const UsersSchema = new Schema({
    id:{
        type:Number,
        required:true,
        min: [1,"Invalid User ID. Must be greater than 0."],
        unique:true,
    },
    first_name:{
        type: String,
        required: true
    },
    last_name:{
        type: String,
        required: true
    },
    birthday:{
        type: Date,
        default: Date.now()
    },
    martial_status:{
        type: String,
    },
    total:{
        type:Number,
        default:0
    }
});

module.exports = mongoose.model('users', UsersSchema);