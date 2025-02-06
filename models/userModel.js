const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// name, email, photo, password, passwordConfirm
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A user must have a name'],
        trim: true,
        maxlength: [25, 'A name must have less or equal than 40 characters'],
        minlength: [3, 'A name name must more or equal than 10 characters'],
        //validate: [validator.isAlpha, 'A Tour name must be all characters']
    },
    email: {
        type: String,
        required: [true, 'A user must have an email'],
        unique: true,
        lowercase: true,
        maxlength: [35, 'User email cannot exceed 35 characters'],
        minlength: [5, 'User email must exceed 5 characters'],
        validate: [validator.isEmail, 'Please enter a valid email adress']
    },
    photo: {
        type: {
            type: String,
            default: 'default.jpg'
        },
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Users require a password'],
        maxlength: [35, 'User password cannot exceeed 35 characters'],
        minlength: [8, 'User password must exceed 8 characters'],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Users require a password'],
        maxlength: [35, 'User password cannot exceeed 35 characters'],
        minlength: [8, 'User password must exceed 8 characters'],
        validate: {
            // This only works on CREATE and SAVE!
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords do not match!'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

userSchema.pre('save', async function (next) {
    // only run this function if password was actually modified
    if (!this.isModified('password')) return next();

    // Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);

    // Delete password confirm field
    this.passwordConfirm = undefined;
    next();
});

userSchema.pre(/^find/, function (next) {
    //this points to the current query
    this.find({ active: { $ne: false } });
    next();
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();
});

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
}

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    let changedTimeStamp;

    if (this.passwordChangedAt) {
        changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    }

    return JWTTimestamp < changedTimeStamp;

    // False means NOT changed
    return false;
};

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 10 minutes
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;