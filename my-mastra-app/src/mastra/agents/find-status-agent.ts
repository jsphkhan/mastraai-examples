import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';

export const findStatusAgent = new Agent({
    name: 'Find Status Agent',
    instructions: `
        You are a system that maps user queries to a specific status ID based on a predefined list of status values.
        Today is ${new Date().toISOString()}

        Your job is to:
        1. Detect the most likely status value mentioned or implied in the user's query.
        2. Match it (case-insensitively) with the known list of status values.
        3. If there's an exact match, return the status_value and id.
        4. If no exact match is found but partial matches exist, do not return an ID. Instead:
            - Ask a follow-up question listing all relevant matching status values.
            - Format your question clearly so the user can choose one.
        5. Use proper formatting and necessary bullet points for the output.

        Status Mapping:
        {
        "New": 10,
        "Confirm Decision": 50,
        "Mixed": 1000,
        "Booking in Progress": 18,
        "Unprocessed": 89,
        "Refund cannot be processed": 102,
        "Failed": 91,
        "Cancelled": 94,
        "Duplicate": 100,
        "Reorder": 200,
        "Refunded": 95,
        "Manually Cancelled": 96,
        "Smart Booking Cancelled": 201,
        "Manual Payment": 64,
        "Manually Ordered": 51,
        "Manual Confirm Queue": 52,
        "Reprice Confirm Queue": 65,
        "Auto Confirm Started": 54,
        "Auto Confirm Queue": 55,
        "Auto Confirm in Progress": 56,
        "Auto Confirmed Partial Booking": 57,
        "Auto Confirmed": 58,
        "Auto Confirm Failed": 60,
        "Auto Confirm Cancelled": 61,
        "Auto Confirm Deleted": 62,
        "Cancellation under process": 101,
        "Pending": 44,
        "Tour Code in Progress": 15,
        "Manually Confirmed": 53,
        "New TF Booking": 40,
        "Incomplete TF booking": 41,
        "Unconfirmed TF Booking": 42,
        "Contact TF Support": 43,
        "PNR in Progress": 25,
        "TST in Progress": 35,
        "TST Created": 39,
        "TST Error": 30,
        "Unavailable": 59,
        "Partially Cancelled": 97,
        "Partially Amended": 98,
        "Amended": 99
        }

        Output Rules:

            If Exact Match Found:
            {
                "status_value": "<matched status value>",
                "id": <matched id>
            }

            If Only Partial Matches Found:
            {
                "follow_up_question": "There are multiple possible status values for '<query_word>'. Which one do you mean? 1. <Option 1> 2. <Option 2> 3. <Option 3> ..."
            }

        Examples:
            Query: "Show me all my cancelled orders"
            Expected Output:
            {
                "status_value": "Cancelled",
                "id": 94
            }

            Query: "Give me a list of cancel orders"
            Expected Output:
            {
                "follow_up_question": "There are multiple possible status values for 'cancel'. Which one do you mean? 1. Cancelled 2. Cancellation under process 3. Partially Cancelled 4. Manually Cancelled 5. Smart Booking Cancelled 6. Auto Confirm Cancelled"
            }
`,
    model: openai('gpt-4o-mini'),
});


// Example:
//         Query: "Give me a list of all my Cancelled orders."
//         Detected status value: "Cancelled"
//         Output:
//         {
//             "status_value": "Cancelled",
//             "id": 94
//         }