const mongoose  = require('mongoose');
const Schema = mongoose.Schema;

const UsersSchema = new Schema({
    id:{
        type:String,
        required:true,
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
        type: String,
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