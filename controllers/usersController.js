const User = require("../models/users");

/**
 * This function retrieves a specific user using the id url parameter and returns
 * it in the requested format {first_name, last_name, id, total}.
 * @param response - The response to send back to the client
 * @param request - The request received from the client
 * @param {Number} request.params.id - The user id to match.
 * @returns {Promise<*>}
 */
exports.getUser = async (request, response) =>{
    //Making sure the id parameter does not contain any letters and is not just 0.
    if(!/^0*[1-9][0-9]*$/.test(request.params.id)){
        return response.status(400).json({"errorMessage":"Invalid User ID. User ID must contain only digits."})}

    const userid = parseInt(request.params.id);

    try{
        const userResult = await User.findOne({ id: userid });
        if(!userResult){
            console.log("No user found");
            return response.status(404).json({"errorMessage": "No user found"}); }
        /** Because we implemented the Computed Design Pattern, we no longer need to retrieve all of
         * the user's expenses and calculate the total. Instead, we have the total attribute rightly available.**/
        const {first_name, last_name, total} = userResult;
        response.status(200).json({first_name,last_name,id:userid, total});
    }
    catch(err){
        console.log(err);
        return response.status(500).json({"errorMessage": "Something went wrong...\n"+ err.message});
    }

}

/**
 * This function satisfies the /about end-point to return a hard-coded json object
 * detailing the participating students details.
 * @param request - request from the client
 * @param response -response to the client
 * @returns {Promise<void>}
 */
exports.aboutUs = async (request, response) =>{
    response.status(200).json([
        {first_name: "David", last_name: "Saadia"},
        {first_name: "Avivit", last_name: "Lazra"}
    ]);
}

/**
 * This function adds an expense item sum value to the total attribute of a given user.
 * @param {Number} userid - The userId to match for
 * @param {Number} sum - The sum value to add to the total
 * @returns {Promise<boolean>}
 */
exports.addToUserTotal = async (userid, sum) =>{
    //Find the user by their id, increase their total by the sum, and return the new document.
        const userResult = await User.findOneAndUpdate(
            { id: userid },{$inc:{total: sum}}, {new: true} );
        if(!userResult){
            console.log("User not found.\nAdding expense to user total failed.");
            return false;
        }
        return true;
}
