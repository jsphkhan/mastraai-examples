/** 
 * Sample test script to call the weather agent programatically
 * 
 * Run using npx tsx src/test.ts
*/

import 'dotenv/config';
// import Mastra entry point
import { mastra } from './mastra/index';

// call the weather agent programatically
async function callWeatherAgent() {
    const weatherAgent = mastra.getAgent('weatherAgent');

    const weatherResponse = await weatherAgent.generate([
        { role: 'user', content: 'What is the weather in Tokyo?' }
    ]);

    console.log(weatherResponse.text);
}

// callWeatherAgent();

async function callWeatherWorkflow() {
    const run = await mastra.getWorkflow('weatherWorkflow').createRunAsync();

    const result = await run.start({ // run.stream() for streaming output
        inputData: {
            city: "London"
        }
    });

    // Dump the complete workflow result (includes status, steps and result)
    console.log(JSON.stringify(result, null, 2));

    // Get the workflow output value
    if (result.status === 'success') {
        console.log(`output value: ${result.result.activities}`);
    }

    // for streaming output
    // for await (const chunk of result.stream) {
    //     console.log(chunk);
    // }
}

callWeatherWorkflow();