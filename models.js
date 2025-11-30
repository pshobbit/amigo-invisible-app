const mongoose = require('mongoose');

const deseoSchema = new mongoose.Schema({
    texto: String,
    comprado: { type: Boolean, default: false },
    compradoPor: { type: mongoose.Schema.Types.ObjectId, default: null } // ID de quien lo compró
});

const usuarioSchema = new mongoose.Schema({
    nombre: String,
    amigoInvisible: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null }, // A quién le regala
    deseos: [deseoSchema]
});

// Modelo principal
const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;