const http = require('http')
const path = require('path') // core node module,it is no need to install it
const express = require('express') //installed with npm i express from terminal and imported in file
const socketio = require('socket.io') // when we call library we get function back...socketio()
const Filter = require('bad-words')
const { generateMessage } = require('./utils/messages')
const { generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname,'../public')

app.use(express.static(publicDirectoryPath))

let count = 0

io.on('connection',(socket) => {
    console.log('Welcome!')

    socket.on('join',(options, callback) => {

        const { error, user } = addUser({id: socket.id, ...options})//socket.id is unified identifier for that connection

        if(error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message',generateMessage('Welcome','Admin'))
        socket.broadcast.to(user.room).emit('message',generateMessage(`${user.username} has joined!`,'Admin')) //sending message to all connected users in room expect itself
        io.to(user.room).emit('roomData',{
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })
    
    socket.on('sendMessage',(message,callback) => {

        const filter = new Filter
        //unable profanity
        if(filter.isProfane(message)) {
            return callback('Profanity is not allowed')
        }

 
        const user = getUser(socket.id)

        io.to(user.room).emit('message',generateMessage(message,user.username))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage( `${user.username} has left!`,'Admin'))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })


    socket.on('sendLocation',(coords,callback) => {

        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage',generateLocationMessage(`https://google.com/maps?q=${coords.latitude},${coords.longitude}`,user.username))
        callback('The location was shared')
    })
})


server.listen(port, () => {
    console.log(`Server is up on port ${port}`)
})


