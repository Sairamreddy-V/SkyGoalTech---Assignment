const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors());

const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const filePath = path.join(__dirname, '/database/database.db');

let db;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: filePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`Server Running on port 3000...`);
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
  }
};

initializeDbAndServer();

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hassedPassword = await bcrypt.hash(password, 10)
  const userQuery = `
    SELECT 
      * 
    FROM 
      user
    WHERE 
      username = '${username}'`
  const dbUser = await db.get(userQuery)
  console.log(dbUser)
  console.log(password.length)

  if (dbUser === undefined) {
    if (password.length >= 5) {
      const addUser = `
            INSERT INTO user(username,name,password,gender,location)
            VALUES(
                '${username}',
                '${name}',
                '${hassedPassword}',
                '${gender}',
                '${location}'
                )`
      await db.run(addUser)
      response.send(`Successful registration of the registrant`)
    } else {
      response.send(`Password is too short`)
    }
  } else {
    response.send(`User already exists`)
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const userQuery = `
  SELECT 
    *
  FROM 
    user
  WHERE 
    username='${username}';`
  const dbUser = await db.get(userQuery)
  if (dbUser === undefined) {
    response.status = 400
    response.send(`Invalid user`)
  } else {
    const isPasswordMach = await bcrypt.compare(password, dbUser.password)
    console.log(isPasswordMach)
    if (isPasswordMach == true) {
      const payLoad = {username: username}
      const jwtToken = jwt.sign(payLoad, 'sai_token')
      response.send({jwtToken})
    } else if (isPasswordMach == false) {
      response.status = 400
      response.send(`Invalid password`)
    }
  }
})


// changing th password
app.put('/change-password', async (requset, response) => {
  const {username, oldPassword, newPassword} = requset.body
  console.log(username)
  const userQuery = `
  SELECT 
    *
  FROM 
    user
  WHERE 
    username = '${username}'`
  const dbUser = await db.get(userQuery)
  const isPasswordMatch = await bcrypt.compare(oldPassword, dbUser.password)
  if (isPasswordMatch) {
    if (newPassword.length >= 5) {
      const hassedNewPassword=await bcrypt.hash(newPassword,10)
      const updateUser = `
      UPDATE 
        user
      SET(
        password='${hassedNewPassword}';
      )`
      const user = await db.run(updateUser)
      response.send('Password updated')
    } else {
      response.send(`Password is too short`)
    }
  } else {
    response.send('Invalid current password')
  }
})


//middleware function
const accesstokenfunction = (request, response, next) => {
  const authorHeader = request.headers['authorization']
  let jwtToken
  if (authorHeader !== undefined) {
    jwtToken = authorHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status = 401
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'sai_token', async (error, user) => {
      if (error) {
        response.status = 401
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

//getting all the user details 

app.get('/all-users',accesstokenfunction,async(request,response)=>{
  const query=`
    SELECT 
      *
    FROM  
      user
  `
  const result= await db.all(query)
  response.status(200).send({result})
})

app.delete('/delete/:id',accesstokenfunction,async(request,response)=>{
  const id=request.params
  const query= `
    DELETE FROM   
      user
    WHERE
      id=${id}
  `
  await db.run(query)
  response.send("User deleted successfully")
})