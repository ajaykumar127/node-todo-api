/*jshint esversion: 6 */

require('./config/config.js');

var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');
var {ObjectID} = require('mongodb');

var {mongoose} = require('./db/mongoose.js');
var {Todo} = require('./models/todo.js');
var {User} = require('./models/user.js');
var {authenticate} = require('./middleware/authenticate.js');

var app = express();
const port = process.env.PORT;

app.use(bodyParser.json());



/******************************************************************************
██    ██ ███████ ███████ ██████      ██████   ██████  ██    ██ ████████ ███████ ███████
██    ██ ██      ██      ██   ██     ██   ██ ██    ██ ██    ██    ██    ██      ██
██    ██ ███████ █████   ██████      ██████  ██    ██ ██    ██    ██    █████   ███████
██    ██      ██ ██      ██   ██     ██   ██ ██    ██ ██    ██    ██    ██           ██
 ██████  ███████ ███████ ██   ██     ██   ██  ██████   ██████     ██    ███████ ███████
******************************************************************************/

app.post('/users', async (req, res) => {
  try {
    const user = new User( {email: req.body.email, password: req.body.password} );
    await user.save();
    const token = await user.generateAuthToken();
    res.header('x-auth', token).send(user);
  } catch (err) {
    res.status(400).send();
  }
});

app.get('/users/me', authenticate, (req, res) => {
  res.send(req.user);
});

app.post('/users/login', async (req, res) => {
  try {
    const userReq = new User( {email: req.body.email, password: req.body.password} );
    const user = await User.findByCredentials(userReq.email, userReq.password);
    const token = await user.generateAuthToken();
    res.header('x-auth', token).send(user);
  } catch (err) {
    res.status(400).send();
  }
});

app.delete('/users/me/token', authenticate, async (req, res) => {
  try {
    await req.user.removeToken(req.token);
    res.status(200).send();
  } catch (err) {
    res.status(400).send();
  }
});


/******************************************************************************
████████  ██████  ██████   ██████  ███████     ██████   ██████  ██    ██ ████████ ███████ ███████
   ██    ██    ██ ██   ██ ██    ██ ██          ██   ██ ██    ██ ██    ██    ██    ██      ██
   ██    ██    ██ ██   ██ ██    ██ ███████     ██████  ██    ██ ██    ██    ██    █████   ███████
   ██    ██    ██ ██   ██ ██    ██      ██     ██   ██ ██    ██ ██    ██    ██    ██           ██
   ██     ██████  ██████   ██████  ███████     ██   ██  ██████   ██████     ██    ███████ ███████
******************************************************************************/

app.post('/todos', authenticate, (req, res) => {
  var todo = new Todo({
    text: req.body.text,
    completed: req.body.completed,
    completedAt: req.body.completedAt,
    _creator: req.user._id
  });

  todo.save().then((doc) => {
    res.send(doc);
  }).catch((error) => {
    res.status(400).send(error);
  });
});


app.get('/todos', authenticate, (req, res) => {
  Todo.find({
    _creator: req.user._id
  }).then((todos) => {
    res.send({todos});
  }, (error) => {
    res.status(400).send(error);
  });
});


app.get('/todos/:id', authenticate, (req, res) => {
  var id = req.params.id;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  Todo.findOne({
    _id: id,
    _creator: req.user._id
  }).then((todo) => {
    if (!todo) {
      return res.status(404).send();
    }
    res.send({todo});
  }).catch((error) => {
    res.status(400).send();
  });
});


app.delete('/todos/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectID.isValid(id)) {
      return res.status(404).send();
    }

    const todo = await Todo.findOneAndRemove( {_id: id, _creator: req.user._id} );
    if (!todo) {
      return res.status(404).send();
    }
    res.send({todo});
  } catch (err) {
    res.status(400).send();
  }
});


app.patch('/todos/:id', authenticate, (req, res) => {
  var id = req.params.id;
  var body = _.pick(req.body, ['text', 'completed']);

  if (!ObjectID.isValid(id)) {
      return res.status(404).send();
  }

  if (body.completed && _.isBoolean(body.completed)) {
    body.completedAt = new Date().getTime();
  } else {
    body.completed = false;
    body.completedAt = null;
  }

  Todo.findOneAndUpdate(
    {
      _id: id,
      _creator: req.user._id
    },
    {$set: body},
    {new: true}
  ).then((todo) => {
    if (!todo) {
      return res.status(404).send();
    }
    res.send({todo});
  }).catch((error) => {
    res.status(400).send();
  });
});


app.listen(port, () => {
  console.log(`Started on port ${port}`);
});

module.exports = {app};
