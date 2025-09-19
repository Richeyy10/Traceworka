const bcrypt = require('bcryptjs');

// The password you are typing in the login form
const plainTextPassword = 'password'; 

// A correct hashed password generated from that password
// You can get this by running your hash-password.js script
const correctHashedPassword = '$2b$10$wQ7n1QVH3JKaxJYz4g.h8OcvU40I2GMuilMnV3L1lveAkv4Wu8/oG'; 

async function verifyPassword() {
    try {
        // This is the line in your code that is failing
        const passwordMatch = await bcrypt.compare(plainTextPassword, correctHashedPassword);
        console.log(`The password matches: ${passwordMatch}`);
    } catch (error) {
        console.log('An error occurred during comparison:', error);
    }
}

verifyPassword();
