import 'dotenv/config';
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { RuntimeContext } from '@mastra/core/runtime-context';
import { orderAgentNetwork } from '../mastra/networks/order-agent-network';

// run the agent network
async function runAgentNetwork() {
    const rl = readline.createInterface({ input, output });

    const runtimeContext = new RuntimeContext();    

    while(true) {
        const query = await rl.question("\nQuery: ");
        // console.log('##### query:', query);
        // const result = await orderAgentNetwork.generate(query, {
        //     runtimeContext
        // });
        
        // console.log("\nResponse from LLM: ");
        // console.log(result);

        const stream = await orderAgentNetwork.stream(query, { runtimeContext });

        for await (const chunk of stream.stream) {
            console.log(chunk);
          }
    }
}

runAgentNetwork();