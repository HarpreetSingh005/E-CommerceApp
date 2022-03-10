const mongoose = require('mongoose');

const url = "mongodb+srv://harpreet2002:harpreet123@cluster0.mshb0.mongodb.net/ecom?retryWrites=true&w=majority"

module.exports = function()
{
  mongoose.connect(url).then(function()
  {
    console.log("DB Connected")
  })  
  .catch(function(error)
  {
    console.log(error)
  })
}
