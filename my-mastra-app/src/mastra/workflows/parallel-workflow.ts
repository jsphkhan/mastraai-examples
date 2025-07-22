/** 
 * This is a test workflow to test the parallel workflow functionality
 * https://mastra.ai/en/docs/workflows/overview
 * https://mastra.ai/en/examples/workflows/parallel-steps
*/

import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z} from 'zod';

const forecastSchema = z.object({
    date: z.string(),
    maxTemp: z.number(),
    minTemp: z.number(),
    precipitationChance: z.number(),
    condition: z.string(),
    location: z.string(),
});

function getWeatherCondition(code: number): string {
    const conditions: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow fall",
      73: "Moderate snow fall",
      75: "Heavy snow fall",
      95: "Thunderstorm",
    };
    return conditions[code] || "Unknown";
}

// Step to fetch weather data for a given city
// Makes API calls to get current weather conditions and forecast
const fetchWeather = createStep({
    id: "fetch-weather",
    description: "Fetches weather forecast for a given city",
    inputSchema: z.object({
      city: z.string(),
    }),
    outputSchema: forecastSchema,
    execute: async ({ inputData }) => {
      if (!inputData) {
        throw new Error("Trigger data not found");
      }
   
      const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputData.city)}&count=1`;
      const geocodingResponse = await fetch(geocodingUrl);
      const geocodingData = (await geocodingResponse.json()) as {
        results: { latitude: number; longitude: number; name: string }[];
      };
   
      if (!geocodingData.results?.[0]) {
        throw new Error(`Location '${inputData.city}' not found`);
      }
   
      const { latitude, longitude, name } = geocodingData.results[0];
   
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,weathercode&timezone=auto,&hourly=precipitation_probability,temperature_2m`;
      const response = await fetch(weatherUrl);
      const data = (await response.json()) as {
        current: {
          time: string;
          precipitation: number;
          weathercode: number;
        };
        hourly: {
          precipitation_probability: number[];
          temperature_2m: number[];
        };
      };
   
      const forecast = {
        date: new Date().toISOString(),
        maxTemp: Math.max(...data.hourly.temperature_2m),
        minTemp: Math.min(...data.hourly.temperature_2m),
        condition: getWeatherCondition(data.current.weathercode),
        location: name,
        precipitationChance: data.hourly.precipitation_probability.reduce(
          (acc, curr) => Math.max(acc, curr),
          0,
        ),
      };
   
      return forecast;
    },
});

// Step to plan activities based on weather conditions
// Uses the planning agent to suggest activities
const planActivities = createStep({
    id: "plan-activities",
    description: "Suggests activities based on weather conditions",
    inputSchema: forecastSchema,
    outputSchema: z.object({
      activities: z.string(),
    }),
    execute: async ({ inputData, mastra }) => {
      const forecast = inputData;
   
      if (!forecast) {
        throw new Error("Forecast data not found");
      }
   
      const prompt = `Based on the following weather forecast for ${forecast.location}, suggest appropriate activities:
        ${JSON.stringify(forecast, null, 2)}
        `;
      
      console.log('##### prompt1: ', prompt);
   
      const agent = mastra?.getAgent("planningAgent");
      if (!agent) {
        throw new Error("Planning agent not found");
      }
   
      const response = await agent.stream([
        {
          role: "user",
          content: prompt,
        },
      ]);
   
      let activitiesText = "";
   
      for await (const chunk of response.textStream) {
        process.stdout.write(chunk);
        activitiesText += chunk;
      }
      return {
        activities: activitiesText,
      };
    },
});

// Step to plan indoor activities as backup options
// Generates alternative indoor activities in case of bad weather
const planIndoorActivities = createStep({
    id: "plan-indoor-activities",
    description: "Suggests indoor activities based on weather conditions",
    inputSchema: forecastSchema,
    outputSchema: z.object({
      activities: z.string(),
    }),
    execute: async ({ inputData, mastra }) => {
      const forecast = inputData;
   
      if (!forecast) {
        throw new Error("Forecast data not found");
      }
   
      const prompt = `In case it rains, plan indoor activities for ${forecast.location} on ${forecast.date}`;
      console.log('\n\n##### prompt2: ', prompt);
   
      const agent = mastra?.getAgent("planningAgent");
      if (!agent) {
        throw new Error("Planning agent not found");
      }
   
      const response = await agent.stream([
        {
          role: "user",
          content: prompt,
        },
      ]);
   
      let activitiesText = "";
   
      for await (const chunk of response.textStream) {
        activitiesText += chunk;
      }
      return {
        activities: activitiesText,
      };
    },
});

// Step to synthesize the results of the indoor and outdoor activities
// Uses the synthesize agent to combine the results into a single report
const synthesizeStep = createStep({
    id: "sythesize-step",
    description: "Synthesizes the results of the indoor and outdoor activities",
    inputSchema: z.object({
      "plan-activities": z.object({
        activities: z.string(),
      }),
      "plan-indoor-activities": z.object({
        activities: z.string(),
      }),
    }),
    outputSchema: z.object({
      activities: z.string(),
    }),
    execute: async ({ inputData, mastra }) => {
      const indoorActivities = inputData?.["plan-indoor-activities"];
      const outdoorActivities = inputData?.["plan-activities"];
   
      const prompt = `Indoor activities:
        ${indoorActivities?.activities}
   
        Outdoor activities:
        ${outdoorActivities?.activities}
   
        There is a chance of rain so be prepared to do indoor activities if needed.`;

      console.log('\n\n##### prompt3', prompt);
   
      const agent = mastra?.getAgent("synthesizeAgent");
      if (!agent) {
        throw new Error("Synthesize agent not found");
      }
   
      const response = await agent.stream([
        {
          role: "user",
          content: prompt,
        },
      ]);
   
      let activitiesText = "";
   
      for await (const chunk of response.textStream) {
        process.stdout.write(chunk);
        activitiesText += chunk;
      }
   
      return {
        activities: activitiesText,
      };
    },
});

// Define the workflow
const activityPlanningWorkflow = createWorkflow({
    id: "parallel-workflow",
    inputSchema: z.object({
      city: z.string().describe('The city to get weather for'),
    }),
    outputSchema: z.object({
      activities: z.string(),
    }),
    steps: [fetchWeather, planActivities, planIndoorActivities, synthesizeStep],
  })
    .then(fetchWeather)
    .parallel([planActivities, planIndoorActivities])
    .then(synthesizeStep)
    .commit();
   
export { activityPlanningWorkflow };
  

