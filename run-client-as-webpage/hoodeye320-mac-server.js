var express = require('express');
var app = express();

app.use(express.static('../HoodEye320'));

app.listen(4040);
