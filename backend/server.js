const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "API Musée d'Art Virtuel" });
});

app.get("/api/artworks", (req, res) => {
    res.json([
        { id: 1, title: "La Joconde", artist: "Léonard de Vinci" },
        { id: 2, title: "La Nuit étoilée", artist: "Vincent van Gogh" }
    ]);
});

app.listen(PORT, () => {
    console.log(`✅ Serveur sur http://localhost:${PORT}`);
});
