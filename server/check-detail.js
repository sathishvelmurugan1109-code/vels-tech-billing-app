const mongoose = require("mongoose");
const User = require("./models/User");

async function checkAccount() {
  try {
    await mongoose.connect("mongodb://localhost:27017/vels_billing");
    console.log("[DB] Connected");

    // Find with passwordHash explicitly selected
    const user = await User.findOne({ email: "velstechoffical@gmail.com" }).select("+passwordHash");
    if (user) {
      const userObj = user.toObject();
      delete userObj.passwordHash;
      console.log("[User] Found:", JSON.stringify(userObj, null, 2));
      console.log("[User] passwordHash type:", typeof user.passwordHash);
      console.log("[User] passwordHash length:", user.passwordHash ? user.passwordHash.length : "undefined");
      console.log("[User] passwordHash preview:", user.passwordHash ? user.passwordHash.substring(0, 30) + "..." : "undefined");
    } else {
      console.log("[User] NOT FOUND");
    }
  } catch (err) {
    console.error("[Error]", err.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkAccount();
