// ai.js - Integración con Teachable Machine (Visión y Audio)

const tmImageURL = "https://teachablemachine.withgoogle.com/models/cveAi7UGP/";
const tmAudioURL = "https://teachablemachine.withgoogle.com/models/zpw77hX0p/";

let modelImage, webcam;
let recognizerAudio;
let aiInitialized = false;

const webcamContainer = document.getElementById("webcam-container");
const gameStatusLabel = document.getElementById("game-status-label");
const audioVisualizer = document.getElementById("mic-status");
const audioLabel = document.getElementById("audio-label");

const controlModeSelect = document.getElementById("control-mode");
const boxCam = document.getElementById("box-cam");
const boxMic = document.getElementById("box-mic");

controlModeSelect.addEventListener("change", (e) => {
    if(e.target.value === "gesture") {
        boxCam.style.display = "block";
        boxMic.style.display = "none";
    } else {
        boxCam.style.display = "none";
        boxMic.style.display = "block";
    }
});

let isPredicting = false;

// Umbral de confianza para IMAGEN. Al no existir clase "Neutro", el umbral de imagen debe ser altísimo para asegurar que realmente es un gesto intencional.
const CONFIDENCE_THRESHOLD_IMAGE = 0.95;
// Umbral de confianza para VOZ.
const CONFIDENCE_THRESHOLD_VOZ = 0.75;

// Variables individuales de debounce para evitar conflictos cruzados (Voz vs Imagen)
let lastImageCommandTime = 0;
let lastVoiceCommandTime = 0;

// Init principal llamado al pulsar "Jugar"
async function initAI() {
    if (aiInitialized) {
        // Si ya estan cargados, reanudar
        startPredicting();
        return;
    }

    gameStatusLabel.innerText = "Cargando modelos de IA...";
    
    try {
        // Cargar Modelo de Imagen
        await initImageModel();
        
        // Cargar Modelo de Audio
        await initAudioModel();
        
        aiInitialized = true;
        gameStatusLabel.innerText = "IA Activa - Juega con Gestos o Voz";
        gameStatusLabel.style.color = "var(--snake-color)";
        
        startPredicting();
        
    } catch (err) {
        console.error("Error iniciando IA: ", err);
        gameStatusLabel.innerText = "Error cargando IA. Permitiste la cámara/mic?";
        gameStatusLabel.style.color = "var(--accent)";
    }
}

async function initImageModel() {
    const modelURL = tmImageURL + "model.json";
    const metadataURL = tmImageURL + "metadata.json";

    modelImage = await tmImage.load(modelURL, metadataURL);

    // Setup Webcam
    const flip = true; 
    webcam = new tmImage.Webcam(300, 300, flip); // width, height, flip
    await webcam.setup(); // pide permisos
    await webcam.play();
    
    webcamContainer.innerHTML = "";
    webcamContainer.appendChild(webcam.canvas);
}

async function initAudioModel() {
    const recognizer = speechCommands.create(
        "BROWSER_FFT",
        undefined,
        tmAudioURL + "model.json",
        tmAudioURL + "metadata.json"
    );

    await recognizer.ensureModelLoaded();
    recognizerAudio = recognizer;
}

function startPredicting() {
    if (!aiInitialized) return;
    isPredicting = true;
    
    // Iniciar loop de imagen
    window.requestAnimationFrame(loopImage);
    
    // Iniciar escucha de audio
    audioVisualizer.classList.add("active");
    recognizerAudio.listen(result => {
        if (!isPredicting || !window.gameActive) return;

        let scores = result.scores; // probabilidades de todas las clases
        let labels = recognizerAudio.wordLabels();
        
        let maxScore = 0;
        let bestCommand = "";
        
        for (let i = 0; i < labels.length; i++) {
            if (scores[i] > maxScore) {
                maxScore = scores[i];
                bestCommand = labels[i].toLowerCase();
            }
        }
        
        // Ignorar "ruido de fondo / Ruido" o clases base si no supera el umbral
        if (maxScore >= CONFIDENCE_THRESHOLD_VOZ && bestCommand.trim() !== "ruido de fondo") {
            // bestCommand suele ser "arriba", "abajo", "izquierdo", "derecho"
            processCommand(bestCommand, "voz");
        }
    }, {
        probabilityThreshold: 0.75, // Solo reportar si supera 75%
        invokeCallbackOnNoiseAndUnknown: true,
        overlapFactor: 0.25 
    });
}

function stopAI() {
    isPredicting = false;
    audioVisualizer.classList.remove("active");
    if (recognizerAudio && recognizerAudio.isListening()) {
        recognizerAudio.stopListening();
    }
    // No pausamos la camara totalmente para evitar molestar al browser volviendo a pedir permisos o recargando, 
    // solo ignoramos los predicciones por el flag `isPredicting`.
}

async function loopImage() {
    if (!isPredicting) return;
    
    if (window.gameActive) {
        webcam.update(); // Update the webcam frame
        await predictImage();
    }
    window.requestAnimationFrame(loopImage);
}

async function predictImage() {
    const prediction = await modelImage.predict(webcam.canvas);
    
    let maxProb = 0;
    let bestClass = "";

    for (let i = 0; i < prediction.length; i++) {
        if (prediction[i].probability > maxProb) {
            maxProb = prediction[i].probability;
            bestClass = prediction[i].className.toLowerCase();
        }
    }

    // Filter neutral classes
    if (maxProb >= CONFIDENCE_THRESHOLD_IMAGE && bestClass !== "neutro" && bestClass !== "centro" && bestClass !== "class 5") {
        processCommand(bestClass, "gesto");
    }
}

// Limpiar y enviar comando al juego (con rate-limiting)
function processCommand(rawLabel, source) {
    if (!window.gameActive) return;
    
    // Ignorar si el modo actual no corresponde a la fuente del comando
    const activeMode = controlModeSelect.value;
    if (activeMode === "gesture" && source === "voz") return;
    if (activeMode === "voice" && source === "gesto") return;

    const now = Date.now();
    
    // Limitar 1 comando cada 400ms por fuente para evitar spam que provoque colisiones de cuello indeseadas
    // Reduciendo conflicto entre voz e imagen
    if (source === "voz" && now - lastVoiceCommandTime < 400) return; 
    if (source === "gesto" && now - lastImageCommandTime < 400) return; 

    // Mapeo defensivo de los labels (Audio dice: "Abajo voz", Imagen dice: "Abajo")
    let finalCommand = "";
    if (rawLabel.includes("arriba")) finalCommand = "arriba";
    else if (rawLabel.includes("abajo")) finalCommand = "abajo";
    else if (rawLabel.includes("izquierd")) finalCommand = "izquierdo";
    else if (rawLabel.includes("derech")) finalCommand = "derecho";

    if (finalCommand) {
        // Enviar al juego
        window.setSnakeDirection(finalCommand);
        
        if (source === "voz") lastVoiceCommandTime = now;
        if (source === "gesto") lastImageCommandTime = now;
        
        // Update UI
        audioLabel.innerText = source === "voz" 
            ? `Voz: ${finalCommand}` 
            : `Gesto: ${finalCommand}`;
        
        setTimeout(() => { 
            if(window.gameActive) audioLabel.innerText = "Escuchando/Observando..."; 
        }, 1500);
    }
}

// Exportamos de forma global para usar en game.js
window.initAI = initAI;
window.stopAI = stopAI;
