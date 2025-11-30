require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Usuario = require('./models');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Servirá tu HTML estático

// Conexión a Base de Datos (MongoDB)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a DB:', err));

// --- API ENDPOINTS ---

// 1. Obtener todos los usuarios (para el login y recargar datos)
app.get('/api/usuarios', async (req, res) => {
    const usuarios = await Usuario.find();
    res.json(usuarios);
});

// 2. Crear nuevo usuario
app.post('/api/usuarios', async (req, res) => {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    
    const nuevo = new Usuario({ nombre, deseos: [] });
    await nuevo.save();
    res.json(nuevo);
});

// 3. Agregar deseo
app.post('/api/usuarios/:id/deseos', async (req, res) => {
    const { texto } = req.body;
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    usuario.deseos.push({ texto });
    await usuario.save();
    res.json(usuario);
});

// 4. Eliminar deseo
app.delete('/api/usuarios/:userId/deseos/:deseoId', async (req, res) => {
    const usuario = await Usuario.findById(req.params.userId);
    usuario.deseos = usuario.deseos.filter(d => d._id.toString() !== req.params.deseoId);
    await usuario.save();
    res.json(usuario);
});

// 5. Marcar/Desmarcar regalo comprado
// OJO: Aquí aplicamos la lógica de que solo el que compra puede marcar/desmarcar
app.put('/api/comprar/:receptorId/:deseoId', async (req, res) => {
    const { compradorId, accion } = req.body; // accion: 'comprar' o 'liberar'
    
    const receptor = await Usuario.findById(req.params.receptorId);
    const deseo = receptor.deseos.id(req.params.deseoId);

    if (accion === 'comprar') {
        deseo.comprado = true;
        deseo.compradoPor = compradorId;
    } else {
        deseo.comprado = false;
        deseo.compradoPor = null;
    }

    await receptor.save();
    res.json(receptor);
});

// 6. SORTEO (Algoritmo Amigo Invisible)
app.post('/api/sortear', async (req, res) => {
    const usuarios = await Usuario.find();
    if (usuarios.length < 2) return res.status(400).json({ error: 'Mínimo 2 personas' });

    // Resetear asignaciones previas
    for (let u of usuarios) { u.amigoInvisible = null; }

    let ids = usuarios.map(u => u._id.toString());
    let posibles = [...ids];
    let asignaciones = {};

    // Algoritmo simple de asignación (reintentar si falla la última asignación)
    let exito = false;
    while (!exito) {
        exito = true;
        posibles = [...ids];
        asignaciones = {};
        
        for (let id of ids) {
            // Filtrar: no te puedes regalar a ti mismo
            let opciones = posibles.filter(p => p !== id);
            if (opciones.length === 0) {
                exito = false; // Falló el sorteo (quedó uno solo y es él mismo), reintentar
                break;
            }
            let elegido = opciones[Math.floor(Math.random() * opciones.length)];
            asignaciones[id] = elegido;
            posibles = posibles.filter(p => p !== elegido);
        }
    }

    // Guardar en DB
    for (let u of usuarios) {
        u.amigoInvisible = asignaciones[u._id.toString()];
        await u.save();
    }

    res.json({ message: 'Sorteo realizado' });
});

// 7. Reiniciar todo
app.post('/api/reiniciar', async (req, res) => {
    await Usuario.deleteMany({});
    res.json({ message: 'Reiniciado' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));