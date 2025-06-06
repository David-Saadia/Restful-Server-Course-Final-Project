const request = require('supertest'); //Testing using local app
const app = require('../app');


const axios = require('axios');// Testing using real server
const BASE_URL = 'http://localhost:3000';
const LIVE = false;

describe('Testing the /about endpoint...', ()=>{
    const expectation = [
        {first_name: "David", last_name: "Saadia"},
        {first_name: "Avivit", last_name: "Lazra"}
    ];

    it('Testing GET request at endpoint',async ()=> {
        const response =  await request(app).get('/api/about');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(expectation);
    });

});



describe('Testing the /users/:id endpoint...', ()=> {
    let userId = 123123
    const path = `/api/users/`
    it("Testing correct GET request at endpoint",async ()=> {
        const response =  await request(app).get(path + userId);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('first_name', 'mosh');
        expect(response.body).toHaveProperty('last_name', "israeli");
        expect(response.body).toHaveProperty('id', userId);
        expect(response.body).toHaveProperty('total');
    });

    it("Testing bad GET request at endpoint - Cause: User doesn't exist.",async ()=> {
        userId = 12341234;
        const response =  await request(app).get(path + userId);
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('errorMessage');
    });

    it("Testing bad GET request at endpoint - Cause: Bad ID string.",async ()=> {
        userId = "1234AB1234";
        const response =  await request(app).get(path + userId);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errorMessage');
    });

});

describe('Testing the addToUserTotal function..',  ()=> {
    const User = require("../models/users");
    const {addToUserTotal} = require('../controllers/usersController');
    const dummyUserID = 64209
    beforeAll(async () => {
        await User.create({id:dummyUserID,first_name:"Johnny", last_name: "Bravo"}); });

    afterAll(async () => {
        await User.deleteOne({id:dummyUserID}); });

    it("Testing adding a positive sum",async ()=>{
        addToUserTotal(dummyUserID, 20);
        const response = await request(app).get(`/api/users/${dummyUserID}`);
        expect(response.body.total).toBe(20);
    });
    it("Testing adding a negative sum",async ()=>{
        addToUserTotal(dummyUserID, -20);
        const response = await request(app).get(`/api/users/${dummyUserID}`);
        expect(response.body.total).toBe(0);
    });
});

//If server is not LIVE, we don't run these test
LIVE?
    describe('Testing Live Server (run live server)',() =>{
        describe('Testing the /about endpoint...', ()=> {
            const expectation = [
                {first_name: "David", last_name: "Saadia"},
                {first_name: "Avivit", last_name: "Lazra"}
            ];
            it('Testing GET request at endpoint', async ()=> {
                // if (!LIVE) return;
                const response =  await axios.get(BASE_URL + '/api/about');

                expect(response.status).toBe(200);
                expect(response.data).toMatchObject(expectation);
            });
        });
        describe('Testing the /users/:id endpoint...', ()=> {
            let userId = 123123
            const path = `/api/users/`
            it("Testing correct GET request at endpoint",async ()=> {
                const response =  await axios.get(BASE_URL + path + userId);

                expect(response.status).toBe(200);
                expect(response.data).toHaveProperty('first_name', 'mosh');
                expect(response.data).toHaveProperty('last_name', "israeli");
                expect(response.data).toHaveProperty('id', userId);
                expect(response.data).toHaveProperty('total');
            });

            it("Testing bad GET request at endpoint - Cause: User doesn't exist.", async ()=> {
                userId = 12341234
                try{
                   await axios.get(BASE_URL + path + userId);
                }catch(err){
                    expect(err.response.status).toBe(404);
                    expect(err.response.data).toHaveProperty('errorMessage');
                }
            });

            it("Testing bad GET request at endpoint - Cause: Bad ID string.",async ()=> {
                userId = "1234AB1234";
                try{
                    await axios.get(BASE_URL + path + userId);
                }catch(err){
                    expect(err.response.status).toBe(400);
                    expect(err.response.data).toHaveProperty('errorMessage');
                }
            });
        });
    })
    : null;
