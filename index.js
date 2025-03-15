import OpenAI from "openai"
import readlineSync from 'readline-sync';
import fetch from 'node-fetch';

/**
 * @author kabragaurav
 */

// Get your API key from https://platform.openai.com/api-keys
const OPENAI_API_KEY = "<Get your API key from https://platform.openai.com/api-keys>";
const client = new OpenAI({
    apiKey: OPENAI_API_KEY
});



// Tools

/**
 * Gets the temperature of a city using the OpenWeatherMap API
 * @param {string} [city=''] 
 * @returns {Promise<string>} the temperature of the city
 */
async function getTemperatureDetails(city = '') {
    if (!city) {
        return "Please provide a city name";
    }
    
    try {
        // You need to sign up at https://openweathermap.org/ to get your API key
        const WEATHER_API_KEY = "<get keys using url in above comment. It will take ~10 mins to get keys activated>";
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${WEATHER_API_KEY}`;
        
        console.log(`Fetching weather data for: ${city}`);
        const response = await fetch(url);
        const data = await response.json();
        
        console.log("API Response:", JSON.stringify(data));
        
        if (data.cod === 200) {
            return `${data.main.temp} °C`;
        } else {
            return `Error: ${data.message || "Unknown error"}`;
        }
    } catch (error) {
        console.error("Error fetching weather data:", error);
        return `Error fetching temperature data: ${error.message}`;
    }
}

const toolsMap = {
    "getTemperatureDetails" : getTemperatureDetails,
};

const SYS_PROMPT = `
You are an AI-powered assistant with five states: START, PLAN, EXECUTION, OBSERVATION and OUTPUT.
START by waiting for user prompt and then PLAN using Available Tools.
After PLAN, execute appropriate tools and wait for OBSERVATION.
Once you get OBSERVATION, return the AI-based response based on user prompt and OBSERVATION.

Available Tools:
1. function getTemperatureDetails(city = '')

Strictly follow the JSON format given in below example.
If the temperature observed is invalid, say to user "City not found. Please check the name and try again."

Example:
START
{"type": "user", "user": "What is the temperature of Jaipur?"}
{"type": "plan", "plan": "I will call getTemperatureDetails function for Jaipur"}
{"type": "execution", "function": "getTemperatureDetails", "input": "Jaipur"}
{"type": "observation", "observation": "47 °C"}
{"type": "output", "output": "🤖 The temperature of Jaipur is 47 °C."}
`;

// For auto-prompting/context of previous chats
const history = [
    {role: "system", content: SYS_PROMPT}
];

// User Interaction

while (true) {
    const prompt = readlineSync.question("──> ");
    const jsonQuery = {
        type: "user",
        user: prompt
    }
    history.push({role: "user", content: JSON.stringify(jsonQuery)});

    // loop over five states
    while (true) {
        const chat = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: history,
            response_format: { "type": "json_object" }
        });
    
        const response = chat.choices[0].message.content;
        console.log('---------- Starts Agent Response ----------');
        console.log(response);
        console.log('---------- Ends Agent Response ----------');
        history.push({role: "assistant", content: response});

        const state = JSON.parse(response);

        if (state.type === "output") {
            console.log(state.output);
            break;
        } else if (state.type === "execution") {
            const func = toolsMap[state.function];
            const observation = await func(state.input);
            const observationJson = {"type": "observation", "observation": observation};
            history.push({role: "developer", content: JSON.stringify(observationJson)});
        }
    }
}