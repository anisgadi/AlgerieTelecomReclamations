const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: [
        "client",
        "service_clientele",
        "service1",
        "service2",
        "service3",
        "service4",
        "admin",
      ],
      required: true,
      default: "client",
    },

    // Identité
    nom: { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },
    codeImmatriculation: { type: String, trim: true }, // clients uniquement

    // Contacts (clés primaires)
    telephone: { type: String, unique: true, sparse: true },
    mobile: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true },

    password: { type: String, required: true, minlength: 8 },

    // Localisation (clients)
    wilaya: { type: String },
    adresse: {
      texte: String,
      coordonnees: {
        lat: Number,
        lng: Number,
      },
    },

    typeAbonnement: {
      type: String,
      enum: ["Fibre", "ADSL"],
    },

    // Vérification email
    emailVerified: { type: Boolean, default: false },
    emailVerificationCode: { type: String },
    emailVerificationExpires: { type: Date },

    // Reset password
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // pour les comptes agents
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Hash mot de passe avant sauvegarde
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Méthode de comparaison
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Ne jamais retourner le mot de passe
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationCode;
  delete obj.resetPasswordToken;
  return obj;
};

module.exports = mongoose.model("User", UserSchema);
