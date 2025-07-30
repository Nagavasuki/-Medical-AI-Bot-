// --- Initial Setup ---
// This ensures that the script runs after the HTML content is fully loaded.
document.addEventListener('DOMContentLoaded', () => {

    // Initialize Feather Icons
    feather.replace();

    // --- Page Navigation Elements ---
    const mainPage = document.getElementById('main-page');
    const chatbotPage = document.getElementById('chatbot-page');
    const getStartedBtn = document.getElementById('getStartedBtn');
    const tryAiBtn = document.getElementById('tryAiBtn');
    const backToHomeBtn = document.getElementById('backToHomeBtn');

    // --- Chatbot UI Elements ---
    const sendButton = document.getElementById('sendButton');
    const userInput = document.getElementById('userInput');
    const chatContainer = document.getElementById('chat-container');
    const cameraButton = document.getElementById('cameraButton');
    const imageInput = document.getElementById('imageInput');
    const micButton = document.getElementById('micButton');

    // --- Page Switching Logic ---
    function showChatbot() {
        mainPage.classList.add('hidden');
        chatbotPage.classList.remove('hidden');
    }

    function showHome() {
        chatbotPage.classList.add('hidden');
        mainPage.classList.remove('hidden');
    }

    // Attach event listeners for page navigation
    getStartedBtn.addEventListener('click', showChatbot);
    tryAiBtn.addEventListener('click', showChatbot);
    backToHomeBtn.addEventListener('click', showHome);

    // --- Chatbot Core Logic ---
    const systemPrompt = `You are an AI assistant that provides medicine information in a structured JSON format. Based on the user's query (a symptom, a medicine name, or an image), find relevant over-the-counter (OTC) medicines. Return a JSON object with a key 'medicines' which is an array of medicine objects. For a symptom, provide 1-2 generic and 1-2 branded options. For a specific medicine name, provide its details and one alternative. Each medicine object must conform to the specified schema. Do not invent medicines. Use common, well-known examples. The 'effectiveness' should be a random-seeming integer between 70 and 95. The 'price' should be a realistic example in local currency (e.g., INR). Crucially, do not give prescriptive medical advice or specific dosage. Use the 'commonUse' field to describe typical application, not a direct order.`;
    
    let chatHistory = [];
    let selectedImageBase64 = null;

    // --- Speech Recognition Setup with DEBUGGING ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        console.log("Speech Recognition API is supported.");
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        // DEBUG: Log when recognition starts
        recognition.onstart = () => {
            console.log("Speech recognition started. Please speak.");
            micButton.classList.add('text-red-500');
        };

        // DEBUG: Log the full result object
        recognition.onresult = (event) => {
            console.log("Speech recognition result received:", event);
            const speechResult = event.results[0][0].transcript;
            console.log("Transcript:", speechResult);
            userInput.value = speechResult;
        };

        // DEBUG: Log when speech ends
        recognition.onspeechend = () => {
            console.log("Speech recognition has stopped listening.");
            recognition.stop();
        };
        
        // DEBUG: Log when recognition session ends
        recognition.onend = () => {
            console.log("Speech recognition session ended.");
            micButton.classList.remove('text-red-500');
        };

        // DEBUG: Log any errors
        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            if (event.error === 'no-speech') {
                alert("No speech was detected. Please try again and speak clearly.");
            } else if (event.error === 'network') {
                alert("A network error occurred during speech recognition. Please check your connection.");
            }
        };

    } else {
        console.warn("Speech Recognition API is not supported in this browser.");
        if(micButton) micButton.disabled = true;
    }

    // --- UI Rendering Functions ---
    const addMessage = (sender, message, imageUrl = null) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex items-start gap-3 ${sender === 'user' ? 'justify-end' : ''}`;
        
        const avatarInitial = sender === 'user' ? 'You' : 'AI';
        const avatarBgColor = sender === 'user' ? 'bg-indigo-500' : 'bg-blue-500';
        const messageBgColor = sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
        
        const messageContent = document.createElement('div');
        messageContent.className = `${messageBgColor} p-3 rounded-lg max-w-lg shadow-sm`;

        if (message) {
            const messageText = document.createElement('p');
            messageText.textContent = message;
            messageContent.appendChild(messageText);
        }
        if (imageUrl) {
            const imageElement = document.createElement('img');
            imageElement.src = imageUrl;
            imageElement.className = 'mt-2 rounded-lg max-w-xs';
            messageContent.appendChild(imageElement);
        }

        messageDiv.innerHTML = `
            ${sender === 'user' ? '' : `<div class="w-10 h-10 ${avatarBgColor} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">${avatarInitial}</div>`}
            ${messageContent.outerHTML}
            ${sender === 'user' ? `<div class="w-10 h-10 ${avatarBgColor} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">${avatarInitial}</div>` : ''}
        `;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    };

    const renderMedicineCards = (medicines) => {
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'space-y-4';

        medicines.forEach(med => {
            const card = document.createElement('div');
            const isGeneric = med.type.toLowerCase() === 'generic';
            const borderColor = isGeneric ? 'border-green-500' : 'border-blue-500';
            const tagBgColor = isGeneric ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';

            card.className = `bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 ${borderColor} shadow-md`;
            
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">${med.medicineName}</h3>
                    <span class="text-xs font-semibold px-2 py-1 ${tagBgColor} rounded-full">${med.type}</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm text-gray-600 dark:text-gray-300">
                    <div><strong class="text-gray-700 dark:text-gray-200">Common Use:</strong> ${med.commonUse}</div>
                    <div><strong class="text-gray-700 dark:text-gray-200">Price:</strong> ${med.price}</div>
                    <div><strong class="text-gray-700 dark:text-gray-200">Instructions:</strong> ${med.instructions}</div>
                    <div><strong class="text-gray-700 dark:text-gray-200">Side Effects:</strong> ${med.sideEffects}</div>
                </div>
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Effectiveness</span>
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">${med.effectiveness}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div class="bg-gradient-to-r from-blue-400 to-green-400 h-2.5 rounded-full" style="width: ${med.effectiveness}%"></div>
                    </div>
                </div>
            `;
            cardsContainer.appendChild(card);
        });
        
        chatContainer.appendChild(cardsContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    const showDisclaimer = () => {
        const disclaimerDiv = document.createElement('div');
        disclaimerDiv.className = 'disclaimer-card';
        disclaimerDiv.innerHTML = `
            <p class="font-bold text-yellow-800 dark:text-yellow-300">Important Disclaimer</p>
            <p class="text-sm text-yellow-700 dark:text-yellow-400">I am an AI assistant, not a medical professional. This information is for educational purposes only. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.</p>
        `;
        chatContainer.appendChild(disclaimerDiv);
    }

    const showTypingIndicator = () => {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex items-start gap-3';
        typingDiv.innerHTML = `<div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">AI</div><div class="bg-gray-200 dark:bg-gray-700 p-3 rounded-lg"><div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div></div>`;
        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    const removeTypingIndicator = () => { document.getElementById('typing-indicator')?.remove(); }

    // --- Gemini API Call ---
    const getAIResponse = async (prompt, imageBase64) => {
        showTypingIndicator();
        
        const userParts = [{ text: prompt || "Identify the medicine in the image or suggest something for the described symptom." }];
        if (imageBase64) {
            userParts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
        }

        chatHistory.push({ role: "user", parts: userParts });

        const apiKey = ""; // Leave as-is
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ role: "user", parts: [{text: systemPrompt}]}, ...chatHistory],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "medicines": {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    "medicineName": { "type": "STRING" },
                                    "type": { "type": "STRING", "enum": ["Generic", "Branded"] },
                                    "commonUse": { "type": "STRING" },
                                    "price": { "type": "STRING" },
                                    "instructions": { "type": "STRING" },
                                    "effectiveness": { "type": "INTEGER" },
                                    "sideEffects": { "type": "STRING" }
                                },
                                required: ["medicineName", "type", "commonUse", "price", "instructions", "effectiveness", "sideEffects"]
                            }
                        }
                    }
                }
            }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API request failed: ${response.status}`);

            const result = await response.json();
            removeTypingIndicator();

            const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (jsonText) {
                const data = JSON.parse(jsonText);
                if (data.medicines && data.medicines.length > 0) {
                    renderMedicineCards(data.medicines);
                    showDisclaimer();
                    chatHistory.push({ role: "model", parts: [{ text: jsonText }] });
                } else {
                    addMessage('ai', "I couldn't find specific medicine information for that. Could you try rephrasing?");
                }
            } else {
                addMessage('ai', "I'm sorry, I couldn't generate a structured response. Please try again.");
            }

        } catch (error) {
            removeTypingIndicator();
            console.error("Error calling Gemini API or parsing JSON:", error);
            addMessage('ai', "There was an error. I might not be able to provide structured results for that query. Please try asking in a different way.");
        }
    };

    // --- Event Listeners for Chat Interaction ---
    const handleSend = () => {
        const message = userInput.value.trim();
        if (!message && !selectedImageBase64) return;

        addMessage('user', message, selectedImageBase64 ? `data:image/jpeg;base64,${selectedImageBase64}` : null);
        getAIResponse(message, selectedImageBase64);
        
        userInput.value = '';
        userInput.placeholder = "Describe a symptom...";
        selectedImageBase64 = null;
        imageInput.value = '';
    };

    sendButton.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSend());
    cameraButton.addEventListener('click', () => imageInput.click());
    
    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            selectedImageBase64 = reader.result.split(',')[1];
            userInput.placeholder = "Image selected. Add a comment and send.";
        };
        reader.readAsDataURL(file);
    });

    micButton.addEventListener('click', () => {
        if (!recognition) {
            console.error("Recognition not initialized.");
            return;
        }
        try {
            console.log("Attempting to start speech recognition...");
            recognition.start();
        } catch(e) {
            console.error("Error starting recognition:", e);
        }
    });
});
