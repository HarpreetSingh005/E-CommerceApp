const express = require('express')
const session = require('express-session')
const app = express()
const port = process.env.PORT || 3000

app.set("view engine", "ejs");
app.use(express.static("public"));

const init = require('./models/mongoose');
init();

const ProductModel = require('./models/product');
const UserModel = require('./models/user');

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
}));

app.use(express.urlencoded({ extended: true }));


//HOME
app.get("/", (req,res) => {


  ProductModel.find({}).then((products) => {
    if(!req.session.user)
      res.render("home",{user:false,username:"",products});
    else{
      res.render("home",{user:true,username:req.session.name,products});
    }
  }).catch(() => {
    console.log("Error calling list");
    res.redirect("/logout");
    return;
  })
    
})


//Product Template
app.get("/getDetails/:id", (req,res) => {
  const {id} = req.params;

  ProductModel.findById(id).then( (data) =>{
    console.log("Page Presented");
    res.render("detail",{data});
  }).catch((data) =>{
    console.log("Error Presenting Page");
    console.log(data);
    res.redirect("/");
  })
})

//Adding to Cart
app.get("/addToCart/:id",(req,res) => {
  const {id} = req.params;

  if(!req.session.user){
    res.redirect("/login");
    return;
  }

  UserModel.findOne({username:req.session.username}).then((user) => {

    let find = false;
    let pro = user.cart;
    let quant = 1;

    user.cart.forEach((data) => {
      if(data.id == id){
        find=true;
        return;
      }
    })

    if(find){
      console.log("Already in Cart");
      return;
    }

    pro.push({id,quant});

    UserModel.findOneAndUpdate({username:user.username},{cart:pro}).then((dt) => {
      console.log("Added to Cart "+id);
    }).catch((data) => {
      console.log("Error Adding to Cart"+data);
    })    
  }).catch((data) => {
    console.log("Error Adding to Cart"+data);
  })

  res.redirect("/");
})


//Go To Cart
app.get("/userCart",(req,res) => {

  if(!req.session.user){
    res.redirect("/login");
    return;
  }

  UserModel.findOne({username:req.session.username}).then((user) => {
    let products = [];
    let sum = 0;

    user.cart.forEach((data) => {
      ProductModel.findById(data.id).then((dt) => {
        sum += data.quant*dt.price;
        products.push({quant:data.quant,pro:dt});
      }).catch(() => {
        console.log("Product Not Found "+data);
      })
    })

    setTimeout(() => {
      res.render("cart",{username:req.session.name,products,sum});
    },1000);
    
  }).catch(() => {
    console.log("Cart Display Error");
    res.redirect("/signup");
  })
})

//Remove from Cart
app.get("/removeCart/:id",(req,res) => {
  const {id} = req.params;

  UserModel.findOne({username:req.session.username}).then((user) => {

    let temp = user.cart;
    temp = temp.filter((data) => {
      if(data.id != id){
        return true;
      }
    })

    UserModel.findOneAndUpdate({username:user.username},{cart:temp}).then((dt) => {
      console.log("Removed from Cart "+id);
    }).catch((data) => {
      console.log("Error removing from Cart"+data);
    })    
  }).catch((data) => {
    console.log("Error removing from Cart"+data);
  })

  res.redirect("/userCart");
})

//Quantity Increment
app.get("/plus/:id",(req,res) => {
  const {id} = req.params;

  UserModel.findOne({username:req.session.username}).then((user) => {

    let list = user.cart;

    list.forEach((data) => {
      if(data.id == id)
        data.quant++;
    })

    UserModel.findOneAndUpdate({username:req.session.username},{cart:list}).then(() => {
      console.log("Increment");
    }).catch(() => {
      console.log("Increment Error");
    })
  })

  res.redirect("/userCart");
})

//Quantity Decrement
app.get("/minus/:id",(req,res) => {
  const {id} = req.params;
  
  UserModel.findOne({username:req.session.username}).then((user) => {

    let list = user.cart;

    list.forEach((data => {
      if(data.id == id)
        data.quant--;
    }))

    UserModel.findOneAndUpdate({username:req.session.username},{cart:list}).then(() => {
      console.log("Decrement");
    }).catch(() => {
      console.log("Decrement Error");
    })
  })

  res.redirect("/userCart");
})

//checkOut
app.get("/checkout/:sum",(req,res) => {

  const {sum} = req.params;

  if(!req.session.user){
    res.redirect("/")
    return;
  }

  UserModel.findOneAndUpdate({username:req.session.username},{cart:[]}).then(() => {
    console.log("Purchase Successful");
    res.render("checkout",{sum});
  }).catch(() => {
    console.log("Purchase Error");
    res.redirect("/userCart");
  })
})



//ADMIN
app.get("/admin",(req,res) => {

  if(req.session.user){
    console.log("ADMIN LOGGEDIN");
    res.render("admin",{user:true,username:req.session.name,products:[]});
  }else
    res.redirect("/");
  return;
})

//Add product to list
app.post("/addproduct",(req,res) => {
  const {name,description,price,quantity,link} = req.body;

  let product = new ProductModel();

  product.name = name;
  product.description = description;
  product.price = price;
  product.quantity = quantity;
  product.link = link || "https://redzonekickboxing.com/wp-content/uploads/2017/04/default-image-620x600.jpg";

  product.save().then(() => {
    console.log("Added Succesfully");
    res.render("admin",{user:true,username:req.session.name,products:[]});
  }).catch(() => {
    console.log("Product Add Error");
    res.render("admin",{user:true,username:req.session.name,products:[]});
  })
})

//Shows List at Admin page
app.get("/showlist",(req,res) => {
  ProductModel.find({}).then((products) => {
    console.log("List Passed");
    res.render("admin",{user:true,username:req.session.name,products});
  }).catch(() => {
    console.log("List Error");
    res.render("admin",{user:true,username:req.session.name,products:[]});
  })
})

//Delete product from DB
app.get("/delete/:id",(req,res) => {
  const {id} = req.params;

  ProductModel.findByIdAndDelete(id).then(() =>{
    console.log("Deleted");
    res.redirect("/showlist");
  }).catch(() => {
    console.log("Delete Error");
    res.redirect("/showlist");
  })
})

//Upadte Product details
app.post("/edit/:id",(req,res) =>{
  const {id} = req.params;
  const {name,description,price,quantity,link} = req.body;

  if(!link)
    link = "https://redzonekickboxing.com/wp-content/uploads/2017/04/default-image-620x600.jpg";

  ProductModel.findByIdAndUpdate(id,{name,description,price,quantity,link}).then(() =>{
    console.log("Product Updated");
    res.redirect("/showlist");
  }).catch(() =>{
    console.log("Update Error");
    res.redirect("/showlist");
  })
})




//LOGIN
app.post("/login_submit",(req,res) =>{

  const {username,password} = req.body;

  UserModel.findOne({username}).then((data) => {
    if(data.pwd != password){
      console.log("Details Mismatch");
      res.render('login',{errp:"Details Mismatch"});
      return;
    }

    req.session.user = true;
    req.session.admin = data.isAdmin;
    req.session.name = data.name;
    req.session.username = data.username;

    console.log("LoggedIn "+username);

    //Admin redirect
    if(data.isAdmin)
      res.redirect("/admin");
    else
      res.redirect("/");
  }).catch(() => {
    console.log("Account doesn't exist");
    res.render('login',{errp:"Account Doesn't exist"});
  })

})


app.get("/login", (req,res) => {

  if(req.session.user){
    res.redirect("/");
    return;
  }

  console.log("LOGIN");
	res.render("login",{errp:""});
  return;
})





//SIGNUP
app.post("/signup_submit",(req,res) =>{

  const {name,username,password,cpassword} = req.body;


  UserModel.findOne({username}).then((data) => {

    if(data != null){
      console.log("Already Exists");
      res.render("signup",{errp:"User already exists"});
      return;
    }

    if(password != cpassword){
      console.log("Password Mismatch");
      res.render("signup",{errp:"Password Mismatch"});
      return;
    }

    let isAdmin = false;

    let salt = Math.random()*100;

    let user = new UserModel();

    user.name = name;
    user.username = username;
    user.pwd = password;
    user.isAdmin = isAdmin;
    user.cart = [];
    user.salt = salt;

    user.save().then(() => {
      console.log(user);
      res.redirect("/login");
    }).catch((data) => {
      console.log("Error in SignUp"+data);
      res.redirect("/signup");
    })    
  }).catch((data) => {
    console.log("Error in SignUp Outer"+data);
    res.redirect("/signup");
  })
})


app.get("/signup", (req,res) => {

  if(req.session.user){
    res.redirect("/");
    return;
  }

  console.log("SIGNUP");
	res.render("signup",{errp:""});
  return;
})



//LOGOUT
app.get("/logout",(req,res)=>{
  req.session.user=false;
  req.session.name="";
  req.session.username="";
  res.redirect("/");
})

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
})
