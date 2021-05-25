require("dotenv").config();
const express = require("express");
const mysql = require("mysql");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);
///MONGOOSE///
const Schema = mongoose.Schema;

mongoose
  .connect(process.env.MONGO_BAGLANTI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("başırılı");
  })
  .catch((err) => {
    console.log("HATA", err);
  });
///MONGOOSE///

//Session//
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    proxy: true,
    name: "omer-asim-bilgiler",
  })
);
app.use(passport.initialize());
app.use(passport.session());

/* Session*/

///MONGOOSE ŞEMA///
const kullaniciSema = new mongoose.Schema({
  isim: String,
  soyisim: String,
  email: String,
  rol: String,
  sifre: String,
});
kullaniciSema.plugin(passportLocalMongoose, {
  /* Kayıt ve Giriş İşlemlerinde kontrol edeceği yerler */
  usernameField: "email",
  passwordField: "sifre",
});
///MONGOOSE ŞEMA///

///MONGOOSE MODEL///
const Kullanici = mongoose.model("Kullanici", kullaniciSema);
passport.use(Kullanici.createStrategy()); /*PASSPORT İLE BAĞLANTI KURULDU */

passport.serializeUser(function (user, done) {
  /*Tarayıcıya Cookie Oluşturur */ done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  /*Tarayıcadaki Cookie'yi alıp kontrol işlemi */ Kullanici.findById(
    id,
    function (err, user) {
      done(err, user);
    }
  );
});

///MONGOOSE MODEL///

////MYSQL///////
var conneciton = mysql.createConnection({
  multipleStatements: true,
  user: process.env.MYSQL_USER,
  host: process.env.MYSQL_HOST,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

conneciton.connect((err) => {
  if (err) throw err;
  console.log("MYSQL'E BAĞLANDI...");
});
////MYSQL///////
///MONGOSE YENİ KULLANICI OLUSTURMA ///

app.post("/api/kayit", (req, res) => {
  Kullanici.register(
    {
      isim: req.body.isim,
      soyisim: req.body.soyisim,
      email: req.body.email,
    },
    req.body.sifre /*ŞİFRELİNCEK YER */,
    (err, gelenveri) => {
      if (err) {
        if (err.name === "UserExistsError") {
          /*DAHA ÖNCE KULLANILMIŞ MAİLMİ ??? */
          res.send({ sonuc: "Email" });
        } else {
          res.send({ sonuc: "HATA" });
        }
      } else {
        passport.authenticate("local")(req, res, function () {
          res.send({ sonuc: "başarılı" });
        });
      }
    }
  );
});
app.post("/api/user/login", (req, res) => {
  var kullanici = new Kullanici({
    email: req.body.email,
    sifre: req.body.sifre,
  });
  req.logIn(kullanici, (err) => {
    if (err) {
      res.send({ sonuc: "HATA" });
    } else {
      passport.authenticate("local")(req, res, () => {
        res.send({ sonuc: "Giriş Başarılı" });
      });
    }
  });
});
app.post("/api/admin_login", (req, res) => {
  var kullanici = new Kullanici({
    email: req.body.email,
    sifre: req.body.sifre,
  });
  req.logIn(kullanici, (err) => {
    if (err) {
      res.json({ sonuc: "HATA" });
    } else {
      passport.authenticate("local")(req, res, () => {
        if (req.user.rol !== "admin") {
          req.logOut();
          res.send({ sonuc: "ADMİN DEĞİLSİN" });
        } else {
          res.status(200).send({ sonuc: true });
        }
      });
    }
  });
});
app.get("/api/user/logout", (req, res) => {
  req.logOut();
  res.send({ sonuc: "ÇIKIŞ BAŞARILI" });
});
app.get("/api/user/check", (req, res) => {
  if (req.isAuthenticated()) {
    res.send({ sonuc: true });
  } else {
    res.send({ sonuc: false });
  }
});
app.get("/api/user/information", (req, res) => {});

///MONGOSE YENİ KULLANICI OLUSTURMA ///

app.get("/", (req, res) => {
  var sql =
    "SELECT * FROM kitaplar ; SELECT * FROM kitaplar WHERE kategori ='Roman' ";
  conneciton.query(sql, (err, results, fields) => {
    if (err) throw err;
    var tumKitaplar = results[0];
    var romanlar = results[1];
    res.send({ roman: romanlar, hepsi: tumKitaplar });
  });
});
app.get("/api/coksatanlar", (req, res) => {
  var sql =
    "SELECT * FROM kitaplar ORDER BY satilma DESC LIMIT 5 ; SELECT * FROM kitaplar ORDER BY id DESC LIMIT 5";
  conneciton.query(sql, (err, results, fields) => {
    var satilma = results[0];
    var yeni = results[1];
    res.send({ satilma: satilma, yeni: yeni });
  });
});

app.get("/api/kitap/:id", (req, res) => {
  var id = req.params.id;
  var sql = "SELECT * FROM kitaplar Where id=?";
  var insert = [id];
  conneciton.query(sql, insert, (err, results, fields) => {
    if (err) throw err;
    res.send(results);
  });
});
app.get("/api/arama", (req, res) => {
  var sql = "SELECT isim,id FROM kitaplar";
  conneciton.query(sql, (err, results, fields) => {
    if (err) res.send({ hata: "HATA" });
    res.send(results);
  });
});
app.get("/api/kategoriler", (req, res) => {
  try {
    var sql = "SELECT DISTINCT kategori FROM kitaplar";
    conneciton.query(sql, (err, results, fields) => {
      if (err) throw err;
      else {
        res.send(results);
      }
    });
  } catch (error) {
    console.log(error);
  }
});
app.get("/api/kategori/bireysel/:kategori", (req, res) => {
  try {
    var kategori = req.params.kategori;
    var sql = "SELECT * FROM kitaplar WHERE kategori=?";
    var insert = [kategori];
    conneciton.query(sql, insert, (err, results, fields) => {
      if (err) throw err;
      else {
        res.send(results);
      }
    });
  } catch (error) {
    console.log(error);
  }
});
app.post("/api/kitap-ekle", (req, res) => {
  var kitapisim = req.body.isim;
  var kategori = req.body.kategori;
  var yazar = req.body.yazar;
  var ind_fiyat = req.body.ind_fiyat;
  var normal_fiyat = req.body.normal_fiyat;
  var YayınEvi = req.body.YayınEvi;
  var aciklama = req.body.aciklama;
  var stok = req.body.stok;
  var zaman = new Date();
  var sonhali =
    zaman.getFullYear() +
    "-" +
    (zaman.getMonth() + 1) +
    "-" +
    zaman.getDate() +
    " " +
    zaman.toLocaleTimeString();
  var sql =
    "INSERT INTO kitaplar (isim,yazar,kategori,yayınevi,fiyat,aciklama,stok,ind_fiyat,satilma,tarih) VALUES(?,?,?,?,?,?,?,?,0,?)";
  var insert = [
    kitapisim,
    yazar,
    kategori,
    YayınEvi,
    normal_fiyat,
    aciklama,
    stok,
    ind_fiyat,
    sonhali,
  ];
  conneciton.query(sql, insert, (err, results, fields) => {
    if (err) throw err;
    else {
      res.send(results);
    }
  });
});
app.delete("/api/kitapsil", (req, res) => {
  var sql = "DELETE FROM kitaplar WHERE id=?";
  var id = [req.query.id];
  conneciton.query(sql, id, (err, results, fields) => {
    if (!err) res.send({ sonuc: true });
    else {
      res.send({ sonuc: false });
    }
  });
});
app.patch("/api/update", (req, res) => {
  var aciklama = req.body.aciklama;
  var isim = req.body.isim;
  var yazar = req.body.yazar;
  var yayınevi = req.body.yayınevi;
  var fiyat = req.body.fiyat;
  var stok = req.body.stok;
  var ind_fiyat = req.body.ind_fiyat;
  var kategori = req.body.kategori;
  var guncelle = [
    aciklama,
    isim,
    yazar,
    yayınevi,
    fiyat,
    stok,
    ind_fiyat,
    kategori,
    req.query.id,
  ];
  var sql =
    "UPDATE kitaplar SET aciklama=? , isim=? , yazar=?, yayınevi=? , fiyat=? , stok=?, ind_fiyat=? , kategori=? WHERE id=?";
  conneciton.query(sql, guncelle, (err, results, fields) => {
    if (!err) res.send({ sonuc: true });
    else {
      res.send({ sonuc: false });
    }
  });
});
app.get("/api/last10items", (req, res) => {
  if (req.isAuthenticated() && req.user.rol === "admin") {
    var sql = "SELECT id,isim,yazar FROM kitaplar ORDER BY id DESC LIMIT 10";
    conneciton.query(sql, (err, results, fields) => {
      if (err) throw err;
      else {
        res.send(results);
      }
    });
  } else {
    res.send({ sonuc: "GİRİŞ YAPMANI GEREKİR" });
  }
});
app.get("/api/onerilen/urunler", (req, res) => {
  var kategori = req.query.kategori;
  var id = req.query.id;
  var sql = "SELECT * FROM kitaplar WHERE id NOT IN (?) AND kategori=? LIMIT 6";
  var insert = [id, kategori];
  conneciton.query(sql, insert, (err, results, fields) => {
    if (err) throw err;
    else {
      res.send(results);
    }
  });
});
app.get("/api/haftaninyayinlari", (req, res) => {
  var sql = "SELECT * FROM kitaplar WHERE yayınevi='CAN' LIMIT 5";
  conneciton.query(sql, (err, results, fields) => {
    if (err) throw err;
    else {
      res.send(results);
    }
  });
});

/*YORUM APİ */
app.post("/api/create/comment", (req, res) => {
  var sql = "INSERT INTO comments (id,yildiz,yorumlar,onay) VALUES(?,?,?,0)";
  var result = [req.body.id, req.body.yildiz, req.body.yorumlar];
  conneciton.query(sql, result, (err, results, fields) => {
    if (!err) {
      res.send(results);
    } else {
      res.send({ sonuc: false });
    }
  });
});
app.get("/api/get/comments/:id", (req, res) => {
  var sql = "SELECT * FROM comments WHERE id=? AND onay=1";
  var id = req.params.id;
  var params = [id];
  conneciton.query(sql, params, (err, results, fields) => {
    if (err) {
      res.send({ sonuc: false });
    } else {
      res.send(results);
    }
  });
});
/*ONAY BEKLEYENLER */
app.get("/api/admin/comments/confirm", (req, res) => {
  var sql = "SELECT * FROM comments WHERE onay=0";
  conneciton.query(sql, (err, results, fields) => {
    if (err) res.send({ sonuc: false });
    else {
      res.send(results);
    }
  });
});
/*ONAY BEKLEYENLER */
app.patch("/api/admin/comments/replace", (req, res) => {
  var sql = "UPDATE comments SET onay=1 WHERE comments_id=?";
  var id = [req.body.comments_id];
  conneciton.query(sql, id, (err, results, fields) => {
    if (err) {
      res.send({ sonuc: false });
    } else {
      res.send(results);
    }
  });
});
/*YORUM APİ */
app.listen(5000, () => {
  console.log("SERVER 5000 PORTUNDA ÇALIŞIYOR");
});
